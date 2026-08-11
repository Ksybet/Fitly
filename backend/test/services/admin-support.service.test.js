jest.mock('../../src/modules/admin/admin-support.repository', () => ({
	listRequests: jest.fn(),
	getRequest: jest.fn(),
	getStatus: jest.fn(),
	updateStatus: jest.fn(),
	addMessage: jest.fn(),
}));

const repository = require('../../src/modules/admin/admin-support.repository');
const service = require('../../src/modules/admin/admin-support.service');

function requestRow(overrides = {}) {
	return {
		id: '12', userId: 7, subject: 'Calories are missing', category: 'problem',
		status: 'created', createdAt: new Date('2026-08-12T10:00:00.000Z'),
		updatedAt: new Date('2026-08-12T10:00:00.000Z'), resolvedAt: null, closedAt: null,
		messages: [], ...overrides,
	};
}

describe('admin support service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('lists all requests with user ids and filters', async () => {
		repository.listRequests.mockResolvedValue({ items: [requestRow()], total: 1 });
		const result = await service.listRequests({ status: 'created', query: 'calories', page: 1, pageSize: 10 });
		expect(result.items[0]).toMatchObject({ id: 12, userId: 7 });
		expect(result.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
	});

	test.each([
		['created', 'in_review'], ['created', 'closed'],
		['in_review', 'resolved'], ['in_review', 'closed'],
		['resolved', 'in_review'], ['resolved', 'closed'],
	])('allows %s to %s', async (current, next) => {
		repository.getStatus.mockResolvedValue(current);
		repository.updateStatus.mockResolvedValue(requestRow({ status: next }));
		repository.getRequest.mockResolvedValue(requestRow({ status: next }));
		await expect(service.updateStatus(12, next)).resolves.toMatchObject({ status: next, userId: 7 });
		expect(repository.updateStatus).toHaveBeenCalledWith(12, current, next);
	});

	test.each([
		['created', 'resolved'], ['created', 'created'],
		['in_review', 'created'], ['resolved', 'created'],
	])('rejects %s to %s', async (current, next) => {
		repository.getStatus.mockResolvedValue(current);
		await expect(service.updateStatus(12, next)).rejects.toMatchObject({
			status: 409, code: 'INVALID_SUPPORT_STATUS_TRANSITION',
		});
		expect(repository.updateStatus).not.toHaveBeenCalled();
	});

	test('treats closed as terminal and detects concurrent changes', async () => {
		repository.getStatus.mockResolvedValueOnce('closed');
		await expect(service.updateStatus(12, 'in_review')).rejects.toMatchObject({
			code: 'SUPPORT_REQUEST_CLOSED',
		});
		repository.getStatus.mockResolvedValueOnce('created');
		repository.updateStatus.mockResolvedValueOnce(null);
		await expect(service.updateStatus(12, 'in_review')).rejects.toMatchObject({
			code: 'SUPPORT_REQUEST_STATE_CHANGED',
		});
	});

	test('returns not found and rejects a message after closing', async () => {
		repository.getRequest.mockResolvedValue(null);
		await expect(service.getRequest(99)).rejects.toMatchObject({ status: 404 });
		repository.addMessage.mockResolvedValue({ outcome: 'closed' });
		await expect(service.addMessage(1, 12, 'Done')).rejects.toMatchObject({
			status: 409, code: 'SUPPORT_REQUEST_CLOSED',
		});
	});
});
