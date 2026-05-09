import React, { useContext, useEffect, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Switch,
	Alert,
	Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemeContext, ThemeMode } from '../src/context/ThemeContext';

const SETTINGS_STORAGE_KEY = 'fitly_settings';

type AppSettings = {
	doNotDisturb: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
	doNotDisturb: false,
};

export default function SettingsScreen() {
	const insets = useSafeAreaInsets();
	const { themeMode, setThemeMode, colors, isDark } = useContext(ThemeContext);

	const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
	const [themeModalVisible, setThemeModalVisible] = useState(false);

	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = async () => {
		try {
			const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

			if (!raw) {
				setSettings(DEFAULT_SETTINGS);
				return;
			}

			const parsed = JSON.parse(raw);

			setSettings({
				doNotDisturb: Boolean(parsed?.doNotDisturb),
			});
		} catch (e) {
			console.log('Ошибка загрузки настроек', e);
			setSettings(DEFAULT_SETTINGS);
		}
	};

	const saveSettings = async (nextSettings: AppSettings) => {
		try {
			setSettings(nextSettings);

			const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
			const parsed = raw ? JSON.parse(raw) : {};

			await AsyncStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({
					...parsed,
					...nextSettings,
				}),
			);
		} catch (e) {
			console.log('Ошибка сохранения настроек', e);
			Alert.alert('Ошибка', 'Не удалось сохранить настройки');
		}
	};

	const changeTheme = async (theme: ThemeMode) => {
		await setThemeMode(theme);
		setThemeModalVisible(false);
	};

	const toggleDoNotDisturb = async (value: boolean) => {
		await saveSettings({
			...settings,
			doNotDisturb: value,
		});
	};

	const getThemeLabel = () => {
		if (themeMode === 'dark') return 'Тёмная';
		if (themeMode === 'system') return 'Как в системе';
		return 'Светлая';
	};

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View
				style={[
					styles.header,
					{
						paddingTop: insets.top + 20,
						borderBottomColor: colors.border,
						backgroundColor: colors.background,
					},
				]}
			>
				<TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
					<Ionicons name='arrow-back' size={26} color={colors.primary} />
				</TouchableOpacity>

				<Text style={[styles.title, { color: colors.text }]}>Настройки</Text>

				<View style={{ width: 26 }} />
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<TouchableOpacity
					style={[
						styles.card,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
					activeOpacity={0.9}
					onPress={() => setThemeModalVisible(true)}
				>
					<View style={styles.cardLeft}>
						<View
							style={[styles.iconCircle, { backgroundColor: colors.iconBg }]}
						>
							<Feather
								name={isDark ? 'moon' : 'sun'}
								size={22}
								color={colors.primary}
							/>
						</View>

						<View style={styles.textWrap}>
							<Text style={[styles.cardTitle, { color: colors.text }]}>
								Сменить тему
							</Text>
							<Text
								style={[styles.cardSubtitle, { color: colors.textSecondary }]}
							>
								{getThemeLabel()}
							</Text>
						</View>
					</View>

					<Ionicons name='chevron-forward' size={20} color={colors.textMuted} />
				</TouchableOpacity>

				<View
					style={[
						styles.card,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<View style={styles.cardLeft}>
						<View
							style={[styles.iconCircle, { backgroundColor: colors.iconBg }]}
						>
							<Feather name='moon' size={22} color={colors.primary} />
						</View>

						<View style={styles.textWrap}>
							<Text style={[styles.cardTitle, { color: colors.text }]}>
								Не беспокоить
							</Text>
							<Text
								style={[styles.cardSubtitle, { color: colors.textSecondary }]}
							>
								Отключить уведомления в ночное время
							</Text>
						</View>
					</View>

					<Switch
						value={settings.doNotDisturb}
						onValueChange={toggleDoNotDisturb}
						trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
						thumbColor={settings.doNotDisturb ? '#20C07A' : '#FFFFFF'}
					/>
				</View>
			</ScrollView>

			<Modal visible={themeModalVisible} transparent animationType='fade'>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalCard, { backgroundColor: colors.card }]}>
						<Text style={[styles.modalTitle, { color: colors.text }]}>
							Выбери тему
						</Text>

						{[
							{ key: 'light', label: 'Светлая' },
							{ key: 'dark', label: 'Тёмная' },
							{ key: 'system', label: 'Как в системе' },
						].map(option => (
							<TouchableOpacity
								key={option.key}
								style={[
									styles.themeOption,
									{
										backgroundColor: colors.cardSecondary,
										borderColor: colors.border,
									},
								]}
								onPress={() => changeTheme(option.key as ThemeMode)}
								activeOpacity={0.85}
							>
								<Text style={[styles.themeOptionText, { color: colors.text }]}>
									{option.label}
								</Text>

								{themeMode === option.key ? (
									<Ionicons name='checkmark' size={20} color={colors.primary} />
								) : null}
							</TouchableOpacity>
						))}

						<TouchableOpacity
							style={[styles.closeButton, { backgroundColor: colors.primary }]}
							onPress={() => setThemeModalVisible(false)}
							activeOpacity={0.85}
						>
							<Text style={styles.closeButtonText}>Закрыть</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
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
		borderBottomWidth: 1,
		paddingBottom: 12,
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
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 16,
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	cardLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		paddingRight: 12,
	},
	iconCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	textWrap: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
	},
	cardSubtitle: {
		fontSize: 13,
		marginTop: 2,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	modalCard: {
		borderRadius: 20,
		padding: 18,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 14,
	},
	themeOption: {
		height: 52,
		borderRadius: 14,
		borderWidth: 1,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	themeOptionText: {
		fontSize: 15,
		fontWeight: '600',
	},
	closeButton: {
		marginTop: 6,
		height: 48,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '700',
	},
});
