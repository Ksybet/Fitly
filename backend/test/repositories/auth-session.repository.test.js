jest.mock('../../src/config/db', () => ({
	pool: {
		connect: jest.fn(),
	},
}));

const { pool } = require('../../src/config/db');
const {
	createLoginSession,
} = require('../../src/modules/auth/auth-session.repository');

function createClient() {
	return {
		query: jest.fn(),
		release: jest.fn(),
	};
}

describe('auth login session repository', () => {
	beforeEach(() => jest.clearAllMocks());

	test('updates login state and inserts the session in one transaction', async () => {
		const client = createClient();
		pool.connect.mockResolvedValue(client);
		client.query
			.mockResolvedValueOnce()
			.mockResolvedValueOnce({
				rows: [{
					appVersion: '1.2.3',
					lastLoginAt: new Date('2026-08-12T12:00:00.000Z'),
				}],
			})
			.mockResolvedValueOnce({ rows: [{ id: 12 }] })
			.mockResolvedValueOnce();

		await expect(createLoginSession({
			userId: 7,
			refreshTokenHash: 'refresh-hash',
			expiresAt: new Date('2026-09-11T12:00:00.000Z'),
			appVersion: '1.2.3',
		})).resolves.toMatchObject({
			id: 12,
			appVersion: '1.2.3',
		});

		expect(client.query.mock.calls.map(call => call[0])).toEqual([
			'BEGIN',
			expect.stringContaining('UPDATE users'),
			expect.stringContaining('INSERT INTO auth_sessions'),
			'COMMIT',
		]);
		expect(client.release).toHaveBeenCalledTimes(1);
	});

	test('rolls back both changes when session insertion fails', async () => {
		const client = createClient();
		const error = new Error('insert failed');
		pool.connect.mockResolvedValue(client);
		client.query
			.mockResolvedValueOnce()
			.mockResolvedValueOnce({
				rows: [{ appVersion: null, lastLoginAt: new Date() }],
			})
			.mockRejectedValueOnce(error)
			.mockResolvedValueOnce();

		await expect(createLoginSession({
			userId: 7,
			refreshTokenHash: 'refresh-hash',
			expiresAt: new Date('2026-09-11T12:00:00.000Z'),
		})).rejects.toBe(error);

		expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
		expect(client.release).toHaveBeenCalledTimes(1);
	});
});
