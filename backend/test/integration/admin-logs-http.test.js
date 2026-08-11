const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');
const logger = require('../../src/modules/logging/logger');
const {
	deleteExpiredLogs,
} = require('../../src/modules/logging/log-retention.service');

function expectTestDatabase(databaseName) {
	if (!databaseName.endsWith('_test')) {
		throw new Error(
			`Integration tests refuse to use non-test database: ${databaseName}`,
		);
	}
}

function authorization(userId, role = 'admin') {
	return `Bearer ${jwt.sign(
		{ userId, role },
		process.env.JWT_SECRET,
	)}`;
}

async function createUser(email, role = 'user') {
	const result = await pool.query(
		`INSERT INTO users (email, password_hash, role, is_active)
		 VALUES ($1, 'integration-hash', $2, TRUE)
		 RETURNING id`,
		[email, role],
	);
	return result.rows[0].id;
}

async function insertLog({
	timestamp,
	level,
	service,
	userId = null,
	message,
	stackTrace = null,
	requestId = null,
	metadata = {},
}) {
	const result = await pool.query(
		`INSERT INTO system_logs (
			occurred_at, level, service, user_id, message,
			stack_trace, request_id, metadata
		 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
		 RETURNING id`,
		[
			timestamp,
			level,
			service,
			userId,
			message,
			stackTrace,
			requestId,
			JSON.stringify(metadata),
		],
	);
	return Number(result.rows[0].id);
}

