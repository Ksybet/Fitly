const { pool } = require('../../config/db');

const logColumns = `
	id,
	occurred_at AS timestamp,
	level,
	service,
	user_id AS "userId",
	message,
	stack_trace AS "stackTrace",
	request_id AS "requestId",
	metadata
`;

function buildFilters(filters) {
	const conditions = [];
	const values = [];

	function addCondition(value, sql) {
		values.push(value);
		conditions.push(sql.replace('?', `$${values.length}`));
	}

	if (filters.level) addCondition(filters.level, 'level = ?');
	if (filters.service) addCondition(filters.service, 'service = ?');
	if (filters.userId) addCondition(filters.userId, 'user_id = ?');
	if (filters.from) addCondition(filters.from, 'occurred_at >= ?');
	if (filters.to) addCondition(filters.to, 'occurred_at <= ?');
	if (filters.query) {
		values.push(`%${filters.query}%`);
		const parameter = `$${values.length}`;
		conditions.push(`(
			message ILIKE ${parameter}
			OR stack_trace ILIKE ${parameter}
			OR request_id ILIKE ${parameter}
		)`);
	}

	return { conditions, values };
}

async function listLogs(filters) {
	const { conditions, values } = buildFilters(filters);
	const where = conditions.length > 0
		? `WHERE ${conditions.join('\n\t\t AND ')}`
		: '';
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM system_logs
		 ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const logsResult = await pool.query(
		`SELECT ${logColumns}
		 FROM system_logs
		 ${where}
		 ORDER BY occurred_at DESC, id DESC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);

	return {
		items: logsResult.rows,
		total: countResult.rows[0].total,
	};
}

module.exports = {
	buildFilters,
	listLogs,
};
