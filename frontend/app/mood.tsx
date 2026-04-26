import React, { useContext, useEffect, useMemo, useState } from 'react';
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
import { getTodayMood, updateTodayMood } from '../src/api/mood.api';

type MoodMeta = {
	emoji: string;
	label: string;
};

function getMoodMeta(score: number): MoodMeta {
	if (score <= 1) return { emoji: '😭', label: 'Ужасное' };
	if (score <= 3) return { emoji: '😞', label: 'Плохое' };
	if (score <= 5) return { emoji: '😐', label: 'Нейтральное' };
	if (score <= 7) return { emoji: '🙂', label: 'Хорошее' };
	if (score <= 9) return { emoji: '😄', label: 'Отличное' };
	return { emoji: '🤩', label: 'Прекрасное' };
}

export default function MoodScreen() {
	const insets = useSafeAreaInsets();
	const { colors, isDark } = useContext(ThemeContext);

	const [selectedScore, setSelectedScore] = useState<number | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		loadMood();
	}, []);

	const loadMood = async () => {
		try {
			const data = await getTodayMood();

			if (!data) return;

			if (data.moodScore !== undefined && data.moodScore !== null) {
				setSelectedScore(Number(data.moodScore));
			}
		} catch (e) {
			console.log('Ошибка загрузки настроения', e);
		}
	};

	const moodMeta = useMemo(() => {
		if (selectedScore === null) {
			return { emoji: '😐', label: 'Нейтральное' };
		}

		return getMoodMeta(selectedScore);
	}, [selectedScore]);

	const saveMood = async () => {
		if (selectedScore === null) {
			Alert.alert('Ошибка', 'Выберите настроение от 0 до 10');
			return;
		}

		try {
			setIsSaving(true);

			await updateTodayMood({
				moodScore: selectedScore,
				moodLabel: moodMeta.label,
				moodEmoji: moodMeta.emoji,
				note: '',
			});

			router.back();
		} catch (e) {
			console.log('Ошибка сохранения настроения', e);
			Alert.alert('Ошибка', 'Не удалось сохранить настроение');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View
				style={[
					styles.header,
					{
						paddingTop: insets.top + 8,
						backgroundColor: colors.background,
					},
				]}
			>
				<TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
					<Ionicons name='arrow-back' size={26} color={colors.primary} />
				</TouchableOpacity>

				<Text style={[styles.title, { color: colors.text }]}>Настроение</Text>

				<View style={{ width: 26 }} />
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<View
					style={[
						styles.heroCard,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<View
						style={[
							styles.heroEmojiWrap,
							{
								backgroundColor: isDark ? colors.cardSecondary : '#F3F4F6',
							},
						]}
					>
						<Text style={styles.heroEmoji}>{moodMeta.emoji}</Text>
					</View>

					<Text style={[styles.heroTitle, { color: colors.text }]}>
						Как ты себя чувствуешь?
					</Text>

					<Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
						Выбери оценку настроения от 0 до 10
					</Text>

					<View
						style={[
							styles.currentMoodBadge,
							{
								backgroundColor: isDark ? colors.iconBg : '#EEF9F3',
								borderColor: colors.primary,
							},
						]}
					>
						<Text style={[styles.currentMoodLabel, { color: colors.primary }]}>
							{selectedScore !== null
								? `${selectedScore}/10 · ${moodMeta.label}`
								: 'Настроение не выбрано'}
						</Text>
					</View>
				</View>

				<View
					style={[
						styles.sectionCard,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>
						Оценка настроения
					</Text>

					<View style={styles.scoreGrid}>
						{Array.from({ length: 11 }, (_, index) => {
							const score = index;
							const isActive = selectedScore === score;

							return (
								<TouchableOpacity
									key={score}
									style={[
										styles.scoreButton,
										{
											backgroundColor: isActive
												? isDark
													? colors.iconBg
													: '#EEF9F3'
												: colors.cardSecondary,
											borderColor: isActive ? colors.primary : colors.border,
										},
									]}
									onPress={() => setSelectedScore(score)}
									activeOpacity={0.85}
								>
									<Text
										style={[
											styles.scoreButtonText,
											{
												color: isActive ? colors.primary : colors.textSecondary,
											},
										]}
									>
										{score}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>

				<View
					style={[
						styles.legendCard,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<Text style={[styles.legendTitle, { color: colors.text }]}>
						Подсказка
					</Text>

					<Text style={[styles.legendText, { color: colors.textSecondary }]}>
						0–1 — ужасное{'\n'}
						2–3 — плохое{'\n'}
						4–5 — нейтральное{'\n'}
						6–7 — хорошее{'\n'}
						8–9 — отличное{'\n'}
						10 — прекрасное
					</Text>
				</View>

				<TouchableOpacity
					style={[styles.saveButton, { backgroundColor: colors.primary }]}
					onPress={saveMood}
					disabled={isSaving}
					activeOpacity={0.85}
				>
					<Text style={styles.saveButtonText}>
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
	},

	title: {
		fontSize: 18,
		fontWeight: '700',
	},

	content: {
		paddingHorizontal: 16,
		paddingBottom: 30,
	},

	heroCard: {
		borderRadius: 20,
		padding: 18,
		alignItems: 'center',
		marginBottom: 14,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 3,
	},

	heroEmojiWrap: {
		width: 78,
		height: 78,
		borderRadius: 39,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 14,
	},

	heroEmoji: {
		fontSize: 36,
	},

	heroTitle: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 6,
		textAlign: 'center',
	},

	heroSubtitle: {
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 14,
	},

	currentMoodBadge: {
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 10,
	},

	currentMoodLabel: {
		fontSize: 14,
		fontWeight: '700',
		textAlign: 'center',
	},

	sectionCard: {
		borderRadius: 20,
		padding: 16,
		marginBottom: 14,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 3,
	},

	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 12,
	},

	scoreGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},

	scoreButton: {
		width: '14.5%',
		minWidth: 46,
		height: 46,
		borderRadius: 14,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},

	scoreButtonText: {
		fontSize: 15,
		fontWeight: '700',
	},

	legendCard: {
		borderRadius: 20,
		padding: 16,
		marginBottom: 18,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 3,
	},

	legendTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 8,
	},

	legendText: {
		fontSize: 14,
		lineHeight: 22,
	},

	saveButton: {
		height: 54,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},

	saveButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
});
