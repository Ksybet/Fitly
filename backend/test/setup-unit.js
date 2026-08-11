jest.mock('../src/modules/user-activity/user-activity.service', () => ({
	recordUserActivity: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/modules/logging/logger', () => ({
	info: jest.fn().mockResolvedValue(null),
	warning: jest.fn().mockResolvedValue(null),
	error: jest.fn().mockResolvedValue(null),
	critical: jest.fn().mockResolvedValue(null),
}));

const {
	recordUserActivity,
} = require('../src/modules/user-activity/user-activity.service');
const logger = require('../src/modules/logging/logger');

beforeEach(() => {
	recordUserActivity.mockReset();
	recordUserActivity.mockResolvedValue(null);
	for (const method of ['info', 'warning', 'error', 'critical']) {
		logger[method].mockReset();
		logger[method].mockResolvedValue(null);
	}
});
