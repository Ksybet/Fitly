function toDateTimeString(value) {
	if (value instanceof Date) {
		return value.toISOString();
	}

	return value;
}

function toWorkoutSummaryDto(workout) {
	return {
		id: Number(workout.id),
		title: workout.title,
		description: workout.description,
		type: workout.type,
		bodyArea: workout.bodyArea,
		intensity: workout.intensity,
		durationMinutes: Number(workout.durationMinutes),
		estimatedCalories: Number(workout.estimatedCalories),
		imageUrl: workout.imageUrl ?? null,
		isActive: workout.isActive,
	};
}

function toExerciseDto(exercise) {
	return {
		id: Number(exercise.id),
		title: exercise.title,
		description: exercise.description,
		type: exercise.type,
		bodyArea: exercise.bodyArea,
		intensity: exercise.intensity,
		instructions: exercise.instructions,
		media: exercise.media || [],
		isActive: exercise.isActive,
		createdAt: toDateTimeString(exercise.createdAt),
		updatedAt: toDateTimeString(exercise.updatedAt),
	};
}

function assignOptionalNumber(target, field, value) {
	if (value !== null && value !== undefined) {
		target[field] = Number(value);
	}
}

function toWorkoutExerciseDto(record) {
	const dto = {
		exerciseId: Number(record.exerciseId),
		order: Number(record.sortOrder),
		exercise: toExerciseDto(record),
	};

	assignOptionalNumber(dto, 'sets', record.sets);
	assignOptionalNumber(dto, 'repetitions', record.repetitions);
	assignOptionalNumber(dto, 'durationSeconds', record.durationSeconds);
	assignOptionalNumber(dto, 'restSeconds', record.restSeconds);
	return dto;
}

function toWorkoutDto(workout, exercises) {
	return {
		...toWorkoutSummaryDto(workout),
		exercises: exercises.map(toWorkoutExerciseDto),
		createdAt: toDateTimeString(workout.createdAt),
		updatedAt: toDateTimeString(workout.updatedAt),
	};
}

module.exports = {
	toDateTimeString,
	toWorkoutSummaryDto,
	toExerciseDto,
	toWorkoutExerciseDto,
	toWorkoutDto,
};
