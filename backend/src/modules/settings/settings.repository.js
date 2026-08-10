const { pool } = require('../../config/db');

const settingsColumns = `
	theme,
	language,
	timezone,
	quick_action AS "quickAction",
	ai_enabled AS "aiEnabled",
	notifications,
	updated_at AS "updatedAt"
`;

async function getSettings(userId, queryable = pool) {
	await queryable.query(
		`INSERT INTO user_settings (user_id)
		 VALUES ($1)
		 ON CONFLICT (user_id) DO NOTHING`,
		[userId],
	);

	const result = await queryable.query(
		`SELECT ${settingsColumns}
		 FROM user_settings
		 WHERE user_id = $1`,
		[userId],
	);

	return result.rows[0];
}

async function updateSettings(userId, settings, queryable = pool) {
	const result = await queryable.query(
		`INSERT INTO user_settings (
			user_id,
			theme,
			language,
			timezone,
			quick_action,
			ai_enabled,
			notifications
		 )
		 VALUES (
			$1,
			COALESCE($2::varchar, 'system'),
			COALESCE($3::varchar, 'ru'),
			COALESCE($4::varchar, 'UTC'),
			COALESCE($5::varchar, 'water'),
			COALESCE($6::boolean, FALSE),
			COALESCE($7::jsonb, '{}'::jsonb)
		 )
		 ON CONFLICT (user_id) DO UPDATE
		 SET theme = COALESCE($2::varchar, user_settings.theme),
		     language = COALESCE($3::varchar, user_settings.language),
		     timezone = COALESCE($4::varchar, user_settings.timezone),
		     quick_action = COALESCE($5::varchar, user_settings.quick_action),
		     ai_enabled = COALESCE($6::boolean, user_settings.ai_enabled),
		     notifications =
				user_settings.notifications || COALESCE($7::jsonb, '{}'::jsonb),
		     updated_at = CURRENT_TIMESTAMP
		 RETURNING ${settingsColumns}`,
		[
			userId,
			settings.theme ?? null,
			settings.language ?? null,
			settings.timezone ?? null,
			settings.quickAction ?? null,
			settings.aiEnabled ?? null,
			settings.notifications === undefined
				? null
				: JSON.stringify(settings.notifications),
		],
	);

	return result.rows[0];
}

async function getTimezoneByUserId(userId) {
	const result = await pool.query(
		`SELECT COALESCE(
			(
				SELECT timezone
				FROM user_settings
				WHERE user_id = $1
			),
			'UTC'
		 ) AS timezone`,
		[userId],
	);

	return result.rows[0].timezone;
}

module.exports = {
	getSettings,
	updateSettings,
	getTimezoneByUserId,
};
