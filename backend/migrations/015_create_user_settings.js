exports.up = pgm => {
	pgm.createTable('user_settings', {
		user_id: {
			type: 'integer',
			primaryKey: true,
			references: 'users',
			onDelete: 'CASCADE',
		},
		theme: {
			type: 'varchar(10)',
			notNull: true,
			default: 'system',
		},
		language: {
			type: 'varchar(10)',
			notNull: true,
			default: 'ru',
		},
		timezone: {
			type: 'varchar(100)',
			notNull: true,
			default: 'UTC',
		},
		quick_action: {
			type: 'varchar(20)',
			notNull: true,
			default: 'water',
		},
		ai_enabled: {
			type: 'boolean',
			notNull: true,
			default: false,
		},
		notifications: {
			type: 'jsonb',
			notNull: true,
			default: pgm.func("'{}'::jsonb"),
		},
		updated_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
	});

	pgm.addConstraint('user_settings', 'user_settings_theme_check', {
		check: "theme IN ('light', 'dark', 'system')",
	});
	pgm.addConstraint('user_settings', 'user_settings_language_check', {
		check: 'char_length(language) BETWEEN 1 AND 10',
	});
	pgm.addConstraint('user_settings', 'user_settings_timezone_check', {
		check: 'char_length(timezone) BETWEEN 1 AND 100',
	});
	pgm.addConstraint('user_settings', 'user_settings_quick_action_check', {
		check: "quick_action IN ('water', 'nutrition', 'workout', 'mood', 'weight')",
	});
	pgm.addConstraint('user_settings', 'user_settings_notifications_check', {
		check: "jsonb_typeof(notifications) = 'object'",
	});

	pgm.sql(`
		INSERT INTO user_settings (user_id)
		SELECT id
		FROM users
		ON CONFLICT (user_id) DO NOTHING
	`);
};

exports.down = pgm => pgm.dropTable('user_settings');
