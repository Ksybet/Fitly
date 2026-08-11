const supportRepository = require('./support.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function dateTime(value) {
	if (value === null || value === undefined) return null;
	return value instanceof Date ? value.toISOString() : value;
}

function toMessageDto(message) {
	const dto = {
		id: Number(message.id),
		authorType: message.authorType,
		message: message.message,
		createdAt: dateTime(message.createdAt),
	};
	if (message.authorId !== null && message.authorId !== undefined) {
		dto.authorId = Number(message.authorId);
	}
	return dto;
}

function toRequestDto(request, { includeUserId = false } = {}) {
	const dto = {
		id: Number(request.id),
		subject: request.subject,
		category: request.category,
		status: request.status,
		createdAt: dateTime(request.createdAt),
		updatedAt: dateTime(request.updatedAt),
		resolvedAt: dateTime(request.resolvedAt),
		closedAt: dateTime(request.closedAt),
	};
	if (includeUserId) dto.userId = Number(request.userId);
	if (Array.isArray(request.messages)) {
		dto.messages = request.messages.map(toMessageDto);
	}
	return dto;
}

function paginationMeta(page, pageSize, total) {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

async function createRequest(userId, input) {
	const created = await supportRepository.createRequest(
		ensureValidUserId(userId),
		input,
	);
	return toRequestDto(created);
}

async function listRequests(userId, filters = {}) {
	const normalized = {
		status: filters.status,
		page: filters.page ?? DEFAULT_PAGE,
		pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
	};
	const result = await supportRepository.listRequests(
		ensureValidUserId(userId),
		normalized,
	);
	return {
		items: result.items.map(item => toRequestDto(item)),
		meta: paginationMeta(normalized.page, normalized.pageSize, result.total),
	};
}

async function getRequest(userId, requestId) {
	const request = await supportRepository.getRequest(
		ensureValidUserId(userId),
		requestId,
	);
	if (!request) throw new ApiError(404, 'Support request not found');
	return toRequestDto(request);
}

async function addMessage(userId, requestId, message) {
	const result = await supportRepository.addMessage(
		ensureValidUserId(userId),
		requestId,
		message,
	);
	if (result.outcome === 'not_found') {
		throw new ApiError(404, 'Support request not found');
	}
	if (result.outcome === 'closed') {
		throw new ApiError(409, 'Support request is closed', {
			code: 'SUPPORT_REQUEST_CLOSED',
		});
	}
	return toMessageDto(result.message);
}

async function closeRequest(userId, requestId) {
	const outcome = await supportRepository.closeRequest(
		ensureValidUserId(userId),
		requestId,
	);
	if (outcome === 'not_found') {
		throw new ApiError(404, 'Support request not found');
	}
	if (outcome === 'closed') {
		throw new ApiError(409, 'Support request is already closed', {
			code: 'SUPPORT_REQUEST_CLOSED',
		});
	}
}

module.exports = {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	toMessageDto,
	toRequestDto,
	paginationMeta,
	createRequest,
	listRequests,
	getRequest,
	addMessage,
	closeRequest,
};
