jest.mock('../../src/modules/admin/admin-catalog.repository', () => ({
	listExercises: jest.fn(),
	getExerciseById: jest.fn(),
	createExercise: jest.fn(),
	updateExercise: jest.fn(),
	deactivateExercise: jest.fn(),
	listWorkouts: jest.fn(),
	getWorkoutById: jest.fn(),
	getWorkoutExercises: jest.fn(),
	getExercisesByIds: jest.fn(),
	createWorkout: jest.fn(),
	updateWorkout: jest.fn(),
	deactivateWorkout: jest.fn(),
}));

const repository = require('../../src/modules/admin/admin-catalog.repository');
const service = require('../../src/modules/admin/admin-catalog.service');

function exerciseRow(overrides = {}) {
	return {
		id: 12,
		title: 'Burpee',
		description: 'Full body exercise',
		type: 'cardio',
		bodyArea: 'full_body',
		intensity: 'high',
		instructions: ['Jump'],
		media: [],
		isActive: true,
		createdAt: new Date('2026-08-11T10:00:00.000Z'),
		updatedAt: new Date('2026-08-11T10:00:00.000Z'),
		...overrides,
	};
}

function workoutRow(overrides = {}) {
	return {
		id: 5,
		title: 'Admin workout',
		description: 'Workout description',
		type: 'strength',
		bodyArea: 'arms',
		intensity: 'medium',
		durationMinutes: 30,
		estimatedCalories: '250.00',
		imageUrl: null,
		isActive: true,
		createdAt: new Date('2026-08-11T10:00:00.000Z'),
		updatedAt: new Date('2026-08-11T10:00:00.000Z'),
		...overrides,
	};
}

function workoutExerciseRow(overrides = {}) {
	return {
		workoutId: 5,
		exerciseId: 1,
		sortOrder: 1,
		sets: 3,
		repetitions: 10,
		durationSeconds: null,
		restSeconds: 30,
		...exerciseRow({ id: 1 }),
		...overrides,
	};
}

function workoutRecord(overrides = {}) {
	return {
		workout: workoutRow(overrides.workout),
		exercises: overrides.exercises || [workoutExerciseRow()],
	};
}

describe('admin catalog exercise service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('lists active and inactive exercises with default pagination', async () => {
		repository.listExercises.mockResolvedValueOnce({
			items: [exerciseRow({ isActive: false })],
			total: 21,
		});

		await expect(service.listExercises()).resolves.toEqual({
			items: [expect.objectContaining({ id: 12, isActive: false })],
			meta: { page: 1, pageSize: 20, total: 21, totalPages: 2 },
		});
		expect(repository.listExercises).toHaveBeenCalledWith({
			query: undefined,
			active: undefined,
			page: 1,
			pageSize: 20,
		});
	});

	test('gets an inactive exercise by id', async () => {
		repository.getExerciseById.mockResolvedValueOnce(
			exerciseRow({ isActive: false }),
		);

		await expect(service.getExercise(12)).resolves.toMatchObject({
			id: 12,
			isActive: false,
		});
	});

	test('returns NOT_FOUND for an unknown exercise', async () => {
		repository.getExerciseById.mockResolvedValueOnce(null);

		await expect(service.getExercise(999)).rejects.toMatchObject({
			status: 404,
			code: 'NOT_FOUND',
		});
	});

	test('creates and maps an exercise', async () => {
		const input = {
			title: 'Burpee',
			description: 'Full body exercise',
			type: 'cardio',
			bodyArea: 'full_body',
			intensity: 'high',
			instructions: ['Jump'],
		};
		repository.createExercise.mockResolvedValueOnce(exerciseRow());

		await expect(service.createExercise(input)).resolves.toMatchObject({
			id: 12,
			title: 'Burpee',
		});
		expect(repository.createExercise).toHaveBeenCalledWith(input);
	});

	test('partially updates and reactivates an exercise', async () => {
		repository.updateExercise.mockResolvedValueOnce(
			exerciseRow({ title: 'Updated', isActive: true }),
		);

		await expect(service.updateExercise(12, {
			title: 'Updated',
			isActive: true,
		})).resolves.toMatchObject({ title: 'Updated', isActive: true });
		expect(repository.updateExercise).toHaveBeenCalledWith(12, {
			title: 'Updated',
			isActive: true,
		});
	});

	test('returns NOT_FOUND when update target does not exist', async () => {
		repository.updateExercise.mockResolvedValueOnce(null);

		await expect(service.updateExercise(999, { title: 'Updated' }))
			.rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
	});

	test('deactivates an exercise without touching workout relationships', async () => {
		repository.deactivateExercise.mockResolvedValueOnce(true);

		await expect(service.deleteExercise(12)).resolves.toBeUndefined();
		expect(repository.deactivateExercise).toHaveBeenCalledWith(12);
	});

	test('returns NOT_FOUND when delete target does not exist', async () => {
		repository.deactivateExercise.mockResolvedValueOnce(false);

		await expect(service.deleteExercise(999)).rejects.toMatchObject({
			status: 404,
			code: 'NOT_FOUND',
		});
	});
});

