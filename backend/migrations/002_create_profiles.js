exports.up = pgm => {
	pgm.createTable('profiles', {
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
		first_name: { type: 'varchar(100)' },
		birth_date: { type: 'date' },
		gender: { type: 'varchar(20)' },
		height_cm: { type: 'numeric(5,2)' },
		weight_kg: { type: 'numeric(5,2)' },
		updated_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
	});
};

exports.down = pgm => pgm.dropTable('profiles');
