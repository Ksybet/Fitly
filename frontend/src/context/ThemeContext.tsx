import React, { createContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = 'fitly_settings';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeColors = {
	background: string;
	card: string;
	cardSecondary: string;
	text: string;
	textSecondary: string;
	textMuted: string;
	border: string;
	primary: string;
	success: string;
	warning: string;
	danger: string;
	blue: string;
	track: string;
	iconBg: string;
	shadow: string;
};

type ThemeContextType = {
	themeMode: ThemeMode;
	resolvedTheme: 'light' | 'dark';
	colors: ThemeColors;
	setThemeMode: (mode: ThemeMode) => Promise<void>;
	isDark: boolean;
};

const lightColors: ThemeColors = {
	background: '#F3F3F3',
	card: '#FFFFFF',
	cardSecondary: '#FAFAFA',

	text: '#1F2937',
	textSecondary: '#374151',
	textMuted: '#9AA0A6',

	border: '#E5E7EB',

	primary: '#20C07A',
	success: '#20C07A',
	warning: '#F2B544',
	danger: '#F36F6F',
	blue: '#6F9BFF',

	track: '#E5E7EB',
	iconBg: '#EEF5F1',

	shadow: '#000',
};

const darkColors: ThemeColors = {
	background: '#0F172A',
	card: '#1E293B',
	cardSecondary: '#273449',

	text: '#F1F5F9',
	textSecondary: '#CBD5F5',
	textMuted: '#94A3B8',

	border: '#334155',

	primary: '#34D399',
	success: '#34D399',
	warning: '#FBBF24',
	danger: '#F87171',
	blue: '#60A5FA',

	track: '#334155',
	iconBg: '#1F2937',

	shadow: '#000',
};

export const ThemeContext = createContext<ThemeContextType>({
	themeMode: 'system',
	resolvedTheme: 'light',
	colors: lightColors,
	setThemeMode: async () => {},
	isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
	const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(
		Appearance.getColorScheme(),
	);

	useEffect(() => {
		loadTheme();

		const subscription = Appearance.addChangeListener(({ colorScheme }) => {
			setSystemTheme(colorScheme);
		});

		return () => subscription.remove();
	}, []);

	const loadTheme = async () => {
		try {
			const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

			if (!raw) {
				setThemeModeState('system');
				return;
			}

			const parsed = JSON.parse(raw);
			setThemeModeState(parsed?.theme ?? 'system');
		} catch (e) {
			console.log('Ошибка загрузки темы', e);
		}
	};

	const setThemeMode = async (mode: ThemeMode) => {
		try {
			setThemeModeState(mode);

			const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
			const parsed = raw ? JSON.parse(raw) : {};

			const updated = {
				...parsed,
				theme: mode,
			};

			await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.log('Ошибка сохранения темы', e);
		}
	};

	const resolvedTheme: 'light' | 'dark' =
		themeMode === 'system'
			? systemTheme === 'dark'
				? 'dark'
				: 'light'
			: themeMode;

	const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

	return (
		<ThemeContext.Provider
			value={{
				themeMode,
				resolvedTheme,
				colors,
				setThemeMode,
				isDark: resolvedTheme === 'dark',
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
}
