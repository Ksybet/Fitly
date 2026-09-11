import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { getNutritionDay } from '@/src/api/nutrition.api';
import type { MealEntry, MealType, NutritionDay } from '@/src/api/contracts';
import { ThemeContext } from '@/src/context/ThemeContext';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
	breakfast: 'Завтрак',
	lunch: 'Обед',
	dinner: 'Ужин',
	snack: 'Перекус',
};

function getDateString(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
	const [year, month, day] = date.split('-');

	return `${day}.${month}.${year}`;
}

function formatNumber(value: number) {
	return Math.round(value * 100) / 100;
}

export default function NutritionScreen() {
	const { colors } = React.useContext(ThemeContext);

	const [selectedDate, setSelectedDate] = useState(getDateString(new Date()));
	const [nutritionDay, setNutritionDay] = useState<NutritionDay | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function loadNutrition() {
			try {
				setLoading(true);
				setError(null);

				const data = await getNutritionDay(selectedDate);

				if (!cancelled) {
					setNutritionDay(data);
				}
			} catch {
				if (!cancelled) {
					setError('Не удалось загрузить данные о питании');
					setNutritionDay(null);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		loadNutrition();

		return () => {
			cancelled = true;
		};
	}, [selectedDate]);

	function changeDate(days: number) {
		const date = new Date(`${selectedDate}T12:00:00`);
		date.setDate(date.getDate() + days);
		setSelectedDate(getDateString(date));
	}

	function renderMeal(meal: MealEntry) {
		return (
			<View
				key={meal.id}
				style={[styles.mealCard, { backgroundColor: colors.card }]}
			>
				<View style={styles.mealHeader}>
					<View>
						<Text style={[styles.mealType, { color: colors.text }]}>
							{MEAL_TYPE_LABELS[meal.mealType]}
						</Text>
					</View>

					<Text style={[styles.mealCalories, { color: colors.text }]}>
						{formatNumber(meal.nutritionTotal.calories)} ккал
					</Text>
				</View>

				{meal.items.map(item => (
					<View key={item.id} style={styles.productRow}>
						<Text style={[styles.productName, { color: colors.textSecondary }]}>
							{item.name}
						</Text>

						<Text style={[styles.productAmount, { color: colors.text }]}>
							{formatNumber(item.amountG)} г
						</Text>
					</View>
				))}

				<View style={styles.macroRow}>
					<Text style={[styles.macroText, { color: colors.textSecondary }]}>
						Б {formatNumber(meal.nutritionTotal.proteinG)} г
					</Text>

					<Text style={[styles.macroText, { color: colors.textSecondary }]}>
						Ж {formatNumber(meal.nutritionTotal.fatG)} г
					</Text>

					<Text style={[styles.macroText, { color: colors.textSecondary }]}>
						У {formatNumber(meal.nutritionTotal.carbsG)} г
					</Text>
				</View>
			</View>
		);
	}

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
		>
			<View style={styles.header}>
				<Pressable
					onPress={() => router.push('/home')}
					hitSlop={10}
					style={styles.backButton}
				>
					<Ionicons name='arrow-back' size={28} color={colors.primary} />
				</Pressable>

				<View style={styles.dateContainer}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						Питание
					</Text>

					<Text style={[styles.dateText, { color: colors.textSecondary }]}>
						{formatDate(selectedDate)}
					</Text>
				</View>

				<View style={styles.headerSide} />
			</View>

			<View style={styles.dateNavigation}>
				<Pressable
					onPress={() => changeDate(-1)}
					hitSlop={10}
					style={styles.dateArrowButton}
				>
					<MaterialIcons name='chevron-left' size={32} color={colors.text} />
				</Pressable>

				<Pressable
					onPress={() => changeDate(1)}
					hitSlop={10}
					style={styles.dateArrowButton}
				>
					<MaterialIcons name='chevron-right' size={32} color={colors.text} />
				</Pressable>
			</View>

			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				{loading ? (
					<View style={styles.center}>
						<ActivityIndicator size='large' color={colors.primary} />
					</View>
				) : error ? (
					<View style={styles.center}>
						<Text style={[styles.errorText, { color: colors.text }]}>
							{error}
						</Text>
					</View>
				) : nutritionDay ? (
					<>
						<View
							style={[styles.summaryCard, { backgroundColor: colors.card }]}
						>
							<Text style={[styles.summaryTitle, { color: colors.text }]}>
								Итого за день
							</Text>

							<Text style={[styles.calories, { color: colors.text }]}>
								{formatNumber(nutritionDay.totals.calories)} ккал
							</Text>

							<View style={styles.summaryMacros}>
								<View style={styles.summaryMacro}>
									<Text
										style={[styles.summaryMacroValue, { color: colors.text }]}
									>
										{formatNumber(nutritionDay.totals.proteinG)} г
									</Text>

									<Text
										style={[
											styles.summaryMacroLabel,
											{
												color: colors.textSecondary,
											},
										]}
									>
										Белки
									</Text>
								</View>

								<View style={styles.summaryMacro}>
									<Text
										style={[styles.summaryMacroValue, { color: colors.text }]}
									>
										{formatNumber(nutritionDay.totals.fatG)} г
									</Text>

									<Text
										style={[
											styles.summaryMacroLabel,
											{
												color: colors.textSecondary,
											},
										]}
									>
										Жиры
									</Text>
								</View>

								<View style={styles.summaryMacro}>
									<Text
										style={[styles.summaryMacroValue, { color: colors.text }]}
									>
										{formatNumber(nutritionDay.totals.carbsG)} г
									</Text>

									<Text
										style={[
											styles.summaryMacroLabel,
											{
												color: colors.textSecondary,
											},
										]}
									>
										Углеводы
									</Text>
								</View>
							</View>
						</View>

						<Text style={[styles.sectionTitle, { color: colors.text }]}>
							Приёмы пищи
						</Text>

						{nutritionDay.meals.length === 0 ? (
							<View
								style={[styles.emptyCard, { backgroundColor: colors.card }]}
							>
								<Text
									style={[
										styles.emptyText,
										{
											color: colors.textSecondary,
										},
									]}
								>
									За этот день приёмов пищи пока нет
								</Text>
							</View>
						) : (
							nutritionDay.meals.map(renderMeal)
						)}

						<Pressable
							style={[
								styles.addButton,
								{
									backgroundColor: colors.primary,
								},
							]}
							onPress={() => {
								// Добавление приёма пищи реализуем следующим шагом.
							}}
						>
							<MaterialIcons name='add' size={24} color='#fff' />

							<Text style={styles.addButtonText}>Добавить приём пищи</Text>
						</Pressable>
					</>
				) : null}
			</ScrollView>
		</SafeAreaView>
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
		paddingVertical: 12,
	},

	backButton: {
		width: 48,
		height: 48,
		alignItems: 'flex-start',
		justifyContent: 'center',
	},

	headerSide: {
		width: 48,
	},

	dateContainer: {
		flex: 1,
		alignItems: 'center',
	},

	headerTitle: {
		fontSize: 22,
		fontWeight: '700',
	},

	dateText: {
		marginTop: 2,
		fontSize: 14,
	},

	dateNavigation: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		marginTop: -4,
		marginBottom: 4,
	},

	dateArrowButton: {
		width: 48,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},

	content: {
		padding: 16,
		paddingTop: 8,
		paddingBottom: 32,
	},

	summaryCard: {
		borderRadius: 18,
		padding: 20,
	},

	summaryTitle: {
		fontSize: 17,
		fontWeight: '600',
	},

	calories: {
		marginTop: 8,
		fontSize: 30,
		fontWeight: '700',
	},

	summaryMacros: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20,
	},

	summaryMacro: {
		alignItems: 'center',
	},

	summaryMacroValue: {
		fontSize: 16,
		fontWeight: '600',
	},

	summaryMacroLabel: {
		marginTop: 4,
		fontSize: 13,
	},

	sectionTitle: {
		marginTop: 24,
		marginBottom: 12,
		fontSize: 20,
		fontWeight: '700',
	},

	mealCard: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
	},

	mealHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
	},

	mealType: {
		fontSize: 17,
		fontWeight: '700',
	},

	mealCalories: {
		fontSize: 16,
		fontWeight: '600',
	},

	productRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 12,
	},

	productName: {
		flex: 1,
		fontSize: 15,
	},

	productAmount: {
		marginLeft: 12,
		fontSize: 14,
	},

	macroRow: {
		flexDirection: 'row',
		gap: 16,
		marginTop: 16,
		paddingTop: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#999',
	},

	macroText: {
		fontSize: 13,
	},

	emptyCard: {
		borderRadius: 16,
		padding: 20,
		alignItems: 'center',
	},

	emptyText: {
		fontSize: 15,
		textAlign: 'center',
	},

	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 14,
		paddingVertical: 14,
		marginTop: 8,
		gap: 8,
	},

	addButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},

	center: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
	},

	errorText: {
		fontSize: 15,
		textAlign: 'center',
	},
});
