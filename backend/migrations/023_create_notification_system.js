exports.up = pgm => {
	pgm.createTable('push_devices', {
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
		platform: { type: 'varchar(10)', notNull: true },
		push_token: { type: 'varchar(4096)', notNull: true, unique: true },
		app_version: { type: 'varchar(30)' },
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
	pgm.addConstraint('push_devices', 'push_devices_platform_check', {
		check: "platform IN ('ios', 'android')",
	});
	pgm.addConstraint('push_devices', 'push_devices_token_not_blank', {
		check: 'char_length(trim(push_token)) >= 20',
	});
	pgm.createIndex('push_devices', ['user_id', 'id'], {
		name: 'push_devices_user_id_idx',
	});

	pgm.createTable('notifications', {
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
		type: { type: 'varchar(20)', notNull: true },
		title: { type: 'varchar(200)', notNull: true },
		body: { type: 'text', notNull: true },
		status: {
			type: 'varchar(20)',
			notNull: true,
			default: 'created',
		},
		scheduled_at: { type: 'timestamptz' },
		sent_at: { type: 'timestamptz' },
		read_at: { type: 'timestamptz' },
		payload: {
			type: 'jsonb',
			notNull: true,
			default: pgm.func("'{}'::jsonb"),
		},
		deduplication_key: {
			type: 'varchar(255)',
			notNull: true,
			unique: true,
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
	pgm.addConstraint('notifications', 'notifications_type_check', {
		check: "type IN ('water', 'sleep', 'workout', 'achievement', 'system', 'support')",
	});
	pgm.addConstraint('notifications', 'notifications_status_check', {
		check: "status IN ('created', 'scheduled', 'sent', 'read', 'cancelled')",
	});
	pgm.addConstraint('notifications', 'notifications_title_not_blank', {
		check: 'char_length(trim(title)) > 0',
	});
	pgm.addConstraint('notifications', 'notifications_body_not_blank', {
		check: 'char_length(trim(body)) BETWEEN 1 AND 2000',
	});
	pgm.addConstraint('notifications', 'notifications_payload_object_check', {
		check: "jsonb_typeof(payload) = 'object'",
	});
	pgm.createIndex(
		'notifications',
		[
			{ name: 'user_id' },
			{ name: 'created_at', sort: 'DESC' },
			{ name: 'id', sort: 'DESC' },
		],
		{ name: 'notifications_user_created_idx' },
	);
	pgm.createIndex('notifications', ['user_id', 'type', 'status'], {
		name: 'notifications_user_filters_idx',
	});
	pgm.createIndex('notifications', ['user_id', 'read_at'], {
		name: 'notifications_user_unread_idx',
		where: "read_at IS NULL AND status <> 'cancelled'",
	});

	pgm.createTable('notification_schedules', {
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
		type: { type: 'varchar(20)', notNull: true },
		workout_plan_id: {
			type: 'integer',
			references: 'workout_plans',
			onDelete: 'CASCADE',
		},
		source_key: { type: 'varchar(255)', notNull: true, unique: true },
		next_run_at: { type: 'timestamptz', notNull: true },
		status: {
			type: 'varchar(20)',
			notNull: true,
			default: 'active',
		},
		locked_until: { type: 'timestamptz' },
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
	pgm.addConstraint('notification_schedules', 'notification_schedules_type_check', {
		check: "type IN ('water', 'sleep', 'workout')",
	});
	pgm.addConstraint('notification_schedules', 'notification_schedules_status_check', {
		check: "status IN ('active', 'completed', 'cancelled')",
	});
	pgm.addConstraint('notification_schedules', 'notification_schedules_source_check', {
		check: `
			(type = 'workout' AND workout_plan_id IS NOT NULL)
			OR (type IN ('water', 'sleep') AND workout_plan_id IS NULL)
		`,
	});
	pgm.createIndex('notification_schedules', ['user_id', 'type'], {
		name: 'notification_schedules_recurring_unique_idx',
		unique: true,
		where: "type IN ('water', 'sleep') AND status = 'active'",
	});
	pgm.createIndex('notification_schedules', 'workout_plan_id', {
		name: 'notification_schedules_workout_unique_idx',
		unique: true,
		where: "type = 'workout' AND status = 'active'",
	});
	pgm.createIndex('notification_schedules', ['status', 'next_run_at'], {
		name: 'notification_schedules_due_idx',
		where: "status = 'active'",
	});

	pgm.createTable('notification_deliveries', {
		id: {
			type: 'bigint',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		notification_id: {
			type: 'bigint',
			notNull: true,
			references: 'notifications',
			onDelete: 'CASCADE',
		},
		device_id: {
			type: 'bigint',
			references: 'push_devices',
			onDelete: 'SET NULL',
		},
		status: {
			type: 'varchar(20)',
			notNull: true,
			default: 'pending',
		},
		attempt_count: { type: 'integer', notNull: true, default: 0 },
		next_attempt_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
		provider_ticket_id: { type: 'varchar(255)' },
		last_error_code: { type: 'varchar(100)' },
		last_error_message: { type: 'text' },
		last_attempt_at: { type: 'timestamptz' },
		receipt_checked_at: { type: 'timestamptz' },
		locked_until: { type: 'timestamptz' },
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
	pgm.addConstraint('notification_deliveries', 'notification_deliveries_status_check', {
		check: "status IN ('pending', 'ticketed', 'sent', 'failed')",
	});
	pgm.addConstraint('notification_deliveries', 'notification_deliveries_attempt_check', {
		check: 'attempt_count BETWEEN 0 AND 5',
	});
	pgm.addConstraint(
		'notification_deliveries',
		'notification_deliveries_notification_device_unique',
		{ unique: ['notification_id', 'device_id'] },
	);
	pgm.createIndex('notification_deliveries', 'provider_ticket_id', {
		name: 'notification_deliveries_ticket_unique_idx',
		unique: true,
		where: 'provider_ticket_id IS NOT NULL',
	});
	pgm.createIndex('notification_deliveries', ['status', 'next_attempt_at'], {
		name: 'notification_deliveries_due_idx',
		where: "status IN ('pending', 'ticketed')",
	});
};

exports.down = pgm => {
	pgm.dropTable('notification_deliveries');
	pgm.dropTable('notification_schedules');
	pgm.dropTable('notifications');
	pgm.dropTable('push_devices');
};
