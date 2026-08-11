const waterRepository = require('./water.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');
const { toWaterDayDto, toWaterEntryDto } = require('./water.mapper');
const {
	getDateInTimeZone,
	getUserLocalDate,
	getUserTimezone,
} = require('../settings/user-local-date.service');

function paginationMeta(page, pageSize, total) {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

async function getTodayWater(userId) {
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getUserLocalDate(normalizedUserId);
	const water = await waterRepository.getTodayWater(normalizedUserId, date);

	return toWaterDayDto(water);
}

async function setTodayWater(userId, amountMl) {
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getUserLocalDate(normalizedUserId);
	const water = await waterRepository.setTodayWater(
		normalizedUserId,
		date,
		amountMl,
	);

	return toWaterDayDto(water);
}

async function listEntries(userId, filters) {
	const result = await waterRepository.listEntries(
		ensureValidUserId(userId),
		filters,
	);

	return {
		items: result.entries.map(toWaterEntryDto),
		meta: paginationMeta(filters.page, filters.pageSize, result.total),
	};
}

async function createEntry(userId, entryData) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const consumedAt = entryData.consumedAt || new Date(Date.now()).toISOString();
	const date = getDateInTimeZone(timezone, new Date(consumedAt));
	const entry = await waterRepository.createEntry(
		normalizedUserId,
		date,
		{ ...entryData, consumedAt },
	);
	const day = await waterRepository.getTodayWater(normalizedUserId, date);

	return {
		entry: toWaterEntryDto(entry),
		day: toWaterDayDto(day),
	};
}

async function updateEntry(userId, entryId, entryData) {
	const normalizedUserId = ensureValidUserId(userId);
	let date = null;

	if (entryData.consumedAt) {
		const timezone = await getUserTimezone(normalizedUserId);
		date = getDateInTimeZone(timezone, new Date(entryData.consumedAt));
	}

	const entry = await waterRepository.updateEntry(
		normalizedUserId,
		entryId,
		date,
		entryData,
	);

	if (!entry) {
		throw new ApiError(404, 'Water entry not found');
	}

	return toWaterEntryDto(entry);
}

async function deleteEntry(userId, entryId) {
	const deleted = await waterRepository.deleteEntry(
		ensureValidUserId(userId),
		entryId,
	);

	if (!deleted) {
		throw new ApiError(404, 'Water entry not found');
	}
}

module.exports = {
	getTodayWater,
	setTodayWater,
	listEntries,
	createEntry,
	updateEntry,
	deleteEntry,
};
