import React, { useContext, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../src/context/ThemeContext';
import BottomNav from '../src/components/BottomNav';

type WorkoutType = 'cardio' | 'strength' | 'stretching';
type BodyZone = 'press' | 'arms' | 'glutes' | 'legs' | 'back' | 'full_body';

const WORKOUT_TYPES: {
	key: WorkoutType;
	label: string;
	icon: keyof typeof MaterialCommunityIcons.glyphMap;
	disabled?: boolean;
}[] = [
	{ key: 'cardio', label: 'Кардио', icon: 'heart', disabled: true },
	{ key: 'strength', label: 'Силовая', icon: 'dumbbell' },
	{ key: 'stretching', label: 'Растяжка', icon: 'yoga', disabled: true },
];

const BODY_ZONES: {
	key: BodyZone;
	label: string;
	icon: keyof typeof MaterialCommunityIcons.glyphMap;
	disabled?: boolean;
}[] = [
	{ key: 'press', label: 'Пресс', icon: 'human', disabled: true },
	{ key: 'arms', label: 'Руки', icon: 'arm-flex-outline' },
	{ key: 'glutes', label: 'Ягодицы', icon: 'human-female', disabled: true },
	{ key: 'legs', label: 'Ноги', icon: 'shoe-print', disabled: true },
	{ key: 'back', label: 'Спина', icon: 'human-male-height', disabled: true },
	{ key: 'full_body', label: 'Все тело', icon: 'human-male', disabled: true },
];

export default function IndividualWorkoutScreen() {
	const insets = useSafeAreaInsets();
	const { colors, isDark } = useContext(ThemeContext);

	const [selectedType] = useState<WorkoutType>('strength');
	const [selectedZone] = useState<BodyZone>('arms');

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
						const disabled = item.disabled;

						return (
							<TouchableOpacity
								key={item.key}
								style={[
									styles.typeTab,
									active && { backgroundColor: colors.primary },
									disabled && styles.disabledItem,
								]}
								activeOpacity={disabled ? 1 : 0.85}
								disabled={disabled}
							>
								<MaterialCommunityIcons
									name={item.icon}
									size={18}
									color={
										active
											? '#FFFFFF'
											: disabled
												? colors.textMuted
												: colors.textSecondary
									}
								/>

								<Text
									style={[
										styles.typeTabText,
										{
											color: active
												? '#FFFFFF'
												: disabled
													? colors.textMuted
													: colors.textSecondary,
										},
									]}
								>
									{item.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				<View style={styles.zoneGrid}>
					{BODY_ZONES.map(item => {
						const active = selectedZone === item.key;
						const disabled = item.disabled;

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
									disabled && styles.disabledItem,
								]}
								activeOpacity={disabled ? 1 : 0.85}
								disabled={disabled}
							>
								<MaterialCommunityIcons
									name={item.icon}
									size={24}
									color={
										active
											? colors.primary
											: disabled
												? colors.textMuted
												: colors.textSecondary
									}
								/>

								<Text
									style={[
										styles.zoneText,
										{
											color:
												disabled && !active ? colors.textMuted : colors.text,
										},
									]}
								>
									{item.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				<View
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
									backgroundColor: isDark ? colors.cardSecondary : '#E9F8F1',
								},
							]}
						>
							<MaterialCommunityIcons
								name='dumbbell'
								size={22}
								color={colors.primary}
							/>
						</View>

						<View style={styles.workoutInfo}>
							<Text style={[styles.workoutTitle, { color: colors.text }]}>
								Силовая для рук
							</Text>

							<Text style={[styles.workoutMeta, { color: colors.textMuted }]}>
								25 минут · Средняя
							</Text>

							<Text style={[styles.workoutMeta, { color: colors.textMuted }]}>
								сложность ~ 220 ккал
							</Text>
						</View>

						<TouchableOpacity
							style={[styles.startButton, { backgroundColor: colors.primary }]}
							activeOpacity={0.85}
							onPress={() => router.push('/workout-details?id=strength-arms')}
						>
							<Text style={styles.startButtonText}>Начать</Text>
						</TouchableOpacity>
					</View>

					<View style={[styles.hintBar, { backgroundColor: colors.track }]}>
						<Text style={[styles.hintText, { color: colors.textMuted }]}>
							Подходит при хорошем самочувствии
						</Text>
					</View>
				</View>
			</ScrollView>

			<BottomNav />
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
		height: 34,
		borderRadius: 9,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 5,
	},
	typeTabText: {
		fontSize: 13,
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
	},
	disabledItem: {
		opacity: 0.4,
	},
	workoutCard: {
		borderRadius: 16,
		padding: 12,
		marginBottom: 20,
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
		paddingHorizontal: 16,
		height: 30,
		alignItems: 'center',
		justifyContent: 'center',
	},
	startButtonText: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '700',
	},
	hintBar: {
		height: 18,
		borderRadius: 9,
		justifyContent: 'center',
		paddingHorizontal: 12,
		marginTop: 10,
	},
	hintText: {
		fontSize: 11,
	},
});
