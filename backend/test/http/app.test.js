jest.mock('../../src/config/db', () => {
	const client = {
		query: jest.fn(),
		release: jest.fn(),
	};
	return {
		pool: {
			query: jest.fn(),
			connect: jest.fn(),
		},
		testClient: client,
	};
});

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, testClient } = require('../../src/config/db');
const { ApiError } = require('../../src/utils/api-error');
const { errorMiddleware } = require('../../src/middlewares/error.middleware');

const requestIdPattern = /^req_[0-9a-f]{32}$/;

function createAuthorization(
	payload = { userId: 1, role: 'user' },
	options = {},
	secret = process.env.JWT_SECRET,
) {
	const token = jwt.sign(payload, secret, options);
	return `Bearer ${token}`;
}

function expectSuccessResponse(response, expectedData) {
	expect(response.body).toMatchObject({
		success: true,
		data: expectedData,
		meta: {
			requestId: expect.stringMatching(requestIdPattern),
		},
	});
}

function expectErrorResponse(response, { code, message, details }) {
	expect(response.body).toEqual({
		success: false,
		message,
		error: {
			code,
			requestId: expect.stringMatching(requestIdPattern),
			...(details ? { details } : {}),
		},
	});
}

describe('HTTP application contracts', () => {
	beforeEach(() => {
		pool.query.mockReset();
		pool.connect.mockReset();
		testClient.query.mockReset();
		testClient.release.mockReset();
		pool.connect.mockResolvedValue(testClient);
	});

	test('GET /health reports API and database availability', async () => {
		pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

		await request(app)
			.get('/health')
			.expect(200)
			.expect(response => {
				expectSuccessResponse(response, {
					status: 'ok',
					database: 'ok',
					timestamp: expect.any(String),
				});
				expect(new Date(response.body.data.timestamp).toISOString())
					.toBe(response.body.data.timestamp);
			});

		expect(pool.query).toHaveBeenCalledWith('SELECT 1');
	});

	test('GET /health returns 503 when the database is unavailable', async () => {
		pool.query.mockRejectedValueOnce(new Error('connection refused'));

		await request(app)
			.get('/health')
			.expect(503)
			.expect(response => expectErrorResponse(response, {
				code: 'SERVICE_UNAVAILABLE',
				message: 'Service temporarily unavailable',
			}));
	});

	test('each HTTP request receives a unique request id', async () => {
		const [firstResponse, secondResponse] = await Promise.all([
			request(app).get('/health'),
			request(app).get('/health'),
		]);

		expect(firstResponse.body.meta.requestId).toMatch(requestIdPattern);
		expect(secondResponse.body.meta.requestId).toMatch(requestIdPattern);
		expect(firstResponse.body.meta.requestId).not.toBe(secondResponse.body.meta.requestId);
	});

	test('an unknown route returns a predictable JSON 404', async () => {
		await request(app)
			.get('/missing')
			.expect(404)
			.expect(response => expectErrorResponse(response, {
				code: 'NOT_FOUND',
				message: 'Route not found',
			}));
	});

	test('the undocumented root route is not exposed', async () => {
		await request(app)
			.get('/')
			.expect(404)
			.expect(response => expectErrorResponse(response, {
				code: 'NOT_FOUND',
				message: 'Route not found',
			}));
	});

	test('request validation returns 400 instead of 500', async () => {
		await request(app)
			.post('/api/v1/auth/login')
			.send({})
			.expect(400)
			.expect(response => expectErrorResponse(response, {
				code: 'VALIDATION_ERROR',
				message: 'Request validation failed',
				details: [
					{
						field: 'login',
						code: 'REQUIRED',
						message: 'login is required',
					},
					{
						field: 'password',
						code: 'REQUIRED',
						message: 'password is required',
					},
				],
			}));
	});

	test('registration validates password strength and rejects unknown fields', async () => {
		const response = await request(app)
			.post('/api/v1/auth/register')
			.send({
				email: 'user@example.com',
				password: 'weak',
				unknown: true,
			})
			.expect(400);

		expect(response.body).toMatchObject({
			success: false,
			message: 'Request validation failed',
			error: {
				code: 'VALIDATION_ERROR',
				requestId: expect.stringMatching(requestIdPattern),
				details: expect.arrayContaining([
					expect.objectContaining({
						field: 'unknown',
						code: 'UNKNOWN_FIELD',
					}),
					expect.objectContaining({
						field: 'password',
						code: 'WEAK_PASSWORD',
					}),
				]),
			},
		});
	});

	test('refresh validates the documented request body before accessing the database', async () => {
		await request(app)
			.post('/api/v1/auth/refresh')
			.send({ refreshToken: 'short', unknown: true })
			.expect(400)
			.expect(response => {
				expect(response.body).toMatchObject({
					success: false,
					message: 'Request validation failed',
					error: {
						code: 'VALIDATION_ERROR',
						requestId: expect.stringMatching(requestIdPattern),
						details: expect.arrayContaining([
							expect.objectContaining({
								field: 'unknown',
								code: 'UNKNOWN_FIELD',
							}),
							expect.objectContaining({
								field: 'refreshToken',
								code: 'INVALID_LENGTH',
							}),
						]),
					},
				});
			});

		expect(pool.query).not.toHaveBeenCalled();
	});

	test('logout requires a valid access token before validating the refresh token', async () => {
		await request(app)
			.post('/api/v1/auth/logout')
			.send({ refreshToken: 'valid-looking-refresh-token' })
			.expect(401)
			.expect(response => expectErrorResponse(response, {
				code: 'UNAUTHORIZED',
				message: 'Unauthorized',
			}));

		expect(pool.query).not.toHaveBeenCalled();
	});

	test('logout validates its refresh token after access authentication', async () => {
		await request(app)
			.post('/api/v1/auth/logout')
			.set('Authorization', createAuthorization())
			.send({ refreshToken: 'short' })
			.expect(400)
			.expect(response => {
				expect(response.body).toMatchObject({
					success: false,
					message: 'Request validation failed',
					error: {
						code: 'VALIDATION_ERROR',
						details: [
							expect.objectContaining({
								field: 'refreshToken',
								code: 'INVALID_LENGTH',
							}),
						],
					},
				});
			});

		expect(pool.query).not.toHaveBeenCalled();
	});

	test('logout-all requires a valid access token', async () => {
		await request(app)
			.post('/api/v1/auth/logout-all')
			.expect(401)
			.expect(response => expectErrorResponse(response, {
				code: 'UNAUTHORIZED',
				message: 'Unauthorized',
			}));

		expect(pool.query).not.toHaveBeenCalled();
	});

	test('malformed JSON returns a contract validation error', async () => {
		await request(app)
			.post('/api/v1/auth/login')
			.set('Content-Type', 'application/json')
			.send('{"login":')
			.expect(400)
			.expect(response => expectErrorResponse(response, {
				code: 'VALIDATION_ERROR',
				message: 'Malformed JSON body',
				details: [{
					message: 'Request body must contain valid JSON',
				}],
			}));
	});

	test('a protected route without a JWT returns 401', async () => {
		await request(app)
			.get('/api/v1/profile')
			.expect(401)
			.expect(response => expectErrorResponse(response, {
				code: 'UNAUTHORIZED',
				message: 'Unauthorized',
			}));
	});

	test('account deletion requires the documented confirmation body', async () => {
		const response = await request(app)
			.delete('/api/v1/account')
			.set('Authorization', createAuthorization())
			.send({ password: 'Fitly#2026', confirmation: 'delete' })
			.expect(400);

		expect(response.body).toMatchObject({
			success: false,
			message: 'Request validation failed',
			error: {
				code: 'VALIDATION_ERROR',
				requestId: expect.stringMatching(requestIdPattern),
				details: [
					expect.objectContaining({
						field: 'confirmation',
						code: 'INVALID_CONFIRMATION',
					}),
				],
			},
		});
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('the undocumented profile deletion route is not exposed', async () => {
		await request(app)
			.delete('/api/v1/profile')
			.set('Authorization', createAuthorization())
			.send({ password: 'Fitly#2026' })
			.expect(404)
			.expect(response => expectErrorResponse(response, {
				code: 'NOT_FOUND',
				message: 'Route not found',
			}));
	});

	test.each([
		['Bearer ', 'Unauthorized'],
		['Bearer not-a-jwt', 'Invalid or expired token'],
		[createAuthorization(undefined, { expiresIn: -1 }), 'Invalid or expired token'],
		[createAuthorization(undefined, {}, 'different-secret'), 'Invalid or expired token'],
		[createAuthorization({ role: 'user' }), 'Invalid or expired token'],
		[createAuthorization({ userId: 1, role: 'operator' }), 'Invalid or expired token'],
	])('a protected route rejects an invalid authorization header', async (authorization, message) => {
		await request(app)
			.get('/api/v1/auth/me')
			.set('Authorization', authorization)
			.expect(401)
			.expect(response => expectErrorResponse(response, {
				code: 'UNAUTHORIZED',
				message,
			}));
	});

	test('a valid JWT loads the contract user instead of exposing token claims', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [{
				id: 7,
				email: 'admin@example.com',
				passwordHash: 'hidden',
				role: 'admin',
				isActive: true,
				emailVerified: true,
				appVersion: null,
				createdAt: '2026-07-26T10:00:00.000Z',
				updatedAt: '2026-07-26T10:00:00.000Z',
			}],
		});

		await request(app)
			.get('/api/v1/auth/me')
			.set('Authorization', createAuthorization({ userId: 7, role: 'admin' }))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					id: 7,
					email: 'admin@example.com',
					role: 'admin',
					status: 'active',
					emailVerified: true,
					appVersion: null,
					createdAt: '2026-07-26T10:00:00.000Z',
				});
				expect(response.body.meta.requestId).toMatch(requestIdPattern);
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

			await adminRequest
				.expect(status)
				.expect(response => expectErrorResponse(response, {
					code: status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
					message,
				}));
		},
	);

	test('an administrator passes the namespace guard and reaches the global 404', async () => {
		await request(app)
			.get('/api/v1/admin/not-implemented')
			.set(
				'Authorization',
				createAuthorization({ userId: 7, role: 'admin' }),
			)
			.expect(404)
			.expect(response => expectErrorResponse(response, {
				code: 'NOT_FOUND',
				message: 'Route not found',
			}));
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
					emailVerified: false,
					appVersion: null,
					createdAt: '2026-07-26T10:00:00.000Z',
				}],
			})
			.mockResolvedValueOnce({ rows: [{ id: 1 }] });
		testClient.query
			.mockResolvedValueOnce()
			.mockResolvedValueOnce({
				rows: [{
					appVersion: '1.2.3',
					lastLoginAt: new Date('2026-08-12T12:00:00.000Z'),
				}],
			})
			.mockResolvedValueOnce({ rows: [{ id: 2 }] })
			.mockResolvedValueOnce();

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
				expect(response.body.data).toMatchObject({
					token: expect.any(String),
					refreshToken: expect.any(String),
					tokenType: 'Bearer',
					expiresIn: 3600,
					user: {
						id: 7,
						email: 'admin@example.com',
						role: 'admin',
						status: 'active',
						emailVerified: false,
						appVersion: '1.2.3',
						createdAt: '2026-07-26T10:00:00.000Z',
					},
				});
				expect(response.body.meta.requestId).toMatch(requestIdPattern);
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
		[{ firstName: 42 }, 'firstName', 'INVALID_LENGTH'],
		[{ birthDate: 42 }, 'birthDate', 'INVALID_DATE'],
		[{ birthDate: '02.01.2000' }, 'birthDate', 'INVALID_DATE'],
		[{ gender: 42 }, 'gender', 'INVALID_ENUM'],
		[{ gender: 'unknown' }, 'gender', 'INVALID_ENUM'],
		[{ heightCm: '170' }, 'heightCm', 'OUT_OF_RANGE'],
		[{ heightCm: 49 }, 'heightCm', 'OUT_OF_RANGE'],
		[{ heightCm: 261 }, 'heightCm', 'OUT_OF_RANGE'],
		[{ weightKg: '60' }, 'weightKg', 'OUT_OF_RANGE'],
		[{ weightKg: 19 }, 'weightKg', 'OUT_OF_RANGE'],
		[{ weightKg: 501 }, 'weightKg', 'OUT_OF_RANGE'],
		[{ unknown: true }, 'unknown', 'UNKNOWN_FIELD'],
	])('profile validation rejects %p without accessing the database', async (body, field, detailCode) => {
		pool.query.mockClear();

		const response = await request(app)
			.put('/api/v1/profile')
			.set('Authorization', createAuthorization())
			.send(body)
			.expect(400);

		expect(response.body).toMatchObject({
			success: false,
			message: 'Request validation failed',
			error: {
				code: 'VALIDATION_ERROR',
				requestId: expect.stringMatching(requestIdPattern),
				details: [expect.objectContaining({ field, code: detailCode })],
			},
		});
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('an unexpected exception is safely handled as a 500', async () => {
		const errorApp = express();
		errorApp.get('/boom', () => {
			throw new Error('SELECT password_hash FROM Users');
		});
		errorApp.use(errorMiddleware);

		await request(errorApp)
			.get('/boom')
			.expect(500)
			.expect(response => expectErrorResponse(response, {
				code: 'INTERNAL_ERROR',
				message: 'Internal server error',
			}));
	});

	test('an API error exposes safe field details', async () => {
		const errorApp = express();
		errorApp.get('/validation', (req, res, next) => {
			next(new ApiError(400, 'Check the request', {
				details: [{
					field: 'email',
					code: 'INVALID_EMAIL',
					message: 'Email has an invalid format',
				}],
			}));
		});
		errorApp.use(errorMiddleware);

		await request(errorApp)
			.get('/validation')
			.expect(400)
			.expect(response => expectErrorResponse(response, {
				code: 'VALIDATION_ERROR',
				message: 'Check the request',
				details: [{
					field: 'email',
					code: 'INVALID_EMAIL',
					message: 'Email has an invalid format',
				}],
			}));
	});

	test('an invalid API status is normalized to a safe 500', async () => {
		const errorApp = express();
		errorApp.get('/invalid-status', (req, res, next) => {
			next(new ApiError(200, 'This must not be public'));
		});
		errorApp.use(errorMiddleware);

		await request(errorApp)
			.get('/invalid-status')
			.expect(500)
			.expect(response => expectErrorResponse(response, {
				code: 'INTERNAL_ERROR',
				message: 'Internal server error',
			}));
	});
});
