const { pool, closeDatabase } = require('../../src/config/db');

describe('Diary PostgreSQL schema', () => {
	let userId;

	beforeAll(async () => {
		const database = await pool.query('SELECT current_database() AS name');
		if (!database.rows[0].name.endsWith('_test')) {
			throw new Error(`Integration tests refuse to use: ${database.rows[0].name}`);
		}
	});

	beforeEach(async () => {
		await pool.query(`
			TRUNCATE TABLE diary_entries, users
			RESTART IDENTITY CASCADE
		`);
		const user = await pool.query(
			`INSERT INTO users (email, password_hash)
			 VALUES ('diary-schema@example.com', 'not-used')
			 RETURNING id`,
		);
		userId = user.rows[0].id;
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('creates diary entries with expected defaults', async () => {
		const result = await pool.query(
			`INSERT INTO diary_entries (user_id, recorded_at, mood_score)
			 VALUES ($1, '2026-08-10T12:00:00Z', 4)
			 RETURNING
				tags,
				symptoms,
				input_method AS "inputMethod"`,
			[userId],
		);

		expect(result.rows[0]).toEqual({
			tags: [],
			symptoms: [],
			inputMethod: 'manual',
		});
	});

	test.each([
		['mood score', 0, null, null],
		['energy level', 3, 6, null],
		['stress level', 3, null, -1],
	])('rejects invalid %s', async (label, moodScore, energyLevel, stressLevel) => {
		await expect(pool.query(
			`INSERT INTO diary_entries (
				user_id, recorded_at, mood_score, energy_level, stress_level
			 ) VALUES ($1, '2026-08-10T12:00:00Z', $2, $3, $4)`,
			[userId, moodScore, energyLevel, stressLevel],
		)).rejects.toMatchObject({ code: '23514' });
	});

	test('rejects oversized collections and notes', async () => {
		await expect(pool.query(
			`INSERT INTO diary_entries (
				user_id, recorded_at, mood_score, symptoms
			 ) VALUES ($1, NOW(), 3, $2::text[])`,
			[userId, Array.from({ length: 21 }, (_, index) => `symptom-${index}`)],
		)).rejects.toMatchObject({ code: '23514' });

		await expect(pool.query(
			`INSERT INTO diary_entries (
				user_id, recorded_at, mood_score, note
			 ) VALUES ($1, NOW(), 3, $2)`,
			[userId, 'x'.repeat(5001)],
		)).rejects.toMatchObject({ code: '23514' });
	});

	test('deletes diary entries when their owner is deleted', async () => {
		await pool.query(
			`INSERT INTO diary_entries (user_id, recorded_at, mood_score)
			 VALUES ($1, NOW(), 3)`,
			[userId],
		);
		await pool.query('DELETE FROM users WHERE id = $1', [userId]);

		const result = await pool.query(
			'SELECT COUNT(*)::integer AS total FROM diary_entries',
		);
		expect(result.rows[0].total).toBe(0);
	});
});
