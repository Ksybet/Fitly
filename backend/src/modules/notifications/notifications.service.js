const notificationsRepository = require('./notifications.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function toDateTime(value) {
	if (value === null || value === undefined) {
		return null;
	}
	return value instanceof Date ? value.toISOString() : value;
}

function toNotificationDto(notification) {
	return {
		id: Number(notification.id),
		type: notification.type,
		title: notification.title,
		body: notification.body,
		status: notification.status,
		scheduledAt: toDateTime(notification.scheduledAt),
		sentAt: toDateTime(notification.sentAt),
		readAt: toDateTime(notification.readAt),
		payload: notification.payload ?? {},
		createdAt: toDateTime(notification.createdAt),
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

async function listNotifications(userId, filters = {}) {
	const normalizedUserId = ensureValidUserId(userId);
	const normalizedFilters = {
		status: filters.status,
		type: filters.type,
		page: filters.page ?? DEFAULT_PAGE,
		pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
	};
	const result = await notificationsRepository.listNotifications(
		normalizedUserId,
		normalizedFilters,
	);

	return {
		items: result.items.map(toNotificationDto),
		meta: paginationMeta(
			normalizedFilters.page,
			normalizedFilters.pageSize,
			result.total,
		),
	};
}

async function getUnreadCount(userId) {
	return notificationsRepository.getUnreadCount(ensureValidUserId(userId));
}

async function markNotificationRead(userId, notificationId) {
	const notification = await notificationsRepository.markRead(
		ensureValidUserId(userId),
		notificationId,
	);
	if (!notification) {
		throw new ApiError(404, 'Notification not found');
	}
}

async function markAllNotificationsRead(userId) {
	await notificationsRepository.markAllRead(ensureValidUserId(userId));
}

module.exports = {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	toNotificationDto,
	paginationMeta,
	listNotifications,
	getUnreadCount,
	markNotificationRead,
	markAllNotificationsRead,
};
