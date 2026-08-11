exports.up = pgm => {
	pgm.addColumn('users', {
		last_login_at: {
			type: 'timestamptz',
		},
	});

	pgm.createTable('user_activity_daily', {
		user_id: {
			type: 'integer',
			notNull: true,
			references: 'users',
			onDelete: 'CASCADE',
		},
		activity_date: {
			type: 'date',
			notNull: true,
		},
		last_activity_at: {
			type: 'timestamptz',
			notNull: true,
		},
	}, {
		constraints: {
			primaryKey: ['user_id', 'activity_date'],
		},
	});

	pgm.createIndex(
		'user_activity_daily',
		['activity_date', 'user_id'],
		{ name: 'user_activity_daily_date_user_idx' },
	);
	pgm.createIndex('users', ['role', 'created_at'], {
		name: 'users_role_created_at_idx',
	});
};

exports.down = pgm => {
	pgm.dropIndex('users', ['role', 'created_at'], {
		name: 'users_role_created_at_idx',
	});
	pgm.dropTable('user_activity_daily');
	pgm.dropColumn('users', 'last_login_at');
};
