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
import BottomNav from '../src/components/BottomNav';

const GOALS_STORAGE_KEY = 'fitly_goals';
const DAILY_DATA_STORAGE_KEY = 'fitly_daily_data';

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
};

type DailyDataState = {
	steps: number;
	sleepHours: number;
	sleepMinutes: number;
	sleepQuality: string;
	sleepStart: string;
	sleepEnd: string;
	calories: number;
};

type QuickEditField = 'steps' | 'calories' | null;

type StepsProgressCircleProps = {
	value: number;
	goal: number | null;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function StepsProgressCircle({ value, goal }: StepsProgressCircleProps) {
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
					stroke='#E5E7EB'
					strokeWidth={strokeWidth}
					fill='none'
				/>

				<AnimatedCircle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke='#20C07A'
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
				<Text style={styles.stepsValue}>{value > 0 ? value : '—'}</Text>
				<Text style={styles.stepsLabel}>
					{value > 0 ? 'шагов' : 'нет данных'}
				</Text>
			</View>
		</View>
	);
}

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const { user } = useContext(AuthContext);

	const userName =
		user?.firstName || user?.name || user?.email?.split('@')[0] || 'Алексей';

	const currentWeight = Number(user?.weightKg ?? 68);

	const [goals, setGoals] = useState<GoalsState>({
		stepsGoal: null,
		calorieGoal: null,
		weightGoal: null,
		sleepGoalHours: null,
	});

	const [dailyData, setDailyData] = useState<DailyDataState>({
		steps: 0,
		sleepHours: 0,
		sleepMinutes: 0,
		sleepQuality: '',
		sleepStart: '',
		sleepEnd: '',
		calories: 0,
	});

	const [quickEditField, setQuickEditField] = useState<QuickEditField>(null);
	const [quickEditValue, setQuickEditValue] = useState('');
	const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

	const loadHomeData = async () => {
		try {
			const [rawGoals, rawDailyData] = await Promise.all([
				AsyncStorage.getItem(GOALS_STORAGE_KEY),
				AsyncStorage.getItem(DAILY_DATA_STORAGE_KEY),
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
				});
			} else {
				setGoals({
					stepsGoal: null,
					calorieGoal: null,
					weightGoal: null,
					sleepGoalHours: null,
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
				});
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

	const waterProgress = 60;

	const weightProgress = useMemo(() => {
		if (!goals.weightGoal) return 0;
		return Math.min((currentWeight / goals.weightGoal) * 100, 100);
	}, [currentWeight, goals.weightGoal]);

	const openQuickEdit = (field: QuickEditField) => {
		if (!field) return;

		setQuickEditField(field);
		setQuickEditValue(
			field === 'steps'
				? dailyData.steps > 0
					? String(dailyData.steps)
					: ''
				: dailyData.calories > 0
					? String(dailyData.calories)
					: '',
		);
	};

	const closeQuickEdit = () => {
		setQuickEditField(null);
		setQuickEditValue('');
	};

	const saveQuickEdit = async () => {
		if (!quickEditField) return;

		const numericValue = Number(quickEditValue);

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
				updatedAt: new Date().toISOString(),
			};

			if (quickEditField === 'steps') {
				updatedPayload.steps = numericValue;
			}

			if (quickEditField === 'calories') {
				updatedPayload.calories = numericValue;
			}

			await AsyncStorage.setItem(
				DAILY_DATA_STORAGE_KEY,
				JSON.stringify(updatedPayload),
			);

			setDailyData(prev => ({
				...prev,
				steps: quickEditField === 'steps' ? numericValue : prev.steps,
				calories: quickEditField === 'calories' ? numericValue : prev.calories,
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
				: '';

	const quickEditPlaceholder =
		quickEditField === 'steps'
			? 'Например, 7560'
			: quickEditField === 'calories'
				? 'Например, 1850'
				: 'Введите значение';

	const quickEditUnit =
		quickEditField === 'steps'
			? 'шагов'
			: quickEditField === 'calories'
				? 'ккал'
				: '';

	return (
		<View style={styles.container}>
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
						<Text style={styles.logo}>Fitly</Text>

						<TouchableOpacity style={styles.headerIcon} activeOpacity={0.8}>
							<Ionicons
								name='notifications-outline'
								size={22}
								color='#9CA3AF'
							/>
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.greetingRow}>
					<View style={styles.greetingTextBlock}>
						<Text style={styles.greetingTitle}>Привет, {userName}!</Text>
						<Text style={styles.greetingSubtitle}>
							Вот твои показатели на сегодня
						</Text>
					</View>

					<TouchableOpacity
						style={styles.targetButton}
						activeOpacity={0.8}
						onPress={() => router.push('/goals' as any)}
					>
						<View style={styles.targetIconWrapper}>
							<Feather name='target' size={22} color='#20C07A' />
						</View>
					</TouchableOpacity>
				</View>

				<View style={styles.statsRow}>
					<TouchableOpacity
						activeOpacity={0.9}
						style={[styles.card, styles.stepsCard]}
						onPress={() => openQuickEdit('steps')}
					>
						<Ionicons name='walk-outline' size={18} color='#20C07A' />

						<View style={styles.stepsCircleWrapper}>
							<StepsProgressCircle
								value={dailyData.steps}
								goal={goals.stepsGoal}
							/>
						</View>

						{goals.stepsGoal ? (
							<>
								<Text style={styles.stepsGoalText}>
									Цель: {goals.stepsGoal}
								</Text>
								<View style={styles.stepsTrack}>
									<View
										style={[
											styles.stepsFill,
											{ width: `${stepsProgressPercent}%` },
										]}
									/>
								</View>
							</>
						) : null}
					</TouchableOpacity>

					<View style={styles.rightStats}>
						<TouchableOpacity
							activeOpacity={0.9}
							style={styles.smallCard}
							onPress={() => router.push('/sleep' as any)}
						>
							<Ionicons name='moon' size={16} color='#6F9BFF' />

							<Text style={styles.smallMainValue}>
								{hasSleep
									? `${dailyData.sleepHours} ч ${dailyData.sleepMinutes} м`
									: '—'}
							</Text>

							<Text style={styles.smallAccentText}>
								{hasSleep
									? dailyData.sleepQuality || 'Без оценки'
									: 'Нет данных'}
							</Text>

							{goals.sleepGoalHours ? (
								<View style={styles.sleepTrack}>
									<View
										style={[styles.sleepFill, { width: `${sleepProgress}%` }]}
									/>
								</View>
							) : (
								<View style={styles.sleepBar} />
							)}

							<Text style={styles.smallHint}>
								{hasSleep
									? `${dailyData.sleepStart} — ${dailyData.sleepEnd}`
									: 'Добавьте данные о сне'}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							activeOpacity={0.9}
							style={styles.smallCard}
							onPress={() => openQuickEdit('calories')}
						>
							<Ionicons name='flame-outline' size={16} color='#F2B544' />

							<View style={styles.kcalRow}>
								<Text style={styles.smallMainValue}>
									{hasCalories ? dailyData.calories : '—'}
								</Text>
								<Text style={styles.kcalText}> ккал</Text>
							</View>

							{goals.calorieGoal ? (
								<>
									<Text style={styles.smallHint}>
										Цель: {goals.calorieGoal}
									</Text>

									<View style={styles.caloriesTrack}>
										<View
											style={[
												styles.caloriesFill,
												{ width: `${caloriesProgress}%` },
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
						icon={<MaterialIcons name='restaurant' size={22} color='#F2B544' />}
						label='Питание'
					/>

					<ActionButton
						icon={<FontAwesome5 name='dumbbell' size={18} color='#6F9BFF' />}
						label='Тренировка'
					/>

					<ActionButton
						icon={<Ionicons name='heart' size={20} color='#F36F6F' />}
						label='Состояние'
					/>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Дневник состояния</Text>

						<TouchableOpacity activeOpacity={0.8}>
							<Text style={styles.dots}>···</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.diaryCard}>
						<View style={styles.diaryLeft}>
							<View style={styles.moodIconCircle}>
								<Ionicons name='happy-outline' size={22} color='#20C07A' />
							</View>

							<Text style={styles.diaryText}>Хорошее</Text>

							<Ionicons name='thumbs-up' size={18} color='#20C07A' />
						</View>
					</View>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Избранное</Text>

						<TouchableOpacity activeOpacity={0.8}>
							<MaterialIcons name='menu' size={22} color='#4B5563' />
						</TouchableOpacity>
					</View>

					<View style={styles.favoritesRow}>
						<View style={styles.favoriteCard}>
							<View style={styles.favoriteTopRow}>
								<Ionicons name='water-outline' size={18} color='#6F9BFF' />
								<Text style={styles.favoriteTitle}>Вода</Text>
							</View>

							<Text style={styles.favoriteValue}>1,2 л / 2 л</Text>

							<View style={styles.favoriteTrack}>
								<View
									style={[
										styles.favoriteFill,
										{ width: `${waterProgress}%`, backgroundColor: '#6F9BFF' },
									]}
								/>
							</View>
						</View>

						<View style={styles.favoriteCard}>
							<View style={styles.favoriteTopRow}>
								<Ionicons name='barbell-outline' size={18} color='#F2B544' />
								<Text style={styles.favoriteTitle}>Вес</Text>
							</View>

							<Text style={styles.favoriteValue}>
								{currentWeight}
								{goals.weightGoal ? ` / ${goals.weightGoal}` : ''} кг
							</Text>

							{goals.weightGoal ? (
								<View style={styles.favoriteTrack}>
									<View
										style={[
											styles.favoriteFill,
											{
												width: `${weightProgress}%`,
												backgroundColor: '#F2B544',
											},
										]}
									/>
								</View>
							) : null}
						</View>
					</View>
				</View>
			</ScrollView>

			<BottomNav />

			<Modal visible={!!quickEditField} transparent animationType='fade'>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>{quickEditTitle}</Text>

						<Text style={styles.modalSubtitle}>
							Введите текущее значение в {quickEditUnit}
						</Text>

						<View style={styles.modalInputWrap}>
							<TextInput
								style={styles.modalInput}
								value={quickEditValue}
								onChangeText={text =>
									setQuickEditValue(text.replace(/[^0-9]/g, ''))
								}
								keyboardType='numeric'
								placeholder={quickEditPlaceholder}
								placeholderTextColor='#A0A7B5'
								autoFocus
								maxLength={6}
							/>

							<Text style={styles.modalInputUnit}>{quickEditUnit}</Text>
						</View>

						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[styles.modalButton, styles.modalCancelButton]}
								onPress={closeQuickEdit}
								activeOpacity={0.85}
								disabled={isSavingQuickEdit}
							>
								<Text style={styles.modalCancelText}>Отмена</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.modalButton, styles.modalSaveButton]}
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
	return (
		<TouchableOpacity
			style={styles.actionButton}
			onPress={onPress}
			activeOpacity={0.82}
		>
			<View style={styles.actionIcon}>{icon}</View>
			<Text style={styles.actionLabel}>{label}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F3F3F3',
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
		color: '#20C07A',
	},

	headerIcon: {
		position: 'absolute',
		right: 0,
		top: 4,
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: '#F1F1F1',
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
		color: '#9AA0A6',
	},

	targetButton: {
		width: 48,
		height: 48,
	},

	targetIconWrapper: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: '#F0FBF6',
		alignItems: 'center',
		justifyContent: 'center',
	},

	statsRow: {
		flexDirection: 'row',
		gap: 10,
		marginBottom: 16,
	},

	card: {
		backgroundColor: '#fff',
		borderRadius: 20,
		padding: 12,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 8,
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
		color: '#1F2937',
	},

	stepsLabel: {
		fontSize: 13,
		color: '#6B7280',
	},

	stepsGoalText: {
		fontSize: 12,
		color: '#9AA0A6',
		marginTop: 6,
		marginBottom: 6,
		textAlign: 'center',
	},

	stepsTrack: {
		height: 6,
		backgroundColor: '#E5E7EB',
		borderRadius: 4,
		overflow: 'hidden',
	},

	stepsFill: {
		height: '100%',
		backgroundColor: '#20C07A',
		borderRadius: 4,
	},

	rightStats: {
		width: '59%',
		gap: 10,
	},

	smallCard: {
		backgroundColor: '#fff',
		borderRadius: 20,
		padding: 12,
		minHeight: 110,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},

	smallMainValue: {
		fontSize: 22,
		fontWeight: '700',
		color: '#1F2937',
	},

	smallAccentText: {
		fontSize: 13,
		color: '#6F9BFF',
		marginTop: 2,
	},

	sleepBar: {
		height: 4,
		width: 60,
		backgroundColor: '#D9E6FF',
		marginVertical: 6,
		borderRadius: 4,
	},

	sleepTrack: {
		height: 6,
		backgroundColor: '#E5E7EB',
		borderRadius: 4,
		marginVertical: 6,
		overflow: 'hidden',
	},

	sleepFill: {
		height: '100%',
		backgroundColor: '#6F9BFF',
		borderRadius: 4,
	},

	smallHint: {
		fontSize: 12,
		color: '#9AA0A6',
	},

	kcalRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
	},

	kcalText: {
		fontSize: 14,
		color: '#374151',
		marginTop: 4,
	},

	caloriesTrack: {
		height: 6,
		backgroundColor: '#E5E7EB',
		borderRadius: 4,
		marginTop: 8,
		overflow: 'hidden',
	},

	caloriesFill: {
		height: '100%',
		backgroundColor: '#F2B544',
	},

	actionsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 18,
	},

	actionButton: {
		width: '31.5%',
		height: 90,
		backgroundColor: '#fff',
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},

	actionIcon: {
		marginBottom: 6,
	},

	actionLabel: {
		fontSize: 12,
		color: '#6B7280',
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
		color: '#1F1F1F',
	},

	dots: {
		fontSize: 20,
		color: '#9CA3AF',
		lineHeight: 20,
	},

	diaryCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 14,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},

	diaryLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	moodIconCircle: {
		width: 34,
		height: 34,
		borderRadius: 17,
		borderWidth: 2,
		borderColor: '#20C07A',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},

	diaryText: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		marginRight: 8,
	},

	favoritesRow: {
		flexDirection: 'row',
		gap: 12,
	},

	favoriteCard: {
		flex: 1,
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 6,
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
		color: '#9AA0A6',
		fontWeight: '600',
	},

	favoriteValue: {
		fontSize: 21,
		fontWeight: '700',
		color: '#374151',
		marginBottom: 10,
	},

	favoriteTrack: {
		height: 6,
		backgroundColor: '#E5E7EB',
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
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 18,
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 4,
	},

	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1F2937',
		marginBottom: 6,
		textAlign: 'center',
	},

	modalSubtitle: {
		fontSize: 13,
		color: '#6B7280',
		textAlign: 'center',
		marginBottom: 14,
	},

	modalInputWrap: {
		height: 54,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 14,
		backgroundColor: '#FAFAFA',
		marginBottom: 16,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
	},

	modalInput: {
		flex: 1,
		fontSize: 16,
		color: '#111827',
	},

	modalInputUnit: {
		fontSize: 14,
		fontWeight: '600',
		color: '#6B7280',
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

	modalCancelButton: {
		backgroundColor: '#F3F4F6',
	},

	modalSaveButton: {
		backgroundColor: '#20C07A',
	},

	modalCancelText: {
		fontSize: 15,
		fontWeight: '600',
		color: '#6B7280',
	},

	modalSaveText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#FFFFFF',
	},
});
