const { toWorkoutSummaryDto } = require('../workouts/workouts.mapper');

function toDateTimeString(value) {
	if (value instanceof Date) {
		return value.toISOString();
	}

	return value;
}

function toWorkoutPlanDto(record) {
	return {
		id: Number(record.id),
		workoutId: Number(record.workoutId),
		scheduledAt: toDateTimeString(record.scheduledAt),
		reminderMinutesBefore: Number(record.reminderMinutesBefore),
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
		completedSessionId:
			record.completedSessionId === null
				|| record.completedSessionId === undefined
				? null
				: Number(record.completedSessionId),
		createdAt: toDateTimeString(record.createdAt),
		updatedAt: toDateTimeString(record.updatedAt),
	};
}

module.exports = {
	toWorkoutPlanDto,
};
