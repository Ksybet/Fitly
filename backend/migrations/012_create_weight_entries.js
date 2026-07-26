exports.up = pgm => {
	pgm.createTable('weight_entries', {
		id: {
			type: 'bigint',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		user_id: {
			type: 'integer',
			notNull: true,
			references: 'users',
			onDelete: 'CASCADE',
		},
		entry_date: {
			type: 'date',
			notNull: true,
		},
		weight_kg: {
			type: 'numeric(5,2)',
			notNull: true,
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

	pgm.addConstraint('weight_entries', 'weight_entries_user_date_unique', {
		unique: ['user_id', 'entry_date'],
	});
	pgm.createIndex('weight_entries', ['user_id', 'entry_date']);
};

exports.down = pgm => pgm.dropTable('weight_entries');
