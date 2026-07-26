const GOAL_TYPES = [
	'weight_loss',
	'weight_gain',
	'maintain_shape',
	'steps',
	'water',
	'custom',
];
const GOAL_UNITS = [
	'kg',
	'steps',
	'ml',
	'workouts',
	'minutes',
	'repetitions',
	'custom',
];
const GOAL_STATUSES = [
	'created',
	'in_progress',
	'completed',
	'cancelled',
];

function quotedValues(values) {
	return values.map(value => `'${value}'`).join(', ');
}

exports.up = pgm => {
	pgm.addColumns('goals', {
		current_value: { type: 'numeric' },
		progress_percent: {
			type: 'numeric',
			notNull: true,
			default: 0,
		},
		completed_at: { type: 'timestamptz' },
	});

	pgm.sql(`
		UPDATE goals
		SET
			goal_type = CASE
				WHEN goal_type IN (${quotedValues(GOAL_TYPES)}) THEN goal_type
				ELSE 'custom'
			END,
			title = LEFT(
				CASE
					WHEN title IS NULL OR title = '' THEN 'Untitled goal'
					ELSE title
				END,
				100
			),
			target_value = GREATEST(COALESCE(target_value, 0), 0),
			unit = CASE
				WHEN unit IN (${quotedValues(GOAL_UNITS)}) THEN unit
				ELSE 'custom'
			END,
			status = CASE
				WHEN status = 'active' THEN 'in_progress'
				WHEN status IN (${quotedValues(GOAL_STATUSES)}) THEN status
				ELSE 'created'
			END
	`);

	pgm.alterColumn('goals', 'title', {
		type: 'varchar(100)',
		notNull: true,
	});
	pgm.alterColumn('goals', 'target_value', {
		type: 'numeric',
		notNull: true,
	});
	pgm.alterColumn('goals', 'unit', {
		type: 'varchar(20)',
		notNull: true,
	});
	pgm.alterColumn('goals', 'status', {
		default: 'created',
	});

	pgm.addConstraint('goals', 'goals_goal_type_check', {
		check: `goal_type IN (${quotedValues(GOAL_TYPES)})`,
	});
	pgm.addConstraint('goals', 'goals_title_check', {
		check: 'char_length(title) >= 1 AND char_length(title) <= 100',
	});
	pgm.addConstraint('goals', 'goals_target_value_check', {
		check: 'target_value >= 0',
	});
	pgm.addConstraint('goals', 'goals_unit_check', {
		check: `unit IN (${quotedValues(GOAL_UNITS)})`,
	});
	pgm.addConstraint('goals', 'goals_status_check', {
		check: `status IN (${quotedValues(GOAL_STATUSES)})`,
	});
	pgm.addConstraint('goals', 'goals_progress_percent_check', {
		check: 'progress_percent >= 0 AND progress_percent <= 100',
	});
};

exports.down = pgm => {
	pgm.dropConstraint('goals', 'goals_progress_percent_check');
	pgm.dropConstraint('goals', 'goals_status_check');
	pgm.dropConstraint('goals', 'goals_unit_check');
	pgm.dropConstraint('goals', 'goals_target_value_check');
	pgm.dropConstraint('goals', 'goals_title_check');
	pgm.dropConstraint('goals', 'goals_goal_type_check');

	pgm.sql(`
		UPDATE goals
		SET status = 'active'
		WHERE status IN ('created', 'in_progress')
	`);

	pgm.alterColumn('goals', 'status', { default: 'active' });
	pgm.alterColumn('goals', 'unit', { notNull: false });
	pgm.alterColumn('goals', 'target_value', { notNull: false });
	pgm.alterColumn('goals', 'title', {
		type: 'varchar(255)',
		notNull: false,
	});
	pgm.dropColumns('goals', [
		'current_value',
		'progress_percent',
		'completed_at',
	]);
};
