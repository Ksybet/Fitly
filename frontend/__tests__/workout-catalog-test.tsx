import React from 'react';
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react-native';
import { ApiClientError } from '../src/api/api-error';
import type { WorkoutCatalogPage } from '../src/api/workouts.api';
import { getWorkoutCatalog } from '../src/api/workouts.api';
import WorkoutCatalogScreen from '../app/workout-catalog';

const mockPush = jest.fn();

jest.mock('axios', () => ({
	isAxiosError: () => false,
}));

jest.mock('expo-router', () => ({
	router: {
		back: jest.fn(),
		push: (...args: unknown[]) => mockPush(...args),
		replace: jest.fn(),
	},
}));

jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	}),
}));

jest.mock('../src/components/BottomNav', () => {
	const { View } = require('react-native');
	return () => <View testID='bottom-nav' />;
});

jest.mock('../src/api/workouts.api', () => ({
	getWorkoutCatalog: jest.fn(),
}));

const mockedCatalog = getWorkoutCatalog as jest.MockedFunction<
	typeof getWorkoutCatalog
>;

async function renderCatalog() {
	const view = render(<WorkoutCatalogScreen />);

	await act(async () => {
		await Promise.resolve();
	});

	return view;
}

async function press(label: string) {
	fireEvent.press(screen.getByLabelText(label));

	await act(async () => {
		await Promise.resolve();
	});
}

function catalogPage(
	items: WorkoutCatalogPage['items'],
	overrides: Partial<WorkoutCatalogPage['meta']> = {},
): WorkoutCatalogPage {
	return {
		items,
		meta: {
			page: 1,
			pageSize: 20,
			total: items.length,
			totalPages: items.length === 0 ? 0 : 1,
			requestId: 'req_test',
			...overrides,
		},
	};
}

const strengthWorkout = {
	id: 1,
	title: 'Силовая для рук',
	description: 'Описание силовой тренировки',
	type: 'strength' as const,
	bodyArea: 'arms' as const,
	intensity: 'medium' as const,
	durationMinutes: 25,
	estimatedCalories: 220,
	imageUrl: null,
	isActive: true,
};

const cardioWorkout = {
	id: 4,
	title: 'Кардио для ног',
	description: 'Описание кардио',
	type: 'cardio' as const,
	bodyArea: 'legs' as const,
	intensity: 'high' as const,
	durationMinutes: 27,
	estimatedCalories: 260,
	imageUrl: null,
	isActive: true,
};

describe('WorkoutCatalogScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedCatalog.mockResolvedValue(
			catalogPage([strengthWorkout, cardioWorkout]),
		);
	});

	test('loads and renders every workout returned by API', async () => {
		await renderCatalog();

		expect(await screen.findByText('Силовая для рук')).toBeTruthy();
		expect(screen.getByText('Кардио для ног')).toBeTruthy();
		expect(mockedCatalog).toHaveBeenCalledWith({
			type: undefined,
			bodyArea: undefined,
			page: 1,
			pageSize: 20,
		});
	});

	test('sends type and body-area filters and allows clearing them', async () => {
		await renderCatalog();
		await screen.findByText('Силовая для рук');

		await press('Тип: Силовая');
		await waitFor(() => {
			expect(mockedCatalog).toHaveBeenLastCalledWith(
				expect.objectContaining({
					type: 'strength',
					bodyArea: undefined,
					page: 1,
				}),
			);
		});

		await press('Зона: Руки');
		await waitFor(() => {
			expect(mockedCatalog).toHaveBeenLastCalledWith(
				expect.objectContaining({
					type: 'strength',
					bodyArea: 'arms',
					page: 1,
				}),
			);
		});

		await press('Тип: Силовая');
		await waitFor(() => {
			expect(mockedCatalog).toHaveBeenLastCalledWith(
				expect.objectContaining({
					type: undefined,
					bodyArea: 'arms',
					page: 1,
				}),
			);
		});
	});

	test('appends the next page through Show more', async () => {
		mockedCatalog
			.mockResolvedValueOnce(catalogPage([strengthWorkout], {
				total: 2,
				totalPages: 2,
			}))
			.mockResolvedValueOnce(catalogPage([cardioWorkout], {
				page: 2,
				total: 2,
				totalPages: 2,
			}));

		await renderCatalog();
		await screen.findByText('Силовая для рук');

		await press('Показать ещё');

		expect(await screen.findByText('Кардио для ног')).toBeTruthy();
		expect(screen.getByText('Силовая для рук')).toBeTruthy();
		expect(mockedCatalog).toHaveBeenLastCalledWith(
			expect.objectContaining({ page: 2 }),
		);
	});

	test('shows empty and retry states', async () => {
		mockedCatalog
			.mockResolvedValueOnce(catalogPage([]))
			.mockRejectedValueOnce(new ApiClientError('offline', {
				code: 'NETWORK_ERROR',
			}))
			.mockResolvedValueOnce(catalogPage([strengthWorkout]));

		const view = await renderCatalog();
		expect(await screen.findByText(
			'По выбранным фильтрам тренировки не найдены.',
		)).toBeTruthy();

		await view.unmount();
		await renderCatalog();
		expect(await screen.findByText(
			'Не удалось загрузить каталог тренировок.',
		)).toBeTruthy();

		await press('Повторить');
		expect(await screen.findByText('Силовая для рук')).toBeTruthy();
	});

	test('navigates with numeric workout ID', async () => {
		await renderCatalog();
		await screen.findByText('Силовая для рук');

		await press('Открыть Силовая для рук');

		expect(mockPush).toHaveBeenCalledWith({
			pathname: '/workout-details',
			params: { id: '1' },
		});
	});

	test('ignores a stale response after filters change', async () => {
		let resolveInitial!: (value: WorkoutCatalogPage) => void;
		let resolveFiltered!: (value: WorkoutCatalogPage) => void;
		mockedCatalog
			.mockReturnValueOnce(new Promise(resolve => {
				resolveInitial = resolve;
			}))
			.mockReturnValueOnce(new Promise(resolve => {
				resolveFiltered = resolve;
			}));

		await renderCatalog();
		await press('Тип: Силовая');

		await act(async () => {
			resolveFiltered(catalogPage([strengthWorkout]));
		});
		expect(await screen.findByText('Силовая для рук')).toBeTruthy();

		await act(async () => {
			resolveInitial(catalogPage([cardioWorkout]));
		});
		expect(screen.queryByText('Кардио для ног')).toBeNull();
	});
});
