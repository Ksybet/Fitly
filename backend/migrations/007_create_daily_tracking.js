exports.up = pgm => {
	pgm.createTable('daily_tracking', {
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
		tracking_date: { type: 'date', notNull: true },
		steps: { type: 'integer', default: 0 },
		calories: { type: 'integer', default: 0 },
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

	pgm.addConstraint('daily_tracking', 'daily_tracking_user_date_unique', {
		unique: ['user_id', 'tracking_date'],
	});
};

exports.down = pgm => pgm.dropTable('daily_tracking');
