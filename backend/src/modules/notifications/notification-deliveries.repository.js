const { pool } = require('../../config/db');

async function createForNotification(
	queryable,
	notificationId,
	userId,
	availableAt,
) {
	const result = await queryable.query(
		`INSERT INTO notification_deliveries (
			notification_id,
			device_id,
			next_attempt_at
		 )
		 SELECT $1, device.id, $3
		 FROM push_devices device
		 WHERE device.user_id = $2
		 ON CONFLICT (notification_id, device_id) DO NOTHING
		 RETURNING id`,
		[notificationId, userId, availableAt],
	);

	return result.rows;
}

async function claimPending(
	now,
	limit,
	leaseSeconds,
	queryable = pool,
) {
	const result = await queryable.query(
		`WITH due AS (
			SELECT delivery.id
			FROM notification_deliveries delivery
			JOIN notifications notification
				ON notification.id = delivery.notification_id
			WHERE delivery.status = 'pending'
			  AND delivery.next_attempt_at <= $1
			  AND (
				delivery.locked_until IS NULL
				OR delivery.locked_until <= $1
			  )
			  AND notification.status NOT IN ('read', 'cancelled')
			ORDER BY delivery.next_attempt_at ASC, delivery.id ASC
			FOR UPDATE OF delivery SKIP LOCKED
			LIMIT $2
		 )
		 UPDATE notification_deliveries delivery
		 SET locked_until = $1 + ($3 * INTERVAL '1 second'),
		     updated_at = CURRENT_TIMESTAMP
		 FROM due, notifications notification, push_devices device
		 WHERE delivery.id = due.id
		   AND notification.id = delivery.notification_id
		   AND device.id = delivery.device_id
		 RETURNING
			delivery.id,
			delivery.device_id AS "deviceId",
			delivery.attempt_count AS "attemptCount",
			device.push_token AS "pushToken",
			notification.title,
			notification.body,
			notification.payload`,
		[now, limit, leaseSeconds],
	);

	return result.rows;
}

async function markTicketed(deliveryId, ticketId, attemptedAt, receiptAt) {
	await pool.query(
		`UPDATE notification_deliveries
		 SET status = 'ticketed',
		     attempt_count = attempt_count + 1,
		     provider_ticket_id = $2,
		     last_attempt_at = $3,
		     next_attempt_at = $4,
		     last_error_code = NULL,
		     last_error_message = NULL,
		     locked_until = NULL,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[deliveryId, ticketId, attemptedAt, receiptAt],
	);
}

async function markRetry(
	deliveryId,
	attemptCount,
	errorCode,
	errorMessage,
	nextAttemptAt,
	now,
) {
	const exhausted = attemptCount + 1 >= 5;
	await pool.query(
		`UPDATE notification_deliveries
		 SET status = $2,
		     attempt_count = $3,
		     next_attempt_at = $4,
		     last_attempt_at = $5,
		     last_error_code = $6,
		     last_error_message = $7,
		     locked_until = NULL,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[
			deliveryId,
			exhausted ? 'failed' : 'pending',
			attemptCount + 1,
			nextAttemptAt,
			now,
			errorCode,
			errorMessage,
		],
	);
}

async function markFailed(deliveryId, errorCode, errorMessage, now) {
	await pool.query(
		`UPDATE notification_deliveries
		 SET status = 'failed',
		     attempt_count = LEAST(attempt_count + 1, 5),
		     last_attempt_at = $4,
		     last_error_code = $2,
		     last_error_message = $3,
		     locked_until = NULL,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[deliveryId, errorCode, errorMessage, now],
	);
}

async function claimReceipts(now, limit, leaseSeconds, queryable = pool) {
	const result = await queryable.query(
		`WITH due AS (
			SELECT id
			FROM notification_deliveries
			WHERE status = 'ticketed'
			  AND next_attempt_at <= $1
			  AND (locked_until IS NULL OR locked_until <= $1)
			ORDER BY next_attempt_at ASC, id ASC
			FOR UPDATE SKIP LOCKED
			LIMIT $2
		 )
		 UPDATE notification_deliveries delivery
		 SET locked_until = $1 + ($3 * INTERVAL '1 second'),
		     updated_at = CURRENT_TIMESTAMP
		 FROM due
		 WHERE delivery.id = due.id
		 RETURNING
			delivery.id,
			delivery.device_id AS "deviceId",
			delivery.provider_ticket_id AS "ticketId",
			delivery.last_attempt_at AS "ticketedAt"`,
		[now, limit, leaseSeconds],
	);

	return result.rows;
}

async function deferReceipt(deliveryId, nextAttemptAt, now) {
	await pool.query(
		`UPDATE notification_deliveries
		 SET next_attempt_at = $2,
		     receipt_checked_at = $3,
		     locked_until = NULL,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[deliveryId, nextAttemptAt, now],
	);
}

async function markSent(deliveryId, now) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const delivery = await client.query(
			`UPDATE notification_deliveries
			 SET status = 'sent',
			     receipt_checked_at = $2,
			     last_error_code = NULL,
			     last_error_message = NULL,
			     locked_until = NULL,
			     updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1
			 RETURNING notification_id AS "notificationId"`,
			[deliveryId, now],
		);
		if (delivery.rows[0]) {
			await client.query(
				`UPDATE notifications
				 SET status = CASE WHEN status = 'read' THEN status ELSE 'sent' END,
				     sent_at = COALESCE(sent_at, $2),
				     updated_at = CURRENT_TIMESTAMP
				 WHERE id = $1
				   AND status <> 'cancelled'`,
				[delivery.rows[0].notificationId, now],
			);
		}
		await client.query('COMMIT');
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function deleteDevice(deviceId) {
	await pool.query('DELETE FROM push_devices WHERE id = $1', [deviceId]);
}

module.exports = {
	createForNotification,
	claimPending,
	markTicketed,
	markRetry,
	markFailed,
	claimReceipts,
	deferReceipt,
	markSent,
	deleteDevice,
};
