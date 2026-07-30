const {
	sumNutritionValues,
	roundNutritionValue,
	roundNutritionValues,
} = require('./nutrition.calculator');

function toDateTimeString(value) {
	if (value instanceof Date) {
		return value.toISOString();
	}

	return value;
}

function nutritionValuesFromRow(row, prefix = '') {
	const field = name => prefix
		? `${prefix}${name[0].toUpperCase()}${name.slice(1)}`
		: name;

	return {
		calories: row[field('calories')],
		proteinG: row[field('proteinG')],
		fatG: row[field('fatG')],
		carbsG: row[field('carbsG')],
	};
}

function toNutritionValues(row, prefix = '') {
	return Object.fromEntries(
		Object.entries(nutritionValuesFromRow(row, prefix))
			.map(([key, value]) => [key, Number(value)]),
	);
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

function toMealItemDto(item) {
	return {
		id: Number(item.id),
		productId: item.productId === null || item.productId === undefined
			? null
			: Number(item.productId),
		name: item.name,
		amountG: Number(item.amountG),
		nutritionPer100g: toNutritionValues(item, 'per100g'),
		nutritionTotal: roundNutritionValues(
			nutritionValuesFromRow(item, 'total'),
		),
	};
}

function sumMealItemRows(items) {
	return sumNutritionValues(
		items.map(item => nutritionValuesFromRow(item, 'total')),
	);
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
		nutritionTotal: roundNutritionValues(sumMealItemRows(record.items)),
		createdAt: toDateTimeString(record.entry.createdAt),
		updatedAt: toDateTimeString(record.entry.updatedAt),
	};
}

function toNutritionDayDto(date, records) {
	const totals = sumNutritionValues(
		records.map(record => sumMealItemRows(record.items)),
	);

	return {
		date,
		meals: records.map(toMealEntryDto),
		totals: roundNutritionValues(totals),
	};
}

module.exports = {
	toFoodProductDto,
	toNutritionValues,
	nutritionValuesFromRow,
	toDateTimeString,
	toMealEntryDto,
	toNutritionDayDto,
	roundNutritionValue,
};
