const Decimal = require('decimal.js');
const analyticsRepository = require('./analytics.repository');
const { calculatePeriodRange } = require('./analytics-period');
const {
	getDateInTimeZone,
	getUserTimezone,
} = require('../settings/user-local-date.service');
const { ensureValidUserId } = require('../../utils/validation');

async function resolveAnalyticsContext(userId, query) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const endDate = query.endDate || getDateInTimeZone(timezone);
	const range = calculatePeriodRange(query.period, endDate);

	return { normalizedUserId, timezone, range };
}

function calculateBmi(weightKg, heightCm) {
	if (weightKg === null || heightCm === null) {
		return null;
	}

	const heightMeters = new Decimal(heightCm).dividedBy(100);
	return new Decimal(weightKg)
		.dividedBy(heightMeters.pow(2))
		.toDecimalPlaces(2)
		.toNumber();
}

async function getWeightAnalytics(userId, query) {
	const { normalizedUserId, range } = await resolveAnalyticsContext(
		userId,
		query,
	);
	const [rows, latestWeight, heightCm] = await Promise.all([
		analyticsRepository.getWeightEntries(normalizedUserId, range),
		analyticsRepository.getLatestWeight(normalizedUserId, range.to),
		analyticsRepository.getProfileHeight(normalizedUserId),
	]);
	const currentWeightKg = latestWeight === null ? null : Number(latestWeight);
	const points = rows.map(row => ({
		date: row.date,
		value: Number(row.weightKg),
	}));
	const changeKg = rows.length < 2
		? null
		: new Decimal(rows.at(-1).weightKg)
			.minus(rows[0].weightKg)
			.toDecimalPlaces(2)
			.toNumber();

	return {
		range,
		currentWeightKg,
		changeKg,
		bmi: calculateBmi(currentWeightKg, heightCm),
		points,
	};
}

async function getActivityAnalytics(userId, query) {
	const { normalizedUserId, timezone, range } = await resolveAnalyticsContext(
		userId,
		query,
	);
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
			steps: Number(row.steps),
			workoutMinutes: Math.floor(dailyElapsedSeconds / 60),
			caloriesBurned: new Decimal(row.caloriesBurned).toNumber(),
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

async function getSleepAnalytics(userId, query) {
	const { normalizedUserId, range } = await resolveAnalyticsContext(
		userId,
		query,
	);
	const rows = await analyticsRepository.getSleepEntries(
		normalizedUserId,
		range,
	);

	if (rows.length === 0) {
		return {
			range,
			averageDurationMinutes: null,
			averageQuality: null,
			points: [],
		};
	}

	let totalDurationMinutes = new Decimal(0);
	let totalQuality = new Decimal(0);
	const points = rows.map(row => {
		const durationMinutes = new Decimal(row.durationMinutes);
		const quality = Number(row.quality);
		totalDurationMinutes = totalDurationMinutes.plus(durationMinutes);
		totalQuality = totalQuality.plus(quality);

		return {
			date: row.date,
			value: durationMinutes.toDecimalPlaces(0).toNumber(),
			secondaryValue: quality,
		};
	});

	return {
		range,
		averageDurationMinutes: totalDurationMinutes
			.dividedBy(rows.length)
			.toDecimalPlaces(0)
			.toNumber(),
		averageQuality: totalQuality
			.dividedBy(rows.length)
			.toDecimalPlaces(1)
			.toNumber(),
		points,
	};
}

module.exports = {
	getWeightAnalytics,
	getActivityAnalytics,
	getSleepAnalytics,
};
