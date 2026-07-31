const { toWorkoutSummaryDto } = require('../workouts/workouts.mapper');
const {
	calculateElapsedSeconds,
} = require('./workout-session-time');

function toDateTimeString(value) {
	if (value instanceof Date) {
		return value.toISOString();
	}

	return value;
}

function toWorkoutSessionExerciseResultDto(result) {
	const dto = {
		exerciseId: Number(result.exerciseId),
		completed: result.completed,
	};

	for (const field of [
		'setsCompleted',
		'repetitionsCompleted',
		'durationSeconds',
	]) {
		if (result[field] !== null && result[field] !== undefined) {
			dto[field] = Number(result[field]);
		}
	}

	return dto;
}

function toWorkoutSessionDto(record, currentTime) {
	return {
		id: Number(record.id),
		workoutId: Number(record.workoutId),
		workoutPlanId:
			record.workoutPlanId === null
				|| record.workoutPlanId === undefined
				? null
				: Number(record.workoutPlanId),
		workout: toWorkoutSummaryDto({
			id: record.workoutId,
			title: record.workoutTitle,
			description: record.workoutDescription,
			type: record.workoutType,
			bodyArea: record.workoutBodyArea,
			intensity: record.workoutIntensity,
			durationMinutes: record.workoutDurationMinutes,
			estimatedCalories: record.workoutEstimatedCalories,
			imageUrl: record.workoutImageUrl,
			isActive: record.workoutIsActive,
		}),
		status: record.status,
		startedAt: toDateTimeString(record.startedAt),
		pausedAt: record.pausedAt
			? toDateTimeString(record.pausedAt)
			: null,
		finishedAt: record.finishedAt
			? toDateTimeString(record.finishedAt)
			: null,
		elapsedSeconds: calculateElapsedSeconds(record, currentTime),
		caloriesBurned:
			record.caloriesBurned === null
				|| record.caloriesBurned === undefined
				? null
				: Number(record.caloriesBurned),
		exerciseResults: (record.exerciseResults || [])
			.map(toWorkoutSessionExerciseResultDto),
		createdAt: toDateTimeString(record.createdAt),
		updatedAt: toDateTimeString(record.updatedAt),
	};
}

module.exports = {
	toWorkoutSessionExerciseResultDto,
	toWorkoutSessionDto,
};
