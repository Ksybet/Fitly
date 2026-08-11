const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const supportRepository = require('../../src/modules/support/support.repository');
const { pool, closeDatabase } = require('../../src/config/db');

function expectTestDatabase(databaseName) {
	if (!databaseName.endsWith('_test')) {
		throw new Error(`Integration tests refuse to use non-test database: ${databaseName}`);
	}
}

function authorization(userId, role = 'user') {
	return `Bearer ${jwt.sign({ userId, role }, process.env.JWT_SECRET)}`;
}

async function createUser(email, role = 'user') {
	const result = await pool.query(
		`INSERT INTO users (email, password_hash, role)
		 VALUES ($1, 'not-used', $2)
		 RETURNING id`,
		[email, role],
	);
	return result.rows[0].id;
}

describe('Support PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(`
			TRUNCATE TABLE support_messages, support_requests, users
			RESTART IDENTITY CASCADE
		`);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('runs the complete user and administrator workflow', async () => {
		const ownerId = await createUser('support-owner@example.com');
		const otherId = await createUser('support-other@example.com');
		const adminId = await createUser('support-admin@example.com', 'admin');
		const ownerToken = authorization(ownerId);
		const otherToken = authorization(otherId);
		const adminToken = authorization(adminId, 'admin');

		const created = await request(app)
			.post('/api/v1/support/requests')
			.set('Authorization', ownerToken)
			.send({ subject: 'Calories are missing', message: 'My diary is incorrect', category: 'problem' })
			.expect(201);
		const requestId = created.body.data.id;
		expect(created.body.data).toMatchObject({ status: 'created', category: 'problem' });
		expect(created.body.data.messages).toHaveLength(1);

		await request(app).get(`/api/v1/support/requests/${requestId}`)
			.set('Authorization', otherToken).expect(404);
		await request(app).get('/api/v1/support/requests?status=created')
			.set('Authorization', ownerToken).expect(200)
			.expect(response => expect(response.body.data.map(item => item.id)).toEqual([requestId]));

		await request(app).get('/api/v1/admin/support-requests?status=created&query=CALORIES')
			.set('Authorization', adminToken).expect(200)
			.expect(response => expect(response.body.data[0]).toMatchObject({ id: requestId, userId: ownerId }));

		await request(app).patch(`/api/v1/admin/support-requests/${requestId}`)
			.set('Authorization', adminToken).send({ status: 'resolved' }).expect(409)
			.expect(response => expect(response.body.error.code).toBe('INVALID_SUPPORT_STATUS_TRANSITION'));
		await request(app).patch(`/api/v1/admin/support-requests/${requestId}`)
			.set('Authorization', adminToken).send({ status: 'in_review' }).expect(200);
		await request(app).post(`/api/v1/admin/support-requests/${requestId}/messages`)
			.set('Authorization', adminToken).send({ message: 'We are investigating' }).expect(201);
		const resolved = await request(app).patch(`/api/v1/admin/support-requests/${requestId}`)
			.set('Authorization', adminToken).send({ status: 'resolved' }).expect(200);
		expect(resolved.body.data.resolvedAt).not.toBeNull();

		await request(app).post(`/api/v1/support/requests/${requestId}/messages`)
			.set('Authorization', ownerToken).send({ message: 'The issue remains' }).expect(201);
		const reopened = await request(app).patch(`/api/v1/admin/support-requests/${requestId}`)
			.set('Authorization', adminToken).send({ status: 'in_review' }).expect(200);
		expect(reopened.body.data.resolvedAt).toBeNull();

		await request(app).post(`/api/v1/support/requests/${requestId}/close`)
			.set('Authorization', ownerToken).expect(200);
		await request(app).post(`/api/v1/support/requests/${requestId}/messages`)
			.set('Authorization', ownerToken).send({ message: 'Again' }).expect(409);
		await request(app).post(`/api/v1/admin/support-requests/${requestId}/messages`)
			.set('Authorization', adminToken).send({ message: 'Again' }).expect(409);
		await request(app).patch(`/api/v1/admin/support-requests/${requestId}`)
			.set('Authorization', adminToken).send({ status: 'in_review' }).expect(409)
			.expect(response => expect(response.body.error.code).toBe('SUPPORT_REQUEST_CLOSED'));

		await request(app).get(`/api/v1/admin/support-requests/${requestId}`)
			.set('Authorization', adminToken).expect(200)
			.expect(response => {
				expect(response.body.data.status).toBe('closed');
				expect(response.body.data.closedAt).not.toBeNull();
				expect(response.body.data.messages.map(item => item.authorType))
					.toEqual(['user', 'admin', 'user']);
			});
	});

	test('enforces schema constraints, indexes, rollback and cascading deletion', async () => {
		const userId = await createUser('support-schema@example.com');
		await expect(supportRepository.createRequest(userId, {
			subject: 'Atomic request', category: 'question', message: '   ',
		})).rejects.toMatchObject({ code: '23514' });
		const rolledBack = await pool.query('SELECT COUNT(*)::integer AS count FROM support_requests');
		expect(rolledBack.rows[0].count).toBe(0);

		await expect(pool.query(
			`INSERT INTO support_requests (user_id, subject, category)
			 VALUES ($1, 'Invalid', 'unknown')`,
			[userId],
		)).rejects.toMatchObject({ code: '23514' });

		const created = await supportRepository.createRequest(userId, {
			subject: 'Valid request', category: 'complaint', message: 'Please review',
		});
		const indexes = await pool.query(
			`SELECT indexname FROM pg_indexes
			 WHERE schemaname = 'public'
			   AND indexname = ANY($1::text[])`,
			[[
				'support_requests_user_created_idx',
				'support_requests_status_updated_idx',
				'support_messages_request_created_idx',
			]],
		);
		expect(indexes.rows).toHaveLength(3);
		await pool.query('DELETE FROM users WHERE id = $1', [userId]);
		const remaining = await pool.query(
			`SELECT
			 (SELECT COUNT(*)::integer FROM support_requests WHERE id = $1) AS requests,
			 (SELECT COUNT(*)::integer FROM support_messages WHERE support_request_id = $1) AS messages`,
			[created.id],
		);
		expect(remaining.rows[0]).toEqual({ requests: 0, messages: 0 });
	});
});
