const { pool } = require('../../config/db');

const achievementProgressColumns = `
	achievement.id,
	achievement.code,
	achievement.title,
	achievement.description,
	achievement.reward_type AS "rewardType",
	achievement.image_url AS "imageUrl",
	achievement.condition_text AS "conditionText",
	achievement.target_value AS "targetValue",
	achievement.sort_order AS "sortOrder",
	COALESCE(progress.current_value, 0)::bigint AS "currentValue",
	user_achievement.earned_at AS "earnedAt"
`;

const achievementProgressJoins = `
	LEFT JOIN (
		SELECT
			result.exercise_id,
			SUM(COALESCE(result.repetitions_completed, 0))::bigint
				AS current_value
		FROM workout_session_exercise_results result
		JOIN workout_sessions session ON session.id = result.session_id
		WHERE session.user_id = $1
		  AND session.status = 'completed'
		GROUP BY result.exercise_id
	) progress ON progress.exercise_id = achievement.exercise_id
	LEFT JOIN user_achievements user_achievement
		ON user_achievement.user_id = $1
		AND user_achievement.achievement_id = achievement.id
`;

async function listActiveAchievementsWithProgress(userId) {
	const result = await pool.query(
		`SELECT ${achievementProgressColumns}
		 FROM achievements achievement
		 ${achievementProgressJoins}
		 WHERE achievement.is_active = TRUE
		 ORDER BY achievement.sort_order ASC, achievement.id ASC`,
		[userId],
	);

	return result.rows;
}

async function findActiveAchievementWithProgress(userId, achievementId) {
	const result = await pool.query(
		`SELECT ${achievementProgressColumns}
		 FROM achievements achievement
		 ${achievementProgressJoins}
		 WHERE achievement.is_active = TRUE
		   AND achievement.id = $2`,
		[userId, achievementId],
	);

	return result.rows[0] || null;
}

async function awardReachedAchievements(
	client,
	userId,
	exerciseIds,
	earnedAt,
) {
	if (exerciseIds.length === 0) {
		return [];
	}

	const result = await client.query(
		`INSERT INTO user_achievements (
			user_id,
			achievement_id,
			earned_at
		 )
		 SELECT
			$1,
			achievement.id,
			$3
		 FROM achievements achievement
		 JOIN (
			SELECT
				exercise_result.exercise_id,
				SUM(COALESCE(exercise_result.repetitions_completed, 0))::bigint
					AS current_value
			FROM workout_session_exercise_results exercise_result
			JOIN workout_sessions session
				ON session.id = exercise_result.session_id
			WHERE session.user_id = $1
			  AND session.status = 'completed'
			  AND exercise_result.exercise_id = ANY($2::integer[])
			GROUP BY exercise_result.exercise_id
		 ) progress ON progress.exercise_id = achievement.exercise_id
		 WHERE achievement.is_active = TRUE
		   AND achievement.metric_type = 'exercise_repetitions'
		   AND progress.current_value >= achievement.target_value
		 ON CONFLICT (user_id, achievement_id) DO NOTHING
		 RETURNING achievement_id AS "achievementId"`,
		[userId, exerciseIds, earnedAt],
	);

	return result.rows.map(row => Number(row.achievementId));
}

module.exports = {
	listActiveAchievementsWithProgress,
	findActiveAchievementWithProgress,
	awardReachedAchievements,
};
