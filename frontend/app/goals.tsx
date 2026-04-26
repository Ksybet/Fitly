import React, { useContext, useEffect, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	ScrollView,
	TextInput,
	Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemeContext } from '../src/context/ThemeContext';
import { getGoals, updateGoals } from '../src/api/goals.api';

type GoalsState = {
	stepsGoal: string;
	calorieGoal: string;
	weightGoal: string;
	sleepGoalHours: string;
	waterGoal: string;
};

type ApiGoal = {
	goalType: string;
	targetValue: number;
};

export default function GoalsScreen() {
	const { colors, isDark } = useContext(ThemeContext);

	const [goals, setGoals] = useState<GoalsState>({
		stepsGoal: '',
		calorieGoal: '',
		weightGoal: '',
		sleepGoalHours: '',
		waterGoal: '',
	});

	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		loadGoals();
	}, []);

	const mapApiGoalsToState = (apiGoals: ApiGoal[]) => {
		const nextGoals: GoalsState = {
			stepsGoal: '',
			calorieGoal: '',
			weightGoal: '',
			sleepGoalHours: '',
			waterGoal: '',
		};

		apiGoals.forEach(goal => {
			const value =
				goal.targetValue !== undefined && goal.targetValue !== null
					? String(goal.targetValue)
					: '';

			if (goal.goalType === 'steps') {
				nextGoals.stepsGoal = value;
			}

			if (goal.goalType === 'calories') {
				nextGoals.calorieGoal = value;
			}

			if (goal.goalType === 'weight') {
				nextGoals.weightGoal = value;
			}

			if (goal.goalType === 'sleep') {
				nextGoals.sleepGoalHours = value;
			}

			if (goal.goalType === 'water') {
				nextGoals.waterGoal = value;
			}
		});

		return nextGoals;
	};

	const mapStateToApiGoals = () => {
		const result = [];

		if (goals.stepsGoal) {
			result.push({
				goalType: 'steps',
				title: 'Цель по шагам',
				targetValue: Number(goals.stepsGoal),
				unit: 'steps',
				status: 'active',
			});
		}

		if (goals.calorieGoal) {
			result.push({
				goalType: 'calories',
				title: 'Цель по калориям',
				targetValue: Number(goals.calorieGoal),
				unit: 'kcal',
				status: 'active',
			});
		}

		if (goals.weightGoal) {
			result.push({
				goalType: 'weight',
				title: 'Целевой вес',
				targetValue: Number(goals.weightGoal),
				unit: 'kg',
				status: 'active',
			});
		}

		if (goals.sleepGoalHours) {
			result.push({
				goalType: 'sleep',
				title: 'Цель сна',
				targetValue: Number(goals.sleepGoalHours),
				unit: 'hours',
				status: 'active',
			});
		}

		if (goals.waterGoal) {
			result.push({
				goalType: 'water',
				title: 'Цель по воде',
				targetValue: Number(goals.waterGoal),
				unit: 'l',
				status: 'active',
			});
		}

		return result;
	};

	const loadGoals = async () => {
		try {
			const apiGoals = await getGoals();
			setGoals(mapApiGoalsToState(apiGoals));
		} catch (e) {
			console.log('Ошибка загрузки целей', e);
			Alert.alert('Ошибка', 'Не удалось загрузить цели');
		}
	};

	const handleChange = (field: keyof GoalsState, value: string) => {
		let normalized = value;

		if (field === 'waterGoal') {
			normalized = value
				.replace(',', '.')
				.replace(/[^0-9.]/g, '')
				.replace(/(\..*)\./g, '$1');
		} else {
			normalized = value.replace(/[^0-9]/g, '');
		}

		setGoals(prev => ({
			...prev,
			[field]: normalized,
		}));
	};

	const validate = () => {
		const hasAnyGoal =
			!!goals.stepsGoal ||
			!!goals.calorieGoal ||
			!!goals.weightGoal ||
			!!goals.sleepGoalHours ||
			!!goals.waterGoal;

		if (!hasAnyGoal) {
			Alert.alert('Ошибка', 'Введите хотя бы одну цель');
			return false;
		}

		if (goals.stepsGoal && Number(goals.stepsGoal) <= 0) {
			Alert.alert('Ошибка', 'Цель по шагам должна быть больше нуля');
			return false;
		}

		if (goals.calorieGoal && Number(goals.calorieGoal) <= 0) {
			Alert.alert('Ошибка', 'Цель по калориям должна быть больше нуля');
			return false;
		}

		if (goals.waterGoal && Number(goals.waterGoal) <= 0) {
			Alert.alert('Ошибка', 'Цель по воде должна быть больше нуля');
			return false;
		}

		if (goals.weightGoal && Number(goals.weightGoal) <= 0) {
			Alert.alert('Ошибка', 'Целевой вес должен быть больше нуля');
			return false;
		}

		if (
			goals.sleepGoalHours &&
			(Number(goals.sleepGoalHours) <= 0 || Number(goals.sleepGoalHours) > 24)
		) {
			Alert.alert('Ошибка', 'Цель сна должна быть от 1 до 24 часов');
			return false;
		}

		return true;
	};

	const saveGoals = async () => {
		if (!validate()) return;

		try {
			setIsSaving(true);

			const payload = mapStateToApiGoals();
			await updateGoals(payload);

			router.back();
		} catch (e) {
			console.log('Ошибка сохранения целей', e);
			Alert.alert('Ошибка', 'Не удалось сохранить цели');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<SafeAreaView
			style={[styles.safeArea, { backgroundColor: colors.background }]}
		>
			<View
				style={[
					styles.header,
					{
						backgroundColor: colors.background,
						borderBottomColor: colors.border,
					},
				]}
			>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					activeOpacity={0.8}
				>
					<Ionicons name='arrow-back' size={26} color={colors.primary} />
				</TouchableOpacity>

				<Text style={[styles.headerTitle, { color: colors.text }]}>Цели</Text>

				<View style={styles.headerSpacer} />
			</View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
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
								backgroundColor: colors.iconBg,
							},
						]}
					>
						<Feather name='target' size={20} color={colors.primary} />
					</View>

					<View style={styles.heroTextWrap}>
						<Text style={[styles.heroTitle, { color: colors.text }]}>
							Настрой свои цели
						</Text>
						<Text
							style={[styles.heroSubtitle, { color: colors.textSecondary }]}
						>
							Показатели будут отображаться на главной
						</Text>
					</View>
				</View>

				<View
					style={[
						styles.sectionCard,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<View style={styles.sectionTop}>
						<View
							style={[styles.sectionIcon, { backgroundColor: colors.iconBg }]}
						>
							<Ionicons name='walk-outline' size={18} color={colors.primary} />
						</View>
						<Text style={[styles.sectionName, { color: colors.text }]}>
							Активность
						</Text>
					</View>

					<Text style={[styles.label, { color: colors.textSecondary }]}>
						Цель по шагам
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								borderColor: colors.border,
								backgroundColor: colors.cardSecondary,
								color: colors.text,
							},
						]}
						value={goals.stepsGoal}
						onChangeText={value => handleChange('stepsGoal', value)}
						keyboardType='numeric'
						placeholder='Например, 10000'
						placeholderTextColor={colors.textMuted}
					/>
				</View>

				<View
					style={[
						styles.sectionCard,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<View style={styles.sectionTop}>
						<View
							style={[styles.sectionIcon, { backgroundColor: colors.iconBg }]}
						>
							<MaterialIcons
								name='local-fire-department'
								size={18}
								color={colors.warning}
							/>
						</View>
						<Text style={[styles.sectionName, { color: colors.text }]}>
							Питание
						</Text>
					</View>

					<Text style={[styles.label, { color: colors.textSecondary }]}>
						Цель по калориям
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								borderColor: colors.border,
								backgroundColor: colors.cardSecondary,
								color: colors.text,
							},
						]}
						value={goals.calorieGoal}
						onChangeText={value => handleChange('calorieGoal', value)}
						keyboardType='numeric'
						placeholder='Например, 2300'
						placeholderTextColor={colors.textMuted}
					/>
				</View>

				<View
					style={[
						styles.sectionCard,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<View style={styles.sectionTop}>
						<View
							style={[styles.sectionIcon, { backgroundColor: colors.iconBg }]}
						>
							<Ionicons name='water-outline' size={18} color={colors.blue} />
						</View>
						<Text style={[styles.sectionName, { color: colors.text }]}>
							Вода
						</Text>
					</View>

					<Text style={[styles.label, { color: colors.textSecondary }]}>
						Цель по воде (литры)
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								borderColor: colors.border,
								backgroundColor: colors.cardSecondary,
								color: colors.text,
							},
						]}
						value={goals.waterGoal}
						onChangeText={value => handleChange('waterGoal', value)}
						keyboardType='decimal-pad'
						placeholder='Например, 2.5'
						placeholderTextColor={colors.textMuted}
					/>
				</View>

				<View
					style={[
						styles.sectionCard,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<View style={styles.sectionTop}>
						<View
							style={[styles.sectionIcon, { backgroundColor: colors.iconBg }]}
						>
							<Ionicons
								name='barbell-outline'
								size={18}
								color={colors.warning}
							/>
						</View>
						<Text style={[styles.sectionName, { color: colors.text }]}>
							Тело
						</Text>
					</View>

					<Text style={[styles.label, { color: colors.textSecondary }]}>
						Целевой вес
					</Text>
					<TextInput
						style={[
							styles.input,
							{
								borderColor: colors.border,
								backgroundColor: colors.cardSecondary,
								color: colors.text,
							},
						]}
						value={goals.weightGoal}
						onChangeText={value => handleChange('weightGoal', value)}
						keyboardType='numeric'
						placeholder='Например, 75'
						placeholderTextColor={colors.textMuted}
					/>
				</View>

				<View
					style={[
						styles.sectionCard,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<View style={styles.sectionTop}>
						<View
							style={[styles.sectionIcon, { backgroundColor: colors.iconBg }]}
						>
							<Ionicons name='moon' size={18} color={colors.blue} />
						</View>
						<Text style={[styles.sectionName, { color: colors.text }]}>
							Сон
						</Text>
					</View>

					<Text style={[styles.label, { color: colors.textSecondary }]}>
						Цель сна (часы)
					</Text>
					<View style={styles.sleepGoalGrid}>
						{Array.from({ length: 24 }, (_, index) => {
							const hour = String(index + 1);
							const isActive = goals.sleepGoalHours === hour;

							return (
								<TouchableOpacity
									key={hour}
									style={[
										styles.sleepGoalOption,
										{
											backgroundColor: isActive
												? isDark
													? colors.iconBg
													: '#EEF9F3'
												: colors.cardSecondary,
											borderColor: isActive ? colors.primary : colors.border,
										},
									]}
									onPress={() =>
										setGoals(prev => ({
											...prev,
											sleepGoalHours: hour,
										}))
									}
									activeOpacity={0.85}
								>
									<Text
										style={[
											styles.sleepGoalOptionText,
											{
												color: isActive ? colors.primary : colors.textSecondary,
											},
										]}
									>
										{hour}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>

				<TouchableOpacity
					style={[
						styles.saveButton,
						{ backgroundColor: colors.primary },
						isSaving && styles.saveButtonDisabled,
					]}
					onPress={saveGoals}
					activeOpacity={0.85}
					disabled={isSaving}
				>
					<Text style={styles.saveButtonText}>
						{isSaving ? 'Сохранение...' : 'Сохранить цели'}
					</Text>
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	header: {
		height: 96,
		paddingTop: 35,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
	},
	backButton: {
		width: 40,
		height: 40,
		justifyContent: 'center',
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '700',
	},
	headerSpacer: {
		width: 40,
		height: 40,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 30,
	},
	heroCard: {
		flexDirection: 'row',
		borderRadius: 20,
		padding: 14,
		marginBottom: 14,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 3,
	},
	heroIcon: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	heroTextWrap: {
		flex: 1,
	},
	heroTitle: {
		fontSize: 16,
		fontWeight: '700',
	},
	heroSubtitle: {
		fontSize: 13,
		lineHeight: 18,
	},
	sectionCard: {
		borderRadius: 20,
		padding: 16,
		marginBottom: 14,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 3,
	},
	sectionTop: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	sectionIcon: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	sectionName: {
		fontSize: 16,
		fontWeight: '700',
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 6,
		marginTop: 8,
	},
	input: {
		height: 48,
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 12,
		fontSize: 16,
	},
	sleepGoalGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 4,
	},
	sleepGoalOption: {
		width: 46,
		height: 40,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sleepGoalOptionText: {
		fontSize: 14,
		fontWeight: '600',
	},
	saveButton: {
		height: 54,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 6,
	},
	saveButtonDisabled: {
		opacity: 0.7,
	},
	saveButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},
});
