exports.up = pgm => {
	pgm.createTable('system_logs', {
		id: {
			type: 'bigint',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		occurred_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
		level: { type: 'varchar(10)', notNull: true },
		service: { type: 'varchar(100)', notNull: true },
		user_id: { type: 'integer' },
		message: { type: 'text', notNull: true },
		stack_trace: { type: 'text' },
		request_id: { type: 'varchar(100)' },
		metadata: {
			type: 'jsonb',
			notNull: true,
			default: pgm.func("'{}'::jsonb"),
		},
	});

	pgm.addConstraint('system_logs', 'system_logs_level_check', {
		check: "level IN ('info', 'warning', 'error', 'critical')",
	});
	pgm.addConstraint('system_logs', 'system_logs_service_check', {
		check: 'char_length(trim(service)) BETWEEN 1 AND 100',
	});
	pgm.addConstraint('system_logs', 'system_logs_message_check', {
		check: 'char_length(trim(message)) BETWEEN 1 AND 2000',
	});

	pgm.createIndex(
		'system_logs',
		[
			{ name: 'occurred_at', sort: 'DESC' },
			{ name: 'id', sort: 'DESC' },
		],
		{ name: 'system_logs_occurred_idx' },
	);
	pgm.createIndex(
		'system_logs',
		[
			'level',
			{ name: 'occurred_at', sort: 'DESC' },
			{ name: 'id', sort: 'DESC' },
		],
		{ name: 'system_logs_level_occurred_idx' },
	);
	pgm.createIndex(
		'system_logs',
		[
			'service',
			{ name: 'occurred_at', sort: 'DESC' },
			{ name: 'id', sort: 'DESC' },
		],
		{ name: 'system_logs_service_occurred_idx' },
	);
	pgm.createIndex(
		'system_logs',
		[
			'user_id',
			{ name: 'occurred_at', sort: 'DESC' },
			{ name: 'id', sort: 'DESC' },
		],
		{ name: 'system_logs_user_occurred_idx' },
	);
};

exports.down = pgm => {
	pgm.dropTable('system_logs');
};
