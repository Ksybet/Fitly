const Decimal = require('decimal.js');
const analyticsRepository = require('./analytics.repository');
const { calculatePeriodRange } = require('./analytics-period');
const {
	getDateInTimeZone,
	getUserTimezone,
} = require('../settings/user-local-date.service');
const { ensureValidUserId } = require('../../utils/validation');

async function getActivityAnalytics(userId, query) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const endDate = query.endDate || getDateInTimeZone(timezone);
	const range = calculatePeriodRange(query.period, endDate);
	const rows = await analyticsRepository.getDailyActivity(
		normalizedUserId,
		range,
		timezone,
	);

	let workoutCount = 0;
	let elapsedSeconds = 0;
	let caloriesBurned = new Decimal(0);
	let totalSteps = 0;
	const points = rows.map(row => {
		const dailyElapsedSeconds = Number(row.elapsedSeconds);
		workoutCount += Number(row.workoutCount);
		elapsedSeconds += dailyElapsedSeconds;
		caloriesBurned = caloriesBurned.plus(row.caloriesBurned);
		totalSteps += Number(row.steps);

		return {
			date: row.date,
			value: Number(row.steps),
			secondaryValue: Math.floor(dailyElapsedSeconds / 60),
		};
	});

	return {
		range,
		workouts: {
			workoutCount,
			totalMinutes: Math.floor(elapsedSeconds / 60),
			caloriesBurned: caloriesBurned.toNumber(),
		},
		totalSteps,
		points,
	};
}

module.exports = {
	getActivityAnalytics,
};
