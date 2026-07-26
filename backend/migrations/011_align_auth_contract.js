exports.up = pgm => {
	pgm.addColumns('users', {
		email_verified: {
			type: 'boolean',
			notNull: true,
			default: false,
		},
		app_version: {
			type: 'varchar(30)',
		},
	});

	pgm.sql(`
		CREATE UNIQUE INDEX users_email_lower_unique
		ON users (LOWER(email))
	`);

	pgm.createTable('auth_sessions', {
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
		refresh_token_hash: {
			type: 'char(64)',
			notNull: true,
			unique: true,
		},
		expires_at: {
			type: 'timestamptz',
			notNull: true,
		},
		revoked_at: {
			type: 'timestamptz',
		},
		created_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
	});

	pgm.createIndex('auth_sessions', 'user_id');
};

exports.down = pgm => {
	pgm.dropTable('auth_sessions');
	pgm.sql('DROP INDEX users_email_lower_unique');
	pgm.dropColumns('users', ['email_verified', 'app_version']);
};
