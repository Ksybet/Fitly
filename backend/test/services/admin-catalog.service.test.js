jest.mock('../../src/modules/admin/admin-catalog.repository', () => ({
	listExercises: jest.fn(),
	getExerciseById: jest.fn(),
	createExercise: jest.fn(),
	updateExercise: jest.fn(),
	deactivateExercise: jest.fn(),
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
