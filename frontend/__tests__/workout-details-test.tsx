import React from 'react';
import {
	act,
	fireEvent,
	render,
	screen,
} from '@testing-library/react-native';
import WorkoutDetailsScreen from '../app/workout-details';
import { ApiClientError } from '../src/api/api-error';
import type { Workout } from '../src/api/contracts';
import { getWorkoutById } from '../src/api/workouts.api';

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockParams: { id?: string | string[] } = { id: '7' };

jest.mock('axios', () => ({
	isAxiosError: () => false,
}));

jest.mock('expo-router', () => ({
	router: {
		back: (...args: unknown[]) => mockBack(...args),
		push: (...args: unknown[]) => mockPush(...args),
	},
	useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	}),
}));

jest.mock('../src/api/workouts.api', () => ({
	getWorkoutById: jest.fn(),
}));

const mockedGetWorkoutById = getWorkoutById as jest.MockedFunction<
	typeof getWorkoutById
>;

const workout: Workout = {
	id: 7,
	title: 'Тренировка с сервера',
	description: 'Описание тренировки',
	type: 'strength',
	bodyArea: 'full_body',
	intensity: 'medium',
	durationMinutes: 25,
	estimatedCalories: 220,
	imageUrl: null,
	isActive: true,
	createdAt: '2026-07-30T10:00:00.000Z',
	updatedAt: '2026-07-30T10:00:00.000Z',
	exercises: [
		{
			exerciseId: 2,
			order: 2,
			sets: 3,
			repetitions: 10,
			restSeconds: 30,
			exercise: {
				id: 2,
				title: 'Второе в ответе',
				description: 'Описание второго упражнения',
				type: 'strength',
				bodyArea: 'arms',
				intensity: 'medium',
				instructions: [
					'Сохраняйте корпус ровным.',
					'Двигайтесь без рывков.',
				],
				media: [],
				isActive: true,
				createdAt: '2026-07-30T10:00:00.000Z',
				updatedAt: '2026-07-30T10:00:00.000Z',
			},
		},
		{
			exerciseId: 1,
			order: 1,
			durationSeconds: 120,
			exercise: {
				id: 1,
				title: 'Первое в ответе',
				description: 'Описание первого упражнения',
				type: 'stretching',
				bodyArea: 'full_body',
				intensity: 'low',
				instructions: ['Дышите спокойно.'],
				media: [],
				isActive: true,
				createdAt: '2026-07-30T10:00:00.000Z',
				updatedAt: '2026-07-30T10:00:00.000Z',
			},
		},
	],
};

async function flushUpdates() {
	await act(async () => {
		await Promise.resolve();
	});
}

async function press(label: string) {
	fireEvent.press(screen.getByLabelText(label));
	await flushUpdates();
}

describe('WorkoutDetailsScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockParams = { id: '7' };
		mockedGetWorkoutById.mockResolvedValue(workout);
	});

	test('loads details by numeric ID and keeps server exercise order', async () => {
		let resolveWorkout!: (value: Workout) => void;
		mockedGetWorkoutById.mockReturnValue(new Promise(resolve => {
			resolveWorkout = resolve;
		}));

		render(<WorkoutDetailsScreen />);

		expect(screen.getByText('Загружаем тренировку…')).toBeTruthy();
		expect(mockedGetWorkoutById).toHaveBeenCalledWith(7);

		await act(async () => {
			resolveWorkout(workout);
		});

		expect(await screen.findByText('Тренировка с сервера')).toBeTruthy();
		const exerciseTitles = screen.getAllByText(/в ответе$/).map(
			node => node.props.children,
		);
		expect(exerciseTitles).toEqual([
			'Второе в ответе',
			'Первое в ответе',
		]);
		expect(screen.getByText(
			'3 подхода × 10 раз · отдых 30 сек',
		)).toBeTruthy();
		expect(screen.getByText('2 минуты')).toBeTruthy();
		expect(screen.getByText('Сохраняйте корпус ровным.')).toBeTruthy();
		expect(screen.getByText('Двигайтесь без рывков.')).toBeTruthy();
		expect(screen.getByText('Дышите спокойно.')).toBeTruthy();
	});

	test('rejects an invalid route parameter without an API request', () => {
		mockParams = { id: 'strength-arms' };

		render(<WorkoutDetailsScreen />);

		expect(screen.getByText('Некорректная ссылка')).toBeTruthy();
		expect(mockedGetWorkoutById).not.toHaveBeenCalled();
	});

	test('shows a separate not-found state for 404', async () => {
		mockedGetWorkoutById.mockRejectedValue(new ApiClientError('missing', {
			status: 404,
			code: 'WORKOUT_NOT_FOUND',
		}));

		render(<WorkoutDetailsScreen />);
		await flushUpdates();

		expect(await screen.findByText('Тренировка не найдена')).toBeTruthy();
		expect(screen.queryByLabelText('Повторить')).toBeNull();
	});

	test('retries a network error', async () => {
		mockedGetWorkoutById
			.mockRejectedValueOnce(new ApiClientError('offline', {
				code: 'NETWORK_ERROR',
			}))
			.mockResolvedValueOnce(workout);

		render(<WorkoutDetailsScreen />);
		await flushUpdates();

		expect(await screen.findByText('Ошибка загрузки')).toBeTruthy();
		await press('Повторить');

		expect(await screen.findByText('Тренировка с сервера')).toBeTruthy();
		expect(mockedGetWorkoutById).toHaveBeenCalledTimes(2);
		expect(mockedGetWorkoutById).toHaveBeenNthCalledWith(2, 7);
	});

	test('keeps the existing transition to the workout session', async () => {
		render(<WorkoutDetailsScreen />);
		await flushUpdates();
		await screen.findByText('Тренировка с сервера');

		await press('Начать тренировку');

		expect(mockPush).toHaveBeenCalledWith('/workout-session');
	});
});
