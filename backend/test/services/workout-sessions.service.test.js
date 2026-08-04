jest.mock(
	'../../src/modules/workout-sessions/workout-sessions.repository',
	() => ({
		listSessions: jest.fn(),
		findActiveSessionByUserId: jest.fn(),
		findSessionById: jest.fn(),
		findSessionForUpdate: jest.fn(),
		createSession: jest.fn(),
		pauseSession: jest.fn(),
		resumeSession: jest.fn(),
		finishSession: jest.fn(),
		cancelSession: jest.fn(),
		insertExerciseResults: jest.fn(),
		findExercisesByWorkoutId: jest.fn(),
		findWorkoutPlanForUpdate: jest.fn(),
		hasActiveOrCompletedSessionForPlan: jest.fn(),
		completeWorkoutPlan: jest.fn(),
	}),
);
jest.mock('../../src/modules/workouts/workouts.repository', () => ({
	getActiveWorkoutById: jest.fn(),
}));
jest.mock(
	'../../src/modules/workout-sessions/workout-session-clock',
	() => ({ now: jest.fn() }),
);
jest.mock(
	'../../src/modules/settings/user-local-date.service',
	() => ({ getUserTimezone: jest.fn() }),
);
const mockTransactionClient = { query: jest.fn() };
jest.mock('../../src/utils/db-transaction', () => ({
	withTransaction: jest.fn(callback => callback(mockTransactionClient)),
}));

const repository =
	require('../../src/modules/workout-sessions/workout-sessions.repository');
const workoutsRepository =
	require('../../src/modules/workouts/workouts.repository');
const clock =
	require('../../src/modules/workout-sessions/workout-session-clock');
const localDateService =
	require('../../src/modules/settings/user-local-date.service');
const service =
	require('../../src/modules/workout-sessions/workout-sessions.service');

const tenOClock = new Date('2026-07-31T10:00:00.000Z');

function sessionRow(overrides = {}) {
	return {
		id: 5,
		userId: 2,
		workoutId: 3,
		workoutPlanId: null,
		status: 'in_progress',
		startedAt: tenOClock,
		pausedAt: null,
		finishedAt: null,
		accumulatedPauseSeconds: 0,
		elapsedSeconds: null,
		caloriesBurned: null,
		createdAt: tenOClock,
		updatedAt: tenOClock,
		workoutTitle: 'Силовая',
		workoutDescription: 'Описание',
		workoutType: 'strength',
		workoutBodyArea: 'full_body',
		workoutIntensity: 'medium',
		workoutDurationMinutes: 25,
		workoutEstimatedCalories: '220.00',
		workoutImageUrl: null,
		workoutIsActive: true,
		exerciseResults: [],
		...overrides,
	};
}

