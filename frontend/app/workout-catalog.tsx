import React, {
	useContext,
	useEffect,
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNav from '../src/components/BottomNav';
import { ThemeContext } from '../src/context/ThemeContext';
import { normalizeApiError, withRequestId } from '../src/api/api-error';
import type {
	BodyArea,
	Intensity,
	PaginationMeta,
	WorkoutSummary,
	WorkoutType,
} from '../src/api/contracts';
import { getWorkoutCatalog } from '../src/api/workouts.api';

type WorkoutTypeOption = {
	key: WorkoutType;
	label: string;
	icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

type BodyAreaOption = {
	key: BodyArea;
	label: string;
	icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const WORKOUT_TYPES: WorkoutTypeOption[] = [
	{ key: 'cardio', label: 'Кардио', icon: 'heart' },
	{ key: 'strength', label: 'Силовая', icon: 'dumbbell' },
	{ key: 'stretching', label: 'Растяжка', icon: 'yoga' },
	{ key: 'yoga', label: 'Йога', icon: 'meditation' },
];

const BODY_AREAS: BodyAreaOption[] = [
	{ key: 'abs', label: 'Пресс', icon: 'human' },
	{ key: 'arms', label: 'Руки', icon: 'arm-flex-outline' },
	{ key: 'glutes', label: 'Ягодицы', icon: 'human-female' },
	{ key: 'legs', label: 'Ноги', icon: 'shoe-print' },
	{ key: 'back', label: 'Спина', icon: 'human-male-height' },
	{ key: 'full_body', label: 'Все тело', icon: 'human-male' },
];

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

function mergeWorkoutPages(
	current: WorkoutSummary[],
	incoming: WorkoutSummary[],
) {
	const merged = new Map(current.map(workout => [workout.id, workout]));

	for (const workout of incoming) {
		merged.set(workout.id, workout);
	}

	return [...merged.values()];
}

export default function WorkoutCatalogScreen() {
	const insets = useSafeAreaInsets();
	const { colors, isDark } = useContext(ThemeContext);
	const [selectedType, setSelectedType] = useState<WorkoutType>();
	const [selectedBodyArea, setSelectedBodyArea] = useState<BodyArea>();
	const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
	const [meta, setMeta] = useState<PaginationMeta>();
	const [page, setPage] = useState(1);
	const [retryVersion, setRetryVersion] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>();
	const requestSequence = useRef(0);

	useEffect(() => {
		const sequence = ++requestSequence.current;
		const appending = page > 1;

		if (appending) {
			setIsLoadingMore(true);
		} else {
			setIsLoading(true);
		}
		setErrorMessage(undefined);

		getWorkoutCatalog({
			type: selectedType,
			bodyArea: selectedBodyArea,
			page,
			pageSize: 20,
		})
			.then(result => {
				if (requestSequence.current !== sequence) return;

				setWorkouts(current => (
					appending
						? mergeWorkoutPages(current, result.items)
						: result.items
				));
				setMeta(result.meta);
			})
			.catch(error => {
				if (requestSequence.current !== sequence) return;

				const apiError = normalizeApiError(error);
				setErrorMessage(withRequestId(
					'Не удалось загрузить каталог тренировок.',
					apiError.requestId,
				));
			})
			.finally(() => {
				if (requestSequence.current !== sequence) return;

				setIsLoading(false);
				setIsLoadingMore(false);
			});

		return () => {
			if (requestSequence.current === sequence) {
				requestSequence.current += 1;
			}
		};
	}, [
		page,
		retryVersion,
		selectedBodyArea,
		selectedType,
	]);

	function resetCatalog() {
		setPage(1);
		setMeta(undefined);
		setWorkouts([]);
		setErrorMessage(undefined);
	}

	function toggleType(type: WorkoutType) {
		resetCatalog();
		setSelectedType(current => current === type ? undefined : type);
	}

	function toggleBodyArea(bodyArea: BodyArea) {
		resetCatalog();
		setSelectedBodyArea(current => (
			current === bodyArea ? undefined : bodyArea
		));
	}

	function retry() {
		setRetryVersion(current => current + 1);
	}

	const hasMore = meta !== undefined && page < meta.totalPages;

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingTop: insets.top + 10,
						paddingBottom: 112 + insets.bottom,
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
						Тренировки
					</Text>

					<View style={styles.backButton} />
				</View>

				<View style={[styles.divider, { backgroundColor: colors.border }]} />

				<Text style={[styles.subtitle, { color: colors.textMuted }]}>
					Подберите тренировку под ваше состояние и цель
				</Text>

				<View style={[styles.typeTabs, { backgroundColor: colors.track }]}>
					{WORKOUT_TYPES.map(item => {
						const active = selectedType === item.key;

						return (
							<TouchableOpacity
								key={item.key}
								style={[
									styles.typeTab,
									active && { backgroundColor: colors.primary },
								]}
								activeOpacity={0.85}
								onPress={() => toggleType(item.key)}
								accessibilityRole='button'
								accessibilityState={{ selected: active }}
								accessibilityLabel={`Тип: ${item.label}`}
							>
								<MaterialCommunityIcons
									name={item.icon}
									size={17}
									color={active ? '#FFFFFF' : colors.textSecondary}
								/>

								<Text
									style={[
										styles.typeTabText,
										{ color: active ? '#FFFFFF' : colors.textSecondary },
									]}
								>
									{item.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				<View style={styles.zoneGrid}>
					{BODY_AREAS.map(item => {
						const active = selectedBodyArea === item.key;

						return (
							<TouchableOpacity
								key={item.key}
								style={[
									styles.zoneButton,
									{
										backgroundColor: active
											? isDark
												? colors.cardSecondary
												: '#E9F8F1'
											: colors.card,
										borderColor: active ? colors.primary : 'transparent',
									},
								]}
								activeOpacity={0.85}
								onPress={() => toggleBodyArea(item.key)}
								accessibilityRole='button'
								accessibilityState={{ selected: active }}
								accessibilityLabel={`Зона: ${item.label}`}
							>
								<MaterialCommunityIcons
									name={item.icon}
									size={24}
									color={active ? colors.primary : colors.textSecondary}
								/>

								<Text style={[styles.zoneText, { color: colors.text }]}>
									{item.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				{isLoading && workouts.length === 0 ? (
					<View style={styles.stateContainer}>
						<ActivityIndicator color={colors.primary} size='large' />
						<Text style={[styles.stateText, { color: colors.textMuted }]}>
							Загружаем тренировки…
						</Text>
					</View>
				) : null}

				{!isLoading && errorMessage && workouts.length === 0 ? (
					<StateMessage
						icon='cloud-offline-outline'
						message={errorMessage}
						actionLabel='Повторить'
						onAction={retry}
					/>
				) : null}

				{!isLoading && !errorMessage && workouts.length === 0 ? (
					<StateMessage
						icon='search-outline'
						message='По выбранным фильтрам тренировки не найдены.'
					/>
				) : null}

				{workouts.map(workout => (
					<View
						key={workout.id}
						style={[
							styles.workoutCard,
							{ backgroundColor: colors.card, shadowColor: colors.shadow },
						]}
					>
						<View style={styles.workoutRow}>
							<View
								style={[
									styles.workoutIcon,
									{
										backgroundColor: isDark
											? colors.cardSecondary
											: '#E9F8F1',
									},
								]}
							>
								<MaterialCommunityIcons
									name={WORKOUT_ICONS[workout.type]}
									size={22}
									color={colors.primary}
								/>
							</View>

							<View style={styles.workoutInfo}>
								<Text style={[styles.workoutTitle, { color: colors.text }]}>
									{workout.title}
								</Text>

								<Text
									style={[styles.workoutMeta, { color: colors.textMuted }]}
								>
									{workout.durationMinutes} минут ·{' '}
									{INTENSITY_LABELS[workout.intensity]}
								</Text>

								<Text
									style={[styles.workoutMeta, { color: colors.textMuted }]}
								>
									~ {workout.estimatedCalories} ккал
								</Text>
							</View>

							<TouchableOpacity
								style={[
									styles.startButton,
									{ backgroundColor: colors.primary },
								]}
								activeOpacity={0.85}
								onPress={() => router.push({
									pathname: '/workout-details',
									params: { id: String(workout.id) },
								})}
								accessibilityRole='button'
								accessibilityLabel={`Открыть ${workout.title}`}
							>
								<Text style={styles.startButtonText}>Открыть</Text>
							</TouchableOpacity>
						</View>

						{workout.description ? (
							<View style={[styles.hintBar, { backgroundColor: colors.track }]}>
								<Text
									style={[styles.hintText, { color: colors.textMuted }]}
									numberOfLines={2}
								>
									{workout.description}
								</Text>
							</View>
						) : null}
					</View>
				))}

				{errorMessage && workouts.length > 0 ? (
					<View style={[styles.inlineError, { backgroundColor: colors.card }]}>
						<Text style={[styles.inlineErrorText, { color: colors.textMuted }]}>
							{errorMessage}
						</Text>
						<TouchableOpacity
							onPress={retry}
							accessibilityRole='button'
							accessibilityLabel='Повторить загрузку'
						>
							<Text style={[styles.retryText, { color: colors.primary }]}>
								Повторить
							</Text>
						</TouchableOpacity>
					</View>
				) : null}

				{hasMore ? (
					<TouchableOpacity
						style={[
							styles.loadMoreButton,
							{
								backgroundColor: colors.card,
								borderColor: colors.primary,
							},
						]}
						onPress={() => setPage(current => current + 1)}
						disabled={isLoadingMore}
						accessibilityRole='button'
						accessibilityLabel='Показать ещё'
					>
						{isLoadingMore ? (
							<ActivityIndicator size='small' color={colors.primary} />
						) : (
							<Text style={[styles.loadMoreText, { color: colors.primary }]}>
								Показать ещё
							</Text>
						)}
					</TouchableOpacity>
				) : null}
			</ScrollView>

			<BottomNav />
		</View>
	);
}

function StateMessage({
	icon,
	message,
	actionLabel,
	onAction,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	message: string;
	actionLabel?: string;
	onAction?: () => void;
}) {
	const { colors } = useContext(ThemeContext);

	return (
		<View style={styles.stateContainer}>
			<Ionicons name={icon} size={34} color={colors.textMuted} />
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

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
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
		textAlign: 'center',
	},
	divider: {
		height: 1,
		marginHorizontal: -20,
		marginBottom: 16,
	},
	subtitle: {
		fontSize: 15,
		lineHeight: 20,
		marginBottom: 10,
	},
	typeTabs: {
		flexDirection: 'row',
		borderRadius: 12,
		padding: 4,
		marginBottom: 14,
	},
	typeTab: {
		flex: 1,
		minHeight: 38,
		borderRadius: 9,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
		paddingVertical: 3,
	},
	typeTabText: {
		fontSize: 10,
		fontWeight: '700',
	},
	zoneGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginBottom: 22,
	},
	zoneButton: {
		width: '30.9%',
		minHeight: 55,
		borderRadius: 10,
		borderWidth: 1.5,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		gap: 7,
	},
	zoneText: {
		fontSize: 13,
		fontWeight: '600',
		flexShrink: 1,
	},
	workoutCard: {
		borderRadius: 16,
		padding: 12,
		marginBottom: 14,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	workoutRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	workoutIcon: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	workoutInfo: {
		flex: 1,
	},
	workoutTitle: {
		fontSize: 15,
		fontWeight: '700',
		marginBottom: 2,
	},
	workoutMeta: {
		fontSize: 12,
		lineHeight: 16,
	},
	startButton: {
		borderRadius: 14,
		paddingHorizontal: 14,
		height: 30,
		alignItems: 'center',
		justifyContent: 'center',
	},
	startButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '700',
	},
	hintBar: {
		minHeight: 22,
		borderRadius: 9,
		justifyContent: 'center',
		paddingHorizontal: 12,
		paddingVertical: 4,
		marginTop: 10,
	},
	hintText: {
		fontSize: 11,
		lineHeight: 15,
	},
	stateContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 36,
		gap: 12,
	},
	stateText: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
	},
	retryButton: {
		minHeight: 38,
		borderRadius: 14,
		paddingHorizontal: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	retryButtonText: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '700',
	},
	inlineError: {
		borderRadius: 14,
		padding: 12,
		marginBottom: 14,
		alignItems: 'center',
		gap: 8,
	},
	inlineErrorText: {
		fontSize: 12,
		textAlign: 'center',
	},
	retryText: {
		fontSize: 13,
		fontWeight: '700',
	},
	loadMoreButton: {
		minHeight: 44,
		borderRadius: 15,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
	},
	loadMoreText: {
		fontSize: 14,
		fontWeight: '700',
	},
});
