exports.up = pgm => {
	pgm.createTable('goals', {
		id: {
			type: 'integer',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		user_id: {
			type: 'integer',
			notNull: true,
			references: 'users',
			onDelete: 'CASCADE',
		},
		goal_type: { type: 'varchar(50)', notNull: true },
		title: { type: 'varchar(255)' },
		target_value: { type: 'numeric(10,2)' },
		unit: { type: 'varchar(20)' },
		start_date: { type: 'date' },
		end_date: { type: 'date' },
		status: { type: 'varchar(30)', notNull: true, default: 'active' },
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

	pgm.createIndex('goals', 'user_id');
};

exports.down = pgm => pgm.dropTable('goals');
