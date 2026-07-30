const Decimal = require('decimal.js');

const NutritionDecimal = Decimal.clone({
	precision: 40,
	rounding: Decimal.ROUND_HALF_UP,
});

const NUTRITION_KEYS = ['calories', 'proteinG', 'fatG', 'carbsG'];
const MIN_AMOUNT_G = new NutritionDecimal('0.1');
const MAX_AMOUNT_G = new NutritionDecimal('10000');

function toDecimal(value, field = 'value') {
	try {
		const decimal = new NutritionDecimal(value);

		if (!decimal.isFinite()) {
			throw new RangeError(`${field} must be finite`);
		}

		return decimal;
	} catch (error) {
		if (error instanceof RangeError) {
			throw error;
		}

		throw new RangeError(`${field} must be a decimal number`);
	}
}

function validateAmount(amountG) {
	const amount = toDecimal(amountG, 'amountG');

	if (amount.lt(MIN_AMOUNT_G) || amount.gt(MAX_AMOUNT_G)) {
		throw new RangeError('amountG must be between 0.1 and 10000');
	}

	return amount;
}

function calculateNutritionTotal(nutritionPer100g, amountG) {
	const amount = validateAmount(amountG);

	return Object.fromEntries(NUTRITION_KEYS.map(key => {
		const value = toDecimal(nutritionPer100g[key], key);

		if (value.isNegative()) {
			throw new RangeError(`${key} must be non-negative`);
		}

		return [key, value.times(amount).dividedBy(100).toString()];
	}));
}

function sumNutritionValues(values) {
	const totals = Object.fromEntries(
		NUTRITION_KEYS.map(key => [key, new NutritionDecimal(0)]),
	);

	for (const nutrition of values) {
		for (const key of NUTRITION_KEYS) {
			totals[key] = totals[key].plus(toDecimal(nutrition[key], key));
		}
	}

	return Object.fromEntries(
		NUTRITION_KEYS.map(key => [key, totals[key].toString()]),
	);
}

function roundNutritionValue(value) {
	const rounded = toDecimal(value)
		.toDecimalPlaces(2, NutritionDecimal.ROUND_HALF_UP)
		.toNumber();

	return Object.is(rounded, -0) ? 0 : rounded;
}

function roundNutritionValues(values) {
	return Object.fromEntries(
		NUTRITION_KEYS.map(key => [key, roundNutritionValue(values[key])]),
	);
}

function addAmounts(left, right) {
	return toDecimal(left, 'amountG').plus(toDecimal(right, 'amountG'));
}

function isAmountAboveMaximum(amount) {
	return toDecimal(amount, 'amountG').gt(MAX_AMOUNT_G);
}

module.exports = {
	NUTRITION_KEYS,
	calculateNutritionTotal,
	sumNutritionValues,
	roundNutritionValue,
	roundNutritionValues,
	addAmounts,
	isAmountAboveMaximum,
	validateAmount,
};
