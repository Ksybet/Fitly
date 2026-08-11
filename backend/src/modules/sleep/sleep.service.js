const sleepRepository = require('./sleep.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');
const { toSleepEntryDto } = require('./sleep.mapper');
const {
	getDateInTimeZone,
	getUserLocalDate,
	getUserTimezone,
} = require('../settings/user-local-date.service');

function validateSleepInterval(sleepData) {
	const sleepStart = new Date(sleepData.sleepStart);
	const sleepEnd = new Date(sleepData.sleepEnd);
	const durationMinutes = (sleepEnd.getTime() - sleepStart.getTime()) / 60000;

	if (durationMinutes < 1 || durationMinutes > 1440) {
		throw new ApiError(400, 'Request validation failed', {
			details: [{
				field: 'sleepEnd',
				code: 'INVALID_INTERVAL',
				message: 'sleepEnd must be after sleepStart by at most 24 hours',
			}],
		});
	}
}

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
		throw new ApiError(409, 'Sleep entry already exists for this date', {
			cause: error,
		});
	}

	throw error;
}

async function getSleepDate(userId, sleepData) {
	const timezone = await getUserTimezone(userId);
	return getDateInTimeZone(timezone, new Date(sleepData.sleepEnd));
}

async function getTodaySleep(userId) {
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getUserLocalDate(normalizedUserId);
	const sleep = await sleepRepository.getTodaySleep(normalizedUserId, date);

	return toSleepEntryDto(sleep);
}

async function updateTodaySleep(userId, sleepData) {
	validateSleepInterval(sleepData);

	const normalizedUserId = ensureValidUserId(userId);
	const date = await getUserLocalDate(normalizedUserId);
	const sleep = await sleepRepository.upsertTodaySleep(
		normalizedUserId,
		date,
		{
			sleepStart: sleepData.sleepStart,
			sleepEnd: sleepData.sleepEnd,
			sleepQuality: sleepData.sleepQuality,
		},
	);

	return toSleepEntryDto(sleep);
}

async function listEntries(userId, filters) {
	const result = await sleepRepository.listEntries(
		ensureValidUserId(userId),
		filters,
	);

	return {
		items: result.entries.map(toSleepEntryDto),
		meta: paginationMeta(filters.page, filters.pageSize, result.total),
	};
}

async function createEntry(userId, sleepData) {
	validateSleepInterval(sleepData);
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getSleepDate(normalizedUserId, sleepData);

	try {
		return toSleepEntryDto(await sleepRepository.createEntry(
			normalizedUserId,
			date,
			sleepData,
		));
	} catch (error) {
		return mapDateConflict(error);
	}
}

async function updateEntry(userId, entryId, sleepData) {
	validateSleepInterval(sleepData);
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getSleepDate(normalizedUserId, sleepData);

	try {
		const entry = await sleepRepository.updateEntry(
			normalizedUserId,
			entryId,
			date,
			sleepData,
		);

		if (!entry) {
			throw new ApiError(404, 'Sleep entry not found');
		}

		return toSleepEntryDto(entry);
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		return mapDateConflict(error);
	}
}

async function deleteEntry(userId, entryId) {
	const deleted = await sleepRepository.deleteEntry(
		ensureValidUserId(userId),
		entryId,
	);

	if (!deleted) {
		throw new ApiError(404, 'Sleep entry not found');
	}
}

module.exports = {
	validateSleepInterval,
	getTodaySleep,
	updateTodaySleep,
	listEntries,
	createEntry,
	updateEntry,
	deleteEntry,
};
