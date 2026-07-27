function toDateString(value) {
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}

	return value;
}

function toDateTimeString(value) {
	if (value instanceof Date) {
		return value.toISOString();
	}

	return value;
}

function toGoalDto(goal) {
	const dto = {
		id: Number(goal.id),
		goalType: goal.goalType,
		title: goal.title,
		targetValue: Number(goal.targetValue),
		unit: goal.unit,
		status: goal.status,
		currentValue: goal.currentValue === null || goal.currentValue === undefined
			? null
			: Number(goal.currentValue),
		progressPercent: Number(goal.progressPercent),
		createdAt: toDateTimeString(goal.createdAt),
		completedAt: goal.completedAt === null || goal.completedAt === undefined
			? null
			: toDateTimeString(goal.completedAt),
	};

	if (goal.startsOn !== null && goal.startsOn !== undefined) {
		dto.startsOn = toDateString(goal.startsOn);
	}

	dto.endsOn = goal.endsOn === null || goal.endsOn === undefined
		? null
		: toDateString(goal.endsOn);

	return dto;
}

module.exports = { toGoalDto };
