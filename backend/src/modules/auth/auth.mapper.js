function toDateTimeString(value) {
	return value instanceof Date ? value.toISOString() : value;
}

function toUserDto(user) {
	return {
		id: Number(user.id),
		email: user.email,
		role: user.role,
		status: user.isActive ? 'active' : 'blocked',
		emailVerified: Boolean(user.emailVerified),
		appVersion: user.appVersion ?? null,
		createdAt: toDateTimeString(user.createdAt),
	};
}

module.exports = { toUserDto };
