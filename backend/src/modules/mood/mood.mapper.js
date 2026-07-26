function toDateTimeString(value) {
	return value instanceof Date ? value.toISOString() : value;
}

function toMoodEntryDto(mood) {
	if (!mood) {
		return null;
	}

	const dto = {
		id: Number(mood.id),
		date: mood.date instanceof Date
			? mood.date.toISOString().slice(0, 10)
			: mood.date,
		moodScore: Number(mood.moodScore),
		createdAt: toDateTimeString(mood.createdAt),
		updatedAt: toDateTimeString(mood.updatedAt),
	};

	for (const field of ['moodLabel', 'moodEmoji', 'note']) {
		if (mood[field] !== null && mood[field] !== undefined) {
			dto[field] = mood[field];
		}
	}

	return dto;
}

module.exports = { toMoodEntryDto };
