jest.mock('../../src/modules/support/support.repository', () => ({
	createRequest: jest.fn(),
	listRequests: jest.fn(),
	getRequest: jest.fn(),
	addMessage: jest.fn(),
	closeRequest: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const repository = require('../../src/modules/support/support.repository');

function authorization(userId = 7) {
	return `Bearer ${jwt.sign({ userId, role: 'user' }, process.env.JWT_SECRET)}`;
}

function requestRow(overrides = {}) {
	return {
		id: '12', userId: 7, subject: 'Calories are missing', category: 'problem',
		status: 'created', createdAt: new Date('2026-08-12T10:00:00.000Z'),
		updatedAt: new Date('2026-08-12T10:00:00.000Z'), resolvedAt: null, closedAt: null,
		...overrides,
	};
}

function messageRow(overrides = {}) {
	return {
		id: '21', authorId: 7, authorType: 'user', message: 'Please investigate',
		createdAt: new Date('2026-08-12T10:00:00.000Z'), ...overrides,
	};
}

describe('Support HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('requires authentication for the namespace', async () => {
		await request(app).get('/api/v1/support/requests').expect(401);
		expect(repository.listRequests).not.toHaveBeenCalled();
	});

	test('creates a request and trims transport strings', async () => {
		repository.createRequest.mockResolvedValue({ ...requestRow(), messages: [messageRow()] });
		await request(app)
			.post('/api/v1/support/requests')
			.set('Authorization', authorization())
			.send({ subject: '  Calories are missing ', message: ' Please investigate ', category: 'problem' })
			.expect(201)
			.expect(response => {
				expect(response.body.data).toMatchObject({ id: 12, category: 'problem', status: 'created' });
				expect(response.body.data).not.toHaveProperty('userId');
			});
		expect(repository.createRequest).toHaveBeenCalledWith(7, {
			subject: 'Calories are missing', message: 'Please investigate', category: 'problem',
		});
	});

	test('lists owned requests with status and pagination', async () => {
		repository.listRequests.mockResolvedValue({ items: [requestRow()], total: 1 });
		await request(app)
			.get('/api/v1/support/requests?status=created&page=1&pageSize=10')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(1);
				expect(response.body.meta).toMatchObject({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
			});
		expect(repository.listRequests).toHaveBeenCalledWith(7, {
			status: 'created', page: 1, pageSize: 10,
		});
	});

	test('gets a request with chronological messages', async () => {
		repository.getRequest.mockResolvedValue({ ...requestRow(), messages: [messageRow()] });
		await request(app).get('/api/v1/support/requests/12')
			.set('Authorization', authorization()).expect(200)
			.expect(response => expect(response.body.data.messages[0]).toMatchObject({ id: 21, authorType: 'user' }));
		expect(repository.getRequest).toHaveBeenCalledWith(7, 12);
	});

	test('adds a message and closes an owned request', async () => {
		repository.addMessage.mockResolvedValue({ outcome: 'created', message: messageRow() });
		repository.closeRequest.mockResolvedValue('closed_now');
		await request(app).post('/api/v1/support/requests/12/messages')
			.set('Authorization', authorization()).send({ message: 'Please investigate' }).expect(201);
		await request(app).post('/api/v1/support/requests/12/close')
			.set('Authorization', authorization()).expect(200)
			.expect(response => expect(response.body.data).toEqual({ completed: true }));
	});

	test('returns not found for absent or foreign requests', async () => {
		repository.getRequest.mockResolvedValue(null);
		await request(app).get('/api/v1/support/requests/99')
			.set('Authorization', authorization()).expect(404);
	});

	test('returns a stable conflict when a closed request receives a message', async () => {
		repository.addMessage.mockResolvedValue({ outcome: 'closed' });
		await request(app).post('/api/v1/support/requests/12/messages')
			.set('Authorization', authorization()).send({ message: 'Again' }).expect(409)
			.expect(response => expect(response.body.error.code).toBe('SUPPORT_REQUEST_CLOSED'));
	});

	test.each([
		['get', '/api/v1/support/requests?status=pending', undefined, 'status'],
		['get', '/api/v1/support/requests?pageSize=101', undefined, 'pageSize'],
		['get', '/api/v1/support/requests/not-a-number', undefined, 'requestId'],
		['post', '/api/v1/support/requests', { subject: '', message: 'x' }, 'subject'],
		['post', '/api/v1/support/requests', { subject: 'x', message: 'x', unknown: true }, 'unknown'],
		['post', '/api/v1/support/requests/12/messages', { message: '   ' }, 'message'],
	])('validates %s %s', async (method, url, body, field) => {
		let pending = request(app)[method](url).set('Authorization', authorization());
		if (body !== undefined) pending = pending.send(body);
		await pending.expect(400).expect(response => {
			expect(response.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field })]));
		});
	});
});
