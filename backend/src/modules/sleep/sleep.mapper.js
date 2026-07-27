function toSleepEntryDto(sleep) {
	if (!sleep) {
		return null;
	}

	return {
		id: Number(sleep.id),
		date: sleep.date instanceof Date
			? sleep.date.toISOString().slice(0, 10)
			: sleep.date,
		sleepStart: sleep.sleepStart instanceof Date
			? sleep.sleepStart.toISOString()
			: sleep.sleepStart,
		sleepEnd: sleep.sleepEnd instanceof Date
			? sleep.sleepEnd.toISOString()
			: sleep.sleepEnd,
		sleepQuality: Number(sleep.sleepQuality),
		durationMinutes: Number(sleep.durationMinutes),
		createdAt: sleep.createdAt instanceof Date
			? sleep.createdAt.toISOString()
			: sleep.createdAt,
		updatedAt: sleep.updatedAt instanceof Date
			? sleep.updatedAt.toISOString()
			: sleep.updatedAt,
	};
}

module.exports = { toSleepEntryDto };
