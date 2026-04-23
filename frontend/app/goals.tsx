import React, { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

const GOALS_STORAGE_KEY = 'fitly_goals';

type GoalsState = {
	stepsGoal: string;
	calorieGoal: string;
	weightGoal: string;
	sleepGoalHours: string;
};

export default function GoalsScreen() {
	const [goals, setGoals] = useState<GoalsState>({
		stepsGoal: '',
		calorieGoal: '',
		weightGoal: '',
		sleepGoalHours: '',
	});

	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		loadGoals();
	}, []);

	const loadGoals = async () => {
		try {
			const raw = await AsyncStorage.getItem(GOALS_STORAGE_KEY);

			if (!raw) return;

			const parsed = JSON.parse(raw);

			setGoals({
				stepsGoal:
					parsed?.stepsGoal !== undefined && parsed?.stepsGoal !== null
						? String(parsed.stepsGoal)
						: '',
				calorieGoal:
					parsed?.calorieGoal !== undefined && parsed?.calorieGoal !== null
						? String(parsed.calorieGoal)
						: '',
				weightGoal:
					parsed?.weightGoal !== undefined && parsed?.weightGoal !== null
						? String(parsed.weightGoal)
						: '',
				sleepGoalHours:
					parsed?.sleepGoalHours !== undefined &&
					parsed?.sleepGoalHours !== null
						? String(parsed.sleepGoalHours)
						: '',
			});
		} catch (e) {
			console.log('Ошибка загрузки целей', e);
		}
	};

	const handleChange = (field: keyof GoalsState, value: string) => {
		const normalized = value.replace(/[^0-9]/g, '');

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
			!!goals.sleepGoalHours;

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

			const payload = {
				stepsGoal: goals.stepsGoal ? Number(goals.stepsGoal) : null,
				calorieGoal: goals.calorieGoal ? Number(goals.calorieGoal) : null,
				weightGoal: goals.weightGoal ? Number(goals.weightGoal) : null,
				sleepGoalHours: goals.sleepGoalHours
					? Number(goals.sleepGoalHours)
					: null,
				updatedAt: new Date().toISOString(),
			};

			await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(payload));

			router.back();
		} catch (e) {
			console.log('Ошибка сохранения целей', e);
			Alert.alert('Ошибка', 'Не удалось сохранить цели');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					activeOpacity={0.8}
				>
					<Ionicons name='arrow-back' size={26} color='#20C07A' />
				</TouchableOpacity>

				<Text style={styles.headerTitle}>Цели</Text>

				<View style={styles.headerSpacer} />
			</View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
				<View style={styles.heroCard}>
					<View style={styles.heroIcon}>
						<Feather name='target' size={20} color='#20C07A' />
					</View>

					<View style={styles.heroTextWrap}>
						<Text style={styles.heroTitle}>Настрой свои цели</Text>
						<Text style={styles.heroSubtitle}>
							Цели появятся на главной после сохранения
						</Text>
					</View>
				</View>

				<View style={styles.card}>
					<Text style={styles.label}>Цель по шагам</Text>
					<TextInput
						style={styles.input}
						value={goals.stepsGoal}
						onChangeText={value => handleChange('stepsGoal', value)}
						keyboardType='numeric'
						placeholder='Например, 10000'
						placeholderTextColor='#A0A7B5'
					/>

					<Text style={styles.label}>Цель по калориям</Text>
					<TextInput
						style={styles.input}
						value={goals.calorieGoal}
						onChangeText={value => handleChange('calorieGoal', value)}
						keyboardType='numeric'
						placeholder='Например, 2300'
						placeholderTextColor='#A0A7B5'
					/>

					<Text style={styles.label}>Целевой вес</Text>
					<TextInput
						style={styles.input}
						value={goals.weightGoal}
						onChangeText={value => handleChange('weightGoal', value)}
						keyboardType='numeric'
						placeholder='Например, 75'
						placeholderTextColor='#A0A7B5'
					/>

					<Text style={styles.label}>Цель сна (часы)</Text>
					<View style={styles.sleepGoalGrid}>
						{Array.from({ length: 24 }, (_, index) => {
							const hour = String(index + 1);

							return (
								<TouchableOpacity
									key={hour}
									style={[
										styles.sleepGoalOption,
										goals.sleepGoalHours === hour &&
											styles.sleepGoalOptionActive,
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
											goals.sleepGoalHours === hour &&
												styles.sleepGoalOptionTextActive,
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
					style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
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
		backgroundColor: '#F4F4F4',
	},

	header: {
		height: 96,
		paddingTop: 35,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomColor: '#ECECEC',
		backgroundColor: '#F4F4F4',
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
		color: '#1F2937',
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
		backgroundColor: '#fff',
		borderRadius: 20,
		padding: 14,
		marginBottom: 14,
	},

	heroIcon: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: '#EEF9F3',
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
		color: '#1F2937',
	},

	heroSubtitle: {
		fontSize: 13,
		color: '#6B7280',
		lineHeight: 18,
	},

	card: {
		backgroundColor: '#fff',
		borderRadius: 20,
		padding: 16,
		marginBottom: 20,
	},

	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 6,
		marginTop: 10,
	},

	input: {
		height: 48,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 12,
		paddingHorizontal: 12,
		fontSize: 16,
		color: '#111827',
		backgroundColor: '#FAFAFA',
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
		backgroundColor: '#FAFAFA',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
	},

	sleepGoalOptionActive: {
		backgroundColor: '#EEF9F3',
		borderColor: '#20C07A',
	},

	sleepGoalOptionText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#6B7280',
	},

	sleepGoalOptionTextActive: {
		color: '#20C07A',
	},

	saveButton: {
		height: 54,
		borderRadius: 16,
		backgroundColor: '#20C07A',
		alignItems: 'center',
		justifyContent: 'center',
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
