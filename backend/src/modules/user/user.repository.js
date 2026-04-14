const users = [
	{
		id: '1',
		email: 'user@example.com',
		password: '12345678',
		role: 'user',
		is_active: true,
	},
];

async function findUserByEmail(email) {
	return users.find(user => user.email === email) || null;
}

async function createUser(userData) {
	users.push(userData);
	return userData;
}

module.exports = {
	findUserByEmail,
	createUser,
};
