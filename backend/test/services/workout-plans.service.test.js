jest.mock('../../src/modules/workout-plans/workout-plans.repository', () => ({
	getWorkoutPlanById: jest.fn(),
	listWorkoutPlans: jest.fn(),
	createWorkoutPlan: jest.fn(),
	updateWorkoutPlan: jest.fn(),
	cancelWorkoutPlan: jest.fn(),
}));
jest.mock('../../src/modules/workouts/workouts.repository', () => ({
	getActiveWorkoutById: jest.fn(),
}));
jest.mock('../../src/modules/settings/user-local-date.service', () => ({
	getUserTimezone: jest.fn(),
}));

const workoutPlansRepository =
	require('../../src/modules/workout-plans/workout-plans.repository');
const workoutsRepository =
	require('../../src/modules/workouts/workouts.repository');
const {
	getUserTimezone,
} = require('../../src/modules/settings/user-local-date.service');
const workoutPlansService =
	require('../../src/modules/workout-plans/workout-plans.service');

function workoutPlanRow(overrides = {}) {
	return {
		id: 7,
		workoutId: 3,
		scheduledAt: new Date('2026-08-10T15:00:00.000Z'),
		reminderMinutesBefore: 45,
		status: 'scheduled',
		completedSessionId: null,
		createdAt: new Date('2026-07-31T10:00:00.000Z'),
		updatedAt: new Date('2026-07-31T10:00:00.000Z'),
		workoutTitle: 'Силовая для рук',
		workoutDescription: 'Описание',
		workoutType: 'strength',
		workoutBodyArea: 'arms',
		workoutIntensity: 'medium',
		workoutDurationMinutes: 25,
		workoutEstimatedCalories: '220.00',
		workoutImageUrl: null,
		workoutIsActive: true,
		...overrides,
	};
}

