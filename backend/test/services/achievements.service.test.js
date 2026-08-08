jest.mock('../../src/modules/achievements/achievements.repository', () => ({
	listActiveAchievementsWithProgress: jest.fn(),
	findActiveAchievementWithProgress: jest.fn(),
	awardReachedExerciseRepetitionAchievements: jest.fn(),
}));

const repository =
	require('../../src/modules/achievements/achievements.repository');
const service = require('../../src/modules/achievements/achievements.service');

function achievementRow(overrides = {}) {
	return {
		id: 1,
		code: 'SQUATS_50',
		title: '50 приседаний',
		description: 'Выполните 50 приседаний',
		rewardType: 'badge',
		imageUrl: null,
		conditionText: 'Выполнить 50 приседаний',
		currentValue: '0',
		targetValue: 50,
		sortOrder: 1,
		earnedAt: null,
		...overrides,
	};
}

describe('achievements service', () => {
	beforeEach(() => jest.clearAllMocks());

	test.each([
		[0, 50, 'locked', 0],
		[25, 50, 'in_progress', 50],
		[50, 50, 'earned', 100],
		[175, 50, 'earned', 100],
	])(
		'derives progress %s/%s as %s',
		(current, target, status, progressPercent) => {
			expect(service.deriveAchievementProgress(current, target)).toEqual({
				status,
				progressPercent,
			});
		},
	);

	test('filters and paginates mapped achievements', async () => {
		repository.listActiveAchievementsWithProgress.mockResolvedValue([
			achievementRow({ id: 1, currentValue: '175' }),
			achievementRow({
				id: 2,
				code: 'SQUATS_100',
				currentValue: '175',
				targetValue: 100,
				sortOrder: 2,
			}),
			achievementRow({
				id: 3,
				code: 'SQUATS_150',
				currentValue: '175',
				targetValue: 150,
				sortOrder: 3,
			}),
		]);

		await expect(service.listAchievements(7, {
			status: 'earned',
			page: 2,
			pageSize: 2,
		})).resolves.toEqual({
			items: [expect.objectContaining({ id: 3, status: 'earned' })],
			meta: {
				page: 2,
				pageSize: 2,
				total: 3,
				totalPages: 2,
			},
		});
	});

	test('returns one achievement with an ISO earnedAt', async () => {
		repository.findActiveAchievementWithProgress.mockResolvedValue(
			achievementRow({
				currentValue: '50',
				earnedAt: new Date('2026-08-01T10:00:00.000Z'),
			}),
		);

		await expect(service.getAchievement(7, 1)).resolves.toMatchObject({
			status: 'earned',
			currentValue: 50,
			earnedAt: '2026-08-01T10:00:00.000Z',
		});
	});

	test('returns not found for an inactive or unknown achievement', async () => {
		repository.findActiveAchievementWithProgress.mockResolvedValue(null);

		await expect(service.getAchievement(7, 99)).rejects.toMatchObject({
			status: 404,
			code: 'NOT_FOUND',
		});
	});

	test('skips evaluation when no entities were affected', async () => {
		await expect(service.evaluateAndAward({
			client: { query: jest.fn() },
			userId: 7,
			metricType: service.METRIC_TYPES.EXERCISE_REPETITIONS,
			affectedIds: [],
			earnedAt: new Date('2026-08-01T10:00:00.000Z'),
		})).resolves.toEqual([]);

		expect(repository.awardReachedExerciseRepetitionAchievements)
			.not.toHaveBeenCalled();
	});

	test('returns no awards when no new threshold was reached', async () => {
		const client = { query: jest.fn() };
		const earnedAt = new Date('2026-08-01T10:00:00.000Z');
		repository.awardReachedExerciseRepetitionAchievements
			.mockResolvedValue([]);

		await expect(service.evaluateAndAward({
			client,
			userId: 7,
			metricType: service.METRIC_TYPES.EXERCISE_REPETITIONS,
			affectedIds: [7, 7],
			earnedAt,
		})).resolves.toEqual([]);

		expect(repository.awardReachedExerciseRepetitionAchievements)
			.toHaveBeenCalledWith(client, 7, [7], earnedAt);
	});

	test('returns every newly awarded achievement in notification-ready form', async () => {
		const client = { query: jest.fn() };
		const earnedAt = new Date('2026-08-01T10:00:00.000Z');
		repository.awardReachedExerciseRepetitionAchievements
			.mockResolvedValue([
				{
					id: 1,
					code: 'SQUATS_50',
					title: '50 приседаний',
					earnedAt,
				},
				{
					id: 2,
					code: 'SQUATS_100',
					title: '100 приседаний',
					earnedAt,
				},
			]);

		await expect(service.evaluateAndAward({
			client,
			userId: 7,
			metricType: service.METRIC_TYPES.EXERCISE_REPETITIONS,
			affectedIds: [7],
			earnedAt,
		})).resolves.toEqual([
			{
				id: 1,
				code: 'SQUATS_50',
				title: '50 приседаний',
				earnedAt: '2026-08-01T10:00:00.000Z',
			},
			{
				id: 2,
				code: 'SQUATS_100',
				title: '100 приседаний',
				earnedAt: '2026-08-01T10:00:00.000Z',
			},
		]);
	});
});
