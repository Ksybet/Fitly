exports.up = pgm => {
	pgm.sql(`
		INSERT INTO weight_entries (
			user_id,
			entry_date,
			weight_kg,
			created_at,
			updated_at
		)
		SELECT
			profile.user_id,
			(
				profile.updated_at AT TIME ZONE COALESCE(settings.timezone, 'UTC')
			)::date,
			profile.weight_kg,
			profile.updated_at,
			profile.updated_at
		FROM profiles profile
		LEFT JOIN user_settings settings
			ON settings.user_id = profile.user_id
		WHERE profile.weight_kg IS NOT NULL
		  AND NOT EXISTS (
			SELECT 1
			FROM weight_entries entry
			WHERE entry.user_id = profile.user_id
		  )
	`);

	pgm.dropConstraint('water_entries', 'water_entries_user_date_unique');
	pgm.dropConstraint('water_entries', 'water_entries_amount_check');
	pgm.sql('DELETE FROM water_entries WHERE amount_ml = 0');
	pgm.addConstraint('water_entries', 'water_entries_amount_check', {
		check: 'amount_ml BETWEEN 1 AND 20000',
	});
	pgm.createIndex('water_entries', ['user_id', 'water_date'], {
		name: 'water_entries_user_date_idx',
	});
};

exports.down = pgm => {
	pgm.dropIndex('water_entries', ['user_id', 'water_date'], {
		name: 'water_entries_user_date_idx',
	});
	pgm.dropConstraint('water_entries', 'water_entries_amount_check');
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
	pgm.addConstraint('water_entries', 'water_entries_amount_check', {
		check: 'amount_ml BETWEEN 0 AND 20000',
	});
	pgm.addConstraint('water_entries', 'water_entries_user_date_unique', {
		unique: ['user_id', 'water_date'],
	});
};
