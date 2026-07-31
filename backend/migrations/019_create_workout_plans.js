exports.up = pgm => {
	pgm.createTable('workout_plans', {
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
		scheduled_at: {
			type: 'timestamptz',
			notNull: true,
		},
		reminder_minutes_before: {
			type: 'integer',
			notNull: true,
			default: 30,
		},
		status: {
			type: 'varchar(20)',
			notNull: true,
			default: 'scheduled',
		},
		completed_session_id: {
			type: 'integer',
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

	pgm.addConstraint(
		'workout_plans',
		'workout_plans_reminder_minutes_check',
		{
			check: 'reminder_minutes_before BETWEEN 0 AND 10080',
		},
	);
	pgm.addConstraint('workout_plans', 'workout_plans_status_check', {
		check: "status IN ('scheduled', 'completed', 'cancelled')",
	});
	pgm.createIndex(
		'workout_plans',
		['user_id', 'scheduled_at'],
		{ name: 'workout_plans_user_scheduled_at_idx' },
	);
	pgm.createIndex(
		'workout_plans',
		['status', 'scheduled_at'],
		{
			name: 'workout_plans_status_scheduled_at_idx',
			where: "status = 'scheduled'",
		},
	);
};

exports.down = pgm => {
	pgm.dropTable('workout_plans');
};
