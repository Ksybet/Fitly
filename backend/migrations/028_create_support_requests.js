exports.up = pgm => {
	pgm.createTable('support_requests', {
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
		subject: { type: 'varchar(200)', notNull: true },
		category: { type: 'varchar(20)', notNull: true, default: 'question' },
		status: { type: 'varchar(20)', notNull: true, default: 'created' },
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
		resolved_at: { type: 'timestamptz' },
		closed_at: { type: 'timestamptz' },
	});
	pgm.addConstraint('support_requests', 'support_requests_subject_check', {
		check: 'char_length(trim(subject)) BETWEEN 1 AND 200',
	});
	pgm.addConstraint('support_requests', 'support_requests_category_check', {
		check: "category IN ('question', 'problem', 'complaint', 'billing', 'other')",
	});
	pgm.addConstraint('support_requests', 'support_requests_status_check', {
		check: "status IN ('created', 'in_review', 'resolved', 'closed')",
	});
	pgm.addConstraint('support_requests', 'support_requests_timestamps_check', {
		check: `
			(status = 'resolved' AND resolved_at IS NOT NULL AND closed_at IS NULL)
			OR (status = 'closed' AND closed_at IS NOT NULL)
			OR (status IN ('created', 'in_review') AND resolved_at IS NULL AND closed_at IS NULL)
		`,
	});
	pgm.createIndex(
		'support_requests',
		[
			{ name: 'user_id' },
			{ name: 'created_at', sort: 'DESC' },
			{ name: 'id', sort: 'DESC' },
		],
		{ name: 'support_requests_user_created_idx' },
	);
	pgm.createIndex(
		'support_requests',
		[
			{ name: 'status' },
			{ name: 'updated_at', sort: 'DESC' },
			{ name: 'id', sort: 'DESC' },
		],
		{ name: 'support_requests_status_updated_idx' },
	);

	pgm.createTable('support_messages', {
		id: {
			type: 'bigint',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		support_request_id: {
			type: 'bigint',
			notNull: true,
			references: 'support_requests',
			onDelete: 'CASCADE',
		},
		author_user_id: {
			type: 'integer',
			references: 'users',
			onDelete: 'SET NULL',
		},
		author_type: { type: 'varchar(10)', notNull: true },
		message: { type: 'text', notNull: true },
		created_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
	});
	pgm.addConstraint('support_messages', 'support_messages_author_type_check', {
		check: "author_type IN ('user', 'admin')",
	});
	pgm.addConstraint('support_messages', 'support_messages_message_check', {
		check: 'char_length(trim(message)) BETWEEN 1 AND 5000',
	});
	pgm.createIndex(
		'support_messages',
		['support_request_id', 'created_at', 'id'],
		{ name: 'support_messages_request_created_idx' },
	);
};

exports.down = pgm => {
	pgm.dropTable('support_messages');
	pgm.dropTable('support_requests');
};
