const { pool } = require('../../config/db');

const auditColumns = `
	id,
	user_id AS "userId",
	email,
	succeeded,
	failure_reason AS "failureReason",
	ip_address::text AS "ipAddress",
	device,
	app_version AS "appVersion",
	created_at AS "createdAt"
`;

async function createAdminLoginAttempt(attempt) {
	const result = await pool.query(
		`INSERT INTO admin_login_attempts (
			user_id,
			email,
			succeeded,
			failure_reason,
			ip_address,
			device,
			app_version
		)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING ${auditColumns}`,
		[
			attempt.userId,
			attempt.email,
			attempt.succeeded,
			attempt.failureReason,
			attempt.ipAddress,
			attempt.device,
			attempt.appVersion,
		],
	);

	return result.rows[0];
}

module.exports = {
	createAdminLoginAttempt,
};
