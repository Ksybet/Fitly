jest.mock('../../src/modules/daily/daily.repository', () => ({
	getToday: jest.fn(),
	upsertToday: jest.fn(),
	listSteps: jest.fn(),
	upsertSteps: jest.fn(),
}));

const dailyRepository = require('../../src/modules/daily/daily.repository');
const dailyService = require('../../src/modules/daily/daily.service');

describe('steps history service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('maps chronological step entries', async () => {
		dailyRepository.listSteps.mockResolvedValueOnce([{
			date: '2026-08-01',
			steps: '1234',
			updatedAt: new Date('2026-08-01T10:00:00.000Z'),
		}]);

		await expect(dailyService.listSteps('7', {
			from: '2026-08-01',
			to: '2026-08-31',
		})).resolves.toEqual([{
			date: '2026-08-01',
			steps: 1234,
			updatedAt: '2026-08-01T10:00:00.000Z',
		}]);
		expect(dailyRepository.listSteps).toHaveBeenCalledWith(7, {
			from: '2026-08-01',
			to: '2026-08-31',
		});
	});

	test('upserts steps for the authenticated user and explicit date', async () => {
		dailyRepository.upsertSteps.mockResolvedValueOnce({
			date: '2026-08-10',
			steps: 4321,
			updatedAt: '2026-08-10T10:00:00.000Z',
		});

		await expect(dailyService.updateSteps('7', '2026-08-10', 4321))
			.resolves.toEqual({
				date: '2026-08-10',
				steps: 4321,
				updatedAt: '2026-08-10T10:00:00.000Z',
			});
		expect(dailyRepository.upsertSteps)
			.toHaveBeenCalledWith(7, '2026-08-10', 4321);
	});
});
