function toWaterDayDto(water) {
	const amountMl = Number(water.amountMl);
	const goalMl = Number(water.goalMl);

	return {
		date: water.date instanceof Date
			? water.date.toISOString().slice(0, 10)
			: water.date,
		amountMl,
		goalMl,
		progressPercent: goalMl === 0
			? 0
			: Number(((amountMl / goalMl) * 100).toFixed(2)),
	};
}

function toWaterEntryDto(entry) {
	return {
		id: Number(entry.id),
		amountMl: Number(entry.amountMl),
		consumedAt: entry.consumedAt instanceof Date
			? entry.consumedAt.toISOString()
			: entry.consumedAt,
		date: entry.date instanceof Date
			? entry.date.toISOString().slice(0, 10)
			: entry.date,
		createdAt: entry.createdAt instanceof Date
			? entry.createdAt.toISOString()
			: entry.createdAt,
	};
}

module.exports = { toWaterDayDto, toWaterEntryDto };
