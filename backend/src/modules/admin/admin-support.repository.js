const { pool } = require('../../config/db');
const {
	requestColumns,
	messageColumns,
} = require('../support/support.repository');

async function listRequests(filters) {
	const values = [];
	const conditions = [];
	if (filters.status !== undefined) {
		values.push(filters.status);
		conditions.push(`status = $${values.length}`);
	}
	if (filters.query !== undefined) {
		values.push(`%${filters.query}%`);
		conditions.push(`subject ILIKE $${values.length}`);
	}
	const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total FROM support_requests ${where}`,
		values,
	);
	const pageValues = [
		...values,
		filters.pageSize,
		(filters.page - 1) * filters.pageSize,
	];
	const result = await pool.query(
		`SELECT ${requestColumns}
		 FROM support_requests
		 ${where}
		 ORDER BY updated_at DESC, id DESC
		 LIMIT $${values.length + 1}
		 OFFSET $${values.length + 2}`,
		pageValues,
	);
	return { items: result.rows, total: countResult.rows[0].total };
}

async function getRequest(requestId) {
	const requestResult = await pool.query(
		`SELECT ${requestColumns} FROM support_requests WHERE id = $1`,
		[requestId],
	);
	if (!requestResult.rows[0]) return null;
	const messagesResult = await pool.query(
		`SELECT ${messageColumns}
		 FROM support_messages
		 WHERE support_request_id = $1
		 ORDER BY created_at ASC, id ASC`,
		[requestId],
	);
	return { ...requestResult.rows[0], messages: messagesResult.rows };
}

async function getStatus(requestId) {
	const result = await pool.query(
		'SELECT status FROM support_requests WHERE id = $1',
		[requestId],
	);
	return result.rows[0]?.status ?? null;
}

async function updateStatus(requestId, expectedStatus, nextStatus) {
	const result = await pool.query(
		`UPDATE support_requests
		 SET status = $2::varchar,
		     resolved_at = CASE WHEN $2::varchar = 'resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,
		     closed_at = CASE WHEN $2::varchar = 'closed' THEN CURRENT_TIMESTAMP ELSE NULL END,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND status = $3::varchar
		 RETURNING ${requestColumns}`,
		[requestId, nextStatus, expectedStatus],
	);
	return result.rows[0] ?? null;
}

async function addMessage(adminUserId, requestId, message) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const locked = await client.query(
			'SELECT status FROM support_requests WHERE id = $1 FOR UPDATE',
			[requestId],
		);
		if (!locked.rows[0]) {
			await client.query('COMMIT');
			return { outcome: 'not_found' };
		}
		if (locked.rows[0].status === 'closed') {
			await client.query('COMMIT');
			return { outcome: 'closed' };
		}
		const result = await client.query(
			`INSERT INTO support_messages (
				support_request_id, author_user_id, author_type, message
			 ) VALUES ($1, $2, 'admin', $3)
			 RETURNING ${messageColumns}`,
			[requestId, adminUserId, message],
		);
		await client.query(
			'UPDATE support_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
			[requestId],
		);
		await client.query('COMMIT');
		return { outcome: 'created', message: result.rows[0] };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

module.exports = { listRequests, getRequest, getStatus, updateStatus, addMessage };
