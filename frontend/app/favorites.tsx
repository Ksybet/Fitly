import React, { useContext, useEffect, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemeContext } from '../src/context/ThemeContext';
import { getFavorites, updateFavorites } from '../src/api/favorites.api';

type FavoriteKey = 'water' | 'weight' | 'height' | 'bmi';

type FavoritesState = Record<FavoriteKey, boolean>;

const DEFAULT_FAVORITES: FavoritesState = {
	water: true,
	weight: true,
	height: true,
	bmi: true,
};

const favoriteItems: {
	key: FavoriteKey;
	title: string;
	subtitle: string;
	icon: (color: string) => React.ReactNode;
}[] = [
	{
		key: 'water',
		title: 'Вода',
		subtitle: 'Прогресс по воде за день',
		icon: color => <Ionicons name='water-outline' size={20} color={color} />,
	},
	{
		key: 'weight',
		title: 'Вес',
		subtitle: 'Текущий вес пользователя',
		icon: color => <Ionicons name='barbell-outline' size={20} color={color} />,
	},
	{
		key: 'height',
		title: 'Рост',
		subtitle: 'Рост из личных данных',
		icon: color => <Ionicons name='body-outline' size={20} color={color} />,
	},
	{
		key: 'bmi',
		title: 'ИМТ',
		subtitle: 'Индекс массы тела',
		icon: color => (
			<Ionicons name='calculator-outline' size={20} color={color} />
		),
	},
];

export default function FavoritesScreen() {
	const insets = useSafeAreaInsets();
	const { colors, isDark } = useContext(ThemeContext);

	const [favorites, setFavorites] = useState<FavoritesState>(DEFAULT_FAVORITES);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		loadFavorites();
	}, []);

	const loadFavorites = async () => {
		try {
			const data = await getFavorites();

			setFavorites({
				water: Boolean(data?.water),
				weight: Boolean(data?.weight),
				height: Boolean(data?.height),
				bmi: Boolean(data?.bmi),
			});
		} catch (e) {
			console.log('Ошибка загрузки избранного', e);
		}
	};

	const toggleFavorite = async (key: FavoriteKey) => {
		try {
			const updated = {
				...favorites,
				[key]: !favorites[key],
			};

			setFavorites(updated);
			await updateFavorites(updated);
		} catch (e) {
			console.log('Ошибка сохранения избранного', e);
			Alert.alert('Ошибка', 'Не удалось сохранить избранное');
		}
	};

	const saveFavorites = async () => {
		const enabledCount = Object.values(favorites).filter(Boolean).length;

		if (enabledCount === 0) {
			Alert.alert('Ошибка', 'Выбери хотя бы одну карточку');
			return;
		}

		router.back();
	};

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View
				style={[
					styles.header,
					{
						paddingTop: insets.top + 8,
						borderBottomColor: colors.border,
						backgroundColor: colors.background,
					},
				]}
			>
				<TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
					<Ionicons name='arrow-back' size={26} color={colors.primary} />
				</TouchableOpacity>

				<Text style={[styles.title, { color: colors.text }]}>Избранное</Text>

				<View style={{ width: 26 }} />
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<Text style={[styles.description, { color: colors.textSecondary }]}>
					Выбери карточки, которые хочешь видеть в разделе «Избранное»
				</Text>

				<View
					style={[
						styles.card,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					{favoriteItems.map((item, index) => {
						const isActive = favorites[item.key];
						const isLast = index === favoriteItems.length - 1;

						return (
							<TouchableOpacity
								key={item.key}
								style={[
									styles.itemRow,
									{
										borderBottomColor: colors.border,
									},
									isLast && styles.itemRowNoBorder,
								]}
								onPress={() => toggleFavorite(item.key)}
								activeOpacity={0.85}
							>
								<View style={styles.itemLeft}>
									<View
										style={[
											styles.itemIcon,
											{
												backgroundColor: colors.iconBg,
											},
										]}
									>
										{item.icon(
											item.key === 'water'
												? colors.blue
												: item.key === 'weight'
													? colors.warning
													: item.key === 'height'
														? colors.primary
														: colors.success,
										)}
									</View>

									<View style={styles.itemTextWrap}>
										<Text style={[styles.itemTitle, { color: colors.text }]}>
											{item.title}
										</Text>
										<Text
											style={[styles.itemSubtitle, { color: colors.textMuted }]}
										>
											{item.subtitle}
										</Text>
									</View>
								</View>

								<View
									style={[
										styles.checkbox,
										{
											borderColor: isActive ? colors.primary : colors.border,
											backgroundColor: isActive
												? colors.primary
												: isDark
													? colors.cardSecondary
													: '#FFFFFF',
										},
									]}
								>
									{isActive ? (
										<Ionicons name='checkmark' size={16} color='#FFFFFF' />
									) : null}
								</View>
							</TouchableOpacity>
						);
					})}
				</View>

				<TouchableOpacity
					style={[
						styles.saveButton,
						{ backgroundColor: colors.primary },
						isSaving && styles.saveButtonDisabled,
					]}
					onPress={saveFavorites}
					activeOpacity={0.85}
					disabled={isSaving}
				>
					<Text style={styles.saveText}>
						{isSaving ? 'Сохранение...' : 'Сохранить'}
					</Text>
				</TouchableOpacity>
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
	description: {
		fontSize: 14,
		marginBottom: 14,
	},
	card: {
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 6,
		marginBottom: 20,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	itemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	itemRowNoBorder: {
		borderBottomWidth: 0,
	},
	itemLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		paddingRight: 12,
	},
	itemIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	itemTextWrap: {
		flex: 1,
	},
	itemTitle: {
		fontSize: 15,
		fontWeight: '700',
		marginBottom: 2,
	},
	itemSubtitle: {
		fontSize: 12,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1.5,
		alignItems: 'center',
		justifyContent: 'center',
	},
	saveButton: {
		height: 54,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	saveButtonDisabled: {
		opacity: 0.7,
	},
	saveText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
});
