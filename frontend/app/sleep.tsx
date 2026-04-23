import React, { useContext, useEffect, useMemo, useState } from 'react';
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
import { ThemeContext } from '../src/context/ThemeContext';

const DAILY_DATA_STORAGE_KEY = 'fitly_daily_data';

type PickerField = 'start' | 'end' | null;

export default function SleepScreen() {
	const insets = useSafeAreaInsets();
	const { colors, isDark } = useContext(ThemeContext);

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
				moodScore:
					prev?.moodScore !== undefined && prev?.moodScore !== null
						? Number(prev.moodScore)
						: null,
				moodLabel: prev?.moodLabel ?? '',
				moodEmoji: prev?.moodEmoji ?? '',
				waterCurrent:
					prev?.waterCurrent !== undefined && prev?.waterCurrent !== null
						? Number(prev.waterCurrent)
						: null,
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
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View
				style={[
					styles.header,
					{
						paddingTop: insets.top + 8,
						backgroundColor: colors.background,
					},
				]}
			>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name='arrow-back' size={26} color={colors.primary} />
				</TouchableOpacity>

				<Text style={[styles.title, { color: colors.text }]}>Сон</Text>

				<View style={{ width: 26 }} />
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<View
					style={[
						styles.card,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<Text style={[styles.label, { color: colors.textSecondary }]}>
						Качество сна
					</Text>

					<View style={styles.optionRow}>
						{['Плохо', 'Нормально', 'Хорошо'].map(option => {
							const isActive = sleepQuality === option;

							return (
								<TouchableOpacity
									key={option}
									style={[
										styles.optionButton,
										{
											backgroundColor: isActive
												? isDark
													? colors.iconBg
													: '#EEF9F3'
												: colors.cardSecondary,
											borderColor: isActive ? colors.primary : colors.border,
										},
									]}
									onPress={() => setSleepQuality(option)}
									activeOpacity={0.85}
								>
									<Text
										style={[
											styles.optionText,
											{
												color: isActive ? colors.primary : colors.textSecondary,
											},
										]}
									>
										{option}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>

					<Text style={[styles.label, { color: colors.textSecondary }]}>
						Начало сна
					</Text>
					<TouchableOpacity
						style={[
							styles.pickerButton,
							{
								backgroundColor: colors.cardSecondary,
								borderColor: colors.border,
							},
						]}
						onPress={() => openTimePicker('start')}
						activeOpacity={0.85}
					>
						<Text
							style={[
								styles.pickerButtonText,
								{ color: sleepStart ? colors.text : colors.textMuted },
							]}
						>
							{sleepStart || 'Выбрать время'}
						</Text>
					</TouchableOpacity>

					<Text style={[styles.label, { color: colors.textSecondary }]}>
						Конец сна
					</Text>
					<TouchableOpacity
						style={[
							styles.pickerButton,
							{
								backgroundColor: colors.cardSecondary,
								borderColor: colors.border,
							},
						]}
						onPress={() => openTimePicker('end')}
						activeOpacity={0.85}
					>
						<Text
							style={[
								styles.pickerButtonText,
								{ color: sleepEnd ? colors.text : colors.textMuted },
							]}
						>
							{sleepEnd || 'Выбрать время'}
						</Text>
					</TouchableOpacity>

					<View
						style={[
							styles.durationCard,
							{
								backgroundColor: colors.cardSecondary,
								borderColor: colors.border,
							},
						]}
					>
						<Text style={[styles.durationLabel, { color: colors.textMuted }]}>
							Длительность сна
						</Text>
						<Text style={[styles.durationValue, { color: colors.text }]}>
							{duration.hours > 0 || duration.minutes > 0
								? `${duration.hours} ч ${duration.minutes} м`
								: '—'}
						</Text>
					</View>

					{pickerField && (
						<View
							style={[styles.pickerWrapper, { backgroundColor: colors.card }]}
						>
							<DateTimePicker
								value={pickerValue}
								mode='time'
								is24Hour
								display={Platform.OS === 'ios' ? 'spinner' : 'default'}
								onChange={onTimeChange}
								themeVariant={isDark ? 'dark' : 'light'}
							/>

							{Platform.OS === 'ios' && (
								<View style={styles.iosPickerActions}>
									<TouchableOpacity
										style={[
											styles.iosPickerButtonSecondary,
											{
												backgroundColor: isDark
													? colors.cardSecondary
													: '#F3F4F6',
											},
										]}
										onPress={() => setPickerField(null)}
										activeOpacity={0.85}
									>
										<Text
											style={[
												styles.iosPickerButtonSecondaryText,
												{ color: colors.textSecondary },
											]}
										>
											Готово
										</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					)}
				</View>

				<TouchableOpacity
					style={[styles.saveButton, { backgroundColor: colors.primary }]}
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
		borderRadius: 20,
		padding: 16,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 3,
	},

	label: {
		fontSize: 14,
		fontWeight: '600',
		marginTop: 10,
		marginBottom: 6,
	},

	optionRow: {
		flexDirection: 'row',
		gap: 10,
	},

	optionButton: {
		flex: 1,
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},

	optionText: {
		fontWeight: '600',
	},

	pickerButton: {
		height: 48,
		borderRadius: 12,
		paddingHorizontal: 12,
		borderWidth: 1,
		justifyContent: 'center',
	},

	pickerButtonText: {
		fontSize: 16,
	},

	durationCard: {
		marginTop: 14,
		padding: 14,
		borderRadius: 14,
		borderWidth: 1,
	},

	durationLabel: {
		fontSize: 13,
		marginBottom: 4,
	},

	durationValue: {
		fontSize: 18,
		fontWeight: '700',
	},

	pickerWrapper: {
		marginTop: 10,
		borderRadius: 12,
		overflow: 'hidden',
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
	},

	iosPickerButtonSecondaryText: {
		fontSize: 14,
		fontWeight: '600',
	},

	saveButton: {
		marginTop: 20,
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
