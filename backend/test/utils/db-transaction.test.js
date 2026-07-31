jest.mock('../../src/config/db', () => ({
	pool: {
		connect: jest.fn(),
	},
}));

const { pool } = require('../../src/config/db');
const { withTransaction } = require('../../src/utils/db-transaction');

describe('database transaction helper', () => {
	test('commits and releases a successful transaction', async () => {
		const client = {
			query: jest.fn().mockResolvedValue({}),
			release: jest.fn(),
		};
		pool.connect.mockResolvedValueOnce(client);

		await expect(withTransaction(async receivedClient => {
			expect(receivedClient).toBe(client);
			return 'result';
		})).resolves.toBe('result');
		expect(client.query.mock.calls.map(call => call[0]))
			.toEqual(['BEGIN', 'COMMIT']);
		expect(client.release).toHaveBeenCalledTimes(1);
	});

	test('rolls back and releases a failed transaction', async () => {
		const client = {
			query: jest.fn().mockResolvedValue({}),
			release: jest.fn(),
		};
		pool.connect.mockResolvedValueOnce(client);
		const failure = new Error('failure');

		await expect(withTransaction(async () => {
			throw failure;
		})).rejects.toBe(failure);
		expect(client.query.mock.calls.map(call => call[0]))
			.toEqual(['BEGIN', 'ROLLBACK']);
		expect(client.release).toHaveBeenCalledTimes(1);
	});
});
