jest.mock('../../src/modules/support/support.repository', () => ({
	createRequest: jest.fn(),
	listRequests: jest.fn(),
	getRequest: jest.fn(),
	addMessage: jest.fn(),
	closeRequest: jest.fn(),
}));

const repository = require('../../src/modules/support/support.repository');
const service = require('../../src/modules/support/support.service');

function requestRow(overrides = {}) {
	return {
		id: '12',
		userId: 7,
		subject: 'Calories are missing',
		category: 'problem',
		status: 'created',
		createdAt: new Date('2026-08-12T10:00:00.000Z'),
		updatedAt: new Date('2026-08-12T10:00:00.000Z'),
		resolvedAt: null,
		closedAt: null,
		...overrides,
	};
}

function messageRow(overrides = {}) {
	return {
		id: '21',
		authorId: 7,
		authorType: 'user',
		message: 'Please investigate',
		createdAt: new Date('2026-08-12T10:00:00.000Z'),
		...overrides,
	};
}

describe('support service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('creates and maps a request with its initial message', async () => {
		repository.createRequest.mockResolvedValue({
			...requestRow(),
			messages: [messageRow()],
		});
		const result = await service.createRequest(7, {
			subject: 'Calories are missing',
			message: 'Please investigate',
			category: 'problem',
		});
		expect(result).toEqual(expect.objectContaining({
			id: 12,
			status: 'created',
			resolvedAt: null,
			messages: [expect.objectContaining({ id: 21, authorId: 7 })],
		}));
		expect(result).not.toHaveProperty('userId');
	});

	test('lists requests with pagination metadata', async () => {
		repository.listRequests.mockResolvedValue({ items: [requestRow()], total: 21 });
		const result = await service.listRequests(7, { status: 'created', page: 2, pageSize: 20 });
		expect(repository.listRequests).toHaveBeenCalledWith(7, {
			status: 'created', page: 2, pageSize: 20,
		});
		expect(result.meta).toEqual({ page: 2, pageSize: 20, total: 21, totalPages: 2 });
	});

	test('hides missing and foreign requests behind not found', async () => {
		repository.getRequest.mockResolvedValue(null);
		await expect(service.getRequest(7, 99)).rejects.toMatchObject({ status: 404 });
	});

	test('rejects messages and repeated closing after closed', async () => {
		repository.addMessage.mockResolvedValue({ outcome: 'closed' });
		await expect(service.addMessage(7, 12, 'Again')).rejects.toMatchObject({
			status: 409, code: 'SUPPORT_REQUEST_CLOSED',
		});
		repository.closeRequest.mockResolvedValue('closed');
		await expect(service.closeRequest(7, 12)).rejects.toMatchObject({
			status: 409, code: 'SUPPORT_REQUEST_CLOSED',
		});
	});

	test('maps a newly created message and propagates repository failures', async () => {
		repository.addMessage.mockResolvedValue({ outcome: 'created', message: messageRow() });
		await expect(service.addMessage(7, 12, 'Please investigate')).resolves.toEqual(
			expect.objectContaining({ id: 21, authorType: 'user' }),
		);
		const failure = new Error('database unavailable');
		repository.listRequests.mockRejectedValue(failure);
		await expect(service.listRequests(7)).rejects.toBe(failure);
	});
});
