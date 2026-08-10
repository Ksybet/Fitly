const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

function expectTestDatabase(databaseName) {
	if (!databaseName.endsWith('_test')) {
		throw new Error(`Integration tests refuse to use non-test database: ${databaseName}`);
	}
}

function authorization(userId) {
	return `Bearer ${jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

async function createUser(email, timezone = 'UTC') {
	const user = await pool.query(
		`INSERT INTO users (email, password_hash)
		 VALUES ($1, 'not-used')
		 RETURNING id`,
		[email],
	);
	await pool.query(
		`INSERT INTO user_settings (user_id, timezone)
		 VALUES ($1, $2)`,
		[user.rows[0].id, timezone],
	);

	return user.rows[0].id;
}

async function createEntry(token, body) {
	return request(app)
		.post('/api/v1/diary/entries')
		.set('Authorization', token)
		.send(body)
		.expect(201);
}

describe('Diary PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(`
			TRUNCATE TABLE diary_entries, user_settings, users
			RESTART IDENTITY CASCADE
		`);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('creates multiple entries and filters by local date and mood', async () => {
		const userId = await createUser('diary-list@example.com', 'Europe/Istanbul');
		const token = authorization(userId);

		const previousLocalDay = await createEntry(token, {
			recordedAt: '2026-08-09T20:30:00Z',
			moodScore: 2,
			note: 'Previous local day',
		});
		const afterLocalMidnight = await createEntry(token, {
			recordedAt: '2026-08-09T21:30:00Z',
			moodScore: 3,
			symptoms: ['Произвольный симптом'],
		});
		const laterSameDay = await createEntry(token, {
			recordedAt: '2026-08-10T15:00:00Z',
			moodScore: 5,
			energyLevel: 4,
			stressLevel: 1,
			tags: ['training'],
			symptoms: ['fatigue'],
			note: 'Evening note',
		});

		expect(previousLocalDay.body.data.date).toBe('2026-08-09');
		expect(afterLocalMidnight.body.data).toMatchObject({
			date: '2026-08-10',
			inputMethod: 'manual',
			symptoms: ['Произвольный симптом'],
			energyLevel: null,
			stressLevel: null,
			note: null,
		});
		expect(laterSameDay.body.data.date).toBe('2026-08-10');

		await request(app)
			.get('/api/v1/diary/entries?from=2026-08-10&to=2026-08-10')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data.map(entry => entry.id)).toEqual([
					laterSameDay.body.data.id,
					afterLocalMidnight.body.data.id,
				]);
				expect(response.body.meta).toMatchObject({
					page: 1,
					pageSize: 20,
					total: 2,
					totalPages: 1,
				});
			});

		await request(app)
			.get('/api/v1/diary/entries?from=2026-08-10&to=2026-08-10&moodScore=3')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(1);
				expect(response.body.data[0].id).toBe(afterLocalMidnight.body.data.id);
			});

		await request(app)
			.get('/api/v1/diary/entries?from=2026-08-10&to=2026-08-10&page=2&pageSize=1')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data.map(entry => entry.id)).toEqual([
					afterLocalMidnight.body.data.id,
				]);
				expect(response.body.meta).toMatchObject({
					page: 2,
					pageSize: 1,
					total: 2,
					totalPages: 2,
				});
			});
	});

	test('uses id as a stable newest-first tiebreaker', async () => {
		const userId = await createUser('diary-order@example.com');
		const token = authorization(userId);
		const first = await createEntry(token, {
			recordedAt: '2026-08-10T12:00:00Z',
			moodScore: 3,
		});
		const second = await createEntry(token, {
			recordedAt: '2026-08-10T12:00:00Z',
			moodScore: 4,
		});

		await request(app)
			.get('/api/v1/diary/entries')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data.map(entry => entry.id)).toEqual([
					second.body.data.id,
					first.body.data.id,
				]);
			});
	});

	test('updates and deletes only entries owned by the authenticated user', async () => {
		const ownerId = await createUser('diary-owner@example.com', 'Europe/Istanbul');
		const otherUserId = await createUser('diary-other@example.com', 'Europe/Istanbul');
		const ownerToken = authorization(ownerId);
		const otherToken = authorization(otherUserId);
		const created = await createEntry(ownerToken, {
			recordedAt: '2026-08-10T12:30:00+03:00',
			moodScore: 4,
			energyLevel: 5,
			stressLevel: 2,
			tags: ['work'],
			symptoms: ['headache'],
			note: 'Original note',
		});
		const entryId = created.body.data.id;

		await request(app)
			.get(`/api/v1/diary/entries/${entryId}`)
			.set('Authorization', otherToken)
			.expect(404);
		await request(app)
			.patch(`/api/v1/diary/entries/${entryId}`)
			.set('Authorization', otherToken)
			.send({ note: 'Not allowed' })
			.expect(404);
		await request(app)
			.delete(`/api/v1/diary/entries/${entryId}`)
			.set('Authorization', otherToken)
			.expect(404);

		const originalCreatedAt = created.body.data.createdAt;
		await request(app)
			.patch(`/api/v1/diary/entries/${entryId}`)
			.set('Authorization', ownerToken)
			.send({
				energyLevel: null,
				stressLevel: null,
				tags: [],
				symptoms: [],
				note: null,
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: entryId,
					recordedAt: '2026-08-10T09:30:00.000Z',
					date: '2026-08-10',
					moodScore: 4,
					energyLevel: null,
					stressLevel: null,
					tags: [],
					symptoms: [],
					note: null,
					createdAt: originalCreatedAt,
				});
			});

		await request(app)
			.delete(`/api/v1/diary/entries/${entryId}`)
			.set('Authorization', ownerToken)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ deleted: true });
			});
		await request(app)
			.get(`/api/v1/diary/entries/${entryId}`)
			.set('Authorization', ownerToken)
			.expect(404);
	});
});
