exports.up = pgm => {
	pgm.createTable('meal_entries', {
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
		meal_type: {
			type: 'varchar(20)',
			notNull: true,
		},
		eaten_at: {
			type: 'timestamptz',
			notNull: true,
		},
		title: {
			type: 'varchar(200)',
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

	pgm.addConstraint('meal_entries', 'meal_entries_type_check', {
		check: "meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')",
	});
	pgm.createIndex('meal_entries', ['user_id', 'eaten_at', 'id']);

	pgm.createTable('meal_items', {
		id: {
			type: 'integer',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		meal_entry_id: {
			type: 'integer',
			notNull: true,
			references: 'meal_entries',
			onDelete: 'CASCADE',
		},
		product_id: {
			type: 'integer',
			references: 'food_products',
			onDelete: 'SET NULL',
		},
		name: {
			type: 'varchar(200)',
			notNull: true,
		},
		amount_g: {
			type: 'numeric',
			notNull: true,
		},
		calories_per_100g: {
			type: 'numeric',
			notNull: true,
		},
		protein_g_per_100g: {
			type: 'numeric',
			notNull: true,
		},
		fat_g_per_100g: {
			type: 'numeric',
			notNull: true,
		},
		carbs_g_per_100g: {
			type: 'numeric',
			notNull: true,
		},
		total_calories: {
			type: 'numeric',
			notNull: true,
		},
		total_protein_g: {
			type: 'numeric',
			notNull: true,
		},
		total_fat_g: {
			type: 'numeric',
			notNull: true,
		},
		total_carbs_g: {
			type: 'numeric',
			notNull: true,
		},
	});

	pgm.addConstraint('meal_items', 'meal_items_name_not_blank', {
		check: 'char_length(btrim(name)) > 0',
	});
	pgm.addConstraint('meal_items', 'meal_items_amount_range', {
		check: 'amount_g >= 0.1 AND amount_g <= 10000',
	});
	pgm.addConstraint('meal_items', 'meal_items_nutrition_non_negative', {
		check: `
			calories_per_100g >= 0
			AND protein_g_per_100g >= 0
			AND fat_g_per_100g >= 0
			AND carbs_g_per_100g >= 0
			AND total_calories >= 0
			AND total_protein_g >= 0
			AND total_fat_g >= 0
			AND total_carbs_g >= 0
		`,
	});
	pgm.createIndex('meal_items', ['meal_entry_id', 'id']);
};

exports.down = pgm => {
	pgm.dropTable('meal_items');
	pgm.dropTable('meal_entries');
};