describe('workout plans service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Date, 'now')
			.mockReturnValue(Date.parse('2026-07-31T12:00:00.000Z'));
		getUserTimezone.mockResolvedValue('Europe/Moscow');
		workoutsRepository.getActiveWorkoutById.mockResolvedValue({ id: 3 });
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('lists mapped plans using the user timezone', async () => {
		workoutPlansRepository.listWorkoutPlans
			.mockResolvedValueOnce([workoutPlanRow()]);

		await expect(workoutPlansService.listWorkoutPlans(2, {
			from: '2026-08-10',
			to: '2026-08-10',
			status: 'scheduled',
		})).resolves.toEqual([expect.objectContaining({
			id: 7,
			workoutId: 3,
			scheduledAt: '2026-08-10T15:00:00.000Z',
			reminderMinutesBefore: 45,
			status: 'scheduled',
			completedSessionId: null,
			workout: {
				id: 3,
				title: 'Силовая для рук',
				description: 'Описание',
				type: 'strength',
				bodyArea: 'arms',
				intensity: 'medium',
				durationMinutes: 25,
				estimatedCalories: 220,
				imageUrl: null,
				isActive: true,
			},
		})]);
		expect(getUserTimezone).toHaveBeenCalledWith(2);
		expect(workoutPlansRepository.listWorkoutPlans).toHaveBeenCalledWith(
			2,
			{
				from: '2026-08-10',
				to: '2026-08-10',
				status: 'scheduled',
			},
			'Europe/Moscow',
		);
	});

	test('creates a scheduled plan with the default reminder', async () => {
		workoutPlansRepository.createWorkoutPlan
			.mockResolvedValueOnce(workoutPlanRow({
				reminderMinutesBefore: 30,
			}));

		await expect(workoutPlansService.createWorkoutPlan(2, {
			workoutId: 3,
			scheduledAt: '2026-08-10T18:00:00+03:00',
		})).resolves.toMatchObject({
			id: 7,
			reminderMinutesBefore: 30,
		});
		expect(workoutsRepository.getActiveWorkoutById).toHaveBeenCalledWith(3);
		expect(workoutPlansRepository.createWorkoutPlan).toHaveBeenCalledWith(
			2,
			{
				workoutId: 3,
				scheduledAt: '2026-08-10T18:00:00+03:00',
				reminderMinutesBefore: 30,
			},
		);
	});

	test('rejects a plan scheduled at or before the current instant', async () => {
		await expect(workoutPlansService.createWorkoutPlan(2, {
			workoutId: 3,
			scheduledAt: '2026-07-31T12:00:00Z',
		})).rejects.toMatchObject({
			status: 400,
			code: 'VALIDATION_ERROR',
			details: [expect.objectContaining({
				field: 'scheduledAt',
				code: 'SCHEDULED_AT_IN_PAST',
			})],
		});
		expect(workoutsRepository.getActiveWorkoutById).not.toHaveBeenCalled();
	});

	test.each([
		[{ workoutId: 0 }, 'workoutId'],
		[{ reminderMinutesBefore: -1 }, 'reminderMinutesBefore'],
		[{ reminderMinutesBefore: 10081 }, 'reminderMinutesBefore'],
	])('rejects invalid create input %j', async (override, field) => {
		await expect(workoutPlansService.createWorkoutPlan(2, {
			workoutId: 3,
			scheduledAt: '2026-08-10T15:00:00Z',
			...override,
		})).rejects.toMatchObject({
			status: 400,
			details: [expect.objectContaining({ field })],
		});
	});

	test('returns not found for an unavailable workout', async () => {
		workoutsRepository.getActiveWorkoutById.mockResolvedValueOnce(null);

		await expect(workoutPlansService.createWorkoutPlan(2, {
			workoutId: 3,
			scheduledAt: '2026-08-10T15:00:00Z',
		})).rejects.toMatchObject({
			status: 404,
			code: 'NOT_FOUND',
		});
		expect(workoutPlansRepository.createWorkoutPlan).not.toHaveBeenCalled();
	});

	test('updates a scheduled plan and preserves an omitted reminder', async () => {
		workoutPlansRepository.getWorkoutPlanById
			.mockResolvedValueOnce(workoutPlanRow());
		workoutPlansRepository.updateWorkoutPlan
			.mockResolvedValueOnce(workoutPlanRow({
				scheduledAt: new Date('2026-08-11T16:00:00.000Z'),
			}));

		await expect(workoutPlansService.updateWorkoutPlan(2, 7, {
			workoutId: 3,
			scheduledAt: '2026-08-11T19:00:00+03:00',
		})).resolves.toMatchObject({
			id: 7,
			reminderMinutesBefore: 45,
		});
		expect(workoutPlansRepository.updateWorkoutPlan).toHaveBeenCalledWith(
			2,
			7,
			{
				workoutId: 3,
				scheduledAt: '2026-08-11T19:00:00+03:00',
				reminderMinutesBefore: undefined,
			},
		);
	});

	test.each([
		['cancelled', 'WORKOUT_PLAN_NOT_EDITABLE'],
		['completed', 'WORKOUT_PLAN_ALREADY_COMPLETED'],
	])('rejects updating a %s plan', async (status, code) => {
		workoutPlansRepository.getWorkoutPlanById
			.mockResolvedValueOnce(workoutPlanRow({ status }));

		await expect(workoutPlansService.updateWorkoutPlan(2, 7, {
			workoutId: 3,
			scheduledAt: '2026-08-11T16:00:00Z',
		})).rejects.toMatchObject({ status: 409, code });
		expect(workoutsRepository.getActiveWorkoutById).not.toHaveBeenCalled();
		expect(workoutPlansRepository.updateWorkoutPlan).not.toHaveBeenCalled();
	});

	test('does not disclose a missing or foreign plan', async () => {
		workoutPlansRepository.getWorkoutPlanById.mockResolvedValueOnce(null);

		await expect(workoutPlansService.updateWorkoutPlan(2, 7, {
			workoutId: 3,
			scheduledAt: '2026-08-11T16:00:00Z',
		})).rejects.toMatchObject({
			status: 404,
			code: 'NOT_FOUND',
		});
	});

	test('cancels a scheduled plan', async () => {
		workoutPlansRepository.getWorkoutPlanById
			.mockResolvedValueOnce(workoutPlanRow());
		workoutPlansRepository.cancelWorkoutPlan
			.mockResolvedValueOnce(workoutPlanRow({ status: 'cancelled' }));

		await expect(workoutPlansService.cancelWorkoutPlan(2, 7))
			.resolves.toMatchObject({
				id: 7,
				status: 'cancelled',
			});
		expect(workoutPlansRepository.cancelWorkoutPlan)
			.toHaveBeenCalledWith(2, 7);
	});

	test.each([
		['cancelled', 'WORKOUT_PLAN_ALREADY_CANCELLED'],
		['completed', 'WORKOUT_PLAN_ALREADY_COMPLETED'],
	])('rejects cancelling a %s plan', async (status, code) => {
		workoutPlansRepository.getWorkoutPlanById
			.mockResolvedValueOnce(workoutPlanRow({ status }));

		await expect(workoutPlansService.cancelWorkoutPlan(2, 7))
			.rejects.toMatchObject({ status: 409, code });
		expect(workoutPlansRepository.cancelWorkoutPlan).not.toHaveBeenCalled();
	});
});
