function toDailyTrackingDto(daily) {
	return {
		date: daily.date instanceof Date
			? daily.date.toISOString().slice(0, 10)
			: daily.date,
		steps: Number(daily.steps),
		calories: Number(daily.calories),
	};
}

module.exports = { toDailyTrackingDto };
