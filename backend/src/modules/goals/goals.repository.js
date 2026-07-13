const { pool } = require('../../config/db');

const goalColumns = `
	id,
	user_id AS "userId",
	goal_type AS "goalType",
	title,
	target_value::double precision AS "targetValue",
	unit,
	start_date AS "startDate",
	end_date AS "endDate",
	status,
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function getGoalsByUserId(userId) {
	const result = await pool.query(
		`SELECT ${goalColumns}
		 FROM goals
		 WHERE user_id = $1
		 ORDER BY created_at DESC`,
		[userId],
	);

	return result.rows;
}

async function replaceGoals(userId, goals) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');
		await client.query('DELETE FROM goals WHERE user_id = $1', [userId]);

		for (const goal of goals) {
			await client.query(
				`INSERT INTO goals (
					user_id, goal_type, title, target_value, unit, start_date, end_date, status
				 )
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				[
					userId,
					goal.goalType,
					goal.title,
					goal.targetValue ?? null,
					goal.unit ?? null,
					goal.startDate ?? null,
					goal.endDate ?? null,
					goal.status ?? 'active',
				],
			);
		}

		await client.query('COMMIT');
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}

	return getGoalsByUserId(userId);
}

module.exports = {
	getGoalsByUserId,
	replaceGoals,
};
