exports.up = pgm => {
	pgm.createTable('admin_login_attempts', {
		id: {
			type: 'integer',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		user_id: {
			type: 'integer',
			references: 'users',
			onDelete: 'SET NULL',
		},
		email: { type: 'varchar(255)', notNull: true },
		succeeded: { type: 'boolean', notNull: true },
		failure_reason: { type: 'varchar(50)' },
		ip_address: { type: 'inet', notNull: true },
		device: { type: 'varchar(512)', notNull: true },
		app_version: { type: 'varchar(50)' },
		created_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
	});

	pgm.createIndex('admin_login_attempts', 'user_id');
	pgm.createIndex('admin_login_attempts', 'created_at');
};

exports.down = pgm => {
	pgm.dropTable('admin_login_attempts');
};
