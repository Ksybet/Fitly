import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Modal,
	TextInput,
	Alert,
	Animated,
	Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	Ionicons,
	MaterialIcons,
	FontAwesome5,
	Feather,
} from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { AuthContext } from '../src/context/AuthContext';
import { ThemeContext } from '../src/context/ThemeContext';
import BottomNav from '../src/components/BottomNav';

const GOALS_STORAGE_KEY = 'fitly_goals';
const DAILY_DATA_STORAGE_KEY = 'fitly_daily_data';
const FAVORITES_STORAGE_KEY = 'fitly_favorites';

type ActionButtonProps = {
	icon: React.ReactNode;
	label: string;
	onPress?: () => void;
};

type GoalsState = {
	stepsGoal: number | null;
	calorieGoal: number | null;
	weightGoal: number | null;
	sleepGoalHours: number | null;
	waterGoal: number | null;
};

type DailyDataState = {
	steps: number;
	sleepHours: number;
	sleepMinutes: number;
	sleepQuality: string;
	sleepStart: string;
	sleepEnd: string;
	calories: number;
	moodScore: number | null;
	moodLabel: string;
	moodEmoji: string;
	waterCurrent: number | null;
};

type QuickEditField = 'steps' | 'calories' | 'water' | null;

type StepsProgressCircleProps = {
	value: number;
	goal: number | null;
	trackColor: string;
	progressColor: string;
	textColor: string;
	labelColor: string;
};

type FavoriteKey = 'water' | 'weight';
type FavoritesState = Record<FavoriteKey, boolean>;

