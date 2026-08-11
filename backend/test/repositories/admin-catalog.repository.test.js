jest.mock('../../src/config/db', () => ({
	pool: {
		query: jest.fn(),
		connect: jest.fn(),
	},
}));

const { pool } = require('../../src/config/db');
const repository = require('../../src/modules/admin/admin-catalog.repository');

function workoutRow() {
	return {
		id: 5,
		title: 'Workout',
		description: 'Description',
		type: 'strength',
		bodyArea: 'arms',
		intensity: 'medium',
		durationMinutes: 30,
		estimatedCalories: '200.00',
		imageUrl: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

const workout = {
	title: 'Workout',
	description: 'Description',
	type: 'strength',
	bodyArea: 'arms',
	intensity: 'medium',
	durationMinutes: 30,
	estimatedCalories: 200,
	exercises: [{ exerciseId: 1, order: 1 }],
};

describe('admin catalog workout repository transactions', () => {
	beforeEach(() => jest.clearAllMocks());

	test('rolls back workout creation when composition insertion fails', async () => {
		const insertError = new Error('relation insertion failed');
		const client = {
			query: jest.fn()
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({ rows: [workoutRow()] })
				.mockRejectedValueOnce(insertError)
				.mockResolvedValueOnce({}),
			release: jest.fn(),
		};
		pool.connect.mockResolvedValueOnce(client);

		await expect(repository.createWorkout(workout)).rejects.toBe(insertError);
		expect(client.query.mock.calls.map(call => call[0])).toEqual([
			'BEGIN',
			expect.stringContaining('INSERT INTO workouts'),
			expect.stringContaining('INSERT INTO workout_exercises'),
			'ROLLBACK',
		]);
		expect(client.release).toHaveBeenCalledTimes(1);
	});

	test('rolls back workout update when replacement insertion fails', async () => {
		const insertError = new Error('replacement failed');
		const client = {
			query: jest.fn()
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({ rows: [workoutRow()] })
				.mockResolvedValueOnce({ rows: [] })
				.mockRejectedValueOnce(insertError)
				.mockResolvedValueOnce({}),
			release: jest.fn(),
		};
		pool.connect.mockResolvedValueOnce(client);

		await expect(repository.updateWorkout(5, {
			title: 'Updated',
			exercises: [{ exerciseId: 2, order: 1 }],
		})).rejects.toBe(insertError);
		expect(client.query.mock.calls.map(call => call[0])).toEqual([
			'BEGIN',
			expect.stringContaining('UPDATE workouts'),
			'DELETE FROM workout_exercises WHERE workout_id = $1',
			expect.stringContaining('INSERT INTO workout_exercises'),
			'ROLLBACK',
		]);
		expect(client.release).toHaveBeenCalledTimes(1);
	});
});
