jest.mock('../../src/modules/notifications/notifications.repository', () => ({
	listNotifications: jest.fn(),
	getUnreadCount: jest.fn(),
	markRead: jest.fn(),
	markAllRead: jest.fn(),
	createNotification: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const notificationsRepository = require('../../src/modules/notifications/notifications.repository');

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 7, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

function notificationRow(overrides = {}) {
	return {
		id: '11',
		type: 'achievement',
		title: 'Новое достижение',
		body: 'Получено достижение',
		status: 'sent',
		scheduledAt: null,
		sentAt: new Date('2026-08-08T10:00:00.000Z'),
		readAt: null,
		payload: { achievementId: 2 },
		createdAt: new Date('2026-08-08T09:59:00.000Z'),
		...overrides,
	};
}

describe('Notifications HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('requires authentication', async () => {
		await request(app).get('/api/v1/notifications').expect(401);
		expect(notificationsRepository.listNotifications).not.toHaveBeenCalled();
	});

	test('lists owned notifications with filters and pagination', async () => {
		notificationsRepository.listNotifications.mockResolvedValueOnce({
			items: [notificationRow()],
			total: 1,
		});

		await request(app)
			.get('/api/v1/notifications?type=achievement&status=sent&page=1&pageSize=10')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([{
					id: 11,
					type: 'achievement',
					title: 'Новое достижение',
					body: 'Получено достижение',
					status: 'sent',
					scheduledAt: null,
					sentAt: '2026-08-08T10:00:00.000Z',
					readAt: null,
					payload: { achievementId: 2 },
					createdAt: '2026-08-08T09:59:00.000Z',
				}]);
				expect(response.body.meta).toMatchObject({
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				});
			});

		expect(notificationsRepository.listNotifications).toHaveBeenCalledWith(7, {
			type: 'achievement',
			status: 'sent',
			page: 1,
			pageSize: 10,
		});
	});

	test('returns unread count', async () => {
		notificationsRepository.getUnreadCount.mockResolvedValueOnce(3);
		await request(app)
			.get('/api/v1/notifications/unread-count')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ count: 3 });
			});
	});

	test('marks one notification and all notifications idempotently', async () => {
		notificationsRepository.markRead.mockResolvedValue({ id: '11' });
		notificationsRepository.markAllRead.mockResolvedValue(2);

		await request(app)
			.post('/api/v1/notifications/11/read')
			.set('Authorization', authorization())
			.expect(200);
		await request(app)
			.post('/api/v1/notifications/11/read')
			.set('Authorization', authorization())
			.expect(200);
		await request(app)
			.post('/api/v1/notifications/read-all')
			.set('Authorization', authorization())
			.expect(200);

		expect(notificationsRepository.markRead).toHaveBeenCalledTimes(2);
		expect(notificationsRepository.markAllRead).toHaveBeenCalledWith(7);
	});

	test('hides absent or foreign notifications behind not found', async () => {
		notificationsRepository.markRead.mockResolvedValueOnce(null);
		await request(app)
			.post('/api/v1/notifications/99/read')
			.set('Authorization', authorization())
			.expect(404);
	});

	test.each([
		['?type=email', 'type'],
		['?status=failed', 'status'],
		['?pageSize=101', 'pageSize'],
		['?unknown=true', 'unknown'],
	])('rejects invalid list query %s', async (query, field) => {
		await request(app)
			.get(`/api/v1/notifications${query}`)
			.set('Authorization', authorization())
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([expect.objectContaining({ field })]),
				);
			});
	});
});
