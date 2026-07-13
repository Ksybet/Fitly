exports.up = pgm => {
	pgm.createTable('favorites', {
		id: {
			type: 'integer',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		user_id: {
			type: 'integer',
			notNull: true,
			unique: true,
			references: 'users',
			onDelete: 'CASCADE',
		},
		water: { type: 'boolean', notNull: true, default: true },
		weight: { type: 'boolean', notNull: true, default: true },
		height: { type: 'boolean', notNull: true, default: true },
		bmi: { type: 'boolean', notNull: true, default: true },
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
};

exports.down = pgm => pgm.dropTable('favorites');
