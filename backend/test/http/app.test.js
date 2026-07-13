jest.mock('../../src/config/db', () => ({
	pool: { query: jest.fn() },
}));

const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');
const { errorMiddleware } = require('../../src/middlewares/error.middleware');

function createAuthorization() {
	const token = jwt.sign({ userId: 1, role: 'user' }, process.env.JWT_SECRET);
	return `Bearer ${token}`;
}

describe('HTTP application contracts', () => {
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
