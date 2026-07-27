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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getTodayDaily, updateTodayDaily } from '../src/api/daily.api';
import { getTodaySleep, updateTodaySleep } from '../src/api/sleep.api';
import { getApiErrorMessage } from '../src/api/api-error';
import {
	createTodaySleepInterval,
	formatTimeFromIso,
} from '../src/utils/sleep-time';

type DailyData = {
	steps: string;
	sleepQuality: string;
	sleepStart: string;
	sleepEnd: string;
	calories: string;
};

export default function AddDataScreen() {
	const [form, setForm] = useState<DailyData>({
		steps: '',
		sleepQuality: '',
		sleepStart: '',
		sleepEnd: '',
		calories: '',
	});

	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		loadSavedData();
	}, []);

	const loadSavedData = async () => {
		try {
			const [daily, sleep] = await Promise.all([
				getTodayDaily(),
				getTodaySleep(),
			]);

			setForm({
				steps: String(daily.steps),
				sleepQuality: sleep ? String(sleep.sleepQuality) : '',
				sleepStart: sleep ? formatTimeFromIso(sleep.sleepStart) : '',
				sleepEnd: sleep ? formatTimeFromIso(sleep.sleepEnd) : '',
				calories: String(daily.calories),
			});
		} catch (requestError) {
			Alert.alert(
				'Ошибка',
				getApiErrorMessage(
					requestError,
					'Не удалось загрузить дневные данные',
				),
			);
		}
	};

	const updateField = (field: keyof DailyData, value: string) => {
		setForm(prev => ({
			...prev,
			[field]: value,
		}));
	};

	const updateNumericField = (field: keyof DailyData, value: string) => {
		const normalized = value.replace(/[^0-9]/g, '');
		updateField(field, normalized);
	};

	const validate = () => {
		if (form.steps && Number(form.steps) < 0) {
			Alert.alert('Ошибка', 'Шаги не могут быть отрицательными');
			return false;
		}

		if (form.calories && Number(form.calories) < 0) {
			Alert.alert('Ошибка', 'Калории не могут быть отрицательными');
			return false;
		}

		const hasAnySleepField =
			!!form.sleepQuality || !!form.sleepStart || !!form.sleepEnd;

		if (
			hasAnySleepField &&
			(!form.sleepQuality || !form.sleepStart || !form.sleepEnd)
		) {
			Alert.alert(
				'Ошибка',
				'Для сна укажите начало, окончание и качество',
			);
			return false;
		}

		if (
			form.sleepQuality &&
			(Number(form.sleepQuality) < 1 || Number(form.sleepQuality) > 5)
		) {
			Alert.alert('Ошибка', 'Качество сна должно быть от 1 до 5');
			return false;
		}

		return true;
	};

	const saveData = async () => {
		if (!validate()) return;

		try {
			setIsSaving(true);

			const requests: Promise<unknown>[] = [
				updateTodayDaily({
					steps: Number(form.steps || 0),
					calories: Number(form.calories || 0),
				}),
			];

			if (form.sleepQuality && form.sleepStart && form.sleepEnd) {
				const interval = createTodaySleepInterval(
					form.sleepStart,
					form.sleepEnd,
				);

				requests.push(
					updateTodaySleep({
						sleepStart: interval.sleepStart,
						sleepEnd: interval.sleepEnd,
						sleepQuality: Number(form.sleepQuality),
					}),
				);
			}

			await Promise.all(requests);

			Alert.alert('Успешно', 'Данные сохранены', [
				{
					text: 'OK',
					onPress: () => router.back(),
				},
			]);
		} catch (requestError) {
			Alert.alert(
				'Ошибка',
				getApiErrorMessage(requestError, 'Не удалось сохранить данные'),
			);
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
					<Ionicons name='arrow-back' size={28} color='#20C07A' />
				</TouchableOpacity>

				<Text style={styles.headerTitle}>Добавить данные</Text>

				<View style={styles.headerSpacer} />
			</View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<Ionicons name='walk-outline' size={18} color='#20C07A' />
						<Text style={styles.sectionTitle}>Шаги</Text>
					</View>

					<TextInput
						style={styles.input}
						value={form.steps}
						onChangeText={value => updateNumericField('steps', value)}
						keyboardType='numeric'
						placeholder='Например, 7560'
						placeholderTextColor='#A0A7B5'
					/>
				</View>

				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<Ionicons name='moon' size={18} color='#6F9BFF' />
						<Text style={styles.sectionTitle}>Сон</Text>
					</View>

					<Text style={styles.label}>Качество сна</Text>
					<TextInput
						style={styles.input}
						value={form.sleepQuality}
						onChangeText={value =>
							updateNumericField('sleepQuality', value)
						}
						keyboardType='numeric'
						placeholder='От 1 до 5'
						placeholderTextColor='#A0A7B5'
					/>

					<View style={styles.rowInputs}>
						<View style={styles.halfInputWrap}>
							<Text style={styles.label}>Начало сна</Text>
							<TextInput
								style={styles.input}
								value={form.sleepStart}
								onChangeText={value => updateField('sleepStart', value)}
								placeholder='23:30'
								placeholderTextColor='#A0A7B5'
							/>
						</View>

						<View style={styles.halfInputWrap}>
							<Text style={styles.label}>Конец сна</Text>
							<TextInput
								style={styles.input}
								value={form.sleepEnd}
								onChangeText={value => updateField('sleepEnd', value)}
								placeholder='07:00'
								placeholderTextColor='#A0A7B5'
							/>
						</View>
					</View>
				</View>

				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<Ionicons name='flame-outline' size={18} color='#F2B544' />
						<Text style={styles.sectionTitle}>Калории</Text>
					</View>

					<TextInput
						style={styles.input}
						value={form.calories}
						onChangeText={value => updateNumericField('calories', value)}
						keyboardType='numeric'
						placeholder='Например, 1850'
						placeholderTextColor='#A0A7B5'
					/>
				</View>

				<TouchableOpacity
					style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
					onPress={saveData}
					activeOpacity={0.85}
					disabled={isSaving}
				>
					<Text style={styles.saveButtonText}>
						{isSaving ? 'Сохранение...' : 'Сохранить'}
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
		height: 72,
		paddingTop: 20,
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
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1F2937',
	},
	headerSpacer: {
		width: 40,
		height: 40,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 18,
		paddingBottom: 32,
	},
	sectionCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 16,
		marginBottom: 18,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 14,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1F2937',
		marginLeft: 8,
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
		color: '#6B7280',
		marginBottom: 6,
		marginTop: 8,
	},
	input: {
		height: 48,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 14,
		paddingHorizontal: 14,
		fontSize: 16,
		color: '#111827',
		backgroundColor: '#FAFAFA',
	},
	rowInputs: {
		flexDirection: 'row',
		gap: 12,
	},
	halfInputWrap: {
		flex: 1,
	},
	saveButton: {
		marginTop: 6,
		height: 54,
		borderRadius: 18,
		backgroundColor: '#20C07A',
		alignItems: 'center',
		justifyContent: 'center',
	},
	saveButtonDisabled: {
		opacity: 0.7,
	},
	saveButtonText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FFFFFF',
	},
});
