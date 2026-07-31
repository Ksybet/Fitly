exports.up = pgm => {
	pgm.createTable('workout_sessions', {
		id: {
			type: 'integer',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		user_id: {
			type: 'integer',
			notNull: true,
			references: 'users',
			onDelete: 'CASCADE',
		},
		workout_id: {
			type: 'integer',
			notNull: true,
			references: 'workouts',
			onDelete: 'RESTRICT',
		},
		workout_plan_id: {
			type: 'integer',
			references: 'workout_plans',
			onDelete: 'SET NULL',
		},
		status: {
			type: 'varchar(20)',
			notNull: true,
			default: 'in_progress',
		},
		started_at: {
			type: 'timestamptz',
			notNull: true,
		},
		paused_at: {
			type: 'timestamptz',
		},
		finished_at: {
			type: 'timestamptz',
		},
		accumulated_pause_seconds: {
			type: 'integer',
			notNull: true,
			default: 0,
		},
		elapsed_seconds: {
			type: 'integer',
		},
		calories_burned: {
			type: 'numeric(10, 2)',
		},
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

	pgm.addConstraint('workout_sessions', 'workout_sessions_status_check', {
		check: "status IN ('in_progress', 'paused', 'completed', 'cancelled')",
	});
	pgm.addConstraint(
		'workout_sessions',
		'workout_sessions_pause_seconds_check',
		{ check: 'accumulated_pause_seconds >= 0' },
	);
	pgm.addConstraint(
		'workout_sessions',
		'workout_sessions_elapsed_seconds_check',
		{ check: 'elapsed_seconds IS NULL OR elapsed_seconds >= 0' },
	);
	pgm.addConstraint(
		'workout_sessions',
		'workout_sessions_calories_check',
		{
			check: `
				calories_burned IS NULL
				OR calories_burned BETWEEN 0 AND 5000
			`,
		},
	);
	pgm.addConstraint(
		'workout_sessions',
		'workout_sessions_state_check',
		{
			check: `
				(
					status = 'in_progress'
					AND paused_at IS NULL
					AND finished_at IS NULL
					AND elapsed_seconds IS NULL
				)
				OR (
					status = 'paused'
					AND paused_at IS NOT NULL
					AND finished_at IS NULL
					AND elapsed_seconds IS NULL
				)
				OR (
					status IN ('completed', 'cancelled')
					AND paused_at IS NULL
					AND finished_at IS NOT NULL
					AND elapsed_seconds IS NOT NULL
				)
			`,
		},
	);

	pgm.createIndex('workout_sessions', 'user_id', {
		name: 'workout_sessions_one_active_per_user_idx',
		unique: true,
		where: "status IN ('in_progress', 'paused')",
	});
	pgm.createIndex('workout_sessions', 'workout_plan_id', {
		name: 'workout_sessions_plan_active_or_completed_idx',
		unique: true,
		where: `
			workout_plan_id IS NOT NULL
			AND status IN ('in_progress', 'paused', 'completed')
		`,
	});
	pgm.createIndex(
		'workout_sessions',
		[
			{ name: 'user_id' },
			{ name: 'started_at', sort: 'DESC' },
			{ name: 'id', sort: 'DESC' },
		],
		{ name: 'workout_sessions_user_started_at_idx' },
	);
	pgm.createIndex('workout_sessions', 'workout_id', {
		name: 'workout_sessions_workout_id_idx',
	});

	pgm.createTable('workout_session_exercise_results', {
		id: {
			type: 'integer',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		session_id: {
			type: 'integer',
			notNull: true,
			references: 'workout_sessions',
			onDelete: 'CASCADE',
		},
		exercise_id: {
			type: 'integer',
			notNull: true,
			references: 'exercises',
			onDelete: 'RESTRICT',
		},
		completed: {
			type: 'boolean',
			notNull: true,
		},
		sets_completed: {
			type: 'integer',
		},
		repetitions_completed: {
			type: 'integer',
		},
		duration_seconds: {
			type: 'integer',
		},
	});

	pgm.addConstraint(
		'workout_session_exercise_results',
		'workout_session_exercise_results_session_exercise_unique',
		{ unique: ['session_id', 'exercise_id'] },
	);
	pgm.addConstraint(
		'workout_session_exercise_results',
		'workout_session_exercise_results_sets_check',
		{ check: 'sets_completed IS NULL OR sets_completed BETWEEN 0 AND 100' },
	);
	pgm.addConstraint(
		'workout_session_exercise_results',
		'workout_session_exercise_results_repetitions_check',
		{
			check: `
				repetitions_completed IS NULL
				OR repetitions_completed BETWEEN 0 AND 10000
			`,
		},
	);
	pgm.addConstraint(
		'workout_session_exercise_results',
		'workout_session_exercise_results_duration_check',
		{
			check: `
				duration_seconds IS NULL
				OR duration_seconds BETWEEN 0 AND 86400
			`,
		},
	);

	pgm.sql(`
		ALTER TABLE workout_plans
		ADD CONSTRAINT workout_plans_completed_session_fk
		FOREIGN KEY (completed_session_id)
		REFERENCES workout_sessions(id)
		ON DELETE SET NULL
	`);
	pgm.createIndex('workout_plans', 'completed_session_id', {
		name: 'workout_plans_completed_session_unique_idx',
		unique: true,
		where: 'completed_session_id IS NOT NULL',
	});
};

exports.down = pgm => {
	pgm.dropIndex('workout_plans', 'completed_session_id', {
		name: 'workout_plans_completed_session_unique_idx',
	});
	pgm.dropConstraint(
		'workout_plans',
		'workout_plans_completed_session_fk',
	);
	pgm.dropTable('workout_session_exercise_results');
	pgm.dropTable('workout_sessions');
};
