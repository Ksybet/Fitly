jest.unmock('../../src/modules/user-activity/user-activity.service');
jest.mock('../../src/modules/user-activity/user-activity.repository', () => ({
	recordDailyActivity: jest.fn(),
}));

const userActivityRepository = require('../../src/modules/user-activity/user-activity.repository');
const {
	recordUserActivity,
} = require('../../src/modules/user-activity/user-activity.service');

describe('user activity service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('normalizes the authenticated user id before recording activity', async () => {
		userActivityRepository.recordDailyActivity.mockResolvedValue({
			userId: 7,
			activityDate: '2026-08-12',
		});

		await expect(recordUserActivity('7')).resolves.toMatchObject({
			userId: 7,
		});
		expect(userActivityRepository.recordDailyActivity).toHaveBeenCalledWith(7);
	});

	test('rejects an invalid authenticated user id without querying persistence', async () => {
		await expect(recordUserActivity(0)).rejects.toMatchObject({ status: 400 });
		expect(userActivityRepository.recordDailyActivity).not.toHaveBeenCalled();
	});
});
