exports.up = pgm => {
	pgm.addColumns('water_entries', {
		water_date: { type: 'date' },
	});
	pgm.sql(`
		UPDATE water_entries
		SET water_date = recorded_at::date
	`);
	pgm.sql(`
		WITH totals AS (
			SELECT
				MIN(id) AS keeper_id,
				user_id,
				water_date,
				LEAST(SUM(amount_ml), 20000)::integer AS amount_ml
			FROM water_entries
			GROUP BY user_id, water_date
		)
		UPDATE water_entries entry
		SET amount_ml = totals.amount_ml
		FROM totals
		WHERE entry.id = totals.keeper_id
	`);
	pgm.sql(`
		DELETE FROM water_entries duplicate
		USING water_entries keeper
		WHERE duplicate.user_id = keeper.user_id
		  AND duplicate.water_date = keeper.water_date
		  AND duplicate.id > keeper.id
	`);
	pgm.alterColumn('water_entries', 'water_date', { notNull: true });
	pgm.addConstraint('water_entries', 'water_entries_user_date_unique', {
		unique: ['user_id', 'water_date'],
	});
	pgm.addConstraint('water_entries', 'water_entries_amount_check', {
		check: 'amount_ml BETWEEN 0 AND 20000',
	});

	pgm.addColumns('sleep_entries', {
		sleep_start: { type: 'timestamptz' },
		sleep_end: { type: 'timestamptz' },
		sleep_quality: { type: 'integer' },
	});
	pgm.sql(`
		UPDATE sleep_entries
		SET
			sleep_start =
				sleep_date::timestamp
				+ CASE
					WHEN started_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
					THEN started_at::time
					ELSE TIME '00:00'
				  END,
			sleep_end =
				sleep_date::timestamp
				+ CASE
					WHEN ended_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
					THEN ended_at::time
					ELSE TIME '08:00'
				  END
				+ CASE
					WHEN started_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
					 AND (
						(
							ended_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
							AND ended_at::time <= started_at::time
						)
						OR (
							NOT COALESCE(
								ended_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$',
								FALSE
							)
							AND TIME '08:00' <= started_at::time
						)
					 )
					THEN INTERVAL '1 day'
					ELSE INTERVAL '0 day'
				  END,
			sleep_quality = CASE LOWER(COALESCE(quality, ''))
				WHEN 'very_bad' THEN 1
				WHEN 'bad' THEN 2
				WHEN 'average' THEN 3
				WHEN 'good' THEN 4
				WHEN 'excellent' THEN 5
				ELSE 3
			END
	`);
	pgm.alterColumn('sleep_entries', 'sleep_start', { notNull: true });
	pgm.alterColumn('sleep_entries', 'sleep_end', { notNull: true });
	pgm.alterColumn('sleep_entries', 'sleep_quality', { notNull: true });
	pgm.addConstraint('sleep_entries', 'sleep_entries_interval_check', {
		check: `
			sleep_end > sleep_start
			AND sleep_end <= sleep_start + INTERVAL '24 hours'
		`,
	});
	pgm.addConstraint('sleep_entries', 'sleep_entries_quality_check', {
		check: 'sleep_quality BETWEEN 1 AND 5',
	});

	pgm.alterColumn('mood_entries', 'mood_label', { type: 'varchar(50)' });
	pgm.alterColumn('mood_entries', 'mood_emoji', { type: 'varchar(16)' });
	pgm.alterColumn('mood_entries', 'note', { type: 'varchar(1000)' });
	pgm.sql(`
		UPDATE mood_entries
		SET mood_score = LEAST(GREATEST(COALESCE(mood_score, 3), 1), 5)
	`);
	pgm.alterColumn('mood_entries', 'mood_score', { notNull: true });
	pgm.addConstraint('mood_entries', 'mood_entries_score_check', {
		check: 'mood_score BETWEEN 1 AND 5',
	});

	pgm.sql(`
		UPDATE daily_tracking
		SET
			steps = LEAST(GREATEST(COALESCE(steps, 0), 0), 200000),
			calories = LEAST(GREATEST(COALESCE(calories, 0), 0), 20000)
	`);
	pgm.alterColumn('daily_tracking', 'steps', {
		type: 'integer',
		notNull: true,
		default: 0,
	});
	pgm.alterColumn('daily_tracking', 'calories', {
		type: 'numeric(10,2)',
		using: 'calories::numeric(10,2)',
		notNull: true,
		default: 0,
	});
	pgm.addConstraint('daily_tracking', 'daily_tracking_steps_check', {
		check: 'steps BETWEEN 0 AND 200000',
	});
	pgm.addConstraint('daily_tracking', 'daily_tracking_calories_check', {
		check: 'calories BETWEEN 0 AND 20000',
	});
};

exports.down = pgm => {
	pgm.dropConstraint('daily_tracking', 'daily_tracking_calories_check');
	pgm.dropConstraint('daily_tracking', 'daily_tracking_steps_check');
	pgm.alterColumn('daily_tracking', 'calories', {
		type: 'integer',
		using: 'ROUND(calories)::integer',
		default: 0,
	});

	pgm.dropConstraint('mood_entries', 'mood_entries_score_check');
	pgm.alterColumn('mood_entries', 'mood_score', { notNull: false });
	pgm.sql(`
		UPDATE mood_entries
		SET
			mood_emoji = LEFT(mood_emoji, 10),
			note = LEFT(note, 500)
	`);
	pgm.alterColumn('mood_entries', 'mood_emoji', { type: 'varchar(10)' });
	pgm.alterColumn('mood_entries', 'note', { type: 'varchar(500)' });

	pgm.dropConstraint('sleep_entries', 'sleep_entries_quality_check');
	pgm.dropConstraint('sleep_entries', 'sleep_entries_interval_check');
	pgm.dropColumns('sleep_entries', [
		'sleep_start',
		'sleep_end',
		'sleep_quality',
	]);

	pgm.dropConstraint('water_entries', 'water_entries_amount_check');
	pgm.dropConstraint('water_entries', 'water_entries_user_date_unique');
	pgm.dropColumns('water_entries', ['water_date']);
};
