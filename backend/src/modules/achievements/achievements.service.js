const achievementsRepository = require('./achievements.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function toDateTimeString(value) {
	return value instanceof Date ? value.toISOString() : value;
}

function deriveAchievementProgress(currentValue, targetValue) {
	const current = Number(currentValue);
	const target = Number(targetValue);
	let status = 'locked';

	if (current >= target) {
		status = 'earned';
	} else if (current > 0) {
		status = 'in_progress';
	}

	return {
		status,
		progressPercent: Math.min(
			100,
			Number(((current / target) * 100).toFixed(2)),
		),
	};
}

function toUserAchievementDto(record) {
	const currentValue = Number(record.currentValue);
	const targetValue = Number(record.targetValue);
	const progress = deriveAchievementProgress(currentValue, targetValue);

	return {
		id: Number(record.id),
		code: record.code,
		title: record.title,
		description: record.description,
		rewardType: record.rewardType,
		imageUrl: record.imageUrl ?? null,
		conditionText: record.conditionText,
		status: progress.status,
		currentValue,
		targetValue,
		progressPercent: progress.progressPercent,
		earnedAt: record.earnedAt === null || record.earnedAt === undefined
			? null
			: toDateTimeString(record.earnedAt),
	};
}

function paginationMeta(page, pageSize, total) {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

async function listAchievements(userId, filters = {}) {
	const page = filters.page ?? DEFAULT_PAGE;
	const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
	const achievements = await achievementsRepository
		.listActiveAchievementsWithProgress(ensureValidUserId(userId));
	const filtered = achievements
		.map(toUserAchievementDto)
		.filter(achievement => (
			filters.status === undefined || achievement.status === filters.status
		));
	const offset = (page - 1) * pageSize;

	return {
		items: filtered.slice(offset, offset + pageSize),
		meta: paginationMeta(page, pageSize, filtered.length),
	};
}

async function getAchievement(userId, achievementId) {
	const achievement = await achievementsRepository
		.findActiveAchievementWithProgress(
			ensureValidUserId(userId),
			achievementId,
		);

	if (!achievement) {
		throw new ApiError(404, 'Achievement not found');
	}

	return toUserAchievementDto(achievement);
}

module.exports = {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	deriveAchievementProgress,
	toUserAchievementDto,
	listAchievements,
	getAchievement,
};
