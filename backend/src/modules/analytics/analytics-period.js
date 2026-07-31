const PERIODS = new Set(['week', 'month', 'year']);

function parseDate(date) {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date) {
	return date.toISOString().slice(0, 10);
}

function calculatePeriodRange(period, endDate) {
	const end = parseDate(endDate);
	const from = new Date(end);

	if (period === 'week') {
		const daysSinceMonday = (end.getUTCDay() + 6) % 7;
		from.setUTCDate(end.getUTCDate() - daysSinceMonday);
	} else if (period === 'month') {
		from.setUTCDate(1);
	} else if (period === 'year') {
		from.setUTCMonth(0, 1);
	} else {
		throw new TypeError(`Unsupported analytics period: ${period}`);
	}

	return {
		period,
		from: formatDate(from),
		to: endDate,
	};
}

module.exports = {
	PERIODS,
	calculatePeriodRange,
};
