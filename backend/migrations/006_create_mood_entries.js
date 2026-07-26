exports.up = pgm => {
	pgm.createTable('mood_entries', {
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
		mood_date: { type: 'date', notNull: true },
		mood_score: { type: 'integer' },
		mood_label: { type: 'varchar(50)' },
		mood_emoji: { type: 'varchar(10)' },
		note: { type: 'varchar(500)' },
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

	pgm.addConstraint('mood_entries', 'mood_entries_user_date_unique', {
		unique: ['user_id', 'mood_date'],
	});
};

exports.down = pgm => pgm.dropTable('mood_entries');
