exports.up = pgm => {
	pgm.createTable('water_entries', {
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
		amount_ml: { type: 'integer', notNull: true },
		recorded_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
		created_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
	});

	pgm.createIndex('water_entries', ['user_id', 'recorded_at']);
};

exports.down = pgm => pgm.dropTable('water_entries');
