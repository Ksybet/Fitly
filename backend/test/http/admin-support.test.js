jest.mock('../../src/modules/admin/admin-support.repository', () => ({
	listRequests: jest.fn(),
	getRequest: jest.fn(),
	getStatus: jest.fn(),
	updateStatus: jest.fn(),
	addMessage: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const repository = require('../../src/modules/admin/admin-support.repository');

function authorization(role = 'admin', userId = 1) {
	return `Bearer ${jwt.sign({ userId, role }, process.env.JWT_SECRET)}`;
}

function requestRow(overrides = {}) {
	return {
		id: '12', userId: 7, subject: 'Calories are missing', category: 'problem',
		status: 'created', createdAt: new Date('2026-08-12T10:00:00.000Z'),
		updatedAt: new Date('2026-08-12T10:00:00.000Z'), resolvedAt: null,
		closedAt: null, messages: [], ...overrides,
	};
}

describe('Admin support HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test.each([[undefined, 401], [authorization('user'), 403]])(
		'protects the administrative support namespace',
		async (token, status) => {
			let pending = request(app).get('/api/v1/admin/support-requests');
			if (token) pending = pending.set('Authorization', token);
			await pending.expect(status);
		},
	);

	test('lists requests by status and case-insensitive subject query', async () => {
		repository.listRequests.mockResolvedValue({ items: [requestRow()], total: 1 });
		await request(app)
			.get('/api/v1/admin/support-requests?status=created&query=calories&page=1&pageSize=10')
			.set('Authorization', authorization()).expect(200)
			.expect(response => {
				expect(response.body.data[0]).toMatchObject({ id: 12, userId: 7 });
				expect(response.body.meta).toMatchObject({ total: 1, totalPages: 1 });
			});
		expect(repository.listRequests).toHaveBeenCalledWith({
			status: 'created', query: 'calories', page: 1, pageSize: 10,
		});
	});

	test('gets a complete request', async () => {
		repository.getRequest.mockResolvedValue(requestRow());
		await request(app).get('/api/v1/admin/support-requests/12')
			.set('Authorization', authorization()).expect(200)
			.expect(response => expect(response.body.data).toMatchObject({ id: 12, userId: 7, messages: [] }));
	});

	test('changes status according to workflow', async () => {
		repository.getStatus.mockResolvedValue('created');
		repository.updateStatus.mockResolvedValue(requestRow({ status: 'in_review' }));
		repository.getRequest.mockResolvedValue(requestRow({ status: 'in_review' }));
		await request(app).patch('/api/v1/admin/support-requests/12')
			.set('Authorization', authorization()).send({ status: 'in_review' }).expect(200)
			.expect(response => expect(response.body.data.status).toBe('in_review'));
	});

	test('returns a stable conflict for an invalid transition', async () => {
		repository.getStatus.mockResolvedValue('created');
		await request(app).patch('/api/v1/admin/support-requests/12')
			.set('Authorization', authorization()).send({ status: 'resolved' }).expect(409)
			.expect(response => expect(response.body.error.code).toBe('INVALID_SUPPORT_STATUS_TRANSITION'));
	});

	test('adds an administrator message and rejects closed requests', async () => {
		repository.addMessage.mockResolvedValueOnce({
			outcome: 'created',
			message: { id: '30', authorId: 1, authorType: 'admin', message: 'Investigating', createdAt: new Date() },
		});
		await request(app).post('/api/v1/admin/support-requests/12/messages')
			.set('Authorization', authorization()).send({ message: 'Investigating' }).expect(201)
			.expect(response => expect(response.body.data).toMatchObject({ id: 30, authorType: 'admin' }));
		repository.addMessage.mockResolvedValueOnce({ outcome: 'closed' });
		await request(app).post('/api/v1/admin/support-requests/12/messages')
			.set('Authorization', authorization()).send({ message: 'Again' }).expect(409)
			.expect(response => expect(response.body.error.code).toBe('SUPPORT_REQUEST_CLOSED'));
	});

	test.each([
		['get', '/api/v1/admin/support-requests?status=pending', undefined, 'status'],
		['get', `/api/v1/admin/support-requests?query=${'x'.repeat(101)}`, undefined, 'query'],
		['get', '/api/v1/admin/support-requests/nope', undefined, 'requestId'],
		['patch', '/api/v1/admin/support-requests/12', { status: 'done' }, 'status'],
		['post', '/api/v1/admin/support-requests/12/messages', { message: '' }, 'message'],
	])('validates %s %s', async (method, url, body, field) => {
		let pending = request(app)[method](url).set('Authorization', authorization());
		if (body !== undefined) pending = pending.send(body);
		await pending.expect(400).expect(response => {
			expect(response.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field })]));
		});
	});
});
