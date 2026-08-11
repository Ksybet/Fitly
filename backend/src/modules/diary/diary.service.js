const diaryRepository = require('./diary.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { ApiError } = require('../../utils/api-error');
const { getUserTimezone } = require('../settings/user-local-date.service');
const { toDiaryEntryDto } = require('./diary.mapper');

function paginationMeta(page, pageSize, total) {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

async function createEntry(userId, entry) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const created = await diaryRepository.createEntry(
		normalizedUserId,
		entry,
		timezone,
	);

	return toDiaryEntryDto(created);
}

async function listEntries(userId, filters) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const result = await diaryRepository.listEntries(
		normalizedUserId,
		filters,
		timezone,
	);

	return {
		items: result.entries.map(toDiaryEntryDto),
		meta: paginationMeta(filters.page, filters.pageSize, result.total),
	};
}

async function getEntry(userId, entryId) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const entry = await diaryRepository.getEntryById(
		normalizedUserId,
		entryId,
		timezone,
	);

	if (!entry) {
		throw new ApiError(404, 'Diary entry not found');
	}

	return toDiaryEntryDto(entry);
}

async function updateEntry(userId, entryId, patch) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const entry = await diaryRepository.updateEntry(
		normalizedUserId,
		entryId,
		patch,
		timezone,
	);

	if (!entry) {
		throw new ApiError(404, 'Diary entry not found');
	}

	return toDiaryEntryDto(entry);
}

async function deleteEntry(userId, entryId) {
	const normalizedUserId = ensureValidUserId(userId);
	const deleted = await diaryRepository.deleteEntry(
		normalizedUserId,
		entryId,
	);

	if (!deleted) {
		throw new ApiError(404, 'Diary entry not found');
	}
}

module.exports = {
	paginationMeta,
	createEntry,
	listEntries,
	getEntry,
	updateEntry,
	deleteEntry,
};
