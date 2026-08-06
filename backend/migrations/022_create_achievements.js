exports.up = pgm => {
	pgm.createTable('achievements', {
		id: 'id',
		code: { type: 'varchar(50)', notNull: true, unique: true },
		title: { type: 'varchar(100)', notNull: true },
		description: { type: 'text', notNull: true },
		reward_type: { type: 'varchar(20)', notNull: true },
		image_url: { type: 'text' },
		metric_type: { type: 'varchar(40)', notNull: true },
		exercise_id: {
			type: 'integer',
			notNull: true,
			references: 'exercises',
			onDelete: 'RESTRICT',
		},
		target_value: { type: 'integer', notNull: true },
		condition_text: { type: 'varchar(255)', notNull: true },
		sort_order: { type: 'integer', notNull: true },
		is_active: { type: 'boolean', notNull: true, default: true },
		created_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
		updated_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
	});

	pgm.addConstraint('achievements', 'achievements_code_check', {
		check: "code ~ '^[A-Z0-9_]+$'",
	});
	pgm.addConstraint('achievements', 'achievements_title_not_blank', {
		check: 'char_length(trim(title)) > 0',
	});
	pgm.addConstraint('achievements', 'achievements_description_not_blank', {
		check: 'char_length(trim(description)) > 0',
	});
	pgm.addConstraint('achievements', 'achievements_reward_type_check', {
		check: "reward_type IN ('badge', 'medal')",
	});
	pgm.addConstraint('achievements', 'achievements_metric_type_check', {
		check: "metric_type = 'exercise_repetitions'",
	});
	pgm.addConstraint('achievements', 'achievements_target_value_check', {
		check: 'target_value > 0',
	});
	pgm.addConstraint('achievements', 'achievements_condition_not_blank', {
		check: 'char_length(trim(condition_text)) > 0',
	});
	pgm.addConstraint('achievements', 'achievements_sort_order_check', {
		check: 'sort_order >= 0',
	});
	pgm.addConstraint(
		'achievements',
		'achievements_metric_exercise_target_unique',
		{ unique: ['metric_type', 'exercise_id', 'target_value'] },
	);
	pgm.createIndex('achievements', ['is_active', 'sort_order', 'id'], {
		name: 'achievements_active_sort_idx',
	});

	pgm.createTable('user_achievements', {
		user_id: {
			type: 'integer',
			notNull: true,
			references: 'users',
			onDelete: 'CASCADE',
		},
		achievement_id: {
			type: 'integer',
			notNull: true,
			references: 'achievements',
			onDelete: 'RESTRICT',
		},
		earned_at: { type: 'timestamptz', notNull: true },
	}, {
		constraints: {
			primaryKey: ['user_id', 'achievement_id'],
		},
	});
	pgm.createIndex('user_achievements', 'achievement_id', {
		name: 'user_achievements_achievement_idx',
	});

	pgm.sql(`
		INSERT INTO achievements (
			code,
			title,
			description,
			reward_type,
			image_url,
			metric_type,
			exercise_id,
			target_value,
			condition_text,
			sort_order
		)
		VALUES
			(
				'SQUATS_50',
				'50 приседаний',
				'Выполните суммарно 50 приседаний в завершённых тренировках.',
				'badge',
				NULL,
				'exercise_repetitions',
				7,
				50,
				'Выполнить 50 приседаний',
				1
			),
			(
				'SQUATS_100',
				'100 приседаний',
				'Выполните суммарно 100 приседаний в завершённых тренировках.',
				'badge',
				NULL,
				'exercise_repetitions',
				7,
				100,
				'Выполнить 100 приседаний',
				2
			),
			(
				'SQUATS_150',
				'150 приседаний',
				'Выполните суммарно 150 приседаний в завершённых тренировках.',
				'badge',
				NULL,
				'exercise_repetitions',
				7,
				150,
				'Выполнить 150 приседаний',
				3
			);
	`);

	pgm.sql(`
		WITH session_totals AS (
			SELECT
				ws.user_id,
				result.exercise_id,
				ws.id AS session_id,
				ws.finished_at,
				SUM(COALESCE(result.repetitions_completed, 0))::bigint
					AS session_value
			FROM workout_sessions ws
			JOIN workout_session_exercise_results result
				ON result.session_id = ws.id
			WHERE ws.status = 'completed'
			  AND ws.finished_at IS NOT NULL
			GROUP BY
				ws.user_id,
				result.exercise_id,
				ws.id,
				ws.finished_at
		),
		running_totals AS (
			SELECT
				user_id,
				exercise_id,
				session_id,
				finished_at,
				SUM(session_value) OVER (
					PARTITION BY user_id, exercise_id
					ORDER BY finished_at, session_id
					ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
				) AS cumulative_value
			FROM session_totals
		),
		reached_achievements AS (
			SELECT
				running.user_id,
				achievement.id AS achievement_id,
				MIN(running.finished_at) AS earned_at
			FROM running_totals running
			JOIN achievements achievement
				ON achievement.metric_type = 'exercise_repetitions'
				AND achievement.exercise_id = running.exercise_id
				AND running.cumulative_value >= achievement.target_value
			WHERE achievement.is_active = TRUE
			GROUP BY running.user_id, achievement.id
		)
		INSERT INTO user_achievements (user_id, achievement_id, earned_at)
		SELECT user_id, achievement_id, earned_at
		FROM reached_achievements
		ON CONFLICT (user_id, achievement_id) DO NOTHING;
	`);
};

exports.down = pgm => {
	pgm.dropTable('user_achievements');
	pgm.dropTable('achievements');
};
