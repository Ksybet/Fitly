const {
	calculatePeriodRange,
} = require('../../src/modules/analytics/analytics-period');

describe('analytics period', () => {
	test.each([
		['week', '2026-07-31', '2026-07-27'],
		['week', '2026-08-02', '2026-07-27'],
		['month', '2026-07-15', '2026-07-01'],
		['year', '2026-07-15', '2026-01-01'],
	])('calculates %s period to date', (period, endDate, from) => {
		expect(calculatePeriodRange(period, endDate)).toEqual({
			period,
			from,
			to: endDate,
		});
	});
});
