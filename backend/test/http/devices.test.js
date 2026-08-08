jest.mock('../../src/modules/devices/devices.repository', () => ({
	upsertDevice: jest.fn(),
	deleteDevice: jest.fn(),
	listDevicesForUser: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const devicesRepository = require('../../src/modules/devices/devices.repository');

const pushToken = 'ExpoPushToken[aaaaaaaaaaaaaaaaaaaaaa]';

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 7, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

describe('Push devices HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('requires authentication', async () => {
		await request(app)
			.post('/api/v1/devices')
			.send({ platform: 'android', pushToken })
			.expect(401);

		expect(devicesRepository.upsertDevice).not.toHaveBeenCalled();
	});

	test('registers or updates an Expo push device', async () => {
		devicesRepository.upsertDevice.mockResolvedValueOnce({
			id: '12',
			platform: 'android',
			pushToken,
			appVersion: '1.2.3',
			createdAt: new Date('2026-08-08T10:00:00.000Z'),
			updatedAt: new Date('2026-08-08T10:05:00.000Z'),
		});

		await request(app)
			.post('/api/v1/devices')
			.set('Authorization', authorization())
			.send({ platform: 'android', pushToken, appVersion: '1.2.3' })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					id: 12,
					platform: 'android',
					pushToken,
					appVersion: '1.2.3',
					createdAt: '2026-08-08T10:00:00.000Z',
					updatedAt: '2026-08-08T10:05:00.000Z',
				});
			});

		expect(devicesRepository.upsertDevice).toHaveBeenCalledWith(7, {
			platform: 'android',
			pushToken,
			appVersion: '1.2.3',
		});
	});

	test.each([
		[{ platform: 'web', pushToken }, 'platform'],
		[{ platform: 'ios', pushToken: 'not-a-token' }, 'pushToken'],
		[{ platform: 'ios', pushToken, appVersion: '' }, 'appVersion'],
	])('rejects invalid registration: %p', async (body, field) => {
		await request(app)
			.post('/api/v1/devices')
			.set('Authorization', authorization())
			.send(body)
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([expect.objectContaining({ field })]),
				);
			});
	});

	test('deletes only an owned device', async () => {
		devicesRepository.deleteDevice.mockResolvedValueOnce({ id: '12' });

		await request(app)
			.delete('/api/v1/devices/12')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ deleted: true });
			});

		expect(devicesRepository.deleteDevice).toHaveBeenCalledWith(7, 12);
	});

	test('returns not found for a foreign or absent device', async () => {
		devicesRepository.deleteDevice.mockResolvedValueOnce(null);

		await request(app)
			.delete('/api/v1/devices/42')
			.set('Authorization', authorization())
			.expect(404);
	});
});
