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

const DAILY_DATA_STORAGE_KEY = 'fitly_daily_data';

type MoodMeta = {
	label: string;
	emoji: string;
	color: string;
};

const getMoodMeta = (score: number): MoodMeta => {
	if (score <= 1) {
		return { label: 'Ужасное', emoji: '😭', color: '#EF4444' };
	}
	if (score <= 3) {
		return { label: 'Очень плохое', emoji: '😣', color: '#F97316' };
	}
	if (score <= 4) {
		return { label: 'Плохое', emoji: '🙁', color: '#F59E0B' };
	}
	if (score <= 6) {
		return { label: 'Нейтральное', emoji: '😐', color: '#9CA3AF' };
	}
	if (score <= 8) {
		return { label: 'Хорошее', emoji: '🙂', color: '#22C55E' };
	}
	return { label: 'Отличное', emoji: '😄', color: '#16A34A' };
};

export default function MoodScreen() {
	const insets = useSafeAreaInsets();

	const [selectedScore, setSelectedScore] = useState<number | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		loadMood();
	}, []);

	const loadMood = async () => {
		try {
			const raw = await AsyncStorage.getItem(DAILY_DATA_STORAGE_KEY);
			if (!raw) return;

			const parsed = JSON.parse(raw);
			if (parsed?.moodScore !== undefined && parsed?.moodScore !== null) {
				setSelectedScore(Number(parsed.moodScore));
			}
		} catch (e) {
			console.log('Ошибка загрузки настроения', e);
		}
	};

	const saveMood = async () => {
		if (selectedScore === null) {
			Alert.alert('Ошибка', 'Выбери настроение от 0 до 10');
			return;
		}

		try {
			setIsSaving(true);

			const raw = await AsyncStorage.getItem(DAILY_DATA_STORAGE_KEY);
			const prev = raw ? JSON.parse(raw) : {};

			const meta = getMoodMeta(selectedScore);

			const updated = {
				steps: Number(prev?.steps ?? 0),
				sleepHours: Number(prev?.sleepHours ?? 0),
				sleepMinutes: Number(prev?.sleepMinutes ?? 0),
				sleepQuality: prev?.sleepQuality ?? '',
				sleepStart: prev?.sleepStart ?? '',
				sleepEnd: prev?.sleepEnd ?? '',
				calories: Number(prev?.calories ?? 0),
				moodScore: selectedScore,
				moodLabel: meta.label,
				moodEmoji: meta.emoji,
				updatedAt: new Date().toISOString(),
			};

			await AsyncStorage.setItem(
				DAILY_DATA_STORAGE_KEY,
				JSON.stringify(updated),
			);

			router.back();
		} catch (e) {
			console.log('Ошибка сохранения настроения', e);
			Alert.alert('Ошибка', 'Не удалось сохранить настроение');
		} finally {
			setIsSaving(false);
		}
	};

	const selectedMeta =
		selectedScore !== null
			? getMoodMeta(selectedScore)
			: { label: 'Нейтральное', emoji: '😐', color: '#9CA3AF' };

	return (
		<View style={styles.container}>
			<View style={[styles.header, { paddingTop: insets.top + 8 }]}>
				<TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
					<Ionicons name='arrow-back' size={26} color='#20C07A' />
				</TouchableOpacity>

				<Text style={styles.title}>Настроение</Text>

				<View style={{ width: 26 }} />
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.previewCard}>
					<Text style={styles.previewEmoji}>{selectedMeta.emoji}</Text>
					<Text style={styles.previewLabel}>{selectedMeta.label}</Text>
					<Text style={[styles.previewScore, { color: selectedMeta.color }]}>
						{selectedScore !== null ? `${selectedScore} / 10` : 'Не выбрано'}
					</Text>
				</View>

				<Text style={styles.sectionTitle}>Оцени настроение от 0 до 10</Text>

				<View style={styles.scoreGrid}>
					{Array.from({ length: 11 }, (_, index) => {
						const score = index;
						const meta = getMoodMeta(score);
						const isActive = selectedScore === score;

						return (
							<TouchableOpacity
								key={score}
								style={[
									styles.scoreButton,
									isActive && {
										backgroundColor: `${meta.color}18`,
										borderColor: meta.color,
									},
								]}
								onPress={() => setSelectedScore(score)}
								activeOpacity={0.85}
							>
								<Text style={styles.scoreEmoji}>{meta.emoji}</Text>
								<Text
									style={[
										styles.scoreNumber,
										isActive && { color: meta.color },
									]}
								>
									{score}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				<TouchableOpacity
					style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
					onPress={saveMood}
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
	previewCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		paddingVertical: 20,
		paddingHorizontal: 16,
		alignItems: 'center',
		marginBottom: 18,
	},
	previewEmoji: {
		fontSize: 40,
		marginBottom: 8,
	},
	previewLabel: {
		fontSize: 22,
		fontWeight: '700',
		color: '#1F2937',
		marginBottom: 4,
	},
	previewScore: {
		fontSize: 16,
		fontWeight: '700',
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 12,
	},
	scoreGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginBottom: 20,
	},
	scoreButton: {
		width: '22%',
		minWidth: 72,
		height: 74,
		borderRadius: 16,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
	},
	scoreEmoji: {
		fontSize: 22,
		marginBottom: 4,
	},
	scoreNumber: {
		fontSize: 16,
		fontWeight: '700',
		color: '#374151',
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
