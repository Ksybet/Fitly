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

module.exports = {
	toFoodProductDto,
	toNutritionValues,
	toDateTimeString,
};
