const { pool } = require('../../config/db');

const goalColumns = `
	id,
	user_id AS "userId",
	goal_type AS "goalType",
	title,
	target_value::double precision AS "targetValue",
	unit,
	start_date AS "startsOn",
	end_date AS "endsOn",
	status,
	current_value::double precision AS "currentValue",
	progress_percent::double precision AS "progressPercent",
	created_at AS "createdAt",
	completed_at AS "completedAt"
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
		await client.query(
			`UPDATE goals
			 SET status = 'cancelled',
			     updated_at = CURRENT_TIMESTAMP
			 WHERE user_id = $1
			   AND status IN ('created', 'in_progress')`,
			[userId],
		);

		for (const goal of goals) {
			await client.query(
				`INSERT INTO goals (
					user_id, goal_type, title, target_value, unit, start_date, end_date
				 )
				 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[
					userId,
					goal.goalType,
					goal.title,
					goal.targetValue,
					goal.unit,
					goal.startsOn ?? null,
					goal.endsOn ?? null,
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
