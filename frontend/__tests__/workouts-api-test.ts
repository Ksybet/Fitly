import { ApiClientError } from '../src/api/api-error';
import httpClient from '../src/api/httpClient';
import {
	getWorkoutById,
	getWorkoutCatalog,
} from '../src/api/workouts.api';

jest.mock('axios', () => ({
	isAxiosError: () => false,
}));

jest.mock('../src/api/httpClient', () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
	},
}));

const mockedGet = httpClient.get as jest.MockedFunction<typeof httpClient.get>;

describe('workouts API', () => {
	beforeEach(() => jest.clearAllMocks());

	test('sends only defined catalog filters and returns pagination metadata', async () => {
		mockedGet.mockResolvedValueOnce({
			data: {
				success: true,
				data: [{
					id: 7,
					title: 'Силовая',
					type: 'strength',
					bodyArea: 'arms',
					intensity: 'medium',
					durationMinutes: 25,
					estimatedCalories: 220,
					isActive: true,
				}],
				meta: {
					page: 2,
					pageSize: 5,
					total: 6,
					totalPages: 2,
					requestId: 'req_1',
				},
			},
		} as never);

		await expect(getWorkoutCatalog({
			type: 'strength',
			bodyArea: undefined,
			intensity: 'medium',
			maxDurationMinutes: 30,
			page: 2,
			pageSize: 5,
		})).resolves.toEqual({
			items: [expect.objectContaining({ id: 7 })],
			meta: expect.objectContaining({
				page: 2,
				totalPages: 2,
				requestId: 'req_1',
			}),
		});
		expect(mockedGet).toHaveBeenCalledWith('/workouts/catalog', {
			params: {
				type: 'strength',
				intensity: 'medium',
				maxDurationMinutes: 30,
				page: 2,
				pageSize: 5,
			},
		});
	});

	test('loads workout details by numeric ID', async () => {
		mockedGet.mockResolvedValueOnce({
			data: {
				success: true,
				data: {
					id: 4,
					title: 'Кардио',
					type: 'cardio',
					bodyArea: 'legs',
					intensity: 'high',
					durationMinutes: 27,
					estimatedCalories: 260,
					isActive: true,
					exercises: [],
					createdAt: '2026-07-31T00:00:00Z',
					updatedAt: '2026-07-31T00:00:00Z',
				},
				meta: { requestId: 'req_2' },
			},
		} as never);

		await expect(getWorkoutById(4)).resolves.toMatchObject({
			id: 4,
			title: 'Кардио',
		});
		expect(mockedGet).toHaveBeenCalledWith('/workouts/catalog/4');
	});

	test('normalizes API failures', async () => {
		mockedGet.mockRejectedValueOnce(new Error('offline'));

		await expect(getWorkoutCatalog()).rejects.toBeInstanceOf(ApiClientError);
	});
});
