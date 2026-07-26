jest.mock('../../src/config/db', () => ({
	pool: { query: jest.fn() },
}));

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');
const { errorMiddleware } = require('../../src/middlewares/error.middleware');

function createAuthorization(
	payload = { userId: 1, role: 'user' },
	options = {},
	secret = process.env.JWT_SECRET,
) {
	const token = jwt.sign(payload, secret, options);
	return `Bearer ${token}`;
}

describe('HTTP application contracts', () => {
	beforeEach(() => pool.query.mockReset());

	test('GET /health returns 200 without a database connection', async () => {
		await request(app).get('/health').expect(200, { success: true, data: 'OK' });
	});

	test('an unknown route returns a predictable JSON 404', async () => {
		await request(app).get('/missing').expect(404, {
			success: false,
			message: 'Route not found',
		});
	});

	test('request validation returns 400 instead of 500', async () => {
		await request(app).post('/api/v1/auth/login').send({}).expect(400, {
			success: false,
			message: 'Поля login, password и appVersion обязательны',
		});
	});

	test('a protected route without a JWT returns 401', async () => {
		await request(app).get('/api/v1/profile').expect(401, {
			success: false,
			message: 'Unauthorized',
		});
	});

	test.each([
		['Bearer ', 'Unauthorized'],
		['Bearer not-a-jwt', 'Invalid or expired token'],
		[createAuthorization(undefined, { expiresIn: -1 }), 'Invalid or expired token'],
		[createAuthorization(undefined, {}, 'different-secret'), 'Invalid or expired token'],
	])('a protected route rejects an invalid authorization header', async (authorization, message) => {
		await request(app)
			.get('/api/v1/auth/me')
			.set('Authorization', authorization)
			.expect(401, { success: false, message });
	});

	test('a valid JWT exposes its payload on the authenticated route', async () => {
		await request(app)
			.get('/api/v1/auth/me')
			.set('Authorization', createAuthorization({ userId: 7, role: 'admin' }))
			.expect(200)
			.expect(response => {
				expect(response.body.data.user).toMatchObject({ userId: 7, role: 'admin' });
			});
	});

	test.each([
		[undefined, 401, 'Unauthorized'],
		['Bearer not-a-jwt', 401, 'Invalid or expired token'],
		[createAuthorization({ userId: 7, role: 'user' }), 403, 'Forbidden'],
	])(
		'the administrative namespace rejects unauthorized access',
		async (authorization, status, message) => {
			const adminRequest = request(app)
				.get('/api/v1/admin/analytics/overview');

			if (authorization) {
				adminRequest.set('Authorization', authorization);
			}

			await adminRequest.expect(status, {
				success: false,
				message,
			});
		},
	);

	test('an administrator passes the namespace guard and reaches the global 404', async () => {
		await request(app)
			.get('/api/v1/admin/analytics/overview')
			.set(
				'Authorization',
				createAuthorization({ userId: 7, role: 'admin' }),
			)
			.expect(404, {
				success: false,
				message: 'Route not found',
			});
	});

	test('an administrator login audits proxy and device metadata', async () => {
		const password = 'Strong!Admin123';
		const passwordHash = await bcrypt.hash(password, 4);
		pool.query
			.mockResolvedValueOnce({
				rows: [{
					id: 7,
					email: 'admin@example.com',
					passwordHash,
					role: 'admin',
					isActive: true,
				}],
			})
			.mockResolvedValueOnce({ rows: [{ id: 1 }] });

		await request(app)
			.post('/api/v1/auth/login')
			.set('X-Forwarded-For', '203.0.113.10')
			.set('User-Agent', 'Fitly Admin Test')
			.send({
				login: 'admin@example.com',
				password,
				appVersion: '1.2.3',
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data.user).toEqual({
					id: 7,
					email: 'admin@example.com',
					role: 'admin',
				});
			});

		expect(pool.query.mock.calls[1][1]).toEqual([
			7,
			'admin@example.com',
			true,
			null,
			'203.0.113.10',
			'Fitly Admin Test',
			'1.2.3',
		]);
	});

	test.each([
		[{ firstName: 42 }, 'firstName must be a string'],
		[{ birthDate: 42 }, 'birthDate must be a string'],
		[{ birthDate: '02.01.2000' }, 'birthDate must be in YYYY-MM-DD format'],
		[{ gender: 42 }, 'gender must be a string'],
		[{ gender: 'unknown' }, 'gender must be one of: male, female, other'],
		[{ heightCm: '170' }, 'heightCm must be a number'],
		[{ heightCm: 0 }, 'heightCm must be between 1 and 300'],
		[{ heightCm: 301 }, 'heightCm must be between 1 and 300'],
		[{ weightKg: '60' }, 'weightKg must be a number'],
		[{ weightKg: 0 }, 'weightKg must be between 1 and 500'],
		[{ weightKg: 501 }, 'weightKg must be between 1 and 500'],
	])('profile validation rejects %p without accessing the database', async (body, message) => {
		pool.query.mockClear();

		await request(app)
			.put('/api/v1/profile')
			.set('Authorization', createAuthorization())
			.send(body)
			.expect(400, { success: false, message });

		expect(pool.query).not.toHaveBeenCalled();
	});

	test('an unexpected exception is safely handled as a 500', async () => {
		const errorApp = express();
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
		errorApp.get('/boom', () => {
			throw new Error('SELECT password_hash FROM Users');
		});
		errorApp.use(errorMiddleware);

		await request(errorApp).get('/boom').expect(500, {
			success: false,
			message: 'Internal server error',
		});
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});
});
