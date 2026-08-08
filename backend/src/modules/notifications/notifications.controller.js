const notificationsService = require('./notifications.service');
const { sendSuccess, sendActionCompleted } = require('../../utils/http-response');

async function listNotifications(req, res, next) {
	try {
		const result = await notificationsService.listNotifications(
			req.user.userId,
			req.notificationQuery,
		);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function getUnreadCount(req, res, next) {
	try {
		const count = await notificationsService.getUnreadCount(req.user.userId);
		return sendSuccess(res, { count });
	} catch (error) {
		return next(error);
	}
}

async function markNotificationRead(req, res, next) {
	try {
		await notificationsService.markNotificationRead(
			req.user.userId,
			req.notificationId,
		);
		return sendActionCompleted(res);
	} catch (error) {
		return next(error);
	}
}

async function markAllNotificationsRead(req, res, next) {
	try {
		await notificationsService.markAllNotificationsRead(req.user.userId);
		return sendActionCompleted(res);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	listNotifications,
	getUnreadCount,
	markNotificationRead,
	markAllNotificationsRead,
};
