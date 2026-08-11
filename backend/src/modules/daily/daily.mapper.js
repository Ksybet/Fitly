function toDailyTrackingDto(daily) {
	return {
		date: daily.date instanceof Date
			? daily.date.toISOString().slice(0, 10)
			: daily.date,
		steps: Number(daily.steps),
		calories: Number(daily.calories),
	};
}

function toStepEntryDto(entry) {
	return {
		date: entry.date instanceof Date
			? entry.date.toISOString().slice(0, 10)
			: entry.date,
		steps: Number(entry.steps),
		updatedAt: entry.updatedAt instanceof Date
			? entry.updatedAt.toISOString()
			: entry.updatedAt,
	};
}

module.exports = { toDailyTrackingDto, toStepEntryDto };
