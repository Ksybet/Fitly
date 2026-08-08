const Decimal = require('decimal.js');
const analyticsRepository = require('./analytics.repository');
const { calculatePeriodRange } = require('./analytics-period');
const {
	roundNutritionValues,
} = require('../nutrition/nutrition.calculator');
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
		.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
		.toNumber();
}

function buildWeightMetrics(rows, latestWeight, heightCm) {
	const currentWeightKg = latestWeight === null ? null : Number(latestWeight);
	const changeKg = rows.length < 2
		? null
		: new Decimal(rows.at(-1).weightKg)
			.minus(rows[0].weightKg)
			.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
			.toNumber();

	return {
		currentWeightKg,
		changeKg,
		bmi: calculateBmi(currentWeightKg, heightCm),
	};
}

function buildActivityMetrics(rows) {
	let workoutCount = 0;
	let elapsedSeconds = 0;
	let caloriesBurned = new Decimal(0);
	let totalSteps = 0;

	for (const row of rows) {
		workoutCount += Number(row.workoutCount);
		elapsedSeconds += Number(row.elapsedSeconds);
		caloriesBurned = caloriesBurned.plus(row.caloriesBurned);
		totalSteps += Number(row.steps);
	}

	return {
		workouts: {
			workoutCount,
			totalMinutes: Math.floor(elapsedSeconds / 60),
			caloriesBurned: caloriesBurned.toNumber(),
		},
		totalSteps,
	};
}

function buildSleepMetrics(rows) {
	if (rows.length === 0) {
		return {
			averageDurationMinutes: null,
			averageQuality: null,
		};
	}

	let totalDurationMinutes = new Decimal(0);
	let totalQuality = new Decimal(0);
	for (const row of rows) {
		totalDurationMinutes = totalDurationMinutes.plus(row.durationMinutes);
		totalQuality = totalQuality.plus(row.quality);
	}

	return {
		averageDurationMinutes: totalDurationMinutes
			.dividedBy(rows.length)
			.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
			.toNumber(),
		averageQuality: totalQuality
			.dividedBy(rows.length)
			.toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
			.toNumber(),
	};
}

function countCalendarDays(range) {
	const from = Date.parse(`${range.from}T00:00:00.000Z`);
	const to = Date.parse(`${range.to}T00:00:00.000Z`);
	return Math.floor((to - from) / 86400000) + 1;
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
	const metrics = buildWeightMetrics(rows, latestWeight, heightCm);
	const points = rows.map(row => ({
		date: row.date,
		value: Number(row.weightKg),
	}));

	return {
		range,
		...metrics,
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
	const metrics = buildActivityMetrics(rows);
	const points = rows.map(row => {
		const dailyElapsedSeconds = Number(row.elapsedSeconds);

		return {
			date: row.date,
			steps: Number(row.steps),
			workoutMinutes: Math.floor(dailyElapsedSeconds / 60),
			caloriesBurned: new Decimal(row.caloriesBurned).toNumber(),
		};
	});

	return {
		range,
		...metrics,
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
	const metrics = buildSleepMetrics(rows);
	const points = rows.map(row => {
		const durationMinutes = new Decimal(row.durationMinutes);
		const quality = Number(row.quality);

		return {
			date: row.date,
			value: durationMinutes.toDecimalPlaces(0).toNumber(),
			secondaryValue: quality,
		};
	});

	return {
		range,
		...metrics,
		points,
	};
}

async function getAnalyticsSummary(userId, query) {
	const { normalizedUserId, timezone, range } = await resolveAnalyticsContext(
		userId,
		query,
	);
	const [
		weightRows,
		latestWeight,
		heightCm,
		activityRows,
		sleepRows,
		nutritionTotals,
		totalWater,
		averageMood,
	] = await Promise.all([
		analyticsRepository.getWeightEntries(normalizedUserId, range),
		analyticsRepository.getLatestWeight(normalizedUserId, range.to),
		analyticsRepository.getProfileHeight(normalizedUserId),
		analyticsRepository.getDailyActivity(
			normalizedUserId,
			range,
			timezone,
		),
		analyticsRepository.getSleepEntries(normalizedUserId, range),
		analyticsRepository.getNutritionTotals(
			normalizedUserId,
			range,
			timezone,
		),
		analyticsRepository.getTotalWater(normalizedUserId, range),
		analyticsRepository.getAverageMood(normalizedUserId, range),
	]);

	const weight = buildWeightMetrics(weightRows, latestWeight, heightCm);
	const activity = buildActivityMetrics(activityRows);
	const sleep = buildSleepMetrics(sleepRows);
	const totalWaterMl = Number(totalWater);
	const averageDailyWaterMl = new Decimal(totalWaterMl)
		.dividedBy(countCalendarDays(range))
		.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
		.toNumber();
	const averageMoodScore = averageMood === null
		? null
		: new Decimal(averageMood)
			.toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
			.toNumber();

	return {
		range,
		latestWeightKg: weight.currentWeightKg,
		weightChangeKg: weight.changeKg,
		bmi: weight.bmi,
		averageSleepMinutes: sleep.averageDurationMinutes,
		averageSleepQuality: sleep.averageQuality,
		totalWaterMl,
		averageDailyWaterMl,
		totalSteps: activity.totalSteps,
		nutrition: roundNutritionValues(nutritionTotals),
		workouts: activity.workouts,
		averageMoodScore,
	};
}

module.exports = {
	getAnalyticsSummary,
	getWeightAnalytics,
	getActivityAnalytics,
	getSleepAnalytics,
};
