import React, { useContext, useEffect, useRef, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	Switch,
	Modal,
	ScrollView,
	Alert,
	Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { ThemeContext } from '../src/context/ThemeContext';

const SLEEP_REMINDER_ENABLED_KEY = 'sleepReminderEnabled';
const SLEEP_REMINDER_TIME_KEY = 'sleepReminderTime';
const SLEEP_NOTIFICATION_ID_KEY = 'sleepNotificationId';

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

const TIME_OPTION_HEIGHT = 50;
const TIME_VISIBLE_AREA_HEIGHT = 190;

async function setupNotificationChannel() {
	if (Platform.OS === 'android') {
		await Notifications.setNotificationChannelAsync('default', {
			name: 'default',
			importance: Notifications.AndroidImportance.HIGH,
		});
	}
}

async function cancelSleepNotification() {
	const oldId = await AsyncStorage.getItem(SLEEP_NOTIFICATION_ID_KEY);

	if (oldId) {
		await Notifications.cancelScheduledNotificationAsync(oldId);
		await AsyncStorage.removeItem(SLEEP_NOTIFICATION_ID_KEY);
	}
}

async function scheduleSleepNotification(hours: number, minutes: number) {
	await setupNotificationChannel();

	const permission = await Notifications.getPermissionsAsync();

	if (permission.status !== 'granted') {
		const request = await Notifications.requestPermissionsAsync();

		if (request.status !== 'granted') {
			Alert.alert(
				'Уведомления выключены',
				'Разреши уведомления в настройках телефона, чтобы получать напоминания о сне.',
			);
			return null;
		}
	}

	await cancelSleepNotification();

	const notificationId = await Notifications.scheduleNotificationAsync({
		content: {
			title: 'Fitly',
			body: 'Пора готовиться ко сну 🌙',
			sound: true,
		},
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.DAILY,
			hour: hours,
			minute: minutes,
			channelId: 'default',
		} as any,
	});

	await AsyncStorage.setItem(SLEEP_NOTIFICATION_ID_KEY, notificationId);
	const scheduled = await Notifications.getAllScheduledNotificationsAsync();
	console.log('SCHEDULED NOTIFICATIONS:', scheduled);

	Alert.alert(
		'Напоминание установлено',
		`Каждый день в ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
	);

	return notificationId;
}

export default function RemindersScreen() {
	const { colors, isDark } = useContext(ThemeContext);

	const [enabled, setEnabled] = useState(false);
	const [hours, setHours] = useState(22);
	const [minutes, setMinutes] = useState(0);
	const [timeModalVisible, setTimeModalVisible] = useState(false);

	useEffect(() => {
		setupNotificationChannel();
		loadReminderSettings();
	}, []);

	const loadReminderSettings = async () => {
		try {
			const savedEnabled = await AsyncStorage.getItem(
				SLEEP_REMINDER_ENABLED_KEY,
			);

			const savedTime = await AsyncStorage.getItem(SLEEP_REMINDER_TIME_KEY);

			setEnabled(savedEnabled === 'true');

			if (savedTime && savedTime.includes(':')) {
				const [savedHours, savedMinutes] = savedTime.split(':').map(Number);

				setHours(savedHours);
				setMinutes(savedMinutes);
			}
		} catch (e) {
			console.log('Ошибка загрузки reminders', e);
		}
	};

	const saveReminder = async (
		newEnabled: boolean,
		selectedHours: number,
		selectedMinutes: number,
	) => {
		try {
			const formattedHours = String(selectedHours).padStart(2, '0');
			const formattedMinutes = String(selectedMinutes).padStart(2, '0');

			await AsyncStorage.setItem(
				SLEEP_REMINDER_ENABLED_KEY,
				String(newEnabled),
			);

			await AsyncStorage.setItem(
				SLEEP_REMINDER_TIME_KEY,
				`${formattedHours}:${formattedMinutes}`,
			);

			if (newEnabled) {
				await scheduleSleepNotification(selectedHours, selectedMinutes);
			} else {
				await cancelSleepNotification();
			}
		} catch (e) {
			console.log('Ошибка сохранения reminders', e);
			Alert.alert('Ошибка', 'Не удалось сохранить настройки');
		}
	};

const handleToggle = async (value: boolean) => {
	setEnabled(value);
	await saveReminder(value, hours, minutes);
};

	const handleSaveTime = async () => {
		setTimeModalVisible(false);
		await saveReminder(enabled, hours, minutes);
	};

	const formattedTime = `${String(hours).padStart(2, '0')}:${String(
		minutes,
	).padStart(2, '0')}`;

	return (
		<SafeAreaView
			style={[styles.safeArea, { backgroundColor: colors.background }]}
		>
			<View style={styles.screen}>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name='arrow-back' size={26} color={colors.primary} />
					</TouchableOpacity>

					<Text style={[styles.title, { color: colors.text }]}>
						Напоминания
					</Text>

					<View style={{ width: 26 }} />
				</View>

				<View
					style={[
						styles.card,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<View style={styles.row}>
						<View style={styles.rowLeft}>
							<View
								style={[styles.iconWrapper, { backgroundColor: colors.iconBg }]}
							>
								<Ionicons name='moon' size={22} color={colors.primary} />
							</View>

							<View style={styles.textBlock}>
								<Text style={[styles.rowTitle, { color: colors.text }]}>
									Уведомление о сне
								</Text>

								<Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
									Каждый день в {formattedTime}
								</Text>
							</View>
						</View>

						<Switch value={enabled} onValueChange={handleToggle} />
					</View>

					<TouchableOpacity
						style={[
							styles.timeButton,
							{
								borderTopColor: colors.border,
							},
						]}
						activeOpacity={0.85}
						onPress={() => setTimeModalVisible(true)}
					>
						<Text
							style={[styles.timeButtonLabel, { color: colors.textSecondary }]}
						>
							Время уведомления
						</Text>

						<View style={styles.timeButtonRight}>
							<Text style={[styles.timeButtonValue, { color: colors.text }]}>
								{formattedTime}
							</Text>

							<Ionicons
								name='time-outline'
								size={20}
								color={colors.textMuted}
							/>
						</View>
					</TouchableOpacity>
				</View>
			</View>

			<Modal visible={timeModalVisible} transparent animationType='fade'>
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
							Время уведомления
						</Text>

						<Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
							Выберите время напоминания
						</Text>

						<View style={styles.timePickerRow}>
							<TimeColumn
								value={hours}
								label='Часы'
								values={HOURS}
								onChange={setHours}
							/>

							<Text style={[styles.timeSeparator, { color: colors.primary }]}>
								:
							</Text>

							<TimeColumn
								value={minutes}
								label='Минуты'
								values={MINUTES}
								onChange={setMinutes}
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
								onPress={() => setTimeModalVisible(false)}
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
									{
										backgroundColor: colors.primary,
									},
								]}
								onPress={handleSaveTime}
								activeOpacity={0.85}
							>
								<Text style={styles.confirmText}>Сохранить</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
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
									{
										color: active ? '#FFFFFF' : colors.text,
									},
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
	safeArea: {
		flex: 1,
	},
	screen: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 54,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 18,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
	},
	card: {
		borderRadius: 20,
		padding: 16,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 3,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingBottom: 14,
	},
	rowLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 12,
	},
	iconWrapper: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	textBlock: {
		flex: 1,
	},
	rowTitle: {
		fontSize: 16,
		fontWeight: '700',
	},
	rowSubtitle: {
		fontSize: 13,
		marginTop: 2,
	},
	timeButton: {
		borderTopWidth: 1,
		paddingTop: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	timeButtonLabel: {
		fontSize: 14,
		fontWeight: '600',
	},
	timeButtonRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	timeButtonValue: {
		fontSize: 16,
		fontWeight: '700',
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
});
