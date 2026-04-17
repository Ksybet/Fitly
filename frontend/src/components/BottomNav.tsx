import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';

type NavItemProps = {
	icon: React.ReactNode;
	label: string;
	active?: boolean;
	onPress?: () => void;
};

export default function BottomNav() {
	const insets = useSafeAreaInsets();
	const pathname = usePathname();

	const isHome = pathname === '/home';
	const isProfile = pathname === '/profile' || pathname === '/personal-data';

	return (
		<View
			style={[
				styles.bottomNav,
				{
					height: 86 + insets.bottom,
					paddingBottom: Math.max(insets.bottom, 10),
				},
			]}
		>
			<NavItem
				icon={
					<Ionicons
						name={isHome ? 'home' : 'home-outline'}
						size={23}
						color={isHome ? '#20C07A' : '#C9C9C9'}
					/>
				}
				label='Главная'
				active={isHome}
				onPress={() => router.replace('/home')}
			/>

			<NavItem
				icon={<Ionicons name='bar-chart-outline' size={22} color='#C9C9C9' />}
				label='Аналитика'
			/>

			<TouchableOpacity style={styles.centerPlusButton} activeOpacity={0.88}>
				<Ionicons name='add' size={28} color='#FFFFFF' />
			</TouchableOpacity>

			<NavItem
				icon={
					<MaterialCommunityIcons name='dumbbell' size={20} color='#C9C9C9' />
				}
				label='Тренировки'
			/>

			<NavItem
				icon={
					<Ionicons
						name='settings'
						size={22}
						color={isProfile ? '#20C07A' : '#C9C9C9'}
					/>
				}
				label='Ещё'
				active={isProfile}
				onPress={() => router.replace('/profile')}
			/>
		</View>
	);
}

function NavItem({ icon, label, active = false, onPress }: NavItemProps) {
	return (
		<TouchableOpacity style={styles.navItem} onPress={onPress}>
			{icon}
			<Text
				style={[styles.navLabel, active && styles.navLabelActive]}
				numberOfLines={1}
			>
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
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#EFEFEF',
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
		color: '#C9C9C9',
		marginTop: 4,
	},
	navLabelActive: {
		color: '#20C07A',
	},
	centerPlusButton: {
		width: 54,
		height: 54,
		borderRadius: 27,
		backgroundColor: '#20C07A',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: -16,
		shadowColor: '#20C07A',
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 6,
	},
});
