import React, { useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../src/context/ThemeContext';

const WORKOUTS = {
	'strength-arms': {
		title: 'Силовая для рук',
		durationMin: 25,
		intensity: 'Средняя',
		calories: 220,
		description: 'Тренировка для укрепления рук, плеч и верхней части тела.',
		icon: 'dumbbell',
		exercises: [
			{
				title: 'Отжимания',
				time: '3 подхода × 10 раз',
				description:
					'Держите корпус ровно, опускайтесь плавно и не прогибайте поясницу.',
			},
			{
				title: 'Планка на руках',
				time: '3 подхода × 30 сек',
				description: 'Напрягите пресс и удерживайте тело в прямой линии.',
			},
			{
				title: 'Сгибания рук',
				time: '3 подхода × 12 раз',
				description: 'Выполняйте движение медленно, контролируя локти.',
			},
		],
	},
	'stretching-full-body': {
		title: 'Растяжка для всего тела',
		durationMin: 15,
		intensity: 'Низкая',
		calories: 50,
		description: 'Мягкая тренировка для расслабления мышц и восстановления.',
		icon: 'yoga',
		exercises: [
			{
				title: 'Наклоны вперёд',
				time: '2 минуты',
				description: 'Тянитесь вниз без рывков, расслабляя спину и шею.',
			},
			{
				title: 'Растяжка плеч',
				time: '2 минуты',
				description: 'Плавно тяните руку к противоположному плечу.',
			},
			{
				title: 'Поза ребёнка',
				time: '3 минуты',
				description:
					'Опуститесь на колени, вытяните руки вперёд и расслабьтесь.',
			},
		],
	},
	'strength-full-body': {
		title: 'Силовая для всего тела',
		durationMin: 25,
		intensity: 'Средняя',
		calories: 220,
		description: 'Комплексная силовая тренировка для основных групп мышц.',
		icon: 'dumbbell',
		exercises: [
			{
				title: 'Приседания',
				time: '3 подхода × 12 раз',
				description: 'Держите спину ровно, колени направляйте по линии стоп.',
			},
			{
				title: 'Отжимания',
				time: '3 подхода × 10 раз',
				description: 'Опускайтесь плавно, не проваливая плечи.',
			},
			{
				title: 'Планка',
				time: '3 подхода × 30 сек',
				description: 'Напрягите пресс и не поднимайте таз слишком высоко.',
			},
		],
	},
	'cardio-legs': {
		title: 'Кардио для ног',
		durationMin: 27,
		intensity: 'Высокая',
		calories: 260,
		description: 'Активная тренировка для ног и выносливости.',
		icon: 'heart',
		exercises: [
			{
				title: 'Бег на месте',
				time: '3 минуты',
				description: 'Двигайтесь активно, помогайте себе руками.',
			},
			{
				title: 'Прыжки',
				time: '3 подхода × 30 сек',
				description: 'Приземляйтесь мягко, не блокируйте колени.',
			},
			{
				title: 'Выпады',
				time: '3 подхода × 10 раз',
				description: 'Следите, чтобы колено не уходило далеко за носок.',
			},
		],
	},
} as const;

export default function WorkoutDetailsScreen() {
	const insets = useSafeAreaInsets();
	const { colors, isDark } = useContext(ThemeContext);
	const params = useLocalSearchParams();

	const workoutId = String(params.id || 'strength-arms');
	const workout =
		WORKOUTS[workoutId as keyof typeof WORKOUTS] || WORKOUTS['strength-arms'];

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
						Инструкция
					</Text>

					<View style={styles.backButton} />
				</View>

				<View style={[styles.divider, { backgroundColor: colors.border }]} />

				<View
					style={[
						styles.heroCard,
						{ backgroundColor: colors.card, shadowColor: colors.shadow },
					]}
				>
					<View
						style={[
							styles.heroIcon,
							{ backgroundColor: isDark ? colors.cardSecondary : '#E9F8F1' },
						]}
					>
						<MaterialCommunityIcons
							name={workout.icon as any}
							size={32}
							color={colors.primary}
						/>
					</View>

					<Text style={[styles.title, { color: colors.text }]}>
						{workout.title}
					</Text>

					<Text style={[styles.description, { color: colors.textMuted }]}>
						{workout.description}
					</Text>

					<View style={styles.metaRow}>
						<MetaItem
							icon='time-outline'
							label={`${workout.durationMin} мин`}
							color={colors.primary}
						/>
						<MetaItem
							icon='flame-outline'
							label={`${workout.calories} ккал`}
							color={colors.warning}
						/>
						<MetaItem
							icon='speedometer-outline'
							label={workout.intensity}
							color={colors.blue}
						/>
					</View>
				</View>

				<Text style={[styles.sectionTitle, { color: colors.text }]}>
					Упражнения
				</Text>

				{workout.exercises.map((exercise, index) => (
					<View
						key={exercise.title}
						style={[
							styles.exerciseCard,
							{ backgroundColor: colors.card, shadowColor: colors.shadow },
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
								<Text style={[styles.exerciseTitle, { color: colors.text }]}>
									{exercise.title}
								</Text>

								<Text style={[styles.exerciseTime, { color: colors.primary }]}>
									{exercise.time}
								</Text>
							</View>
						</View>

						<Text
							style={[styles.exerciseDescription, { color: colors.textMuted }]}
						>
							{exercise.description}
						</Text>
					</View>
				))}

				<TouchableOpacity
					style={[styles.startButton, { backgroundColor: colors.primary }]}
					activeOpacity={0.85}
					onPress={() => router.push('/workout-session')}
				>
					<Text style={styles.startButtonText}>Начать тренировку</Text>
				</TouchableOpacity>
			</ScrollView>
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
