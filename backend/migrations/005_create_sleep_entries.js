exports.up = pgm => {
	pgm.createTable('sleep_entries', {
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
		sleep_date: { type: 'date', notNull: true },
		started_at: { type: 'varchar(10)' },
		ended_at: { type: 'varchar(10)' },
		duration_hours: { type: 'integer' },
		duration_minutes: { type: 'integer' },
		quality: { type: 'varchar(50)' },
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

	pgm.addConstraint('sleep_entries', 'sleep_entries_user_date_unique', {
		unique: ['user_id', 'sleep_date'],
	});
};

exports.down = pgm => pgm.dropTable('sleep_entries');