const DEFAULT_FAVORITES: FavoritesState = {
	water: true,
	weight: true,
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function StepsProgressCircle({
	value,
	goal,
	trackColor,
	progressColor,
	textColor,
	labelColor,
}: StepsProgressCircleProps) {
	const size = 100;
	const strokeWidth = 8;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;

	const targetProgress = useMemo(() => {
		if (!goal || goal <= 0) return 0;
		return Math.min(value / goal, 1);
	}, [value, goal]);

	const progressAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(progressAnim, {
			toValue: targetProgress,
			duration: 700,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	}, [targetProgress, progressAnim]);

	const strokeDashoffset = progressAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [circumference, 0],
	});

	return (
		<View style={styles.stepsCircleSvgWrapper}>
			<Svg width={size} height={size} style={styles.stepsSvg}>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={trackColor}
					strokeWidth={strokeWidth}
					fill='none'
				/>

				<AnimatedCircle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={progressColor}
					strokeWidth={strokeWidth}
					fill='none'
					strokeDasharray={`${circumference} ${circumference}`}
					strokeDashoffset={strokeDashoffset}
					strokeLinecap='round'
					rotation='-90'
					origin={`${size / 2}, ${size / 2}`}
				/>
			</Svg>

			<View style={styles.stepsCircleContent}>
				<Text style={[styles.stepsValue, { color: textColor }]}>
					{value > 0 ? value : '—'}
				</Text>
				<Text style={[styles.stepsLabel, { color: labelColor }]}>
					{value > 0 ? 'шагов' : 'нет данных'}
				</Text>
			</View>
		</View>
	);
}

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const { user } = useContext(AuthContext);
	const { colors, isDark } = useContext(ThemeContext);

	const userName =
		user?.firstName || user?.name || user?.email?.split('@')[0] || 'Алексей';

	const currentWeight = Number(user?.weightKg ?? 0);
	const hasWeight = currentWeight > 0;

	const [goals, setGoals] = useState<GoalsState>({
		stepsGoal: null,
		calorieGoal: null,
		weightGoal: null,
		sleepGoalHours: null,
		waterGoal: null,
	});

	const [favorites, setFavorites] = useState<FavoritesState>(DEFAULT_FAVORITES);

	const [dailyData, setDailyData] = useState<DailyDataState>({
		steps: 0,
		sleepHours: 0,
		sleepMinutes: 0,
		sleepQuality: '',
		sleepStart: '',
		sleepEnd: '',
		calories: 0,
		moodScore: null,
		moodLabel: '',
		moodEmoji: '',
		waterCurrent: null,
	});

	const [quickEditField, setQuickEditField] = useState<QuickEditField>(null);
	const [quickEditValue, setQuickEditValue] = useState('');
	const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

	const loadHomeData = async () => {
		try {
			const [rawGoals, rawDailyData, rawFavorites] = await Promise.all([
				AsyncStorage.getItem(GOALS_STORAGE_KEY),
				AsyncStorage.getItem(DAILY_DATA_STORAGE_KEY),
				AsyncStorage.getItem(FAVORITES_STORAGE_KEY),
			]);

			if (rawGoals) {
				const parsedGoals = JSON.parse(rawGoals);

				setGoals({
					stepsGoal:
						parsedGoals?.stepsGoal !== undefined &&
						parsedGoals?.stepsGoal !== null &&
						Number(parsedGoals.stepsGoal) > 0
							? Number(parsedGoals.stepsGoal)
							: null,
					calorieGoal:
						parsedGoals?.calorieGoal !== undefined &&
						parsedGoals?.calorieGoal !== null &&
						Number(parsedGoals.calorieGoal) > 0
							? Number(parsedGoals.calorieGoal)
							: null,
					weightGoal:
						parsedGoals?.weightGoal !== undefined &&
						parsedGoals?.weightGoal !== null &&
						Number(parsedGoals.weightGoal) > 0
							? Number(parsedGoals.weightGoal)
							: null,
					sleepGoalHours:
						parsedGoals?.sleepGoalHours !== undefined &&
						parsedGoals?.sleepGoalHours !== null &&
						Number(parsedGoals.sleepGoalHours) > 0
							? Number(parsedGoals.sleepGoalHours)
							: null,
					waterGoal:
						parsedGoals?.waterGoal !== undefined &&
						parsedGoals?.waterGoal !== null &&
						Number(parsedGoals.waterGoal) > 0
							? Number(parsedGoals.waterGoal)
							: null,
				});
			} else {
				setGoals({
					stepsGoal: null,
					calorieGoal: null,
					weightGoal: null,
					sleepGoalHours: null,
					waterGoal: null,
				});
			}

			if (rawDailyData) {
				const parsedDailyData = JSON.parse(rawDailyData);

				setDailyData({
					steps: Number(parsedDailyData?.steps ?? 0),
					sleepHours: Number(parsedDailyData?.sleepHours ?? 0),
					sleepMinutes: Number(parsedDailyData?.sleepMinutes ?? 0),
					sleepQuality: parsedDailyData?.sleepQuality ?? '',
					sleepStart: parsedDailyData?.sleepStart ?? '',
					sleepEnd: parsedDailyData?.sleepEnd ?? '',
					calories: Number(parsedDailyData?.calories ?? 0),
					moodScore:
						parsedDailyData?.moodScore !== undefined &&
						parsedDailyData?.moodScore !== null
							? Number(parsedDailyData.moodScore)
							: null,
					moodLabel: parsedDailyData?.moodLabel ?? '',
					moodEmoji: parsedDailyData?.moodEmoji ?? '',
					waterCurrent:
						parsedDailyData?.waterCurrent !== undefined &&
						parsedDailyData?.waterCurrent !== null &&
						Number(parsedDailyData.waterCurrent) > 0
							? Number(parsedDailyData.waterCurrent)
							: null,
				});
			}

			if (rawFavorites) {
				const parsedFavorites = JSON.parse(rawFavorites);
				setFavorites({
					...DEFAULT_FAVORITES,
					...parsedFavorites,
				});
			} else {
				setFavorites(DEFAULT_FAVORITES);
			}
		} catch (e) {
			console.log('Ошибка загрузки данных Home', e);
		}
	};

	useEffect(() => {
		loadHomeData();
	}, []);

	useFocusEffect(
		React.useCallback(() => {
			loadHomeData();
		}, []),
	);

	const hasSteps = dailyData.steps > 0;
	const hasSleep =
		(dailyData.sleepHours > 0 || dailyData.sleepMinutes > 0) &&
		!!dailyData.sleepStart &&
		!!dailyData.sleepEnd;
	const hasCalories = dailyData.calories > 0;

	const stepsProgressPercent = useMemo(() => {
		if (!hasSteps || !goals.stepsGoal) return 0;
		return Math.min((dailyData.steps / goals.stepsGoal) * 100, 100);
	}, [dailyData.steps, goals.stepsGoal, hasSteps]);

	const caloriesProgress = useMemo(() => {
		if (!hasCalories || !goals.calorieGoal) return 0;
		return Math.min((dailyData.calories / goals.calorieGoal) * 100, 100);
	}, [dailyData.calories, goals.calorieGoal, hasCalories]);

	const sleepProgress = useMemo(() => {
		if (!hasSleep || !goals.sleepGoalHours) return 0;

		const currentSleepMinutes =
			Number(dailyData.sleepHours) * 60 + Number(dailyData.sleepMinutes);
		const goalSleepMinutes = Number(goals.sleepGoalHours) * 60;

		if (!goalSleepMinutes) return 0;

		return Math.min((currentSleepMinutes / goalSleepMinutes) * 100, 100);
	}, [
		dailyData.sleepHours,
		dailyData.sleepMinutes,
		goals.sleepGoalHours,
		hasSleep,
	]);

	const waterProgress = useMemo(() => {
		if (!goals.waterGoal || !dailyData.waterCurrent) return 0;
		return Math.min((dailyData.waterCurrent / goals.waterGoal) * 100, 100);
	}, [dailyData.waterCurrent, goals.waterGoal]);

	const weightProgress = useMemo(() => {
		if (!goals.weightGoal || !hasWeight) return 0;
		return Math.min((currentWeight / goals.weightGoal) * 100, 100);
	}, [currentWeight, goals.weightGoal, hasWeight]);

	const openQuickEdit = (field: QuickEditField) => {
		if (!field) return;

		setQuickEditField(field);

		if (field === 'steps') {
			setQuickEditValue(dailyData.steps > 0 ? String(dailyData.steps) : '');
			return;
		}

		if (field === 'calories') {
			setQuickEditValue(
				dailyData.calories > 0 ? String(dailyData.calories) : '',
			);
			return;
		}

		if (field === 'water') {
			setQuickEditValue(
				dailyData.waterCurrent !== null && dailyData.waterCurrent > 0
					? String(dailyData.waterCurrent).replace('.', ',')
					: '',
			);
		}
	};

	const closeQuickEdit = () => {
		setQuickEditField(null);
		setQuickEditValue('');
	};

	const saveQuickEdit = async () => {
		if (!quickEditField) return;

		const normalizedValue =
			quickEditField === 'water'
				? quickEditValue.replace(',', '.')
				: quickEditValue;

		const numericValue = Number(normalizedValue);

		if (!quickEditValue || Number.isNaN(numericValue) || numericValue < 0) {
			Alert.alert('Ошибка', 'Введите корректное число');
			return;
		}

		try {
			setIsSavingQuickEdit(true);

			const rawDailyData = await AsyncStorage.getItem(DAILY_DATA_STORAGE_KEY);
			const parsedDailyData = rawDailyData ? JSON.parse(rawDailyData) : {};

			const updatedPayload = {
				steps: Number(parsedDailyData?.steps ?? 0),
				sleepHours: Number(parsedDailyData?.sleepHours ?? 0),
				sleepMinutes: Number(parsedDailyData?.sleepMinutes ?? 0),
				sleepQuality: parsedDailyData?.sleepQuality ?? '',
				sleepStart: parsedDailyData?.sleepStart ?? '',
				sleepEnd: parsedDailyData?.sleepEnd ?? '',
				calories: Number(parsedDailyData?.calories ?? 0),
				moodScore:
					parsedDailyData?.moodScore !== undefined &&
					parsedDailyData?.moodScore !== null
						? Number(parsedDailyData.moodScore)
						: null,
				moodLabel: parsedDailyData?.moodLabel ?? '',
				moodEmoji: parsedDailyData?.moodEmoji ?? '',
				waterCurrent:
					parsedDailyData?.waterCurrent !== undefined &&
					parsedDailyData?.waterCurrent !== null
						? Number(parsedDailyData.waterCurrent)
						: null,
				updatedAt: new Date().toISOString(),
			};

			if (quickEditField === 'steps') {
				updatedPayload.steps = numericValue;
			}

			if (quickEditField === 'calories') {
				updatedPayload.calories = numericValue;
			}

			if (quickEditField === 'water') {
				updatedPayload.waterCurrent = numericValue;
			}

			await AsyncStorage.setItem(
				DAILY_DATA_STORAGE_KEY,
				JSON.stringify(updatedPayload),
			);

			setDailyData(prev => ({
				...prev,
				steps: quickEditField === 'steps' ? numericValue : prev.steps,
				calories: quickEditField === 'calories' ? numericValue : prev.calories,
				waterCurrent:
					quickEditField === 'water' ? numericValue : prev.waterCurrent,
			}));

			closeQuickEdit();
		} catch (e) {
			console.log('Ошибка быстрого сохранения', e);
			Alert.alert('Ошибка', 'Не удалось сохранить данные');
		} finally {
			setIsSavingQuickEdit(false);
		}
	};

	const quickEditTitle =
		quickEditField === 'steps'
			? 'Введите шаги'
			: quickEditField === 'calories'
				? 'Введите калории'
				: quickEditField === 'water'
					? 'Введите воду'
					: '';

	const quickEditPlaceholder =
		quickEditField === 'steps'
			? 'Например, 7560'
			: quickEditField === 'calories'
				? 'Например, 1850'
				: quickEditField === 'water'
					? 'Например, 1,5'
					: 'Введите значение';

	const quickEditUnit =
		quickEditField === 'steps'
			? 'шагов'
			: quickEditField === 'calories'
				? 'ккал'
				: quickEditField === 'water'
					? 'л'
					: '';

	const currentMoodEmoji = dailyData.moodEmoji || '😐';
	const currentMoodLabel = dailyData.moodLabel || 'Нейтральное';
	const currentMoodScore =
		dailyData.moodScore !== null ? `${dailyData.moodScore} / 10` : '';

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingTop: insets.top + 8,
						paddingBottom: 112 + insets.bottom,
					},
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.header}>
					<View style={styles.brandRow}>
						<Text style={[styles.logo, { color: colors.primary }]}>Fitly</Text>

						<TouchableOpacity
							style={[
								styles.headerIcon,
								{ backgroundColor: isDark ? colors.cardSecondary : '#F1F1F1' },
							]}
							activeOpacity={0.8}
						>
							<Ionicons
								name='notifications-outline'
								size={22}
								color={colors.textMuted}
							/>
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.greetingRow}>
					<View style={styles.greetingTextBlock}>
						<Text style={[styles.greetingTitle, { color: colors.text }]}>
							Привет, {userName}!
						</Text>
						<Text
							style={[styles.greetingSubtitle, { color: colors.textMuted }]}
						>
							Вот твои показатели на сегодня
						</Text>
					</View>

					<TouchableOpacity
						style={styles.targetButton}
						activeOpacity={0.8}
						onPress={() => router.push('/goals' as any)}
					>
						<View
							style={[
								styles.targetIconWrapper,
								{ backgroundColor: isDark ? colors.iconBg : '#F0FBF6' },
							]}
						>
							<Feather name='target' size={22} color={colors.primary} />
						</View>
					</TouchableOpacity>
				</View>

				<View style={styles.statsRow}>
					<TouchableOpacity
						activeOpacity={0.9}
						style={[
							styles.card,
							styles.stepsCard,
							{ backgroundColor: colors.card, shadowColor: colors.shadow },
						]}
						onPress={() => openQuickEdit('steps')}
					>
						<Ionicons name='walk-outline' size={18} color={colors.primary} />

						<View style={styles.stepsCircleWrapper}>
							<StepsProgressCircle
								value={dailyData.steps}
								goal={goals.stepsGoal}
								trackColor={colors.track}
								progressColor={colors.primary}
								textColor={colors.text}
								labelColor={colors.textMuted}
							/>
						</View>

						{goals.stepsGoal ? (
							<>
								<Text
									style={[styles.stepsGoalText, { color: colors.textMuted }]}
								>
									Цель: {goals.stepsGoal}
								</Text>
								<View
									style={[styles.stepsTrack, { backgroundColor: colors.track }]}
								>
									<View
										style={[
											styles.stepsFill,
											{
												width: `${stepsProgressPercent}%`,
												backgroundColor: colors.primary,
											},
										]}
									/>
								</View>
							</>
						) : null}
					</TouchableOpacity>

					<View style={styles.rightStats}>
						<TouchableOpacity
							activeOpacity={0.9}
							style={[
								styles.smallCard,
								{ backgroundColor: colors.card, shadowColor: colors.shadow },
							]}
							onPress={() => router.push('/sleep' as any)}
						>
							<Ionicons name='moon' size={16} color={colors.blue} />

							<Text style={[styles.smallMainValue, { color: colors.text }]}>
								{hasSleep
									? `${dailyData.sleepHours} ч ${dailyData.sleepMinutes} м`
									: '—'}
							</Text>

							<Text style={[styles.smallAccentText, { color: colors.blue }]}>
								{hasSleep
									? dailyData.sleepQuality || 'Без оценки'
									: 'Нет данных'}
							</Text>

							{goals.sleepGoalHours ? (
								<View
									style={[styles.sleepTrack, { backgroundColor: colors.track }]}
								>
									<View
										style={[
											styles.sleepFill,
											{
												width: `${sleepProgress}%`,
												backgroundColor: colors.blue,
											},
										]}
									/>
								</View>
							) : (
								<View
									style={[
										styles.sleepBar,
										{ backgroundColor: isDark ? '#324A68' : '#D9E6FF' },
									]}
								/>
							)}

							<Text style={[styles.smallHint, { color: colors.textMuted }]}>
								{hasSleep
									? `${dailyData.sleepStart} — ${dailyData.sleepEnd}`
									: 'Добавьте данные о сне'}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							activeOpacity={0.9}
							style={[
								styles.smallCard,
								{ backgroundColor: colors.card, shadowColor: colors.shadow },
							]}
							onPress={() => openQuickEdit('calories')}
						>
							<Ionicons name='flame-outline' size={16} color={colors.warning} />

							<View style={styles.kcalRow}>
								<Text style={[styles.smallMainValue, { color: colors.text }]}>
									{hasCalories ? dailyData.calories : '—'}
								</Text>
								<Text
									style={[styles.kcalText, { color: colors.textSecondary }]}
								>
									{' '}
									ккал
								</Text>
							</View>

							{goals.calorieGoal ? (
								<>
									<Text style={[styles.smallHint, { color: colors.textMuted }]}>
										Цель: {goals.calorieGoal}
									</Text>

									<View
										style={[
											styles.caloriesTrack,
											{ backgroundColor: colors.track },
										]}
									>
										<View
											style={[
												styles.caloriesFill,
												{
													width: `${caloriesProgress}%`,
													backgroundColor: colors.warning,
												},
											]}
										/>
									</View>
								</>
							) : null}
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.actionsRow}>
					<ActionButton
						icon={
							<MaterialIcons
								name='restaurant'
								size={22}
								color={colors.warning}
							/>
						}
						label='Питание'
					/>

					<ActionButton
						icon={<Ionicons name='heart' size={20} color={colors.danger} />}
						label='Состояние'
					/>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>
							Дневник состояния
						</Text>
					</View>

					<TouchableOpacity
						style={[
							styles.diaryCard,
							{ backgroundColor: colors.card, shadowColor: colors.shadow },
						]}
						activeOpacity={0.9}
						onPress={() => router.push('/mood' as any)}
					>
						<View style={styles.diaryLeft}>
							<View
								style={[
									styles.moodEmojiCircle,
									{
										backgroundColor: isDark ? colors.cardSecondary : '#F3F4F6',
									},
								]}
							>
								<Text style={styles.moodEmojiText}>{currentMoodEmoji}</Text>
							</View>

							<View style={styles.diaryTextWrap}>
								<Text style={[styles.diaryText, { color: colors.text }]}>
									{currentMoodLabel}
								</Text>
								<Text
									style={[styles.diarySubtext, { color: colors.textMuted }]}
								>
									{dailyData.moodScore !== null
										? 'Нажми, чтобы изменить настроение'
										: 'Нажми, чтобы выбрать настроение'}
								</Text>
							</View>

							<View style={styles.diaryRight}>
								{currentMoodScore ? (
									<Text style={[styles.diaryScore, { color: colors.primary }]}>
										{currentMoodScore}
									</Text>
								) : null}
								<Ionicons
									name='chevron-forward'
									size={18}
									color={colors.textMuted}
								/>
							</View>
						</View>
					</TouchableOpacity>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>
							Избранное
						</Text>

						<TouchableOpacity
							activeOpacity={0.8}
							onPress={() => router.push('/favorites' as any)}
						>
							<MaterialIcons
								name='menu'
								size={22}
								color={colors.textSecondary}
							/>
						</TouchableOpacity>
					</View>

					<View style={styles.favoritesRow}>
						{favorites.water ? (
							<TouchableOpacity
								style={[
									styles.favoriteCard,
									{ backgroundColor: colors.card, shadowColor: colors.shadow },
								]}
								activeOpacity={0.9}
								onPress={() => openQuickEdit('water')}
							>
								<View style={styles.favoriteTopRow}>
									<Ionicons
										name='water-outline'
										size={18}
										color={colors.blue}
									/>
									<Text
										style={[styles.favoriteTitle, { color: colors.textMuted }]}
									>
										Вода
									</Text>
								</View>

								<Text
									style={[
										styles.favoriteValue,
										{ color: colors.textSecondary },
									]}
								>
									{dailyData.waterCurrent !== null
										? `${String(dailyData.waterCurrent).replace('.', ',')} л`
										: '—'}
									{goals.waterGoal
										? ` / ${String(goals.waterGoal).replace('.', ',')} л`
										: ''}
								</Text>

								{goals.waterGoal ? (
									<View
										style={[
											styles.favoriteTrack,
											{ backgroundColor: colors.track },
										]}
									>
										<View
											style={[
												styles.favoriteFill,
												{
													width: `${waterProgress}%`,
													backgroundColor: colors.blue,
												},
											]}
										/>
									</View>
								) : null}
							</TouchableOpacity>
						) : null}

						{favorites.weight ? (
							<View
								style={[
									styles.favoriteCard,
									{ backgroundColor: colors.card, shadowColor: colors.shadow },
								]}
							>
								<View style={styles.favoriteTopRow}>
									<Ionicons
										name='barbell-outline'
										size={18}
										color={colors.warning}
									/>
									<Text
										style={[styles.favoriteTitle, { color: colors.textMuted }]}
									>
										Вес
									</Text>
								</View>

								<Text
									style={[
										styles.favoriteValue,
										{ color: colors.textSecondary },
									]}
								>
									{hasWeight ? currentWeight : '—'}
									{hasWeight && goals.weightGoal
										? ` / ${goals.weightGoal}`
										: ''}
									{hasWeight ? ' кг' : ''}
								</Text>

								{goals.weightGoal && hasWeight ? (
									<View
										style={[
											styles.favoriteTrack,
											{ backgroundColor: colors.track },
										]}
									>
										<View
											style={[
												styles.favoriteFill,
												{
													width: `${weightProgress}%`,
													backgroundColor: colors.warning,
												},
											]}
										/>
									</View>
								) : null}
							</View>
						) : null}
					</View>
				</View>
			</ScrollView>

			<BottomNav />

			<Modal visible={!!quickEditField} transparent animationType='fade'>
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.modalCard,
							{ backgroundColor: colors.card, shadowColor: colors.shadow },
						]}
					>
						<Text style={[styles.modalTitle, { color: colors.text }]}>
							{quickEditTitle}
						</Text>

						<Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
							Введите текущее значение в {quickEditUnit}
						</Text>

						<View
							style={[
								styles.modalInputWrap,
								{
									borderColor: colors.border,
									backgroundColor: colors.cardSecondary,
								},
							]}
						>
							<TextInput
								style={[styles.modalInput, { color: colors.text }]}
								value={quickEditValue}
								onChangeText={text => {
									if (quickEditField === 'water') {
										const normalized = text
											.replace('.', ',')
											.replace(/[^0-9,]/g, '')
											.replace(/(,.*),/g, '$1');

										setQuickEditValue(normalized);
										return;
									}

									setQuickEditValue(text.replace(/[^0-9]/g, ''));
								}}
								keyboardType={
									quickEditField === 'water' ? 'decimal-pad' : 'numeric'
								}
								placeholder={quickEditPlaceholder}
								placeholderTextColor={colors.textMuted}
								autoFocus
								maxLength={6}
							/>

							<Text
								style={[styles.modalInputUnit, { color: colors.textMuted }]}
							>
								{quickEditUnit}
							</Text>
						</View>

						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[
									styles.modalButton,
									styles.modalCancelButton,
									{
										backgroundColor: isDark ? colors.cardSecondary : '#F3F4F6',
									},
								]}
								onPress={closeQuickEdit}
								activeOpacity={0.85}
								disabled={isSavingQuickEdit}
							>
								<Text
									style={[
										styles.modalCancelText,
										{ color: colors.textSecondary },
									]}
								>
									Отмена
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.modalButton,
									styles.modalSaveButton,
									{ backgroundColor: colors.primary },
								]}
								onPress={saveQuickEdit}
								activeOpacity={0.85}
								disabled={isSavingQuickEdit}
							>
								<Text style={styles.modalSaveText}>
									{isSavingQuickEdit ? 'Сохранение...' : 'Сохранить'}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}

