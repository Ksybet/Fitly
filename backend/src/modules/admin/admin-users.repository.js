const { pool } = require('../../config/db');

const adminUserColumns = `
	u.id,
	u.email,
	p.first_name AS "firstName",
	u.role,
	CASE WHEN u.is_active THEN 'active' ELSE 'blocked' END AS status,
	u.email_verified AS "emailVerified",
	u.created_at AS "createdAt",
	u.last_login_at AS "lastLoginAt"
`;

function buildUserFilters(filters) {
	const conditions = [];
	const values = [];

	if (filters.query) {
		values.push(`%${filters.query}%`);
		conditions.push(`u.email ILIKE $${values.length}`);
	}

	if (filters.role) {
		values.push(filters.role);
		conditions.push(`u.role = $${values.length}`);
	}

	if (filters.status) {
		values.push(filters.status === 'active');
		conditions.push(`u.is_active = $${values.length}`);
	}

	return { conditions, values };
}

async function listUsers(filters) {
	const { conditions, values } = buildUserFilters(filters);
	const where = conditions.length > 0
		? `WHERE ${conditions.join('\n\t\t AND ')}`
		: '';
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM users u
		 ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const usersResult = await pool.query(
		`SELECT ${adminUserColumns}
		 FROM users u
		 LEFT JOIN profiles p ON p.user_id = u.id
		 ${where}
		 ORDER BY u.created_at DESC, u.id DESC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);

	return {
		items: usersResult.rows,
		total: countResult.rows[0].total,
	};
}

module.exports = { listUsers };
