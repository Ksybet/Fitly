const { pool } = require('../../config/db');

async function createLog(entry) {
	const result = await pool.query(
		`INSERT INTO system_logs (
			occurred_at,
			level,
			service,
			user_id,
			message,
			stack_trace,
			request_id,
			metadata
		 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
		 RETURNING id`,
		[
			entry.timestamp,
			entry.level,
			entry.service,
			entry.userId,
			entry.message,
			entry.stackTrace,
			entry.requestId,
			JSON.stringify(entry.metadata),
		],
	);

	return Number(result.rows[0].id);
}

async function deleteLogsBefore(cutoff) {
	const result = await pool.query(
		'DELETE FROM system_logs WHERE occurred_at < $1',
		[cutoff],
	);

	return result.rowCount;
}

module.exports = {
	createLog,
	deleteLogsBefore,
};
