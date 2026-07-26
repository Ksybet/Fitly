const bcrypt = require('bcryptjs');
const {
	findUserByEmail,
	createUser,
} = require('../user/user.repository');

const ADMIN_PASSWORD_MIN_LENGTH = 12;
const ADMIN_PASSWORD_MAX_LENGTH = 128;
const ADMIN_PASSWORD_HASH_ROUNDS = 12;

function validateAdminEmail(email) {
	if (
		typeof email !== 'string'
		|| email.length > 255
		|| !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
	) {
		throw new Error('ADMIN_EMAIL must be a valid email address');
	}
}

function validateAdminPassword(password) {
	const isValid = (
		typeof password === 'string'
		&& password.length >= ADMIN_PASSWORD_MIN_LENGTH
		&& password.length <= ADMIN_PASSWORD_MAX_LENGTH
		&& /[a-z]/.test(password)
		&& /[A-Z]/.test(password)
		&& /\d/.test(password)
		&& /[^A-Za-z0-9\s]/.test(password)
		&& !/\s/.test(password)
	);

	if (!isValid) {
		throw new Error(
			'ADMIN_PASSWORD must be 12-128 characters and include lowercase, uppercase, digit, and special characters without whitespace',
		);
	}
}

async function bootstrapAdministrator({ email, password }) {
	if (!email && !password) {
		return { status: 'disabled' };
	}

	if (!email) {
		throw new Error('ADMIN_EMAIL is required when ADMIN_PASSWORD is provided');
	}

	const normalizedEmail = email.trim().toLowerCase();
	validateAdminEmail(normalizedEmail);

	const existingUser = await findUserByEmail(normalizedEmail);

	if (existingUser) {
		if (existingUser.role !== 'admin') {
			throw new Error('ADMIN_EMAIL belongs to a non-admin user');
		}

		return {
			status: 'existing',
			userId: existingUser.id,
		};
	}

	if (!password) {
		throw new Error('ADMIN_PASSWORD is required to create the administrator');
	}

	validateAdminPassword(password);

	const passwordHash = await bcrypt.hash(
		password,
		ADMIN_PASSWORD_HASH_ROUNDS,
	);
	const administrator = await createUser({
		email: normalizedEmail,
		passwordHash,
		role: 'admin',
		isActive: true,
	});

	return {
		status: 'created',
		userId: administrator.id,
	};
}

module.exports = {
	bootstrapAdministrator,
	validateAdminPassword,
};
