function toDateTimeString(value) {
	if (value instanceof Date) {
		return value.toISOString();
	}

	return value;
}

function toNutritionValues(row, prefix = '') {
	const field = name => prefix
		? `${prefix}${name[0].toUpperCase()}${name.slice(1)}`
		: name;

	return {
		calories: Number(row[field('calories')]),
		proteinG: Number(row[field('proteinG')]),
		fatG: Number(row[field('fatG')]),
		carbsG: Number(row[field('carbsG')]),
	};
}

function toFoodProductDto(product) {
	return {
		id: Number(product.id),
		name: product.name,
		nutritionPer100g: toNutritionValues(product),
		isActive: product.isActive,
		source: product.source,
		createdAt: toDateTimeString(product.createdAt),
		updatedAt: toDateTimeString(product.updatedAt),
	};
}

function roundNutritionValue(value) {
	return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function toMealItemDto(item) {
	return {
		id: Number(item.id),
		productId: item.productId === null || item.productId === undefined
			? null
			: Number(item.productId),
		name: item.name,
		amountG: Number(item.amountG),
		nutritionPer100g: toNutritionValues(item, 'per100g'),
		nutritionTotal: toNutritionValues(item, 'total'),
	};
}

function sumNutrition(items) {
	const total = {
		calories: 0,
		proteinG: 0,
		fatG: 0,
		carbsG: 0,
	};

	for (const item of items) {
		for (const key of Object.keys(total)) {
			total[key] = roundNutritionValue(
				total[key] + item.nutritionTotal[key],
			);
		}
	}

	return total;
}

function toMealEntryDto(record) {
	const items = record.items.map(toMealItemDto);

	return {
		id: Number(record.entry.id),
		mealType: record.entry.mealType,
		eatenAt: toDateTimeString(record.entry.eatenAt),
		date: record.entry.date,
		title: record.entry.title,
		items,
		nutritionTotal: sumNutrition(items),
		createdAt: toDateTimeString(record.entry.createdAt),
		updatedAt: toDateTimeString(record.entry.updatedAt),
	};
}

module.exports = {
	toFoodProductDto,
	toNutritionValues,
	toDateTimeString,
	toMealEntryDto,
	roundNutritionValue,
};
