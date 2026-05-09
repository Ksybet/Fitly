import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../src/context/ThemeContext';

const EXERCISES = [
	{
		title: 'Отжимания',
		target: '3 подхода × 10 раз',
		description: 'Держите корпус ровно, опускайтесь плавно.',
	},
	{
		title: 'Планка на руках',
		target: '3 подхода × 30 сек',
		description: 'Напрягите пресс и держите тело прямым.',
	},
	{
		title: 'Сгибания рук',
		target: '3 подхода × 12 раз',
		description: 'Выполняйте движение медленно и контролируйте локти.',
	},
];

function formatTime(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	const restSeconds = seconds % 60;

	return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(
		2,
		'0',
	)}`;
}

export default function WorkoutSessionScreen() {
	const insets = useSafeAreaInsets();
	const { colors, isDark } = useContext(ThemeContext);

	const [seconds, setSeconds] = useState(0);
	const [isRunning, setIsRunning] = useState(true);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);

	const currentExercise = EXERCISES[currentIndex];
	const isLastExercise = currentIndex === EXERCISES.length - 1;

	const progressText = useMemo(() => {
		return `${currentIndex + 1} из ${EXERCISES.length}`;
	}, [currentIndex]);

	useEffect(() => {
		if (!isRunning) return;

		const timer = setInterval(() => {
			setSeconds(prev => prev + 1);
		}, 1000);

		return () => clearInterval(timer);
	}, [isRunning]);

	const finishWorkout = () => {
		setIsRunning(false);
		setIsFinishModalVisible(true);
	};

	const goNext = () => {
		if (isLastExercise) {
			finishWorkout();
			return;
		}

		setCurrentIndex(prev => prev + 1);
	};

	const goBack = () => {
		if (currentIndex > 0) {
			setCurrentIndex(prev => prev - 1);
		}
	};

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
					>
						<Ionicons name='chevron-back' size={24} color={colors.text} />
					</TouchableOpacity>

					<Text style={[styles.headerTitle, { color: colors.text }]}>
						Силовая для рук
					</Text>

					<View style={styles.backButton} />
				</View>

				<View style={[styles.divider, { backgroundColor: colors.border }]} />

				<View
					style={[
						styles.timerCard,
						{ backgroundColor: colors.card, shadowColor: colors.shadow },
					]}
				>
					<Text style={[styles.timerLabel, { color: colors.textMuted }]}>
						Время тренировки
					</Text>

					<Text style={[styles.timerValue, { color: colors.primary }]}>
						{formatTime(seconds)}
					</Text>

					<TouchableOpacity
						style={[
							styles.pauseButton,
							{ backgroundColor: isDark ? colors.cardSecondary : '#F3F4F6' },
						]}
						onPress={() => setIsRunning(prev => !prev)}
					>
						<Ionicons
							name={isRunning ? 'pause' : 'play'}
							size={20}
							color={colors.text}
						/>
						<Text style={[styles.pauseText, { color: colors.text }]}>
							{isRunning ? 'Пауза' : 'Продолжить'}
						</Text>
					</TouchableOpacity>
				</View>

				<Text style={[styles.progressText, { color: colors.textMuted }]}>
					Упражнение {progressText}
				</Text>

				<View
					style={[
						styles.exerciseCard,
						{ backgroundColor: colors.card, shadowColor: colors.shadow },
					]}
				>
					<View
						style={[
							styles.exerciseIcon,
							{
								backgroundColor: isDark ? colors.cardSecondary : '#E9F8F1',
							},
						]}
					>
						<Ionicons name='barbell-outline' size={32} color={colors.primary} />
					</View>

					<Text style={[styles.exerciseTitle, { color: colors.text }]}>
						{currentExercise.title}
					</Text>

					<Text style={[styles.exerciseTarget, { color: colors.primary }]}>
						{currentExercise.target}
					</Text>

					<Text
						style={[styles.exerciseDescription, { color: colors.textMuted }]}
					>
						{currentExercise.description}
					</Text>
				</View>

				<View style={styles.buttonsRow}>
					<TouchableOpacity
						style={[
							styles.secondaryButton,
							{
								backgroundColor: isDark ? colors.cardSecondary : '#F3F4F6',
								opacity: currentIndex === 0 ? 0.45 : 1,
							},
						]}
						disabled={currentIndex === 0}
						onPress={goBack}
					>
						<Text style={[styles.secondaryButtonText, { color: colors.text }]}>
							Назад
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.primaryButton, { backgroundColor: colors.primary }]}
						onPress={goNext}
					>
						<Text style={styles.primaryButtonText}>
							{isLastExercise ? 'Завершить' : 'Далее'}
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* 🔥 ФИНАЛЬНОЕ МОДАЛЬНОЕ ОКНО */}
			<Modal visible={isFinishModalVisible} transparent animationType='fade'>
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.finishModal,
							{ backgroundColor: colors.card, shadowColor: colors.shadow },
						]}
					>
						<View
							style={[
								styles.finishIcon,
								{
									backgroundColor: isDark ? colors.cardSecondary : '#E9F8F1',
								},
							]}
						>
							<Ionicons
								name='checkmark-circle'
								size={46}
								color={colors.primary}
							/>
						</View>

						<Text style={[styles.finishTitle, { color: colors.text }]}>
							Тренировка завершена
						</Text>

						<Text style={[styles.finishSubtitle, { color: colors.textMuted }]}>
							Отличная работа!
						</Text>

						<Text style={[styles.finishTime, { color: colors.primary }]}>
							{formatTime(seconds)}
						</Text>

						<TouchableOpacity
							style={[styles.finishButton, { backgroundColor: colors.primary }]}
							onPress={() => {
								setIsFinishModalVisible(false);
								router.replace('/workouts');
							}}
						>
							<Text style={styles.finishButtonText}>Готово</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { paddingHorizontal: 20 },

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
		marginBottom: 18,
	},

	timerCard: {
		borderRadius: 20,
		padding: 18,
		alignItems: 'center',
		marginBottom: 18,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},

	timerLabel: {
		fontSize: 13,
		marginBottom: 6,
	},

	timerValue: {
		fontSize: 44,
		fontWeight: '800',
		marginBottom: 12,
	},

	pauseButton: {
		height: 38,
		borderRadius: 19,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},

	pauseText: {
		fontSize: 14,
		fontWeight: '700',
	},

	progressText: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 10,
	},

	exerciseCard: {
		borderRadius: 22,
		padding: 20,
		alignItems: 'center',
		marginBottom: 18,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},

	exerciseIcon: {
		width: 72,
		height: 72,
		borderRadius: 36,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 14,
	},

	exerciseTitle: {
		fontSize: 22,
		fontWeight: '800',
		marginBottom: 6,
	},

	exerciseTarget: {
		fontSize: 15,
		fontWeight: '700',
		marginBottom: 10,
	},

	exerciseDescription: {
		fontSize: 14,
		textAlign: 'center',
	},

	buttonsRow: {
		flexDirection: 'row',
		gap: 12,
	},

	secondaryButton: {
		flex: 1,
		height: 48,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},

	secondaryButtonText: {
		fontSize: 15,
		fontWeight: '700',
	},

	primaryButton: {
		flex: 1,
		height: 48,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},

	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '800',
	},

	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},

	finishModal: {
		width: '100%',
		borderRadius: 24,
		padding: 22,
		alignItems: 'center',
	},

	finishIcon: {
		width: 82,
		height: 82,
		borderRadius: 41,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 14,
	},

	finishTitle: {
		fontSize: 22,
		fontWeight: '800',
		marginBottom: 6,
	},

	finishSubtitle: {
		fontSize: 14,
		marginBottom: 10,
	},

	finishTime: {
		fontSize: 38,
		fontWeight: '800',
		marginBottom: 18,
	},

	finishButton: {
		width: '100%',
		height: 48,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},

	finishButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '800',
	},
});
