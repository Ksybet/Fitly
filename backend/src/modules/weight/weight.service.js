const weightRepository = require('./weight.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');
const { toWeightEntryDto } = require('./weight.mapper');

function paginationMeta(page, pageSize, total) {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

function mapDateConflict(error) {
	if (error?.code === '23505') {
		throw new ApiError(409, 'Weight entry already exists for this date', {
			cause: error,
		});
	}

	throw error;
}

async function listEntries(userId, filters) {
	const normalizedUserId = ensureValidUserId(userId);
	const result = await weightRepository.listEntries(normalizedUserId, filters);

	return {
		items: result.entries.map(toWeightEntryDto),
		meta: paginationMeta(filters.page, filters.pageSize, result.total),
	};
}

async function createEntry(userId, entry) {
	const normalizedUserId = ensureValidUserId(userId);

	try {
		return toWeightEntryDto(await weightRepository.createEntry(
			normalizedUserId,
			entry,
		));
	} catch (error) {
		return mapDateConflict(error);
	}
}

async function getEntry(userId, entryId) {
	const entry = await weightRepository.getEntryById(
		ensureValidUserId(userId),
		entryId,
	);

	if (!entry) {
		throw new ApiError(404, 'Weight entry not found');
	}

	return toWeightEntryDto(entry);
}

async function updateEntry(userId, entryId, data) {
	try {
		const entry = await weightRepository.updateEntry(
			ensureValidUserId(userId),
			entryId,
			data,
		);

		if (!entry) {
			throw new ApiError(404, 'Weight entry not found');
		}

		return toWeightEntryDto(entry);
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		return mapDateConflict(error);
	}
}

async function deleteEntry(userId, entryId) {
	const deleted = await weightRepository.deleteEntry(
		ensureValidUserId(userId),
		entryId,
	);

	if (!deleted) {
		throw new ApiError(404, 'Weight entry not found');
	}
}

module.exports = {
	paginationMeta,
	listEntries,
	createEntry,
	getEntry,
	updateEntry,
	deleteEntry,
};
