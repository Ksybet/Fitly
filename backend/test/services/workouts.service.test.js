jest.mock('../../src/modules/workouts/workouts.repository', () => ({
	listActiveWorkouts: jest.fn(),
	getActiveWorkoutById: jest.fn(),
	getWorkoutExercises: jest.fn(),
}));

const workoutsRepository =
	require('../../src/modules/workouts/workouts.repository');
const workoutsService = require('../../src/modules/workouts/workouts.service');
const {
	toWorkoutSummaryDto,
	toWorkoutExerciseDto,
} = require('../../src/modules/workouts/workouts.mapper');

function workoutRow(overrides = {}) {
	return {
		id: 1,
		title: 'Силовая для рук',
		description: 'Описание',
		type: 'strength',
		bodyArea: 'arms',
		intensity: 'medium',
		durationMinutes: 25,
		estimatedCalories: '220.00',
		imageUrl: null,
		isActive: true,
		createdAt: new Date('2026-07-31T08:00:00.000Z'),
		updatedAt: new Date('2026-07-31T09:00:00.000Z'),
		...overrides,
	};
}

function exerciseRow(overrides = {}) {
	return {
		exerciseId: 1,
		sortOrder: 1,
		sets: 3,
		repetitions: 10,
		durationSeconds: null,
		restSeconds: null,
		id: 1,
		title: 'Отжимания',
		description: 'Описание упражнения',
		type: 'strength',
		bodyArea: 'arms',
		intensity: 'medium',
		instructions: ['Держите корпус ровно.'],
		media: [],
		isActive: true,
		createdAt: new Date('2026-07-31T08:00:00.000Z'),
		updatedAt: new Date('2026-07-31T09:00:00.000Z'),
		...overrides,
	};
}

describe('workouts service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('uses default pagination and maps catalog rows', async () => {
		workoutsRepository.listActiveWorkouts.mockResolvedValueOnce({
			items: [workoutRow()],
			total: 21,
		});

		await expect(workoutsService.listWorkoutCatalog()).resolves.toEqual({
			items: [{
				id: 1,
				title: 'Силовая для рук',
				description: 'Описание',
				type: 'strength',
				bodyArea: 'arms',
				intensity: 'medium',
				durationMinutes: 25,
				estimatedCalories: 220,
				imageUrl: null,
				isActive: true,
			}],
			meta: {
				page: 1,
				pageSize: 20,
				total: 21,
				totalPages: 2,
			},
		});
		expect(workoutsRepository.listActiveWorkouts).toHaveBeenCalledWith({
			type: undefined,
			bodyArea: undefined,
			intensity: undefined,
			maxDurationMinutes: undefined,
			page: 1,
			pageSize: 20,
		});
	});

	test('passes normalized filters and custom pagination', async () => {
		workoutsRepository.listActiveWorkouts.mockResolvedValueOnce({
			items: [],
			total: 0,
		});
		const filters = {
			type: 'strength',
			bodyArea: 'arms',
			intensity: 'medium',
			maxDurationMinutes: 30,
			page: 2,
			pageSize: 5,
		};

		await expect(workoutsService.listWorkoutCatalog(filters)).resolves.toEqual({
			items: [],
			meta: {
				page: 2,
				pageSize: 5,
				total: 0,
				totalPages: 0,
			},
		});
		expect(workoutsRepository.listActiveWorkouts).toHaveBeenCalledWith(filters);
	});

	test('returns workout exercises ordered by sortOrder', async () => {
		workoutsRepository.getActiveWorkoutById
			.mockResolvedValueOnce(workoutRow());
		workoutsRepository.getWorkoutExercises.mockResolvedValueOnce([
			exerciseRow({
				exerciseId: 2,
				id: 2,
				sortOrder: 2,
				title: 'Планка',
				sets: null,
				repetitions: null,
				durationSeconds: 30,
			}),
			exerciseRow(),
		]);

		const result = await workoutsService.getWorkout(1);

		expect(result.exercises.map(exercise => exercise.exerciseId))
			.toEqual([1, 2]);
		expect(result.exercises[0]).toMatchObject({
			order: 1,
			sets: 3,
			repetitions: 10,
		});
		expect(result.exercises[1]).toMatchObject({
			order: 2,
			durationSeconds: 30,
		});
		expect(result.createdAt).toBe('2026-07-31T08:00:00.000Z');
	});

	test('returns NOT_FOUND without loading exercises for unavailable workout', async () => {
		workoutsRepository.getActiveWorkoutById.mockResolvedValueOnce(null);

		await expect(workoutsService.getWorkout(44)).rejects.toMatchObject({
			status: 404,
			code: 'NOT_FOUND',
		});
		expect(workoutsRepository.getWorkoutExercises).not.toHaveBeenCalled();
	});
});

describe('workouts mapper', () => {
	test('converts PostgreSQL numeric fields and excludes timestamps from summary', () => {
		expect(toWorkoutSummaryDto(workoutRow())).toEqual({
			id: 1,
			title: 'Силовая для рук',
			description: 'Описание',
			type: 'strength',
			bodyArea: 'arms',
			intensity: 'medium',
			durationMinutes: 25,
			estimatedCalories: 220,
			imageUrl: null,
			isActive: true,
		});
	});

	test('omits nullable workout parameters and maps exercise timestamps', () => {
		expect(toWorkoutExerciseDto(exerciseRow({
			sets: null,
			repetitions: null,
			durationSeconds: 120,
			restSeconds: 0,
		}))).toEqual({
			exerciseId: 1,
			order: 1,
			durationSeconds: 120,
			restSeconds: 0,
			exercise: {
				id: 1,
				title: 'Отжимания',
				description: 'Описание упражнения',
				type: 'strength',
				bodyArea: 'arms',
				intensity: 'medium',
				instructions: ['Держите корпус ровно.'],
				media: [],
				isActive: true,
				createdAt: '2026-07-31T08:00:00.000Z',
				updatedAt: '2026-07-31T09:00:00.000Z',
			},
		});
	});
});
