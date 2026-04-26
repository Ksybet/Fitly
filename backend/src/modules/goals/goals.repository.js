const { sql, poolPromise } = require('../../config/db');

async function getGoalsByUserId(userId) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, userId)
		.query(`
			SELECT
				id,
				user_id AS userId,
				goal_type AS goalType,
				title,
				target_value AS targetValue,
				unit,
				start_date AS startDate,
				end_date AS endDate,
				status,
				created_at AS createdAt,
				updated_at AS updatedAt
			FROM Goals
			WHERE user_id = @userId
			ORDER BY created_at DESC
		`);

	return result.recordset;
}

async function replaceGoals(userId, goals) {
	const pool = await poolPromise;
	const transaction = new sql.Transaction(pool);

	try {
		await transaction.begin();

		await new sql.Request(transaction)
			.input('userId', sql.Int, userId)
			.query(`
				DELETE FROM Goals
				WHERE user_id = @userId
			`);

		for (const goal of goals) {
			await new sql.Request(transaction)
				.input('userId', sql.Int, userId)
				.input('goalType', sql.NVarChar(50), goal.goalType)
				.input('title', sql.NVarChar(255), goal.title)
				.input('targetValue', sql.Decimal(10, 2), goal.targetValue ?? null)
				.input('unit', sql.NVarChar(20), goal.unit ?? null)
				.input('startDate', sql.Date, goal.startDate ?? null)
				.input('endDate', sql.Date, goal.endDate ?? null)
				.input('status', sql.NVarChar(30), goal.status ?? 'active')
				.query(`
					INSERT INTO Goals (
						user_id,
						goal_type,
						title,
						target_value,
						unit,
						start_date,
						end_date,
						status
					)
					VALUES (
						@userId,
						@goalType,
						@title,
						@targetValue,
						@unit,
						@startDate,
						@endDate,
						@status
					)
				`);
		}

		await transaction.commit();

		return getGoalsByUserId(userId);
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
}

module.exports = {
	getGoalsByUserId,
	replaceGoals,
};