function ActionButton({ icon, label, onPress }: ActionButtonProps) {
	const { colors, isDark } = useContext(ThemeContext);

	return (
		<TouchableOpacity
			style={[
				styles.actionButton,
				{ backgroundColor: colors.card, shadowColor: colors.shadow },
			]}
			onPress={onPress}
			activeOpacity={0.82}
		>
			<View style={styles.actionIcon}>{icon}</View>
			<Text
				style={[
					styles.actionLabel,
					{ color: isDark ? colors.textSecondary : '#6B7280' },
				]}
			>
				{label}
			</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},

	scrollContent: {
		paddingHorizontal: 16,
	},

	header: {
		marginBottom: 10,
	},

	brandRow: {
		alignItems: 'center',
		justifyContent: 'center',
	},

	logo: {
		fontSize: 30,
		fontWeight: '700',
	},

	headerIcon: {
		position: 'absolute',
		right: 0,
		top: 4,
		width: 34,
		height: 34,
		borderRadius: 17,
		justifyContent: 'center',
		alignItems: 'center',
	},

	greetingRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 14,
	},

	greetingTextBlock: {
		flex: 1,
		paddingRight: 12,
	},

	greetingTitle: {
		fontSize: 17,
		fontWeight: '700',
	},

	greetingSubtitle: {
		fontSize: 12,
	},

	targetButton: {
		width: 48,
		height: 48,
	},

	targetIconWrapper: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: 'center',
		justifyContent: 'center',
	},

	statsRow: {
		flexDirection: 'row',
		gap: 10,
		marginBottom: 16,
	},

	card: {
		borderRadius: 20,
		padding: 12,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},

	stepsCard: {
		width: '37%',
		minHeight: 240,
	},

	stepsCircleWrapper: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},

	stepsCircleSvgWrapper: {
		width: 100,
		height: 100,
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},

	stepsSvg: {
		position: 'absolute',
	},

	stepsCircleContent: {
		alignItems: 'center',
		justifyContent: 'center',
	},

	stepsValue: {
		fontSize: 24,
		fontWeight: '700',
	},

	stepsLabel: {
		fontSize: 13,
	},

	stepsGoalText: {
		fontSize: 12,
		marginTop: 6,
		marginBottom: 6,
		textAlign: 'center',
	},

	stepsTrack: {
		height: 6,
		borderRadius: 4,
		overflow: 'hidden',
	},

	stepsFill: {
		height: '100%',
		borderRadius: 4,
	},

	rightStats: {
		width: '59%',
		gap: 10,
	},

	smallCard: {
		borderRadius: 20,
		padding: 12,
		minHeight: 110,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},

	smallMainValue: {
		fontSize: 22,
		fontWeight: '700',
	},

	smallAccentText: {
		fontSize: 13,
		marginTop: 2,
	},

	sleepBar: {
		height: 4,
		width: 60,
		marginVertical: 6,
		borderRadius: 4,
	},

	sleepTrack: {
		height: 6,
		borderRadius: 4,
		marginVertical: 6,
		overflow: 'hidden',
	},

	sleepFill: {
		height: '100%',
		borderRadius: 4,
	},

	smallHint: {
		fontSize: 12,
	},

	kcalRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
	},

	kcalText: {
		fontSize: 14,
		marginTop: 4,
	},

	caloriesTrack: {
		height: 6,
		borderRadius: 4,
		marginTop: 8,
		overflow: 'hidden',
	},

	caloriesFill: {
		height: '100%',
	},

	actionsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 18,
	},

	actionButton: {
		width: '48%',
		height: 90,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},

	actionIcon: {
		marginBottom: 6,
	},

	actionLabel: {
		fontSize: 12,
	},

	section: {
		marginBottom: 16,
	},

	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},

	sectionTitle: {
		fontSize: 17,
		fontWeight: '700',
	},

	diaryCard: {
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 14,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},

	diaryLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	moodEmojiCircle: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},

	moodEmojiText: {
		fontSize: 22,
	},

	diaryTextWrap: {
		flex: 1,
	},

	diaryText: {
		fontSize: 18,
		fontWeight: '700',
	},

	diarySubtext: {
		fontSize: 12,
		marginTop: 2,
	},

	diaryRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},

	diaryScore: {
		fontSize: 14,
		fontWeight: '700',
	},

	favoritesRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},

	favoriteCard: {
		width: '48%',
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},

	favoriteTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},

	favoriteTitle: {
		marginLeft: 6,
		fontSize: 14,
		fontWeight: '600',
	},

	favoriteValue: {
		fontSize: 21,
		fontWeight: '700',
		marginBottom: 10,
	},

	favoriteTrack: {
		height: 6,
		borderRadius: 4,
		overflow: 'hidden',
	},

	favoriteFill: {
		height: '100%',
		borderRadius: 4,
	},

	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},

	modalCard: {
		borderRadius: 20,
		padding: 18,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 4,
	},

	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 6,
		textAlign: 'center',
	},

	modalSubtitle: {
		fontSize: 13,
		textAlign: 'center',
		marginBottom: 14,
	},

	modalInputWrap: {
		height: 54,
		borderWidth: 1,
		borderRadius: 14,
		marginBottom: 16,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
	},

	modalInput: {
		flex: 1,
		fontSize: 16,
	},

	modalInputUnit: {
		fontSize: 14,
		fontWeight: '600',
		marginLeft: 10,
	},

	modalButtons: {
		flexDirection: 'row',
		gap: 12,
	},

	modalButton: {
		flex: 1,
		height: 48,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},

	modalCancelButton: {},

	modalSaveButton: {},

	modalCancelText: {
		fontSize: 15,
		fontWeight: '600',
	},

	modalSaveText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#FFFFFF',
	},
});
