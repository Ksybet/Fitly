import React, { useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Alert,
	Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const DAILY_DATA_STORAGE_KEY = 'fitly_daily_data';

type PickerField = 'start' | 'end' | null;

export default function SleepScreen() {
	const insets = useSafeAreaInsets();

	const [sleepQuality, setSleepQuality] = useState('');
	const [sleepStart, setSleepStart] = useState('');
	const [sleepEnd, setSleepEnd] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	const [pickerField, setPickerField] = useState<PickerField>(null);
	const [pickerValue, setPickerValue] = useState(new Date());

	useEffect(() => {
		loadSleepData();
	}, []);

	const loadSleepData = async () => {
		try {
			const raw = await AsyncStorage.getItem(DAILY_DATA_STORAGE_KEY);
			if (!raw) return;

			const data = JSON.parse(raw);

			setSleepQuality(data?.sleepQuality ?? '');
			setSleepStart(data?.sleepStart ?? '');
			setSleepEnd(data?.sleepEnd ?? '');
		} catch (e) {
			console.log('Ошибка загрузки сна', e);
		}
	};

	const formatTime = (date: Date) => {
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	};

	const parseTimeToDate = (time: string) => {
		const date = new Date();

		if (!time || !time.includes(':')) {
			return date;
		}

		const [hours, minutes] = time.split(':').map(Number);

		if (!Number.isNaN(hours)) {
			date.setHours(hours);
		}

		if (!Number.isNaN(minutes)) {
			date.setMinutes(minutes);
		}

		date.setSeconds(0);
		date.setMilliseconds(0);

		return date;
	};

	const calculateSleepDuration = (start: string, end: string) => {
		if (!start || !end || !start.includes(':') || !end.includes(':')) {
			return { hours: 0, minutes: 0 };
		}

		const [startH, startM] = start.split(':').map(Number);
		const [endH, endM] = end.split(':').map(Number);

		if (
			Number.isNaN(startH) ||
			Number.isNaN(startM) ||
			Number.isNaN(endH) ||
			Number.isNaN(endM)
		) {
			return { hours: 0, minutes: 0 };
		}

		const startDate = new Date();
		startDate.setHours(startH, startM, 0, 0);

		const endDate = new Date();
		endDate.setHours(endH, endM, 0, 0);

		if (endDate <= startDate) {
			endDate.setDate(endDate.getDate() + 1);
		}

		const diffMs = endDate.getTime() - startDate.getTime();
		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

		return { hours, minutes };
	};

	const duration = useMemo(() => {
		return calculateSleepDuration(sleepStart, sleepEnd);
	}, [sleepStart, sleepEnd]);

	const validate = () => {
		if (!sleepStart || !sleepEnd) {
			Alert.alert('Ошибка', 'Выберите начало и конец сна');
			return false;
		}

		if (!sleepQuality) {
			Alert.alert('Ошибка', 'Выберите качество сна');
			return false;
		}

		const totalMinutes = duration.hours * 60 + duration.minutes;

		if (totalMinutes <= 0) {
			Alert.alert('Ошибка', 'Некорректный диапазон сна');
			return false;
		}

		return true;
	};

	const openTimePicker = (field: PickerField) => {
		if (!field) return;

		setPickerField(field);
		setPickerValue(
			field === 'start'
				? parseTimeToDate(sleepStart)
				: parseTimeToDate(sleepEnd),
		);
	};

	const onTimeChange = (_event: any, selectedDate?: Date) => {
		if (Platform.OS === 'android') {
			setPickerField(null);
		}

		if (!selectedDate || !pickerField) {
			return;
		}

		const formattedTime = formatTime(selectedDate);

		if (pickerField === 'start') {
			setSleepStart(formattedTime);
		}

		if (pickerField === 'end') {
			setSleepEnd(formattedTime);
		}

		if (Platform.OS === 'ios') {
			setPickerValue(selectedDate);
		}
	};

	const saveSleep = async () => {
		if (!validate()) return;

		try {
			setIsSaving(true);

			const raw = await AsyncStorage.getItem(DAILY_DATA_STORAGE_KEY);
			const prev = raw ? JSON.parse(raw) : {};

			const updated = {
				steps: Number(prev?.steps ?? 0),
				sleepHours: duration.hours,
				sleepMinutes: duration.minutes,
				sleepQuality,
				sleepStart,
				sleepEnd,
				calories: Number(prev?.calories ?? 0),
				updatedAt: new Date().toISOString(),
			};

			await AsyncStorage.setItem(
				DAILY_DATA_STORAGE_KEY,
				JSON.stringify(updated),
			);

			router.back();
		} catch (e) {
			console.log('Ошибка сохранения', e);
			Alert.alert('Ошибка', 'Не удалось сохранить');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={[styles.header, { paddingTop: insets.top + 8 }]}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name='arrow-back' size={26} color='#20C07A' />
				</TouchableOpacity>

				<Text style={styles.title}>Сон</Text>

				<View style={{ width: 26 }} />
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.card}>
					<Text style={styles.label}>Качество сна</Text>
					<View style={styles.optionRow}>
						{['Плохо', 'Нормально', 'Хорошо'].map(option => (
							<TouchableOpacity
								key={option}
								style={[
									styles.optionButton,
									sleepQuality === option && styles.optionButtonActive,
								]}
								onPress={() => setSleepQuality(option)}
								activeOpacity={0.85}
							>
								<Text
									style={[
										styles.optionText,
										sleepQuality === option && styles.optionTextActive,
									]}
								>
									{option}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					<Text style={styles.label}>Начало сна</Text>
					<TouchableOpacity
						style={styles.pickerButton}
						onPress={() => openTimePicker('start')}
						activeOpacity={0.85}
					>
						<Text
							style={[
								styles.pickerButtonText,
								!sleepStart && styles.placeholderText,
							]}
						>
							{sleepStart || 'Выбрать время'}
						</Text>
					</TouchableOpacity>

					<Text style={styles.label}>Конец сна</Text>
					<TouchableOpacity
						style={styles.pickerButton}
						onPress={() => openTimePicker('end')}
						activeOpacity={0.85}
					>
						<Text
							style={[
								styles.pickerButtonText,
								!sleepEnd && styles.placeholderText,
							]}
						>
							{sleepEnd || 'Выбрать время'}
						</Text>
					</TouchableOpacity>

					<View style={styles.durationCard}>
						<Text style={styles.durationLabel}>Длительность сна</Text>
						<Text style={styles.durationValue}>
							{duration.hours > 0 || duration.minutes > 0
								? `${duration.hours} ч ${duration.minutes} м`
								: '—'}
						</Text>
					</View>

					{pickerField && (
						<View style={styles.pickerWrapper}>
							<DateTimePicker
								value={pickerValue}
								mode='time'
								is24Hour
								display={Platform.OS === 'ios' ? 'spinner' : 'default'}
								onChange={onTimeChange}
							/>

							{Platform.OS === 'ios' && (
								<View style={styles.iosPickerActions}>
									<TouchableOpacity
										style={styles.iosPickerButtonSecondary}
										onPress={() => setPickerField(null)}
										activeOpacity={0.85}
									>
										<Text style={styles.iosPickerButtonSecondaryText}>
											Готово
										</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					)}
				</View>

				<TouchableOpacity
					style={styles.saveButton}
					onPress={saveSleep}
					disabled={isSaving}
					activeOpacity={0.85}
				>
					<Text style={styles.saveText}>
						{isSaving ? 'Сохранение...' : 'Сохранить'}
					</Text>
				</TouchableOpacity>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F3F3F3',
	},

	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		marginBottom: 10,
	},

	title: {
		fontSize: 18,
		fontWeight: '700',
	},

	content: {
		paddingHorizontal: 16,
		paddingBottom: 30,
	},

	card: {
		backgroundColor: '#fff',
		borderRadius: 20,
		padding: 16,
	},

	label: {
		fontSize: 14,
		fontWeight: '600',
		marginTop: 10,
		marginBottom: 6,
		color: '#374151',
	},

	optionRow: {
		flexDirection: 'row',
		gap: 10,
	},

	optionButton: {
		flex: 1,
		height: 44,
		borderRadius: 12,
		backgroundColor: '#FAFAFA',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
	},

	optionButtonActive: {
		backgroundColor: '#EEF9F3',
		borderColor: '#20C07A',
	},

	optionText: {
		color: '#6B7280',
		fontWeight: '600',
	},

	optionTextActive: {
		color: '#20C07A',
	},

	pickerButton: {
		height: 48,
		borderRadius: 12,
		backgroundColor: '#FAFAFA',
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		justifyContent: 'center',
	},

	pickerButtonText: {
		fontSize: 16,
		color: '#111827',
	},

	placeholderText: {
		color: '#A0A7B5',
	},

	durationCard: {
		marginTop: 14,
		padding: 14,
		borderRadius: 14,
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},

	durationLabel: {
		fontSize: 13,
		color: '#6B7280',
		marginBottom: 4,
	},

	durationValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1F2937',
	},

	pickerWrapper: {
		marginTop: 10,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#FFFFFF',
	},

	iosPickerActions: {
		paddingHorizontal: 12,
		paddingBottom: 12,
		alignItems: 'flex-end',
	},

	iosPickerButtonSecondary: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: '#F3F4F6',
	},

	iosPickerButtonSecondaryText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},

	saveButton: {
		marginTop: 20,
		backgroundColor: '#20C07A',
		borderRadius: 16,
		height: 54,
		alignItems: 'center',
		justifyContent: 'center',
	},

	saveText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 16,
	},
});
