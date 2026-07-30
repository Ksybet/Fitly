import React, {
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeApiError, withRequestId } from '../src/api/api-error';
import type {
	Intensity,
	Workout,
	WorkoutExercise,
	WorkoutType,
} from '../src/api/contracts';
import { getWorkoutById } from '../src/api/workouts.api';
import { ThemeContext } from '../src/context/ThemeContext';

const WORKOUT_ICONS: Record<
	WorkoutType,
	keyof typeof MaterialCommunityIcons.glyphMap
> = {
	cardio: 'heart',
	strength: 'dumbbell',
	stretching: 'yoga',
	yoga: 'meditation',
};

const INTENSITY_LABELS: Record<Intensity, string> = {
	low: 'Низкая',
	medium: 'Средняя',
	high: 'Высокая',
};

type ScreenStatus = 'loading' | 'ready' | 'invalid' | 'notFound' | 'error';

function parseWorkoutId(value: string | string[] | undefined): number | undefined {
	if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
		return undefined;
	}

	const workoutId = Number(value);

	return Number.isSafeInteger(workoutId) && workoutId <= 2147483647
		? workoutId
		: undefined;
}

function pluralize(
	value: number,
	one: string,
	few: string,
	many: string,
): string {
	const remainder100 = value % 100;
	const remainder10 = value % 10;

	if (remainder100 >= 11 && remainder100 <= 14) return many;
	if (remainder10 === 1) return one;
	if (remainder10 >= 2 && remainder10 <= 4) return few;

	return many;
}

function formatDuration(seconds: number, preferMinutes: boolean): string {
	if (preferMinutes && seconds % 60 === 0) {
		const minutes = seconds / 60;

		return `${minutes} ${pluralize(minutes, 'минута', 'минуты', 'минут')}`;
	}

	return `${seconds} сек`;
}

export function formatExerciseTarget(item: WorkoutExercise): string {
	let target = '';

	if (item.sets !== undefined && item.repetitions !== undefined) {
		target = `${item.sets} ${pluralize(
			item.sets,
			'подход',
			'подхода',
			'подходов',
		)} × ${item.repetitions} раз`;
	} else if (item.sets !== undefined && item.durationSeconds !== undefined) {
		target = `${item.sets} ${pluralize(
			item.sets,
			'подход',
			'подхода',
			'подходов',
		)} × ${formatDuration(item.durationSeconds, false)}`;
	} else if (item.repetitions !== undefined) {
		target = `${item.repetitions} раз`;
	} else if (item.durationSeconds !== undefined) {
		target = formatDuration(item.durationSeconds, true);
	} else if (item.sets !== undefined) {
		target = `${item.sets} ${pluralize(
			item.sets,
			'подход',
			'подхода',
			'подходов',
		)}`;
	}

	if (item.restSeconds !== undefined) {
		const rest = `отдых ${formatDuration(item.restSeconds, false)}`;
		target = target ? `${target} · ${rest}` : rest;
	}

	return target || 'Выполняйте по инструкции';
}

