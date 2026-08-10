function toDateTimeString(value) {
	if (value instanceof Date) {
		return value.toISOString();
	}

	return value;
}

function toDiaryEntryDto(entry) {
	return {
		id: Number(entry.id),
		recordedAt: toDateTimeString(entry.recordedAt),
		date: entry.date,
		moodScore: Number(entry.moodScore),
		energyLevel: entry.energyLevel === null ? null : Number(entry.energyLevel),
		stressLevel: entry.stressLevel === null ? null : Number(entry.stressLevel),
		tags: entry.tags,
		symptoms: entry.symptoms,
		note: entry.note,
		inputMethod: entry.inputMethod,
		createdAt: toDateTimeString(entry.createdAt),
		updatedAt: toDateTimeString(entry.updatedAt),
	};
}

module.exports = { toDiaryEntryDto };
