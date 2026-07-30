const {
	calculateNutritionTotal,
	sumNutritionValues,
	roundNutritionValue,
} = require('../../src/modules/nutrition/nutrition.calculator');

const nutrition = {
	calories: 250,
	proteinG: 10,
	fatG: 5,
	carbsG: 40,
};

describe('nutrition decimal calculator', () => {
	test.each([
		[100, {
			calories: '250',
			proteinG: '10',
			fatG: '5',
			carbsG: '40',
		}],
		[50, {
			calories: '125',
			proteinG: '5',
			fatG: '2.5',
			carbsG: '20',
		}],
		[150, {
			calories: '375',
			proteinG: '15',
			fatG: '7.5',
			carbsG: '60',
		}],
		[12.34, {
			calories: '30.85',
			proteinG: '1.234',
			fatG: '0.617',
			carbsG: '4.936',
		}],
	])('calculates exact nutrition for %s grams', (amountG, expected) => {
		expect(calculateNutritionTotal(nutrition, amountG)).toEqual(expected);
	});

	test('supports zero nutrition values', () => {
		expect(calculateNutritionTotal({
			calories: 0,
			proteinG: 5,
			fatG: 0,
			carbsG: 0,
		}, 80)).toEqual({
			calories: '0',
			proteinG: '4',
			fatG: '0',
			carbsG: '0',
		});
	});

	test('sums exact values before rounding', () => {
		const values = Array.from({ length: 10 }, () => ({
			calories: '0.004',
			proteinG: '0.004',
			fatG: '0.004',
			carbsG: '0.004',
		}));

		expect(sumNutritionValues(values)).toEqual({
			calories: '0.04',
			proteinG: '0.04',
			fatG: '0.04',
			carbsG: '0.04',
		});
	});

	test.each([
		['1.004', 1],
		['1.005', 1.01],
		['1.006', 1.01],
		['0.1', 0.1],
	])('rounds %s to %s without binary artifacts', (value, expected) => {
		expect(roundNutritionValue(value)).toBe(expected);
	});

	test.each([0, -1, 0.09, 10000.01, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects invalid amount %s',
		amountG => {
			expect(() => calculateNutritionTotal(nutrition, amountG))
				.toThrow(RangeError);
		},
	);
});