export default function WorkoutDetailsScreen() {
	const insets = useSafeAreaInsets();
	const { colors, isDark } = useContext(ThemeContext);
	const params = useLocalSearchParams<{ id?: string | string[] }>();
	const workoutId = useMemo(() => parseWorkoutId(params.id), [params.id]);
	const [workout, setWorkout] = useState<Workout>();
	const [status, setStatus] = useState<ScreenStatus>(
		workoutId === undefined ? 'invalid' : 'loading',
	);
	const [errorMessage, setErrorMessage] = useState<string>();
	const [retryVersion, setRetryVersion] = useState(0);
	const requestSequence = useRef(0);

	useEffect(() => {
		if (workoutId === undefined) {
			requestSequence.current += 1;
			setWorkout(undefined);
			setErrorMessage(undefined);
			setStatus('invalid');
			return;
		}

		const sequence = ++requestSequence.current;
		setWorkout(undefined);
		setErrorMessage(undefined);
		setStatus('loading');

		getWorkoutById(workoutId)
			.then(result => {
				if (requestSequence.current !== sequence) return;

				setWorkout(result);
				setStatus('ready');
			})
			.catch(error => {
				if (requestSequence.current !== sequence) return;

				const apiError = normalizeApiError(error);

				if (apiError.status === 404) {
					setStatus('notFound');
					return;
				}

				setErrorMessage(withRequestId(
					'Не удалось загрузить тренировку. Проверьте подключение и попробуйте снова.',
					apiError.requestId,
				));
				setStatus('error');
			});

		return () => {
			if (requestSequence.current === sequence) {
				requestSequence.current += 1;
			}
		};
	}, [retryVersion, workoutId]);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					{
						paddingTop: insets.top + 10,
						paddingBottom: 34 + insets.bottom,
					},
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						activeOpacity={0.8}
						onPress={() => router.back()}
						accessibilityRole='button'
						accessibilityLabel='Назад'
					>
						<Ionicons name='chevron-back' size={24} color={colors.text} />
					</TouchableOpacity>

					<Text style={[styles.headerTitle, { color: colors.text }]}>
						Инструкция
					</Text>

					<View style={styles.backButton} />
				</View>

				<View style={[styles.divider, { backgroundColor: colors.border }]} />

				{status === 'loading' ? (
					<ScreenState
						icon='barbell-outline'
						message='Загружаем тренировку…'
						loading
					/>
				) : null}

				{status === 'invalid' ? (
					<ScreenState
						icon='warning-outline'
						title='Некорректная ссылка'
						message='В адресе должен быть указан положительный числовой ID тренировки.'
					/>
				) : null}

				{status === 'notFound' ? (
					<ScreenState
						icon='search-outline'
						title='Тренировка не найдена'
						message='Возможно, она была удалена или больше недоступна.'
					/>
				) : null}

				{status === 'error' ? (
					<ScreenState
						icon='cloud-offline-outline'
						title='Ошибка загрузки'
						message={errorMessage ?? 'Не удалось загрузить тренировку.'}
						actionLabel='Повторить'
						onAction={() => setRetryVersion(current => current + 1)}
					/>
				) : null}

				{status === 'ready' && workout ? (
					<>
						<View
							style={[
								styles.heroCard,
								{
									backgroundColor: colors.card,
									shadowColor: colors.shadow,
								},
							]}
						>
							<View
								style={[
									styles.heroIcon,
									{
										backgroundColor: isDark
											? colors.cardSecondary
											: '#E9F8F1',
									},
								]}
							>
								<MaterialCommunityIcons
									name={WORKOUT_ICONS[workout.type]}
									size={32}
									color={colors.primary}
								/>
							</View>

							<Text style={[styles.title, { color: colors.text }]}>
								{workout.title}
							</Text>

							{workout.description ? (
								<Text
									style={[styles.description, { color: colors.textMuted }]}
								>
									{workout.description}
								</Text>
							) : null}

							<View style={styles.metaRow}>
								<MetaItem
									icon='time-outline'
									label={`${workout.durationMinutes} мин`}
									color={colors.primary}
								/>
								<MetaItem
									icon='flame-outline'
									label={`${workout.estimatedCalories} ккал`}
									color={colors.warning}
								/>
								<MetaItem
									icon='speedometer-outline'
									label={INTENSITY_LABELS[workout.intensity]}
									color={colors.blue}
								/>
							</View>
						</View>

						<Text style={[styles.sectionTitle, { color: colors.text }]}>
							Упражнения
						</Text>

						{workout.exercises.map((item, index) => (
							<View
								key={`${item.exerciseId}:${item.order}`}
								style={[
									styles.exerciseCard,
									{
										backgroundColor: colors.card,
										shadowColor: colors.shadow,
									},
								]}
							>
								<View style={styles.exerciseTop}>
									<View
										style={[
											styles.exerciseNumber,
											{ backgroundColor: colors.primary },
										]}
									>
										<Text style={styles.exerciseNumberText}>{index + 1}</Text>
									</View>

									<View style={styles.exerciseInfo}>
										<Text
											style={[styles.exerciseTitle, { color: colors.text }]}
										>
											{item.exercise.title}
										</Text>

										<Text
											style={[
												styles.exerciseTime,
												{ color: colors.primary },
											]}
										>
											{formatExerciseTarget(item)}
										</Text>
									</View>
								</View>

								<Text
									style={[
										styles.exerciseDescription,
										{ color: colors.textMuted },
									]}
								>
									{item.exercise.description}
								</Text>

								<View style={styles.instructions}>
									{item.exercise.instructions.map((instruction, stepIndex) => (
										<View
											key={`${item.exerciseId}:instruction:${stepIndex}`}
											style={styles.instructionRow}
										>
											<Text
												style={[
													styles.instructionBullet,
													{ color: colors.primary },
												]}
											>
												•
											</Text>
											<Text
												style={[
													styles.instructionText,
													{ color: colors.textMuted },
												]}
											>
												{instruction}
											</Text>
										</View>
									))}
								</View>
							</View>
						))}

						<TouchableOpacity
							style={[
								styles.startButton,
								{ backgroundColor: colors.primary },
							]}
							activeOpacity={0.85}
							onPress={() => router.push('/workout-session')}
							accessibilityRole='button'
							accessibilityLabel='Начать тренировку'
						>
							<Text style={styles.startButtonText}>
								Начать тренировку
							</Text>
						</TouchableOpacity>
					</>
				) : null}
			</ScrollView>
		</View>
	);
}