describe('Admin logs PostgreSQL HTTP contracts', () => {
	let consoleWarn;

	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
		consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
	});

	beforeEach(async () => {
		await pool.query(
			`TRUNCATE TABLE
				system_logs,
				user_activity_daily,
				users
			 RESTART IDENTITY CASCADE`,
		);
	});

	afterAll(async () => {
		consoleWarn.mockRestore();
		await closeDatabase();
	});

	test('migration creates constrained searchable storage without a user FK', async () => {
		const columns = await pool.query(
			`SELECT column_name, data_type, is_nullable
			 FROM information_schema.columns
			 WHERE table_schema = 'public' AND table_name = 'system_logs'
			 ORDER BY ordinal_position`,
		);
		expect(columns.rows).toEqual(expect.arrayContaining([
			{ column_name: 'occurred_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
			{ column_name: 'level', data_type: 'character varying', is_nullable: 'NO' },
			{ column_name: 'user_id', data_type: 'integer', is_nullable: 'YES' },
			{ column_name: 'metadata', data_type: 'jsonb', is_nullable: 'NO' },
		]));

		const indexes = await pool.query(
			`SELECT indexname
			 FROM pg_indexes
			 WHERE schemaname = 'public' AND tablename = 'system_logs'`,
		);
		expect(indexes.rows.map(row => row.indexname)).toEqual(expect.arrayContaining([
			'system_logs_occurred_idx',
			'system_logs_level_occurred_idx',
			'system_logs_service_occurred_idx',
			'system_logs_user_occurred_idx',
		]));

		const foreignKeys = await pool.query(
			`SELECT COUNT(*)::integer AS total
			 FROM information_schema.table_constraints
			 WHERE table_schema = 'public'
			   AND table_name = 'system_logs'
			   AND constraint_type = 'FOREIGN KEY'`,
		);
		expect(foreignKeys.rows[0].total).toBe(0);
		await expect(insertLog({
			timestamp: '2026-08-12T00:00:00Z',
			level: 'debug',
			service: 'api.test',
			message: 'Invalid level',
		})).rejects.toMatchObject({ code: '23514' });
	});

	test('logger persists stack trace, user context and metadata', async () => {
		const entry = await logger.warning('A retryable operation failed', {
			service: 'worker.notifications',
			userId: 42,
			requestId: 'req_worker',
			error: new Error('temporary outage'),
			attempt: 2,
		});
		const result = await pool.query(
			`SELECT
				level,
				service,
				user_id AS "userId",
				request_id AS "requestId",
				stack_trace AS "stackTrace",
				metadata
			 FROM system_logs`,
		);

		expect(result.rows).toEqual([expect.objectContaining({
			level: 'warning',
			service: 'worker.notifications',
			userId: 42,
			requestId: 'req_worker',
			stackTrace: expect.stringContaining('temporary outage'),
			metadata: { attempt: 2 },
		})]);
		expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
	});

	test('filters with AND semantics and returns UTC timestamps', async () => {
		const adminId = await createUser('admin-logs@example.com', 'admin');
		const userId = await createUser('log-user@example.com');
		await insertLog({
			timestamp: '2026-08-12T10:00:00+03:00',
			level: 'error',
			service: 'api.workout-sessions',
			userId,
			message: 'Workout database failed',
			stackTrace: 'Error: connection terminated',
			requestId: 'req_matching',
			metadata: { method: 'POST' },
		});
		await insertLog({
			timestamp: '2026-08-12T09:00:00Z',
			level: 'warning',
			service: 'api.workout-sessions',
			userId,
			message: 'Fallback succeeded',
		});
		await insertLog({
			timestamp: '2026-08-11T23:59:59.999Z',
			level: 'error',
			service: 'api.auth',
			message: 'Outside range',
		});

		await request(app)
			.get(
				`/api/v1/admin/logs?level=error&service=api.workout-sessions`
				+ `&userId=${userId}&query=CONNECTION`
				+ '&from=2026-08-12T07%3A00%3A00Z&to=2026-08-12T07%3A00%3A00Z',
			)
			.set('Authorization', authorization(adminId))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([expect.objectContaining({
					timestamp: '2026-08-12T07:00:00.000Z',
					level: 'error',
					service: 'api.workout-sessions',
					userId,
					requestId: 'req_matching',
					metadata: { method: 'POST' },
				})]);
				expect(response.body.meta).toMatchObject({ total: 1, totalPages: 1 });
			});
	});

	test('uses stable newest-first pagination and searches request IDs', async () => {
		const adminId = await createUser('pagination-admin@example.com', 'admin');
		const firstId = await insertLog({
			timestamp: '2026-08-12T10:00:00Z',
			level: 'info',
			service: 'api.lifecycle',
			message: 'First',
			requestId: 'req_page_target',
		});
		const secondId = await insertLog({
			timestamp: '2026-08-12T10:00:00Z',
			level: 'critical',
			service: 'api.lifecycle',
			message: 'Second',
			requestId: 'req_page_target',
		});

		const firstPage = await request(app)
			.get('/api/v1/admin/logs?query=PAGE_TARGET&page=1&pageSize=1')
			.set('Authorization', authorization(adminId))
			.expect(200);
		const secondPage = await request(app)
			.get('/api/v1/admin/logs?query=PAGE_TARGET&page=2&pageSize=1')
			.set('Authorization', authorization(adminId))
			.expect(200);

		expect(firstPage.body.data[0].id).toBe(secondId);
		expect(secondPage.body.data[0].id).toBe(firstId);
		expect(firstPage.body.meta).toMatchObject({ total: 2, totalPages: 2 });
	});

	test('retention keeps the inclusive boundary and deletes older rows', async () => {
		await insertLog({
			timestamp: '2026-05-14T11:59:59.999Z',
			level: 'info',
			service: 'api.lifecycle',
			message: 'Expired',
		});
		await insertLog({
			timestamp: '2026-05-14T12:00:00.000Z',
			level: 'info',
			service: 'api.lifecycle',
			message: 'Boundary',
		});

		await expect(deleteExpiredLogs(
			90,
			new Date('2026-08-12T12:00:00.000Z'),
		)).resolves.toBe(1);
		const remaining = await pool.query(
			'SELECT message FROM system_logs ORDER BY id',
		);
		expect(remaining.rows).toEqual([{ message: 'Boundary' }]);
	});
});