describe('workout sessions service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		clock.now.mockReturnValue(tenOClock);
		localDateService.getUserTimezone.mockResolvedValue('Europe/Moscow');
		workoutsRepository.getActiveWorkoutById.mockResolvedValue({ id: 3 });
		repository.findActiveSessionByUserId.mockResolvedValue(null);
		repository.createSession.mockResolvedValue(sessionRow());
		repository.hasActiveOrCompletedSessionForPlan
			.mockResolvedValue(false);
		repository.insertExerciseResults.mockResolvedValue();
		repository.completeWorkoutPlan.mockResolvedValue(true);
	});

	test('starts a catalog workout using server time', async () => {
		await expect(service.startWorkoutSession(2, {
			workoutId: 3,
			workoutPlanId: null,
		})).resolves.toMatchObject({
			id: 5,
			workoutId: 3,
			workoutPlanId: null,
			status: 'in_progress',
			elapsedSeconds: 0,
		});
		expect(repository.createSession).toHaveBeenCalledWith(
			mockTransactionClient,
			2,
			{
				workoutId: 3,
				workoutPlanId: null,
				startedAt: tenOClock,
			},
		);
	});

	test('starts a workout from an owned scheduled plan', async () => {
		repository.findWorkoutPlanForUpdate.mockResolvedValueOnce({
			id: 12,
			workoutId: 3,
			status: 'scheduled',
		});
		repository.createSession.mockResolvedValueOnce(sessionRow({
			workoutPlanId: 12,
		}));

		await expect(service.startWorkoutSession(2, {
			workoutId: 3,
			workoutPlanId: 12,
		})).resolves.toMatchObject({ workoutPlanId: 12 });
		expect(repository.findWorkoutPlanForUpdate).toHaveBeenCalledWith(
			mockTransactionClient,
			2,
			12,
		);
	});

	test('rejects an unavailable workout and an existing active session', async () => {
		workoutsRepository.getActiveWorkoutById.mockResolvedValueOnce(null);
		await expect(service.startWorkoutSession(2, { workoutId: 3 }))
			.rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });

		repository.findActiveSessionByUserId
			.mockResolvedValueOnce(sessionRow());
		await expect(service.startWorkoutSession(2, { workoutId: 3 }))
			.rejects.toMatchObject({
				status: 409,
				code: 'ACTIVE_WORKOUT_SESSION_EXISTS',
			});
	});

	test.each([
		[null, 'NOT_FOUND'],
		[
			{ workoutId: 3, status: 'cancelled' },
			'WORKOUT_PLAN_NOT_SCHEDULED',
		],
		[
			{ workoutId: 4, status: 'scheduled' },
			'WORKOUT_PLAN_WORKOUT_MISMATCH',
		],
	])('rejects an invalid linked plan %#', async (plan, code) => {
		repository.findWorkoutPlanForUpdate.mockResolvedValueOnce(plan);

		await expect(service.startWorkoutSession(2, {
			workoutId: 3,
			workoutPlanId: 12,
		})).rejects.toMatchObject({ code });
	});

	test('rejects a plan that already has a session', async () => {
		repository.findWorkoutPlanForUpdate.mockResolvedValueOnce({
			workoutId: 3,
			status: 'scheduled',
		});
		repository.hasActiveOrCompletedSessionForPlan
			.mockResolvedValueOnce(true);

		await expect(service.startWorkoutSession(2, {
			workoutId: 3,
			workoutPlanId: 12,
		})).rejects.toMatchObject({
			status: 409,
			code: 'WORKOUT_PLAN_SESSION_EXISTS',
		});
	});

	test.each([
		[
			'workout_sessions_one_active_per_user_idx',
			'ACTIVE_WORKOUT_SESSION_EXISTS',
		],
		[
			'workout_sessions_plan_active_or_completed_idx',
			'WORKOUT_PLAN_SESSION_EXISTS',
		],
	])('maps unique constraint %s', async (constraint, code) => {
		repository.createSession.mockRejectedValueOnce({
			code: '23505',
			constraint,
		});

		await expect(service.startWorkoutSession(2, { workoutId: 3 }))
			.rejects.toMatchObject({ status: 409, code });
	});

	test('gets a dynamically timed active session or null', async () => {
		clock.now.mockReturnValueOnce(
			new Date('2026-07-31T10:05:00.000Z'),
		);
		repository.findActiveSessionByUserId
			.mockResolvedValueOnce(sessionRow());
		await expect(service.getActiveWorkoutSession(2))
			.resolves.toMatchObject({ elapsedSeconds: 300 });

		repository.findActiveSessionByUserId.mockResolvedValueOnce(null);
		await expect(service.getActiveWorkoutSession(2)).resolves.toBeNull();
	});

	test('lists owned sessions with normalized pagination', async () => {
		repository.listSessions.mockResolvedValueOnce({
			items: [sessionRow()],
			total: 21,
		});

		await expect(service.listWorkoutSessions(2, {
			status: 'completed',
			page: 2,
			pageSize: 10,
		})).resolves.toMatchObject({
			items: [expect.objectContaining({ id: 5 })],
			meta: {
				page: 2,
				pageSize: 10,
				total: 21,
				totalPages: 3,
			},
		});
		expect(repository.listSessions).toHaveBeenCalledWith(
			2,
			{
				from: undefined,
				to: undefined,
				status: 'completed',
				page: 2,
				pageSize: 10,
			},
			'Europe/Moscow',
		);
	});

	test('does not disclose a missing or foreign session', async () => {
		repository.findSessionById.mockResolvedValueOnce(null);
		await expect(service.getWorkoutSession(2, 99))
			.rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
	});

	test('pauses an in-progress session', async () => {
		const pausedAt = new Date('2026-07-31T10:10:00.000Z');
		clock.now.mockReturnValueOnce(pausedAt);
		repository.findSessionForUpdate
			.mockResolvedValueOnce(sessionRow());
		repository.pauseSession.mockResolvedValueOnce(sessionRow({
			status: 'paused',
			pausedAt,
			updatedAt: pausedAt,
		}));

		await expect(service.pauseWorkoutSession(2, 5))
			.resolves.toMatchObject({
				status: 'paused',
				elapsedSeconds: 600,
			});
		expect(repository.pauseSession).toHaveBeenCalledWith(
			mockTransactionClient,
			2,
			5,
			pausedAt,
		);
	});

	test('rejects pausing a non-active session', async () => {
		repository.findSessionForUpdate.mockResolvedValueOnce(sessionRow({
			status: 'paused',
			pausedAt: tenOClock,
		}));
		await expect(service.pauseWorkoutSession(2, 5))
			.rejects.toMatchObject({
				code: 'WORKOUT_SESSION_NOT_PAUSABLE',
			});
	});

	test('resumes a paused session and accumulates pause time', async () => {
		const pausedAt = new Date('2026-07-31T10:10:00.000Z');
		const resumedAt = new Date('2026-07-31T10:12:00.000Z');
		clock.now.mockReturnValueOnce(resumedAt);
		repository.findSessionForUpdate.mockResolvedValueOnce(sessionRow({
			status: 'paused',
			pausedAt,
			accumulatedPauseSeconds: 60,
		}));
		repository.resumeSession.mockResolvedValueOnce(sessionRow({
			accumulatedPauseSeconds: 180,
			updatedAt: resumedAt,
		}));

		await service.resumeWorkoutSession(2, 5);
		expect(repository.resumeSession).toHaveBeenCalledWith(
			mockTransactionClient,
			2,
			5,
			180,
			resumedAt,
		);
	});

	test('rejects resuming a non-paused session', async () => {
		repository.findSessionForUpdate.mockResolvedValueOnce(sessionRow());
		await expect(service.resumeWorkoutSession(2, 5))
			.rejects.toMatchObject({
				code: 'WORKOUT_SESSION_NOT_RESUMABLE',
			});
	});

	test('finishes an active session with results and calories', async () => {
		const finishedAt = new Date('2026-07-31T10:17:00.000Z');
		const exerciseResults = [{
			exerciseId: 7,
			completed: true,
			setsCompleted: 3,
		}];
		clock.now.mockReturnValueOnce(finishedAt);
		repository.findSessionForUpdate.mockResolvedValueOnce(sessionRow({
			accumulatedPauseSeconds: 120,
		}));
		repository.findExercisesByWorkoutId.mockResolvedValueOnce([
			{ exerciseId: 7 },
		]);
		repository.findSessionById.mockResolvedValueOnce(sessionRow({
			status: 'completed',
			finishedAt,
			accumulatedPauseSeconds: 120,
			elapsedSeconds: 900,
			caloriesBurned: '235.00',
			exerciseResults,
		}));

		await expect(service.finishWorkoutSession(2, 5, {
			caloriesBurned: 235,
			exerciseResults,
		})).resolves.toMatchObject({
			status: 'completed',
			elapsedSeconds: 900,
			caloriesBurned: 235,
			exerciseResults,
		});
		expect(repository.finishSession).toHaveBeenCalledWith(
			mockTransactionClient,
			2,
			5,
			{
				finishedAt,
				accumulatedPauseSeconds: 120,
				elapsedSeconds: 900,
				caloriesBurned: 235,
			},
		);
		expect(repository.insertExerciseResults).toHaveBeenCalledWith(
			mockTransactionClient,
			5,
			exerciseResults,
		);
	});

	test('calculates and stores fallback calories when omitted', async () => {
		const finishedAt = new Date('2026-07-31T10:15:00.000Z');
		clock.now.mockReturnValueOnce(finishedAt);
		repository.findSessionForUpdate.mockResolvedValueOnce(sessionRow());
		repository.findSessionById.mockResolvedValueOnce(sessionRow({
			status: 'completed',
			finishedAt,
			elapsedSeconds: 900,
			caloriesBurned: '132.00',
		}));

		await expect(service.finishWorkoutSession(2, 5)).resolves.toMatchObject({
			caloriesBurned: 132,
		});
		expect(repository.finishSession).toHaveBeenCalledWith(
			mockTransactionClient,
			2,
			5,
			expect.objectContaining({
				elapsedSeconds: 900,
				caloriesBurned: 132,
			}),
		);
	});

	test('caps fallback calories at the contract maximum', () => {
		expect(service.calculateFallbackCalories({
			workoutEstimatedCalories: 5000,
			workoutDurationMinutes: 5,
		}, 600)).toBe(5000);
	});

	test('finishes a paused session and completes its plan', async () => {
		const pausedAt = new Date('2026-07-31T10:10:00.000Z');
		const finishedAt = new Date('2026-07-31T10:12:00.000Z');
		clock.now.mockReturnValueOnce(finishedAt);
		repository.findSessionForUpdate.mockResolvedValueOnce(sessionRow({
			status: 'paused',
			pausedAt,
			workoutPlanId: 12,
		}));
		repository.findWorkoutPlanForUpdate.mockResolvedValueOnce({
			id: 12,
			status: 'scheduled',
		});
		repository.findSessionById.mockResolvedValueOnce(sessionRow({
			status: 'completed',
			workoutPlanId: 12,
			finishedAt,
			accumulatedPauseSeconds: 120,
			elapsedSeconds: 600,
		}));

		await expect(service.finishWorkoutSession(2, 5))
			.resolves.toMatchObject({
				status: 'completed',
				elapsedSeconds: 600,
			});
		expect(repository.completeWorkoutPlan).toHaveBeenCalledWith(
			mockTransactionClient,
			2,
			12,
			5,
			finishedAt,
		);
	});

	test.each([
		['completed', 'WORKOUT_SESSION_ALREADY_COMPLETED'],
		['cancelled', 'WORKOUT_SESSION_CANCELLED'],
	])('rejects finishing a %s session', async (status, code) => {
		repository.findSessionForUpdate
			.mockResolvedValueOnce(sessionRow({ status }));
		await expect(service.finishWorkoutSession(2, 5))
			.rejects.toMatchObject({ status: 409, code });
	});

	test('rejects duplicate and foreign exercise results', async () => {
		await expect(service.finishWorkoutSession(2, 5, {
			exerciseResults: [
				{ exerciseId: 7, completed: true },
				{ exerciseId: 7, completed: false },
			],
		})).rejects.toMatchObject({
			status: 400,
			code: 'VALIDATION_ERROR',
		});

		repository.findSessionForUpdate.mockResolvedValueOnce(sessionRow());
		repository.findExercisesByWorkoutId.mockResolvedValueOnce([
			{ exerciseId: 8 },
		]);
		await expect(service.finishWorkoutSession(2, 5, {
			exerciseResults: [{ exerciseId: 7, completed: true }],
		})).rejects.toMatchObject({
			status: 400,
			details: [expect.objectContaining({ code: 'NOT_IN_WORKOUT' })],
		});
	});

	test('rolls completion back when the linked plan cannot be completed', async () => {
		repository.findSessionForUpdate.mockResolvedValueOnce(sessionRow({
			workoutPlanId: 12,
		}));
		repository.findWorkoutPlanForUpdate.mockResolvedValueOnce({
			status: 'scheduled',
		});
		repository.completeWorkoutPlan.mockResolvedValueOnce(false);

		await expect(service.finishWorkoutSession(2, 5))
			.rejects.toMatchObject({
				status: 409,
				code: 'WORKOUT_PLAN_NOT_SCHEDULED',
			});
	});

	test('cancels a paused session without writing results or changing plan', async () => {
		const pausedAt = new Date('2026-07-31T10:10:00.000Z');
		const finishedAt = new Date('2026-07-31T10:12:00.000Z');
		clock.now.mockReturnValueOnce(finishedAt);
		repository.findSessionForUpdate.mockResolvedValueOnce(sessionRow({
			status: 'paused',
			pausedAt,
			workoutPlanId: 12,
		}));
		repository.findSessionById.mockResolvedValueOnce(sessionRow({
			status: 'cancelled',
			workoutPlanId: 12,
			finishedAt,
			accumulatedPauseSeconds: 120,
			elapsedSeconds: 600,
		}));

		await expect(service.cancelWorkoutSession(2, 5))
			.resolves.toMatchObject({
				status: 'cancelled',
				elapsedSeconds: 600,
			});
		expect(repository.insertExerciseResults).not.toHaveBeenCalled();
		expect(repository.completeWorkoutPlan).not.toHaveBeenCalled();
	});

	test.each([
		['cancelled', 'WORKOUT_SESSION_ALREADY_CANCELLED'],
		['completed', 'WORKOUT_SESSION_ALREADY_COMPLETED'],
	])('rejects cancelling a %s session', async (status, code) => {
		repository.findSessionForUpdate
			.mockResolvedValueOnce(sessionRow({ status }));
		await expect(service.cancelWorkoutSession(2, 5))
			.rejects.toMatchObject({ status: 409, code });
	});
});