function ScreenState({
	icon,
	title,
	message,
	loading = false,
	actionLabel,
	onAction,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	title?: string;
	message: string;
	loading?: boolean;
	actionLabel?: string;
	onAction?: () => void;
}) {
	const { colors } = useContext(ThemeContext);

	return (
		<View style={styles.stateContainer}>
			{loading ? (
				<ActivityIndicator size='large' color={colors.primary} />
			) : (
				<Ionicons name={icon} size={38} color={colors.textMuted} />
			)}

			{title ? (
				<Text style={[styles.stateTitle, { color: colors.text }]}>
					{title}
				</Text>
			) : null}

			<Text style={[styles.stateText, { color: colors.textMuted }]}>
				{message}
			</Text>

			{actionLabel && onAction ? (
				<TouchableOpacity
					style={[styles.retryButton, { backgroundColor: colors.primary }]}
					onPress={onAction}
					accessibilityRole='button'
					accessibilityLabel={actionLabel}
				>
					<Text style={styles.retryButtonText}>{actionLabel}</Text>
				</TouchableOpacity>
			) : null}
		</View>
	);
}

function MetaItem({
	icon,
	label,
	color,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	color: string;
}) {
	const { colors } = useContext(ThemeContext);

	return (
		<View style={[styles.metaItem, { backgroundColor: colors.track }]}>
			<Ionicons name={icon} size={15} color={color} />
			<Text style={[styles.metaText, { color: colors.textMuted }]}>
				{label}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 20,
	},
	header: {
		height: 32,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 14,
	},
	backButton: {
		width: 32,
		height: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '700',
	},
	divider: {
		height: 1,
		marginHorizontal: -20,
		marginBottom: 16,
	},
	stateContainer: {
		minHeight: 320,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 16,
	},
	stateTitle: {
		fontSize: 18,
		fontWeight: '700',
		textAlign: 'center',
	},
	stateText: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
	},
	retryButton: {
		minHeight: 40,
		borderRadius: 14,
		paddingHorizontal: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	retryButtonText: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '700',
	},
	heroCard: {
		borderRadius: 18,
		padding: 16,
		alignItems: 'center',
		marginBottom: 22,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	heroIcon: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},
	title: {
		fontSize: 20,
		fontWeight: '800',
		textAlign: 'center',
		marginBottom: 6,
	},
	description: {
		fontSize: 13,
		lineHeight: 18,
		textAlign: 'center',
		marginBottom: 14,
	},
	metaRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 8,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 6,
	},
	metaText: {
		fontSize: 11,
		fontWeight: '600',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 10,
	},
	exerciseCard: {
		borderRadius: 16,
		padding: 14,
		marginBottom: 12,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	exerciseTop: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	exerciseNumber: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	exerciseNumberText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '800',
	},
	exerciseInfo: {
		flex: 1,
	},
	exerciseTitle: {
		fontSize: 16,
		fontWeight: '700',
	},
	exerciseTime: {
		fontSize: 12,
		fontWeight: '600',
		marginTop: 2,
	},
	exerciseDescription: {
		fontSize: 13,
		lineHeight: 18,
	},
	instructions: {
		marginTop: 10,
		gap: 5,
	},
	instructionRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	instructionBullet: {
		fontSize: 16,
		lineHeight: 19,
		marginRight: 7,
	},
	instructionText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
	},
	startButton: {
		height: 46,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 8,
	},
	startButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '800',
	},
});
