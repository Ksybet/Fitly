import React, { useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import {
	Ionicons,
	MaterialIcons,
	FontAwesome5,
	Feather,
} from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../src/context/AuthContext';
import BottomNav from '../src/components/BottomNav';

type ActionButtonProps = {
	icon: React.ReactNode;
	label: string;
	onPress?: () => void;
};

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const { user } = useContext(AuthContext);

	const userName =
		user?.firstName || user?.name || user?.email?.split('@')[0] || 'Алексей';

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingTop: insets.top + 18,
						paddingBottom: 110 + insets.bottom,
					},
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.header}>
					<Text style={styles.logo}>Fitly</Text>

					<TouchableOpacity style={styles.headerIcon} activeOpacity={0.8}>
						<Ionicons name='notifications-outline' size={22} color='#9CA3AF' />
					</TouchableOpacity>
				</View>

				<View style={styles.greetingRow}>
					<View>
						<Text style={styles.greetingTitle}>Привет, {userName}!</Text>
						<Text style={styles.greetingSubtitle}>
							Вот твои показатели на сегодня
						</Text>
					</View>

					<TouchableOpacity style={styles.targetButton} activeOpacity={0.8}>
						<Feather name='target' size={24} color='#20C07A' />
					</TouchableOpacity>
				</View>

				<View style={styles.statsRow}>
					<View style={[styles.card, styles.stepsCard]}>
						<View style={styles.cardIconTop}>
							<Ionicons name='walk-outline' size={18} color='#20C07A' />
						</View>

						<View style={styles.stepsCircle}>
							<Text style={styles.stepsValue}>7560</Text>
							<Text style={styles.stepsLabel}>шагов</Text>
						</View>
					</View>

					<View style={styles.rightStats}>
						<View style={styles.smallCard}>
							<View style={styles.smallCardIconRow}>
								<Ionicons name='moon' size={16} color='#6F9BFF' />
							</View>

							<Text style={styles.smallMainValue}>7 ч 20 м</Text>

							<Text style={[styles.smallAccentText, { color: '#6F9BFF' }]}>
								Хорошо
							</Text>

							<View style={styles.sleepBar} />
							<Text style={styles.smallHint}>23:30 — 7:00</Text>
						</View>

						<View style={styles.smallCard}>
							<View style={styles.smallCardIconRow}>
								<Ionicons name='flame-outline' size={16} color='#F2B544' />
							</View>

							<View style={styles.kcalRow}>
								<Text style={styles.smallMainValue}>1850</Text>
								<Text style={styles.kcalText}> ккал</Text>
							</View>

							<Text style={styles.smallHint}>Цель: 2300</Text>

							<View style={styles.caloriesTrack}>
								<View style={styles.caloriesFill} />
							</View>
						</View>
					</View>
				</View>

				<View style={styles.actionsRow}>
					<ActionButton
						icon={<Ionicons name='add-circle' size={22} color='#20C07A' />}
						label='Добавить'
					/>

					<ActionButton
						icon={<MaterialIcons name='restaurant' size={22} color='#F2B544' />}
						label='Питание'
					/>

					<ActionButton
						icon={<FontAwesome5 name='dumbbell' size={18} color='#6F9BFF' />}
						label='Тренировка'
					/>

					<ActionButton
						icon={<Ionicons name='heart' size={20} color='#F36F6F' />}
						label='Состояние'
					/>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Дневник состояния</Text>
						<TouchableOpacity activeOpacity={0.8}>
							<Text style={styles.dots}>···</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.diaryCard}>
						<View style={styles.diaryLeft}>
							<View style={styles.moodIconCircle}>
								<Ionicons name='happy-outline' size={22} color='#20C07A' />
							</View>

							<Text style={styles.diaryText}>Хорошее</Text>

							<Ionicons name='thumbs-up' size={18} color='#20C07A' />
						</View>
					</View>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Избранное</Text>
						<TouchableOpacity activeOpacity={0.8}>
							<Feather name='menu' size={18} color='#4B5563' />
						</TouchableOpacity>
					</View>

					<View style={styles.favoritesRow}>
						<View style={styles.favoriteCard}>
							<View style={styles.favoriteTopRow}>
								<Ionicons name='water-outline' size={18} color='#6F9BFF' />
								<Text style={styles.favoriteTitle}>Вода</Text>
							</View>

							<Text style={styles.favoriteValue}>1,2 л / 2 л</Text>

							<View style={styles.favoriteTrack}>
								<View
									style={[
										styles.favoriteFill,
										{ width: '60%', backgroundColor: '#6F9BFF' },
									]}
								/>
							</View>
						</View>

						<View style={styles.favoriteCard}>
							<View style={styles.favoriteTopRow}>
								<Ionicons name='barbell-outline' size={18} color='#F2B544' />
								<Text style={styles.favoriteTitle}>Вес</Text>
							</View>

							<Text style={styles.favoriteValue}>68 / 75 кг</Text>

							<View style={styles.favoriteTrack}>
								<View
									style={[
										styles.favoriteFill,
										{ width: '68%', backgroundColor: '#F2B544' },
									]}
								/>
							</View>
						</View>
					</View>
				</View>
			</ScrollView>

			<BottomNav />
		</View>
	);
}

