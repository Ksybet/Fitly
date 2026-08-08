const { pool } = require('../../config/db');

const deviceColumns = `
	id,
	platform,
	push_token AS "pushToken",
	app_version AS "appVersion",
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function upsertDevice(userId, device) {
	const result = await pool.query(
		`INSERT INTO push_devices (
			user_id,
			platform,
			push_token,
			app_version
		 ) VALUES ($1, $2, $3, $4)
		 ON CONFLICT (push_token) DO UPDATE
		 SET user_id = EXCLUDED.user_id,
		     platform = EXCLUDED.platform,
		     app_version = EXCLUDED.app_version,
		     updated_at = CURRENT_TIMESTAMP
		 RETURNING ${deviceColumns}`,
		[userId, device.platform, device.pushToken, device.appVersion ?? null],
	);

	return result.rows[0];
}

async function deleteDevice(userId, deviceId) {
	const result = await pool.query(
		`DELETE FROM push_devices
		 WHERE id = $1
		   AND user_id = $2
		 RETURNING id`,
		[deviceId, userId],
	);

	return result.rows[0] || null;
}

async function listDevicesForUser(userId, queryable = pool) {
	const result = await queryable.query(
		`SELECT id, platform, push_token AS "pushToken"
		 FROM push_devices
		 WHERE user_id = $1
		 ORDER BY id ASC`,
		[userId],
	);

	return result.rows;
}

module.exports = {
	upsertDevice,
	deleteDevice,
	listDevicesForUser,
};