describe('admin catalog workout service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('lists full active and inactive workouts', async () => {
		repository.listWorkouts.mockResolvedValueOnce({
			records: [workoutRecord({ workout: { isActive: false } })],
			total: 1,
		});

		await expect(service.listWorkouts({ active: false })).resolves.toEqual({
			items: [expect.objectContaining({
				id: 5,
				isActive: false,
				exercises: [expect.objectContaining({ exerciseId: 1, order: 1 })],
			})],
			meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
		});
	});

	test('gets an inactive workout with its ordered composition', async () => {
		repository.getWorkoutById.mockResolvedValueOnce(
			workoutRow({ isActive: false }),
		);
		repository.getWorkoutExercises.mockResolvedValueOnce([
			workoutExerciseRow(),
		]);

		await expect(service.getWorkout(5)).resolves.toMatchObject({
			id: 5,
			isActive: false,
			exercises: [{ exerciseId: 1, order: 1 }],
		});
	});

	test('returns NOT_FOUND without loading composition for an unknown workout', async () => {
		repository.getWorkoutById.mockResolvedValueOnce(null);

		await expect(service.getWorkout(999)).rejects.toMatchObject({
			status: 404,
			code: 'NOT_FOUND',
		});
		expect(repository.getWorkoutExercises).not.toHaveBeenCalled();
	});

	test('creates an active workout only from existing active exercises', async () => {
		const input = {
			title: 'Admin workout',
			description: 'Workout description',
			type: 'strength',
			bodyArea: 'arms',
			intensity: 'medium',
			durationMinutes: 30,
			estimatedCalories: 250,
			exercises: [{ exerciseId: 1, order: 1, sets: 3 }],
		};
		repository.getExercisesByIds.mockResolvedValueOnce([
			{ id: 1, isActive: true },
		]);
		repository.createWorkout.mockResolvedValueOnce(workoutRecord());

		await expect(service.createWorkout(input)).resolves.toMatchObject({
			id: 5,
			exercises: [expect.objectContaining({ exerciseId: 1 })],
		});
		expect(repository.createWorkout).toHaveBeenCalledWith(input);
	});

	test.each([
		[[], 'NOT_FOUND'],
		[[{ id: 1, isActive: false }], 'INACTIVE_RESOURCE'],
	])('rejects unavailable exercises in an active workout', async (records, code) => {
		repository.getExercisesByIds.mockResolvedValueOnce(records);
		const input = {
			isActive: true,
			exercises: [{ exerciseId: 1, order: 1 }],
		};

		await expect(service.createWorkout(input)).rejects.toMatchObject({
			status: 400,
			code: 'VALIDATION_ERROR',
			details: [expect.objectContaining({ code })],
		});
		expect(repository.createWorkout).not.toHaveBeenCalled();
	});

	test('allows an inactive workout to reference an inactive exercise', async () => {
		repository.getExercisesByIds.mockResolvedValueOnce([
			{ id: 1, isActive: false },
		]);
		repository.createWorkout.mockResolvedValueOnce(
			workoutRecord({ workout: { isActive: false } }),
		);

		await expect(service.createWorkout({
			isActive: false,
			exercises: [{ exerciseId: 1, order: 1 }],
		})).resolves.toMatchObject({ isActive: false });
	});

	test('rejects duplicate exercise ids and order values', async () => {
		repository.getExercisesByIds.mockResolvedValueOnce([
			{ id: 1, isActive: true },
		]);

		await expect(service.createWorkout({
			exercises: [
				{ exerciseId: 1, order: 1 },
				{ exerciseId: 1, order: 1 },
			],
		})).rejects.toMatchObject({
			status: 400,
			details: expect.arrayContaining([
				expect.objectContaining({ code: 'DUPLICATE' }),
			]),
		});
	});

	test('validates existing composition before reactivating a workout', async () => {
		repository.getWorkoutById.mockResolvedValueOnce(
			workoutRow({ isActive: false }),
		);
		repository.getWorkoutExercises.mockResolvedValueOnce([
			workoutExerciseRow({ isActive: false }),
		]);
		repository.getExercisesByIds.mockResolvedValueOnce([
			{ id: 1, isActive: false },
		]);

		await expect(service.updateWorkout(5, { isActive: true }))
			.rejects.toMatchObject({
				status: 400,
				details: [expect.objectContaining({ code: 'INACTIVE_RESOURCE' })],
			});
		expect(repository.updateWorkout).not.toHaveBeenCalled();
	});

	test('replaces composition while partially updating workout metadata', async () => {
		repository.getWorkoutById.mockResolvedValueOnce(workoutRow());
		repository.getWorkoutExercises.mockResolvedValueOnce([
			workoutExerciseRow(),
		]);
		repository.getExercisesByIds.mockResolvedValueOnce([
			{ id: 2, isActive: true },
		]);
		repository.updateWorkout.mockResolvedValueOnce(workoutRecord({
			workout: { title: 'Updated' },
			exercises: [workoutExerciseRow({ exerciseId: 2, id: 2 })],
		}));
		const updates = {
			title: 'Updated',
			exercises: [{ exerciseId: 2, order: 1 }],
		};

		await expect(service.updateWorkout(5, updates)).resolves.toMatchObject({
			title: 'Updated',
			exercises: [expect.objectContaining({ exerciseId: 2 })],
		});
		expect(repository.updateWorkout).toHaveBeenCalledWith(5, updates);
	});

	test('deactivates a workout idempotently through the repository', async () => {
		repository.deactivateWorkout.mockResolvedValueOnce(true);

		await expect(service.deleteWorkout(5)).resolves.toBeUndefined();
		expect(repository.deactivateWorkout).toHaveBeenCalledWith(5);
	});
});
