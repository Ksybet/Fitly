jest.mock('../../src/modules/admin/admin-analytics.repository', () => ({
	getOverview: jest.fn(),
}));

const adminAnalyticsRepository = require('../../src/modules/admin/admin-analytics.repository');
const adminAnalyticsService = require('../../src/modules/admin/admin-analytics.service');

describe('admin analytics service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('wraps repository counts in the documented metric values', async () => {
		adminAnalyticsRepository.getOverview.mockResolvedValue({
			registeredUsers: '12',
			activeUsers: '7',
		});

		await expect(adminAnalyticsService.getOverview({
			from: '2026-08-01',
			to: '2026-08-12',
		})).resolves.toEqual({
			from: '2026-08-01',
			to: '2026-08-12',
			registeredUsers: { value: 12 },
			activeUsers: { value: 7 },
		});
	});
});
