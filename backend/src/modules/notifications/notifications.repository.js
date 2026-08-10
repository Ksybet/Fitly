const { pool } = require('../../config/db');

const notificationColumns = `
	id,
	type,
	title,
	body,
	status,
	scheduled_at AS "scheduledAt",
	sent_at AS "sentAt",
	read_at AS "readAt",
	payload,
	created_at AS "createdAt"
`;

async function listNotifications(userId, filters) {
	const values = [userId];
	const conditions = ['user_id = $1'];

	if (filters.status !== undefined) {
		values.push(filters.status);
		conditions.push(`status = $${values.length}`);
	}
	if (filters.type !== undefined) {
		values.push(filters.type);
		conditions.push(`type = $${values.length}`);
	}

	const where = conditions.join(' AND ');
	const count = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM notifications
		 WHERE ${where}`,
		values,
	);
	const offset = (filters.page - 1) * filters.pageSize;
	const pageValues = [...values, filters.pageSize, offset];
	const result = await pool.query(
		`SELECT ${notificationColumns}
		 FROM notifications
		 WHERE ${where}
		 ORDER BY created_at DESC, id DESC
		 LIMIT $${values.length + 1}
		 OFFSET $${values.length + 2}`,
		pageValues,
	);

	return {
		items: result.rows,
		total: count.rows[0].total,
	};
}

async function getUnreadCount(userId) {
	const result = await pool.query(
		`SELECT COUNT(*)::integer AS count
		 FROM notifications
		 WHERE user_id = $1
		   AND read_at IS NULL
		   AND status <> 'cancelled'`,
		[userId],
	);

	return result.rows[0].count;
}

async function markRead(userId, notificationId) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');
		const result = await client.query(
			`UPDATE notifications
			 SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
			     status = 'read',
			     updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1
			   AND user_id = $2
			 RETURNING id`,
			[notificationId, userId],
		);
		if (!result.rows[0]) {
			await client.query('COMMIT');
			return null;
		}

		await client.query(
			`DELETE FROM notification_deliveries
			 WHERE notification_id = $1
			   AND status = 'pending'`,
			[notificationId],
		);
		await client.query('COMMIT');
		return result.rows[0];
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function markAllRead(userId) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');
		const result = await client.query(
			`UPDATE notifications
			 SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
			     status = 'read',
			     updated_at = CURRENT_TIMESTAMP
			 WHERE user_id = $1
			   AND read_at IS NULL
			   AND status <> 'cancelled'
			 RETURNING id`,
			[userId],
		);
		if (result.rows.length > 0) {
			await client.query(
				`DELETE FROM notification_deliveries
				 WHERE notification_id = ANY($1::bigint[])
				   AND status = 'pending'`,
				[result.rows.map(row => row.id)],
			);
		}
		await client.query('COMMIT');
		return result.rowCount;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function createNotification(notification, queryable = pool) {
	const result = await queryable.query(
		`WITH inserted AS (
			INSERT INTO notifications (
				user_id,
				type,
				title,
				body,
				status,
				scheduled_at,
				payload,
				deduplication_key
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (deduplication_key) DO NOTHING
			RETURNING ${notificationColumns}, TRUE AS inserted
		 )
		 SELECT * FROM inserted
		 UNION ALL
		 SELECT ${notificationColumns}, FALSE AS inserted
		 FROM notifications
		 WHERE deduplication_key = $8
		   AND NOT EXISTS (SELECT 1 FROM inserted)
		 LIMIT 1`,
		[
			notification.userId,
			notification.type,
			notification.title,
			notification.body,
			notification.status ?? 'created',
			notification.scheduledAt ?? null,
			JSON.stringify(notification.payload ?? {}),
			notification.deduplicationKey,
		],
	);

	return result.rows[0];
}

module.exports = {
	notificationColumns,
	listNotifications,
	getUnreadCount,
	markRead,
	markAllRead,
	createNotification,
};
