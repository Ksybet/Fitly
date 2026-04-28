import React, { useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../src/context/ThemeContext';
import BottomNav from '../src/components/BottomNav';

export default function WorkoutsScreen() {
	const insets = useSafeAreaInsets();
	const { colors, isDark } = useContext(ThemeContext);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingTop: insets.top + 10,
						paddingBottom: 112 + insets.bottom,
					},
				]}
				showsVerticalScrollIndicator={false}
			>
				<Text style={[styles.headerTitle, { color: colors.text }]}>
					Тренировки
				</Text>

				<View style={[styles.divider, { backgroundColor: colors.border }]} />

				<View
					style={[
						styles.individualCard,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<View style={styles.individualHeader}>
						<View style={styles.individualTextWrap}>
							<Text style={[styles.individualTitle, { color: colors.text }]}>
								Каталог тренировок
							</Text>

							<Text
								style={[styles.individualText, { color: colors.textMuted }]}
							>
								<Text
									style={[styles.individualText, { color: colors.textMuted }]}
								>
									Перейдите в каталог и выберите подходящую тренировку
								</Text>
							</Text>
						</View>

						<View
							style={[
								styles.individualIcon,
								{
									backgroundColor: isDark ? colors.cardSecondary : '#E9F8F1',
								},
							]}
						>
							<MaterialCommunityIcons
								name='dumbbell'
								size={30}
								color={colors.primary}
							/>
						</View>
					</View>

					<TouchableOpacity
						style={[styles.createButton, { backgroundColor: colors.primary }]}
						activeOpacity={0.85}
						onPress={() => router.push('/workout-catalog')}
					>
						<Text style={styles.createButtonText}>Выбрать тренировку</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			<BottomNav />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},

	scrollContent: {
		paddingHorizontal: 20,
	},

	headerTitle: {
		fontSize: 18,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 16,
	},

	divider: {
		height: 1,
		marginHorizontal: -20,
		marginBottom: 16,
	},

	individualCard: {
		borderRadius: 18,
		padding: 16,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},

	individualHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
	},

	individualTextWrap: {
		flex: 1,
		paddingRight: 12,
	},

	individualTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 8,
	},

	individualText: {
		fontSize: 13,
		lineHeight: 18,
	},

	individualIcon: {
		width: 60,
		height: 60,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},

	createButton: {
		height: 38,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},

	createButtonText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '700',
	},
});
