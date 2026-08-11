const adminLogsRepository = require('./admin-logs.repository');

function toDateTimeString(value) {
	return value instanceof Date ? value.toISOString() : value;
}

function toLogEntryDto(log) {
	return {
		id: Number(log.id),
		timestamp: toDateTimeString(log.timestamp),
		level: log.level,
		service: log.service,
		userId: log.userId === null ? null : Number(log.userId),
		message: log.message,
		stackTrace: log.stackTrace ?? null,
		requestId: log.requestId ?? null,
		metadata: log.metadata || {},
	};
}

function paginationMeta(page, pageSize, total) {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

async function listLogs(filters) {
	const result = await adminLogsRepository.listLogs(filters);
	return {
		items: result.items.map(toLogEntryDto),
		meta: paginationMeta(filters.page, filters.pageSize, result.total),
	};
}

module.exports = {
	toLogEntryDto,
	listLogs,
};
