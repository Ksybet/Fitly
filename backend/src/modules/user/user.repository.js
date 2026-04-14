async function findUserByEmail(email) {
	const users = [
		{
			id: '1',
			email: 'user@example.com',
			password: '12345678',
			role: 'user',
			is_active: true,
		},
	];

	return users.find(user => user.email === email) || null;
}

module.exports = { findUserByEmail };
