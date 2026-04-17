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

import { AuthContext } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

function SectionCard({ children }) {
	return <View style={styles.card}>{children}</View>;
}

function SectionRow({ icon, label, subtitle, onPress, noBorder = false }) {
	return (
		<TouchableOpacity
			style={[styles.row, noBorder && styles.rowNoBorder]}
			onPress={onPress}
			activeOpacity={0.8}
		>
			<View style={styles.rowLeft}>
				<View style={styles.iconWrapper}>{icon}</View>

				<View style={styles.textBlock}>
					<Text style={styles.rowLabel}>{label}</Text>
					{!!subtitle && (
						<Text style={styles.rowSubtitle} numberOfLines={1}>
							{subtitle}
						</Text>
					)}
				</View>
			</View>

			<Ionicons name='chevron-forward' size={20} color='#8E97A8' />
		</TouchableOpacity>
	);
}

function StaticRow({ icon, label, value, noBorder = false }) {
	return (
		<View style={[styles.row, noBorder && styles.rowNoBorder]}>
			<View style={styles.rowLeft}>
				<View style={styles.iconWrapper}>{icon}</View>

				<View style={styles.textBlock}>
					<Text style={styles.rowLabel}>{label}</Text>
				</View>
			</View>

			<Text style={styles.staticValue}>{value}</Text>
		</View>
	);
}

export default function ProfileScreen() {
	const { logout, user } = useContext(AuthContext);

	const email = user?.email || 'Не указано';

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
				<Text style={styles.sectionTitle}>Аккаунт</Text>

				<SectionCard>
					<SectionRow
						icon={<Ionicons name='person' size={20} color='#19B97A' />}
						label='Личные данные'
						subtitle={email}
						onPress={() => router.push('/personal-data')}
					/>

					<SectionRow
						icon={
							<MaterialCommunityIcons
								name='trophy-outline'
								size={20}
								color='#7ACFA7'
							/>
						}
						label='Достижения'
						onPress={() => {}}
					/>

					<SectionRow
						icon={<Ionicons name='settings' size={20} color='#7ACFA7' />}
						label='Настройки'
						onPress={() => {}}
						noBorder
					/>
				</SectionCard>

				<Text style={styles.sectionTitle}>Здоровье и уведомления</Text>

				<SectionCard>
					<SectionRow
						icon={<Ionicons name='heart' size={20} color='#6DA7FF' />}
						label='Измерения и синхронизация'
						onPress={() => {}}
					/>

					<SectionRow
						icon={<Ionicons name='notifications' size={20} color='#F0B44C' />}
						label='Напоминания'
						onPress={() => {}}
					/>

					<StaticRow
						icon={<Ionicons name='flash' size={20} color='#9CA3AF' />}
						label='Интенсивность тренировок'
						value='Средняя'
						noBorder
					/>
				</SectionCard>

				<Text style={styles.sectionTitle}>О приложении</Text>

				<SectionCard>
					<SectionRow
						icon={<Feather name='help-circle' size={20} color='#7D83FF' />}
						label='Помощь и поддержка'
						onPress={() => {}}
						noBorder
					/>
				</SectionCard>

				<TouchableOpacity
					style={styles.logoutButton}
					onPress={logout}
					activeOpacity={0.8}
				>
					<Text style={styles.logoutText}>Выйти из аккаунта</Text>
				</TouchableOpacity>

				<Text style={styles.footerText}>
					Продолжая, вы соглашаетесь с{'\n'}
					условиями и политикой конфиденциальности.
				</Text>
			</ScrollView>

			<BottomNav activeTab='profile' />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#F4F4F4',
	},

	content: {
		paddingHorizontal: 14,
		paddingTop: 34,
		paddingBottom: 120,
	},

	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#6B7280',
		marginTop: 16,
		marginBottom: 12,
	},

	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 4,
		marginBottom: 8,

		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.07,
		shadowRadius: 6,
		elevation: 3,
	},

	row: {
		minHeight: 64,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomColor: '#EEEEEE',
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
		backgroundColor: '#EEF5F1',
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
		color: '#1F2937',
	},

	rowSubtitle: {
		fontSize: 13,
		color: '#8A94A6',
		marginTop: 2,
	},

	staticValue: {
		fontSize: 15,
		fontWeight: '500',
		color: '#7ACFA7',
		marginLeft: 10,
	},

	logoutButton: {
		marginTop: 10,
		alignItems: 'center',
		paddingVertical: 10,
	},

	logoutText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FF6B6B',
	},

	footerText: {
		marginTop: 8,
		textAlign: 'center',
		fontSize: 11,
		lineHeight: 16,
		color: '#A7AFBD',
		paddingHorizontal: 24,
	},
});
