import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { ThemeContext } from '../context/ThemeContext';

type NavItemProps = {
	icon: React.ReactNode;
	label: string;
	active?: boolean;
	onPress?: () => void;
	textColor: string;
};

export default function BottomNav() {
	const insets = useSafeAreaInsets();
	const pathname = usePathname();
	const { colors } = useContext(ThemeContext);

	const isHome = pathname === '/home';
	const isProfile = pathname === '/profile' || pathname === '/personal-data';
	const isGoals = pathname === '/goals';
	const isMood = pathname === '/mood';
	const isSleep = pathname === '/sleep';
	const isFavorites = pathname === '/favorites';

	const isMoreSection =
		isProfile || isGoals || isMood || isSleep || isFavorites;

	return (
		<View
			style={[
				styles.bottomNav,
				{
					height: 86 + insets.bottom,
					paddingBottom: Math.max(insets.bottom, 10),
					backgroundColor: colors.card,
					borderTopColor: colors.border,
				},
			]}
		>
			<NavItem
				icon={
					<Ionicons
						name={isHome ? 'home' : 'home-outline'}
						size={23}
						color={isHome ? colors.primary : colors.textMuted}
					/>
				}
				label='Главная'
				active={isHome}
				textColor={isHome ? colors.primary : colors.textMuted}
				onPress={() => router.replace('/home')}
			/>

			<NavItem
				icon={
					<Ionicons
						name='bar-chart-outline'
						size={22}
						color={colors.textMuted}
					/>
				}
				label='Аналитика'
				textColor={colors.textMuted}
			/>

			<TouchableOpacity
				style={[
					styles.centerPlusButton,
					{
						backgroundColor: colors.primary,
						shadowColor: colors.shadow,
					},
				]}
				activeOpacity={0.88}
			>
				<Ionicons name='add' size={28} color='#FFFFFF' />
			</TouchableOpacity>

			<NavItem
				icon={
					<MaterialCommunityIcons
						name='dumbbell'
						size={20}
						color={colors.textMuted}
					/>
				}
				label='Тренировки'
				textColor={colors.textMuted}
			/>

			<NavItem
				icon={
					<Ionicons
						name='settings'
						size={22}
						color={isMoreSection ? colors.primary : colors.textMuted}
					/>
				}
				label='Ещё'
				active={isMoreSection}
				textColor={isMoreSection ? colors.primary : colors.textMuted}
				onPress={() => router.replace('/profile')}
			/>
		</View>
	);
}

function NavItem({ icon, label, onPress, textColor }: NavItemProps) {
	return (
		<TouchableOpacity
			style={styles.navItem}
			onPress={onPress}
			activeOpacity={0.8}
		>
			{icon}
			<Text style={[styles.navLabel, { color: textColor }]} numberOfLines={1}>
				{label}
			</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	bottomNav: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		borderTopWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'flex-start',
		paddingTop: 8,
		paddingHorizontal: 10,
	},
	navItem: {
		alignItems: 'center',
		width: 72,
	},
	navLabel: {
		fontSize: 11,
		marginTop: 4,
	},
	centerPlusButton: {
		width: 54,
		height: 54,
		borderRadius: 27,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: -16,
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 6,
	},
});
