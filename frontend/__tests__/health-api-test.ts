import httpClient from '../src/api/httpClient';
import {
	addWater,
	createSleepEntry,
	createWeightEntry,
	deleteSleepEntry,
	deleteWaterEntry,
	deleteWeightEntry,
	getWeightEntry,
	listSleepEntries,
	listStepEntries,
	listWaterEntries,
	listWeightEntries,
	updateSleepEntry,
	updateWaterEntry,
	updateWeightEntry,
	upsertStepsForDate,
} from '../src/api/health.api';

jest.mock('axios', () => ({
	isAxiosError: () => false,
}));

jest.mock('../src/api/httpClient', () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		post: jest.fn(),
		patch: jest.fn(),
		put: jest.fn(),
		delete: jest.fn(),
	},
}));

const mockedGet = httpClient.get as jest.MockedFunction<typeof httpClient.get>;
const mockedPost = httpClient.post as jest.MockedFunction<typeof httpClient.post>;
const mockedPatch = httpClient.patch as jest.MockedFunction<typeof httpClient.patch>;
const mockedPut = httpClient.put as jest.MockedFunction<typeof httpClient.put>;
const mockedDelete = httpClient.delete as jest.MockedFunction<
	typeof httpClient.delete
>;

function response(data: unknown, meta: Record<string, unknown> = {}) {
	return {
		data: {
			success: true,
			data,
			meta,
		},
	} as never;
}

const weight = {
	id: 1,
	date: '2026-08-10',
	weightKg: 70,
	createdAt: '2026-08-10T10:00:00.000Z',
	updatedAt: '2026-08-10T10:00:00.000Z',
};
const sleep = {
	id: 2,
	date: '2026-08-10',
	sleepStart: '2026-08-10T00:00:00.000Z',
	sleepEnd: '2026-08-10T08:00:00.000Z',
	sleepQuality: 4,
	durationMinutes: 480,
	createdAt: '2026-08-10T08:00:00.000Z',
	updatedAt: '2026-08-10T08:00:00.000Z',
};
const water = {
	id: 3,
	amountMl: 250,
	consumedAt: '2026-08-10T12:00:00.000Z',
	date: '2026-08-10',
	createdAt: '2026-08-10T12:00:00.000Z',
};
const pagination = {
	page: 1,
	pageSize: 20,
	total: 1,
	totalPages: 1,
	requestId: 'req_health',
};

