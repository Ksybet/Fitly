async function findUserByEmail(email) {
	const users = [
		{
			id: '11111111-1111-1111-1111-111111111111',
			email: 'user@example.com',
			password_hash:
				'$2a$10$5P0D4d2kJzK0sB9yM8wW4ePq5D6f2f8S7m9uV1xY2zA3bC4dE5fG6',
			role: 'user',
			is_active: true,
		},
	];

	return users.find(user => user.email === email) || null;
}

module.exports = { findUserByEmail };
