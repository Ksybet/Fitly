import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const FAVORITES_STORAGE_KEY = 'fitly_favorites';

type FavoriteKey = 'water' | 'weight';

type FavoritesState = Record<FavoriteKey, boolean>;

const DEFAULT_FAVORITES: FavoritesState = {
	water: true,
	weight: true,
};

const favoriteItems: {
	key: FavoriteKey;
	title: string;
	subtitle: string;
	icon: React.ReactNode;
}[] = [
	{
		key: 'water',
		title: 'Вода',
		subtitle: 'Прогресс по воде за день',
		icon: <Ionicons name='water-outline' size={20} color='#6F9BFF' />,
	},
	{
		key: 'weight',
		title: 'Вес',
		subtitle: 'Текущий и целевой вес',
		icon: <Ionicons name='barbell-outline' size={20} color='#F2B544' />,
	},
];

export default function FavoritesScreen() {
	const insets = useSafeAreaInsets();
	const [favorites, setFavorites] = useState<FavoritesState>(DEFAULT_FAVORITES);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		loadFavorites();
	}, []);

	const loadFavorites = async () => {
		try {
			const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
			if (!raw) return;

			const parsed = JSON.parse(raw);
			setFavorites({
				...DEFAULT_FAVORITES,
				...parsed,
			});
		} catch (e) {
			console.log('Ошибка загрузки избранного', e);
		}
	};

	const toggleFavorite = (key: FavoriteKey) => {
		setFavorites(prev => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	const saveFavorites = async () => {
		try {
			setIsSaving(true);

			const enabledCount = Object.values(favorites).filter(Boolean).length;
			if (enabledCount === 0) {
				Alert.alert('Ошибка', 'Выбери хотя бы одну карточку');
				return;
			}

			await AsyncStorage.setItem(
				FAVORITES_STORAGE_KEY,
				JSON.stringify(favorites),
			);

			router.back();
		} catch (e) {
			console.log('Ошибка сохранения избранного', e);
			Alert.alert('Ошибка', 'Не удалось сохранить избранное');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={[styles.header, { paddingTop: insets.top + 8 }]}>
				<TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
					<Ionicons name='arrow-back' size={26} color='#20C07A' />
				</TouchableOpacity>

				<Text style={styles.title}>Избранное</Text>

				<View style={{ width: 26 }} />
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.description}>
					Выбери карточки, которые хочешь видеть в разделе «Избранное»
				</Text>

				<View style={styles.card}>
					{favoriteItems.map(item => {
						const isActive = favorites[item.key];

						return (
							<TouchableOpacity
								key={item.key}
								style={styles.itemRow}
								onPress={() => toggleFavorite(item.key)}
								activeOpacity={0.85}
							>
								<View style={styles.itemLeft}>
									<View style={styles.itemIcon}>{item.icon}</View>

									<View style={styles.itemTextWrap}>
										<Text style={styles.itemTitle}>{item.title}</Text>
										<Text style={styles.itemSubtitle}>{item.subtitle}</Text>
									</View>
								</View>

								<View
									style={[styles.checkbox, isActive && styles.checkboxActive]}
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
					style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
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
		backgroundColor: '#F3F3F3',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		marginBottom: 10,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1F2937',
	},
	content: {
		paddingHorizontal: 16,
		paddingBottom: 30,
	},
	description: {
		fontSize: 14,
		color: '#6B7280',
		marginBottom: 14,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 6,
		marginBottom: 20,
	},
	itemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
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
		backgroundColor: '#F8FAFC',
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
		color: '#1F2937',
		marginBottom: 2,
	},
	itemSubtitle: {
		fontSize: 12,
		color: '#9AA0A6',
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: '#D1D5DB',
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkboxActive: {
		backgroundColor: '#20C07A',
		borderColor: '#20C07A',
	},
	saveButton: {
		height: 54,
		borderRadius: 16,
		backgroundColor: '#20C07A',
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
