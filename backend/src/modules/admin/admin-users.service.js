const adminUsersRepository = require('./admin-users.repository');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function toDateTimeString(value) {
	return value instanceof Date ? value.toISOString() : value;
}

function toAdminUserDto(user) {
	return {
		id: Number(user.id),
		email: user.email,
		firstName: user.firstName ?? null,
		role: user.role,
		status: user.status,
		emailVerified: Boolean(user.emailVerified),
		createdAt: toDateTimeString(user.createdAt),
		lastLoginAt: user.lastLoginAt === null
			? null
			: toDateTimeString(user.lastLoginAt),
	};
}

function normalizeFilters(filters = {}) {
	return {
		query: filters.query,
		role: filters.role,
		status: filters.status,
		page: filters.page ?? DEFAULT_PAGE,
		pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
	};
}

function paginationMeta(page, pageSize, total) {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

async function listUsers(filters) {
	const normalizedFilters = normalizeFilters(filters);
	const result = await adminUsersRepository.listUsers(normalizedFilters);

	return {
		items: result.items.map(toAdminUserDto),
		meta: paginationMeta(
			normalizedFilters.page,
			normalizedFilters.pageSize,
			result.total,
		),
	};
}

module.exports = {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	toAdminUserDto,
	normalizeFilters,
	paginationMeta,
	listUsers,
};
