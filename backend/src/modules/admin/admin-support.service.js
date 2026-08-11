const repository = require('./admin-support.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');
const {
	toRequestDto,
	toMessageDto,
	paginationMeta,
} = require('../support/support.service');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const TRANSITIONS = Object.freeze({
	created: new Set(['in_review', 'closed']),
	in_review: new Set(['resolved', 'closed']),
	resolved: new Set(['in_review', 'closed']),
	closed: new Set(),
});

async function listRequests(filters = {}) {
	const normalized = {
		status: filters.status,
		query: filters.query,
		page: filters.page ?? DEFAULT_PAGE,
		pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
	};
	const result = await repository.listRequests(normalized);
	return {
		items: result.items.map(item => toRequestDto(item, { includeUserId: true })),
		meta: paginationMeta(normalized.page, normalized.pageSize, result.total),
	};
}

async function getRequest(requestId) {
	const request = await repository.getRequest(requestId);
	if (!request) throw new ApiError(404, 'Support request not found');
	return toRequestDto(request, { includeUserId: true });
}

async function updateStatus(requestId, nextStatus) {
	const currentStatus = await repository.getStatus(requestId);
	if (currentStatus === null) throw new ApiError(404, 'Support request not found');
	if (!TRANSITIONS[currentStatus]?.has(nextStatus)) {
		throw new ApiError(409, 'Invalid support request status transition', {
			code: currentStatus === 'closed'
				? 'SUPPORT_REQUEST_CLOSED'
				: 'INVALID_SUPPORT_STATUS_TRANSITION',
		});
	}
	const updated = await repository.updateStatus(requestId, currentStatus, nextStatus);
	if (!updated) {
		throw new ApiError(409, 'Support request status changed concurrently', {
			code: 'SUPPORT_REQUEST_STATE_CHANGED',
		});
	}
	const full = await repository.getRequest(requestId);
	return toRequestDto(full ?? updated, { includeUserId: true });
}

async function addMessage(adminUserId, requestId, message) {
	const result = await repository.addMessage(
		ensureValidUserId(adminUserId), requestId, message,
	);
	if (result.outcome === 'not_found') throw new ApiError(404, 'Support request not found');
	if (result.outcome === 'closed') {
		throw new ApiError(409, 'Support request is closed', { code: 'SUPPORT_REQUEST_CLOSED' });
	}
	return toMessageDto(result.message);
}

module.exports = {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	TRANSITIONS,
	listRequests,
	getRequest,
	updateStatus,
	addMessage,
};