function ActionButton({ icon, label, onPress }: ActionButtonProps) {
	return (
		<TouchableOpacity
			style={styles.actionButton}
			onPress={onPress}
			activeOpacity={0.82}
		>
			<View style={styles.actionIcon}>{icon}</View>
			<Text style={styles.actionLabel}>{label}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F3F3F3',
	},
	scrollContent: {
		paddingHorizontal: 16,
	},
	header: {
		position: 'relative',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 22,
	},
	logo: {
		fontSize: 29,
		fontWeight: '700',
		color: '#20C07A',
		textShadowColor: 'rgba(32,192,122,0.18)',
		textShadowOffset: { width: 0, height: 3 },
		textShadowRadius: 7,
	},
	headerIcon: {
		position: 'absolute',
		right: 0,
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: '#F1F1F1',
		justifyContent: 'center',
		alignItems: 'center',
	},
	greetingRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	greetingTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1F1F1F',
		marginBottom: 4,
	},
	greetingSubtitle: {
		fontSize: 12,
		color: '#9AA0A6',
	},
	targetButton: {
		marginTop: 2,
	},
	statsRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 18,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	stepsCard: {
		width: '37%',
		padding: 12,
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cardIconTop: {
		alignSelf: 'flex-start',
	},
	stepsCircle: {
		width: 112,
		height: 112,
		borderRadius: 56,
		borderWidth: 6,
		borderColor: '#20C07A',
		alignItems: 'center',
		justifyContent: 'center',
		marginVertical: 10,
	},
	stepsValue: {
		fontSize: 28,
		fontWeight: '700',
		color: '#1F2937',
	},
	stepsLabel: {
		fontSize: 14,
		color: '#6B7280',
	},
	rightStats: {
		width: '59%',
		gap: 12,
	},
	smallCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		padding: 12,
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	smallCardIconRow: {
		marginBottom: 4,
	},
	smallMainValue: {
		fontSize: 25,
		fontWeight: '700',
		color: '#1F2937',
	},
	smallAccentText: {
		fontSize: 14,
		fontWeight: '600',
		marginTop: 2,
	},
	sleepBar: {
		height: 4,
		width: 52,
		backgroundColor: '#6F9BFF',
		borderRadius: 4,
		marginVertical: 6,
	},
	smallHint: {
		fontSize: 12,
		color: '#9AA0A6',
	},
	kcalRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
	},
	kcalText: {
		fontSize: 14,
		color: '#374151',
		marginBottom: 4,
	},
	caloriesTrack: {
		height: 6,
		backgroundColor: '#E5E7EB',
		borderRadius: 4,
		overflow: 'hidden',
		marginTop: 8,
	},
	caloriesFill: {
		width: '72%',
		height: '100%',
		backgroundColor: '#F2B544',
		borderRadius: 4,
	},
	actionsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20,
	},
	actionButton: {
		width: '23%',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.07,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	actionIcon: {
		marginBottom: 6,
	},
	actionLabel: {
		fontSize: 12,
		color: '#6B7280',
		textAlign: 'center',
	},
	section: {
		marginBottom: 18,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1F1F1F',
	},
	dots: {
		fontSize: 20,
		color: '#9CA3AF',
		lineHeight: 20,
	},
	diaryCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 14,
		shadowColor: '#000',
		shadowOpacity: 0.07,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	diaryLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	moodIconCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: '#20C07A',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	diaryText: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		marginRight: 8,
	},
	favoritesRow: {
		flexDirection: 'row',
		gap: 12,
	},
	favoriteCard: {
		flex: 1,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 12,
		shadowColor: '#000',
		shadowOpacity: 0.07,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	favoriteTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	favoriteTitle: {
		marginLeft: 6,
		fontSize: 14,
		color: '#9AA0A6',
		fontWeight: '600',
	},
	favoriteValue: {
		fontSize: 21,
		fontWeight: '700',
		color: '#374151',
		marginBottom: 10,
	},
	favoriteTrack: {
		height: 6,
		backgroundColor: '#E5E7EB',
		borderRadius: 4,
		overflow: 'hidden',
	},
	favoriteFill: {
		height: '100%',
		borderRadius: 4,
	},
});
