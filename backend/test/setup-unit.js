jest.mock('../src/modules/user-activity/user-activity.service', () => ({
	recordUserActivity: jest.fn().mockResolvedValue(null),
}));

const {
	recordUserActivity,
} = require('../src/modules/user-activity/user-activity.service');

beforeEach(() => {
	recordUserActivity.mockReset();
	recordUserActivity.mockResolvedValue(null);
});
