exports.up = pgm => {
	pgm.createTable('users', {
		id: {
			type: 'integer',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		email: { type: 'varchar(255)', notNull: true, unique: true },
		password_hash: { type: 'varchar(255)', notNull: true },
		role: { type: 'varchar(50)', notNull: true, default: 'user' },
		is_active: { type: 'boolean', notNull: true, default: true },
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

exports.down = pgm => pgm.dropTable('users');
