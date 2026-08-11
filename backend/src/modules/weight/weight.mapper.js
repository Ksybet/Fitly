function toDateTime(value) {
	return value instanceof Date ? value.toISOString() : value;
}

function toWeightEntryDto(entry) {
	return {
		id: Number(entry.id),
		date: entry.date instanceof Date
			? entry.date.toISOString().slice(0, 10)
			: entry.date,
		weightKg: Number(entry.weightKg),
		createdAt: toDateTime(entry.createdAt),
		updatedAt: toDateTime(entry.updatedAt),
	};
}

module.exports = { toWeightEntryDto };
