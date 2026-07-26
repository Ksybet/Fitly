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

module.exports = { toWaterDayDto };
