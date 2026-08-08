jest.mock('../../src/modules/settings/settings.repository', () => ({
	getSettings: jest.fn(),
	updateSettings: jest.fn(),
	getTimezoneByUserId: jest.fn(),
}));
jest.mock('../../src/utils/db-transaction', () => ({
	withTransaction: jest.fn(callback => callback({ query: jest.fn() })),
}));
jest.mock('../../src/modules/notifications/notification-schedules.service', () => ({
	syncRecurringSchedules: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const settingsRepository = require('../../src/modules/settings/settings.repository');

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 1, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

function settingsRow(overrides = {}) {
	return {
		theme: 'system',
		language: 'ru',
		timezone: 'UTC',
		quickAction: 'water',
		aiEnabled: false,
		notifications: {},
		updatedAt: new Date('2026-07-27T10:00:00.000Z'),
		...overrides,
	};
}

describe('settings HTTP contracts', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('GET /api/v1/settings requires authentication', async () => {
		await request(app)
			.get('/api/v1/settings')
			.expect(401);

		expect(settingsRepository.getSettings).not.toHaveBeenCalled();
	});

	test('GET /api/v1/settings returns the documented settings DTO', async () => {
		settingsRepository.getSettings.mockResolvedValueOnce(settingsRow());

		await request(app)
			.get('/api/v1/settings')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					theme: 'system',
					language: 'ru',
					timezone: 'UTC',
					quickAction: 'water',
					aiEnabled: false,
					notifications: {},
					updatedAt: '2026-07-27T10:00:00.000Z',
				});
			});
	});

	test('PATCH /api/v1/settings supports partial notification updates', async () => {
		settingsRepository.getSettings.mockResolvedValueOnce(settingsRow({
			notifications: { enabled: true, waterEnabled: true, waterIntervalMinutes: 120 },
		}));
		settingsRepository.updateSettings.mockResolvedValueOnce(settingsRow({
			timezone: 'Europe/Tallinn',
			notifications: {
				enabled: true,
				waterEnabled: false,
			},
		}));

		await request(app)
			.patch('/api/v1/settings')
			.set('Authorization', authorization())
			.send({
				timezone: 'Europe/Tallinn',
				notifications: { waterEnabled: false },
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					timezone: 'Europe/Tallinn',
					notifications: {
						enabled: true,
						waterEnabled: false,
					},
				});
			});

		expect(settingsRepository.updateSettings).toHaveBeenCalledWith(
			1,
			{
				timezone: 'Europe/Tallinn',
				notifications: { waterEnabled: false },
			},
			expect.any(Object),
		);
	});

	test.each([
		[{}, 'body', 'MIN_PROPERTIES'],
		[{ timezone: 'Mars/Olympus' }, 'timezone', 'INVALID_TIMEZONE'],
		[{ timezone: 42 }, 'timezone', 'INVALID_TIMEZONE'],
		[{ theme: 'blue' }, 'theme', 'INVALID_ENUM'],
		[
			{ notifications: { waterIntervalMinutes: 10 } },
			'notifications.waterIntervalMinutes',
			'OUT_OF_RANGE',
		],
		[
			{ notifications: { doNotDisturbFrom: 'night' } },
			'notifications.doNotDisturbFrom',
			'INVALID_TIME',
		],
	])('PATCH /api/v1/settings rejects invalid input: %p', async (
		body,
		field,
		code,
	) => {
		await request(app)
			.patch('/api/v1/settings')
			.set('Authorization', authorization())
			.send(body)
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ field, code }),
					]),
				);
			});

		expect(settingsRepository.updateSettings).not.toHaveBeenCalled();
	});
});
