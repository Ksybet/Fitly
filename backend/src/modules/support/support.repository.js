const { pool } = require('../../config/db');

const requestColumns = `
	id,
	user_id AS "userId",
	subject,
	category,
	status,
	created_at AS "createdAt",
	updated_at AS "updatedAt",
	resolved_at AS "resolvedAt",
	closed_at AS "closedAt"
`;

const messageColumns = `
	id,
	author_user_id AS "authorId",
	author_type AS "authorType",
	message,
	created_at AS "createdAt"
`;

async function createRequest(userId, input) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const requestResult = await client.query(
			`INSERT INTO support_requests (user_id, subject, category)
			 VALUES ($1, $2, $3)
			 RETURNING ${requestColumns}`,
			[userId, input.subject, input.category],
		);
		const created = requestResult.rows[0];
		const messageResult = await client.query(
			`INSERT INTO support_messages (
				support_request_id, author_user_id, author_type, message
			 ) VALUES ($1, $2, 'user', $3)
			 RETURNING ${messageColumns}`,
			[created.id, userId, input.message],
		);
		await client.query('COMMIT');
		return { ...created, messages: [messageResult.rows[0]] };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function listRequests(userId, filters) {
	const values = [userId];
	const conditions = ['user_id = $1'];
	if (filters.status !== undefined) {
		values.push(filters.status);
		conditions.push(`status = $${values.length}`);
	}
	const where = conditions.join(' AND ');
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM support_requests
		 WHERE ${where}`,
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
		 WHERE ${where}
		 ORDER BY created_at DESC, id DESC
		 LIMIT $${values.length + 1}
		 OFFSET $${values.length + 2}`,
		pageValues,
	);
	return { items: result.rows, total: countResult.rows[0].total };
}

async function getRequest(userId, requestId) {
	const requestResult = await pool.query(
		`SELECT ${requestColumns}
		 FROM support_requests
		 WHERE id = $1 AND user_id = $2`,
		[requestId, userId],
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

async function addMessage(userId, requestId, message) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const locked = await client.query(
			`SELECT status FROM support_requests
			 WHERE id = $1 AND user_id = $2
			 FOR UPDATE`,
			[requestId, userId],
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
			 ) VALUES ($1, $2, 'user', $3)
			 RETURNING ${messageColumns}`,
			[requestId, userId, message],
		);
		await client.query(
			`UPDATE support_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
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

async function closeRequest(userId, requestId) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const locked = await client.query(
			`SELECT status FROM support_requests
			 WHERE id = $1 AND user_id = $2
			 FOR UPDATE`,
			[requestId, userId],
		);
		if (!locked.rows[0]) {
			await client.query('COMMIT');
			return 'not_found';
		}
		if (locked.rows[0].status === 'closed') {
			await client.query('COMMIT');
			return 'closed';
		}
		await client.query(
			`UPDATE support_requests
			 SET status = 'closed', closed_at = CURRENT_TIMESTAMP,
			     updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[requestId],
		);
		await client.query('COMMIT');
		return 'closed_now';
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

module.exports = {
	requestColumns,
	messageColumns,
	createRequest,
	listRequests,
	getRequest,
	addMessage,
	closeRequest,
};
