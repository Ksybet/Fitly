const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const notificationsController = require('./notifications.controller');
const {
	validateNotificationQuery,
	validateNotificationId,
} = require('./notifications.validators');

const router = express.Router();

router.get('/', authMiddleware, validateNotificationQuery, notificationsController.listNotifications);
router.get('/unread-count', authMiddleware, notificationsController.getUnreadCount);
router.post('/read-all', authMiddleware, notificationsController.markAllNotificationsRead);
router.post(
	'/:notificationId/read',
	authMiddleware,
	validateNotificationId,
	notificationsController.markNotificationRead,
);

module.exports = router;
