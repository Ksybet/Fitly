import React, { useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

import { AuthContext } from '../src/context/AuthContext';
import { ThemeContext } from '../src/context/ThemeContext';
import BottomNav from '../src/components/BottomNav';

type Colors = any;

type SectionCardProps = {
	children: React.ReactNode;
	colors: Colors;
};

type SectionRowProps = {
	icon: React.ReactNode;
	label: string;
	subtitle?: string;
	onPress?: () => void;
	noBorder?: boolean;
	colors: Colors;
	disabled?: boolean;
};

type StaticRowProps = {
	icon: React.ReactNode;
	label: string;
	value: string;
	noBorder?: boolean;
	colors: Colors;
	disabled?: boolean;
};

function SectionCard({ children, colors }: SectionCardProps) {
	return (
		<View
			style={[
				styles.card,
				{
					backgroundColor: colors.card,
					shadowColor: colors.shadow,
				},
			]}
		>
			{children}
		</View>
	);
}

function SectionRow({
	icon,
	label,
	subtitle,
	onPress,
	noBorder = false,
	colors,
	disabled = false,
}: SectionRowProps) {
	return (
		<TouchableOpacity
			style={[
				styles.row,
				{ borderBottomColor: colors.border },
				noBorder && styles.rowNoBorder,
				disabled && styles.disabledItem,
			]}
			onPress={disabled ? undefined : onPress}
			activeOpacity={disabled ? 1 : 0.8}
			disabled={disabled}
		>
			<View style={styles.rowLeft}>
				<View style={[styles.iconWrapper, { backgroundColor: colors.iconBg }]}>
					{icon}
				</View>

				<View style={styles.textBlock}>
					<Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>

					{!!subtitle && (
						<Text
							style={[styles.rowSubtitle, { color: colors.textMuted }]}
							numberOfLines={1}
						>
							{subtitle}
						</Text>
					)}
				</View>
			</View>

			<Ionicons name='chevron-forward' size={20} color={colors.textMuted} />
		</TouchableOpacity>
	);
}

function StaticRow({
	icon,
	label,
	value,
	noBorder = false,
	colors,
	disabled = false,
}: StaticRowProps) {
	return (
		<View
			style={[
				styles.row,
				{ borderBottomColor: colors.border },
				noBorder && styles.rowNoBorder,
				disabled && styles.disabledItem,
			]}
		>
			<View style={styles.rowLeft}>
				<View style={[styles.iconWrapper, { backgroundColor: colors.iconBg }]}>
					{icon}
				</View>

				<View style={styles.textBlock}>
					<Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
				</View>
			</View>

			<Text style={[styles.staticValue, { color: colors.primary }]}>
				{value}
			</Text>
		</View>
	);
}

export default function ProfileScreen() {
	const { logout, user } = useContext(AuthContext);
	const { colors } = useContext(ThemeContext);

	const email = user?.email || 'Не указано';

	return (
		<SafeAreaView
			style={[styles.safeArea, { backgroundColor: colors.background }]}
		>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
				<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
					Аккаунт
				</Text>

				<SectionCard colors={colors}>
					<SectionRow
						colors={colors}
						icon={<Ionicons name='person' size={20} color={colors.primary} />}
						label='Личные данные'
						subtitle={email}
						onPress={() => router.push('/personal-data')}
					/>

					<SectionRow
						colors={colors}
						icon={
							<MaterialCommunityIcons
								name='trophy-outline'
								size={20}
								color={colors.success}
							/>
						}
						label='Достижения'
						disabled
					/>

					<SectionRow
						colors={colors}
						icon={<Ionicons name='settings' size={20} color={colors.success} />}
						label='Настройки'
						onPress={() => router.push('/settings')}
						noBorder
					/>
				</SectionCard>

				<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
					Здоровье и уведомления
				</Text>

				<SectionCard colors={colors}>
					<SectionRow
						colors={colors}
						icon={<Ionicons name='heart' size={20} color={colors.blue} />}
						label='Измерения и синхронизация'
						disabled
					/>

					<SectionRow
						colors={colors}
						icon={
							<Ionicons name='notifications' size={20} color={colors.warning} />
						}
						label='Напоминания'
						disabled
					/>

					<StaticRow
						colors={colors}
						icon={<Ionicons name='flash' size={20} color={colors.textMuted} />}
						label='Интенсивность тренировок'
						value='Средняя'
						noBorder
						disabled
					/>
				</SectionCard>

				<Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
					О приложении
				</Text>

				<SectionCard colors={colors}>
					<SectionRow
						colors={colors}
						icon={<Feather name='help-circle' size={20} color='#7D83FF' />}
						label='Помощь и поддержка'
						noBorder
						disabled
					/>
				</SectionCard>

				<TouchableOpacity
					style={styles.logoutButton}
					onPress={logout}
					activeOpacity={0.8}
				>
					<Text style={[styles.logoutText, { color: colors.danger }]}>
						Выйти из аккаунта
					</Text>
				</TouchableOpacity>

				<Text style={[styles.footerText, { color: colors.textMuted }]}>
					Продолжая, вы соглашаетесь с{'\n'}
					условиями и политикой конфиденциальности.
				</Text>
			</ScrollView>

			<BottomNav />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 14,
		paddingTop: 34,
		paddingBottom: 120,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginTop: 16,
		marginBottom: 12,
	},
	card: {
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 4,
		marginBottom: 8,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 3,
	},
	row: {
		minHeight: 64,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		paddingVertical: 8,
	},
	rowNoBorder: {
		borderBottomWidth: 0,
	},
	rowLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 10,
	},
	iconWrapper: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	textBlock: {
		flex: 1,
	},
	rowLabel: {
		fontSize: 16,
		fontWeight: '600',
	},
	rowSubtitle: {
		fontSize: 13,
		marginTop: 2,
	},
	staticValue: {
		fontSize: 15,
		fontWeight: '500',
		marginLeft: 10,
	},
	disabledItem: {
		opacity: 0.4,
	},
	logoutButton: {
		marginTop: 10,
		alignItems: 'center',
		paddingVertical: 10,
	},
	logoutText: {
		fontSize: 16,
		fontWeight: '700',
	},
	footerText: {
		marginTop: 8,
		textAlign: 'center',
		fontSize: 11,
		lineHeight: 16,
		paddingHorizontal: 24,
	},
});