describe('Health API client', () => {
	beforeEach(() => jest.clearAllMocks());

	test('maps all five weight operations', async () => {
		mockedGet
			.mockResolvedValueOnce(response([weight], pagination))
			.mockResolvedValueOnce(response(weight));
		mockedPost.mockResolvedValueOnce(response(weight));
		mockedPatch.mockResolvedValueOnce(response({ ...weight, weightKg: 69.5 }));
		mockedDelete.mockResolvedValueOnce(response({ deleted: true }));

		await expect(listWeightEntries({
			from: '2026-08-01',
			to: undefined,
			page: 1,
		})).resolves.toEqual({ items: [weight], meta: pagination });
		await expect(createWeightEntry({ date: weight.date, weightKg: 70 }))
			.resolves.toEqual(weight);
		await expect(getWeightEntry(1)).resolves.toEqual(weight);
		await expect(updateWeightEntry(1, { date: weight.date, weightKg: 69.5 }))
			.resolves.toMatchObject({ weightKg: 69.5 });
		await expect(deleteWeightEntry(1)).resolves.toEqual({ deleted: true });

		expect(mockedGet).toHaveBeenNthCalledWith(1, '/health/weight', {
			params: { from: '2026-08-01', page: 1 },
		});
		expect(mockedPost).toHaveBeenCalledWith('/health/weight', {
			date: weight.date,
			weightKg: 70,
		});
		expect(mockedGet).toHaveBeenNthCalledWith(2, '/health/weight/1');
		expect(mockedPatch).toHaveBeenCalledWith('/health/weight/1', {
			date: weight.date,
			weightKg: 69.5,
		});
		expect(mockedDelete).toHaveBeenCalledWith('/health/weight/1');
	});

	test('maps all four sleep operations', async () => {
		mockedGet.mockResolvedValueOnce(response([sleep], pagination));
		mockedPost.mockResolvedValueOnce(response(sleep));
		mockedPatch.mockResolvedValueOnce(response({ ...sleep, sleepQuality: 5 }));
		mockedDelete.mockResolvedValueOnce(response({ deleted: true }));
		const input = {
			sleepStart: sleep.sleepStart,
			sleepEnd: sleep.sleepEnd,
			sleepQuality: 4,
		};

		await expect(listSleepEntries()).resolves.toEqual({
			items: [sleep],
			meta: pagination,
		});
		await expect(createSleepEntry(input)).resolves.toEqual(sleep);
		await expect(updateSleepEntry(2, { ...input, sleepQuality: 5 }))
			.resolves.toMatchObject({ sleepQuality: 5 });
		await expect(deleteSleepEntry(2)).resolves.toEqual({ deleted: true });

		expect(mockedGet).toHaveBeenCalledWith('/health/sleep', { params: {} });
		expect(mockedPost).toHaveBeenCalledWith('/health/sleep', input);
		expect(mockedPatch).toHaveBeenCalledWith('/health/sleep/2', {
			...input,
			sleepQuality: 5,
		});
		expect(mockedDelete).toHaveBeenCalledWith('/health/sleep/2');
	});

	test('maps all four water operations and the recalculated day', async () => {
		const day = {
			date: '2026-08-10',
			amountMl: 250,
			goalMl: 2000,
			progressPercent: 12.5,
		};
		mockedGet.mockResolvedValueOnce(response([water], pagination));
		mockedPost.mockResolvedValueOnce(response({ entry: water, day }));
		mockedPatch.mockResolvedValueOnce(response({ ...water, amountMl: 500 }));
		mockedDelete.mockResolvedValueOnce(response({ deleted: true }));

		await expect(listWaterEntries({ pageSize: 10 })).resolves.toEqual({
			items: [water],
			meta: pagination,
		});
		await expect(addWater({
			amountMl: 250,
			consumedAt: water.consumedAt,
		})).resolves.toEqual({ entry: water, day });
		await expect(updateWaterEntry(3, { amountMl: 500 }))
			.resolves.toMatchObject({ amountMl: 500 });
		await expect(deleteWaterEntry(3)).resolves.toEqual({ deleted: true });

		expect(mockedGet).toHaveBeenCalledWith('/health/water', {
			params: { pageSize: 10 },
		});
		expect(mockedPost).toHaveBeenCalledWith('/health/water', {
			amountMl: 250,
			consumedAt: water.consumedAt,
		});
		expect(mockedPatch).toHaveBeenCalledWith('/health/water/3', {
			amountMl: 500,
		});
		expect(mockedDelete).toHaveBeenCalledWith('/health/water/3');
	});

	test('maps both step operations', async () => {
		const step = {
			date: '2026-08-10',
			steps: 4321,
			updatedAt: '2026-08-10T10:00:00.000Z',
		};
		mockedGet.mockResolvedValueOnce(response([step]));
		mockedPut.mockResolvedValueOnce(response(step));

		await expect(listStepEntries({
			from: '2026-08-01',
			to: '2026-08-31',
		})).resolves.toEqual([step]);
		await expect(upsertStepsForDate('2026-08-10', 4321))
			.resolves.toEqual(step);

		expect(mockedGet).toHaveBeenCalledWith('/health/steps', {
			params: { from: '2026-08-01', to: '2026-08-31' },
		});
		expect(mockedPut).toHaveBeenCalledWith('/health/steps/2026-08-10', {
			steps: 4321,
		});
	});
});
