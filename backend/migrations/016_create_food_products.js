exports.up = pgm => {
	pgm.createTable('food_products', {
		id: {
			type: 'integer',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		owner_user_id: {
			type: 'integer',
			references: 'users',
			onDelete: 'CASCADE',
		},
		name: {
			type: 'varchar(200)',
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
		is_active: {
			type: 'boolean',
			notNull: true,
			default: true,
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

	pgm.addConstraint('food_products', 'food_products_name_not_blank', {
		check: 'char_length(btrim(name)) > 0',
	});
	pgm.addConstraint('food_products', 'food_products_nutrition_non_negative', {
		check: `
			calories_per_100g >= 0
			AND protein_g_per_100g >= 0
			AND fat_g_per_100g >= 0
			AND carbs_g_per_100g >= 0
		`,
	});
	pgm.createIndex(
		'food_products',
		['owner_user_id', 'is_active', 'name', 'id'],
	);
};

exports.down = pgm => pgm.dropTable('food_products');
