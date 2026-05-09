import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Alert,
	Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemeContext } from '../src/context/ThemeContext';
import { getTodaySleep, updateTodaySleep } from '../src/api/sleep.api';

type PickerField = 'start' | 'end' | null;
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const TIME_OPTION_HEIGHT = 50;
const TIME_VISIBLE_AREA_HEIGHT = 190;

export default function SleepScreen() {
	const insets = useSafeAreaInsets();
	const { colors, isDark } = useContext(ThemeContext);

	const [sleepQuality, setSleepQuality] = useState('');
	const [sleepStart, setSleepStart] = useState('');
	const [sleepEnd, setSleepEnd] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	const [pickerField, setPickerField] = useState<PickerField>(null);
	const [pickerHour, setPickerHour] = useState(22);
	const [pickerMinute, setPickerMinute] = useState(0);

	useEffect(() => {
		loadSleepData();
	}, []);

	const loadSleepData = async () => {
		try {
			const data = await getTodaySleep();

			if (!data) return;

			setSleepQuality(data?.sleepQuality ?? '');
			setSleepStart(data?.sleepStart ?? '');
			setSleepEnd(data?.sleepEnd ?? '');
		} catch (e) {
			console.log('Ошибка загрузки сна', e);
		}
	};

	const formatTime = (hours: number, minutes: number) => {
		return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
	};

	const parseTime = (time: string) => {
		if (!time || !time.includes(':')) {
			return { hours: 22, minutes: 0 };
		}

		const [hours, minutes] = time.split(':').map(Number);

		return {
			hours: Number.isNaN(hours) ? 22 : hours,
			minutes: Number.isNaN(minutes) ? 0 : minutes,
		};
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

		const currentTime = field === 'start' ? sleepStart : sleepEnd;
		const parsed = parseTime(currentTime);

		setPickerField(field);
		setPickerHour(parsed.hours);
		setPickerMinute(parsed.minutes);
	};

	const closeTimePicker = () => {
		setPickerField(null);
	};

	const savePickerTime = () => {
		if (!pickerField) return;

		const selectedTime = formatTime(pickerHour, pickerMinute);

		if (pickerField === 'start') {
			setSleepStart(selectedTime);
		}

		if (pickerField === 'end') {
			setSleepEnd(selectedTime);
		}

		closeTimePicker();
	};

	const saveSleep = async () => {
		if (!validate()) return;

		try {
			setIsSaving(true);

			await updateTodaySleep({
				sleepStart,
				sleepEnd,
				sleepHours: duration.hours,
				sleepMinutes: duration.minutes,
				sleepQuality,
			});

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

						<Ionicons name='time-outline' size={20} color={colors.textMuted} />
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

						<Ionicons name='time-outline' size={20} color={colors.textMuted} />
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

			<Modal visible={!!pickerField} transparent animationType='fade'>
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.timeModal,
							{
								backgroundColor: colors.card,
								shadowColor: colors.shadow,
							},
						]}
					>
						<Text style={[styles.modalTitle, { color: colors.text }]}>
							{pickerField === 'start' ? 'Начало сна' : 'Конец сна'}
						</Text>

						<Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
							Выберите время в удобном формате
						</Text>

						<View style={styles.timePickerRow}>
							<TimeColumn
								value={pickerHour}
								label='Часы'
								values={HOURS}
								onChange={setPickerHour}
							/>

							<Text style={[styles.timeSeparator, { color: colors.primary }]}>
								:
							</Text>

							<TimeColumn
								value={pickerMinute}
								label='Минуты'
								values={MINUTES}
								onChange={setPickerMinute}
							/>
						</View>

						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[
									styles.modalButton,
									styles.cancelButton,
									{
										backgroundColor: isDark ? colors.cardSecondary : '#F3F4F6',
									},
								]}
								onPress={closeTimePicker}
								activeOpacity={0.85}
							>
								<Text
									style={[styles.cancelText, { color: colors.textSecondary }]}
								>
									Отмена
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.modalButton,
									{ backgroundColor: colors.primary },
								]}
								onPress={savePickerTime}
								activeOpacity={0.85}
							>
								<Text style={styles.confirmText}>Сохранить</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}

function TimeColumn({
	value,
	label,
	values,
	onChange,
}: {
	value: number;
	label: string;
	values: number[];
	onChange: (value: number) => void;
}) {
	const { colors } = useContext(ThemeContext);
	const scrollRef = useRef<ScrollView>(null);

	useEffect(() => {
		const index = values.indexOf(value);

		if (index < 0) return;

		setTimeout(() => {
			const offset =
				index * TIME_OPTION_HEIGHT -
				TIME_VISIBLE_AREA_HEIGHT / 2 +
				TIME_OPTION_HEIGHT / 2;

			scrollRef.current?.scrollTo({
				y: offset > 0 ? offset : 0,
				animated: true,
			});
		}, 120);
	}, [value, values]);

	return (
		<View style={styles.timeColumn}>
			<Text style={[styles.timeLabel, { color: colors.textMuted }]}>
				{label}
			</Text>

			<ScrollView
				ref={scrollRef}
				style={styles.timeScroll}
				contentContainerStyle={styles.timeScrollContent}
				showsVerticalScrollIndicator={false}
			>
				{values.map(item => {
					const active = item === value;

					return (
						<TouchableOpacity
							key={item}
							style={[
								styles.timeOption,
								{
									backgroundColor: active
										? colors.primary
										: colors.cardSecondary,
									borderColor: active ? colors.primary : colors.border,
								},
							]}
							activeOpacity={0.85}
							onPress={() => onChange(item)}
						>
							<Text
								style={[
									styles.timeOptionText,
									{ color: active ? '#FFFFFF' : colors.text },
								]}
							>
								{String(item).padStart(2, '0')}
							</Text>
						</TouchableOpacity>
					);
				})}
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
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
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
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'center',
		paddingHorizontal: 22,
	},
	timeModal: {
		borderRadius: 24,
		padding: 20,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.12,
		shadowRadius: 14,
		elevation: 6,
	},
	modalTitle: {
		fontSize: 21,
		fontWeight: '800',
		textAlign: 'center',
		marginBottom: 6,
	},
	modalSubtitle: {
		fontSize: 13,
		textAlign: 'center',
		marginBottom: 18,
	},
	timePickerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},

	timeColumn: {
		width: 96,
		alignItems: 'center',
	},
	timeControlButton: {
		width: 46,
		height: 36,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	timeValueBox: {
		width: 78,
		height: 70,
		borderRadius: 20,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		marginVertical: 10,
	},
	timeValue: {
		fontSize: 34,
		fontWeight: '800',
	},
	timeLabel: {
		fontSize: 13,
		fontWeight: '700',
		marginBottom: 8,
	},
	timeSeparator: {
		fontSize: 38,
		fontWeight: '800',
		marginHorizontal: 4,
		marginTop: 22,
	},
	modalButtons: {
		flexDirection: 'row',
		gap: 12,
	},
	modalButton: {
		flex: 1,
		height: 48,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelButton: {},
	cancelText: {
		fontSize: 15,
		fontWeight: '700',
	},
	confirmText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '800',
	},
	timeScroll: {
		height: 190,
		width: 86,
	},
	timeScrollContent: {
		gap: 8,
		paddingVertical: 6,
	},
	timeOption: {
		height: 42,
		borderRadius: 14,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},

	timeOptionText: {
		fontSize: 18,
		fontWeight: '800',
	},
});
