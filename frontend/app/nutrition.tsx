import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import {
	createCustomFoodProduct,
	createMeal,
	getNutritionDay,
	searchFoodProducts,
} from '@/src/api/nutrition.api';
import type {
	FoodProduct,
	MealEntry,
	MealType,
	NutritionDay,
} from '@/src/api/contracts';
import { ThemeContext } from '@/src/context/ThemeContext';
type SelectedFoodProduct = {
	product: FoodProduct;
	amountG: string;
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
	breakfast: 'Завтрак',
	lunch: 'Обед',
	dinner: 'Ужин',
	snack: 'Перекус',
};

const MEAL_TYPES: { value: MealType; label: string }[] = [
	{
		value: 'breakfast',
		label: 'Завтрак',
	},
	{
		value: 'lunch',
		label: 'Обед',
	},
	{
		value: 'dinner',
		label: 'Ужин',
	},
	{
		value: 'snack',
		label: 'Перекус',
	},
];

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

function getCurrentTime() {
	const now = new Date();

	return `${String(now.getHours()).padStart(2, '0')}:${String(
		now.getMinutes(),
	).padStart(2, '0')}`;
}

export default function NutritionScreen() {
	const { colors } = React.useContext(ThemeContext);

	const [selectedDate, setSelectedDate] = useState(getDateString(new Date()));
	const [nutritionDay, setNutritionDay] = useState<NutritionDay | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [addMealModalVisible, setAddMealModalVisible] = useState(false);
	const [selectedMealType, setSelectedMealType] =
		useState<MealType>('breakfast');
	const [mealTime, setMealTime] = useState(getCurrentTime());
	const [addMealStep, setAddMealStep] = useState<1 | 2>(1);

	const [productSearch, setProductSearch] = useState('');
	const [products, setProducts] = useState<FoodProduct[]>([]);
	const [isLoadingProducts, setIsLoadingProducts] = useState(false);
	const [isSavingMeal, setIsSavingMeal] = useState(false);
	const [showCreateProduct, setShowCreateProduct] = useState(false);
	const [newProductName, setNewProductName] = useState('');
	const [newProductCalories, setNewProductCalories] = useState('');
	const [newProductProtein, setNewProductProtein] = useState('');
	const [newProductFat, setNewProductFat] = useState('');
	const [newProductCarbs, setNewProductCarbs] = useState('');
	const [isCreatingProduct, setIsCreatingProduct] = useState(false);

	const [selectedProducts, setSelectedProducts] = useState<
		SelectedFoodProduct[]
	>([]);	

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

function openAddMealModal() {
	setAddMealStep(1);
	setSelectedMealType('breakfast');
	setMealTime(getCurrentTime());

	setProductSearch('');
	setProducts([]);
	setSelectedProducts([]);

	setAddMealModalVisible(true);
}

	function closeAddMealModal() {
		setAddMealModalVisible(false);
	}

async function loadProducts(query: string) {
	try {
		setIsLoadingProducts(true);

		const result = await searchFoodProducts({
			query: query.trim() || undefined,
			page: 1,
			pageSize: 20,
		});

		console.log('🍎 PRODUCTS RESULT:', result);

		setProducts(result.items);
	} catch (error) {
		console.error('❌ PRODUCTS ERROR:', error);
		setProducts([]);
	} finally {
		setIsLoadingProducts(false);
	}
}

	async function handleNextStep() {
		setAddMealStep(2);
		await loadProducts('');
	}

	function addProduct(product: FoodProduct) {
		setSelectedProducts(prev => {
			if (prev.some(item => item.product.id === product.id)) {
				return prev;
			}

			return [
				...prev,
				{
					product,
					amountG: '',
				},
			];
		});
	}

	function removeProduct(productId: number) {
		setSelectedProducts(prev =>
			prev.filter(item => item.product.id !== productId),
		);
	}

	function updateProductAmount(productId: number, amountG: string) {
		const normalized = amountG.replace(/[^0-9.]/g, '');

		setSelectedProducts(prev =>
			prev.map(item =>
				item.product.id === productId
					? {
							...item,
							amountG: normalized,
						}
					: item,
			),
		);
	}

	async function handleSaveMeal() {
		const validProducts = selectedProducts.filter(
			item => Number(item.amountG) > 0,
		);

		if (validProducts.length === 0) {
			return;
		}

		try {
			setIsSavingMeal(true);

			const eatenAt = new Date(`${selectedDate}T${mealTime}:00`).toISOString();

			await createMeal({
				mealType: selectedMealType,
				eatenAt,
				items: validProducts.map(item => ({
					productId: item.product.id,
					amountG: Number(item.amountG),
				})),
			});

			const updatedNutritionDay = await getNutritionDay(selectedDate);

			setNutritionDay(updatedNutritionDay);
			closeAddMealModal();
		} catch (error) {
			console.error('❌ CREATE MEAL ERROR:', error);
		} finally {
			setIsSavingMeal(false);
		}
	}

	async function handleCreateProduct() {
		const name = newProductName.trim();
		const calories = Number(newProductCalories);
		const protein = Number(newProductProtein);
		const fat = Number(newProductFat);
		const carbs = Number(newProductCarbs);

		if (
			!name ||
			!Number.isFinite(calories) ||
			!Number.isFinite(protein) ||
			!Number.isFinite(fat) ||
			!Number.isFinite(carbs) ||
			calories < 0 ||
			protein < 0 ||
			fat < 0 ||
			carbs < 0
		) {
			return;
		}

		try {
			setIsCreatingProduct(true);

			const product = await createCustomFoodProduct({
				name,
				nutritionPer100g: {
					calories,
					proteinG: protein,
					fatG: fat,
					carbsG: carbs,
				},
			});

			setProducts(prev => [product, ...prev]);
			addProduct(product);

			setShowCreateProduct(false);

			setNewProductName('');
			setNewProductCalories('');
			setNewProductProtein('');
			setNewProductFat('');
			setNewProductCarbs('');
		} catch (error) {
			console.error('❌ CREATE PRODUCT ERROR:', error);
		} finally {
			setIsCreatingProduct(false);
		}
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
							style={[
								styles.summaryCard,
								{
									backgroundColor: colors.card,
								},
							]}
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
										style={[
											styles.summaryMacroValue,
											{
												color: colors.text,
											},
										]}
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
										style={[
											styles.summaryMacroValue,
											{
												color: colors.text,
											},
										]}
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
										style={[
											styles.summaryMacroValue,
											{
												color: colors.text,
											},
										]}
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
								style={[
									styles.emptyCard,
									{
										backgroundColor: colors.card,
									},
								]}
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
							onPress={openAddMealModal}
						>
							<MaterialIcons name='add' size={24} color='#fff' />

							<Text style={styles.addButtonText}>Добавить приём пищи</Text>
						</Pressable>
					</>
				) : null}
			</ScrollView>

			<Modal
				visible={addMealModalVisible}
				transparent
				animationType='fade'
				onRequestClose={closeAddMealModal}
			>
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.modalCard,
							{
								backgroundColor: colors.card,
								shadowColor: colors.shadow,
							},
						]}
					>
						{addMealStep === 1 ? (
							<>
								<Text style={[styles.modalTitle, { color: colors.text }]}>
									Добавить приём пищи
								</Text>

								<Text
									style={[styles.modalSubtitle, { color: colors.textMuted }]}
								>
									Выберите тип приёма пищи
								</Text>

								<View style={styles.mealTypeList}>
									{MEAL_TYPES.map(item => (
										<Pressable
											key={item.value}
											onPress={() => setSelectedMealType(item.value)}
											style={[
												styles.mealTypeButton,
												{
													backgroundColor:
														selectedMealType === item.value
															? colors.primary
															: colors.cardSecondary,
												},
											]}
										>
											<Text
												style={[
													styles.mealTypeText,
													{
														color:
															selectedMealType === item.value
																? '#FFFFFF'
																: colors.text,
													},
												]}
											>
												{item.label}
											</Text>
										</Pressable>
									))}
								</View>

								<Text
									style={[styles.modalSubtitle, { color: colors.textMuted }]}
								>
									Время: {mealTime}
								</Text>

								<View style={styles.modalButtons}>
									<Pressable
										style={[
											styles.modalButton,
											styles.cancelButton,
											{
												backgroundColor: colors.cardSecondary,
											},
										]}
										onPress={closeAddMealModal}
									>
										<Text
											style={[
												styles.cancelButtonText,
												{ color: colors.textSecondary },
											]}
										>
											Отмена
										</Text>
									</Pressable>
									<Pressable
										style={[
											styles.modalButton,
											{
												backgroundColor: colors.primary,
											},
										]}
										onPress={handleNextStep}
									>
										<Text style={styles.nextButtonText}>Далее</Text>
									</Pressable>
								</View>
							</>
						) : (
							<>
								<View style={styles.modalHeaderRow}>
									<Pressable onPress={() => setAddMealStep(1)} hitSlop={10}>
										<Ionicons
											name='arrow-back'
											size={24}
											color={colors.primary}
										/>
									</Pressable>

									<Text
										style={[
											styles.modalTitle,
											{
												color: colors.text,
												marginBottom: 0,
											},
										]}
									>
										Выбор продуктов
									</Text>

									<View style={{ width: 24 }} />
								</View>

								<Text
									style={[styles.modalSubtitle, { color: colors.textMuted }]}
								>
									Найдите продукт и укажите его количество
								</Text>

								<View
									style={[
										styles.productSearchWrap,
										{
											backgroundColor: colors.cardSecondary,
											borderColor: colors.border,
										},
									]}
								>
									<Ionicons
										name='search-outline'
										size={20}
										color={colors.textMuted}
									/>

									<TextInput
										style={[styles.productSearchInput, { color: colors.text }]}
										value={productSearch}
										onChangeText={text => {
											setProductSearch(text);
											loadProducts(text);
										}}
										placeholder='Поиск продукта'
										placeholderTextColor={colors.textMuted}
									/>
								</View>

								{selectedProducts.length > 0 && (
									<View style={styles.selectedProducts}>
										<Text
											style={[
												styles.selectedProductsTitle,
												{ color: colors.text },
											]}
										>
											Выбранные продукты
										</Text>

										{selectedProducts.map(item => (
											<View
												key={item.product.id}
												style={[
													styles.selectedProductRow,
													{
														backgroundColor: colors.cardSecondary,
													},
												]}
											>
												<View style={styles.selectedProductInfo}>
													<Text
														style={[
															styles.selectedProductName,
															{ color: colors.text },
														]}
													>
														{item.product.name}
													</Text>

													<Text
														style={[
															styles.selectedProductNutrition,
															{ color: colors.textMuted },
														]}
													>
														{item.product.nutritionPer100g.calories} ккал / 100
														г
													</Text>
												</View>

												<View style={styles.gramsInputWrap}>
													<TextInput
														style={[styles.gramsInput, { color: colors.text }]}
														value={item.amountG}
														onChangeText={value =>
															updateProductAmount(item.product.id, value)
														}
														keyboardType='decimal-pad'
														placeholder='г'
														placeholderTextColor={colors.textMuted}
													/>

													<Text
														style={[
															styles.gramsLabel,
															{ color: colors.textMuted },
														]}
													>
														г
													</Text>
												</View>

												<Pressable
													onPress={() => removeProduct(item.product.id)}
													hitSlop={8}
												>
													<Ionicons
														name='close-circle-outline'
														size={22}
														color={colors.textMuted}
													/>
												</Pressable>
											</View>
										))}
									</View>
								)}

								<Pressable
									onPress={() => setShowCreateProduct(prev => !prev)}
									style={[
										styles.createProductButton,
										{
											backgroundColor: colors.cardSecondary,
											borderColor: colors.border,
										},
									]}
								>
									<Ionicons
										name='add-circle-outline'
										size={22}
										color={colors.primary}
									/>

									<Text
										style={[
											styles.createProductButtonText,
											{ color: colors.primary },
										]}
									>
										Добавить свой продукт
									</Text>
								</Pressable>

								{showCreateProduct && (
									<View
										style={[
											styles.createProductForm,
											{
												backgroundColor: colors.cardSecondary,
												borderColor: colors.border,
											},
										]}
									>
										<Text
											style={[
												styles.createProductTitle,
												{ color: colors.text },
											]}
										>
											Новый продукт
										</Text>

										<TextInput
											style={[
												styles.createProductInput,
												{
													color: colors.text,
													borderColor: colors.border,
												},
											]}
											value={newProductName}
											onChangeText={setNewProductName}
											placeholder='Название продукта'
											placeholderTextColor={colors.textMuted}
										/>

										<TextInput
											style={[
												styles.createProductInput,
												{
													color: colors.text,
													borderColor: colors.border,
												},
											]}
											value={newProductCalories}
											onChangeText={setNewProductCalories}
											placeholder='Калории на 100 г'
											placeholderTextColor={colors.textMuted}
											keyboardType='decimal-pad'
										/>

										<TextInput
											style={[
												styles.createProductInput,
												{
													color: colors.text,
													borderColor: colors.border,
												},
											]}
											value={newProductProtein}
											onChangeText={setNewProductProtein}
											placeholder='Белки на 100 г'
											placeholderTextColor={colors.textMuted}
											keyboardType='decimal-pad'
										/>

										<TextInput
											style={[
												styles.createProductInput,
												{
													color: colors.text,
													borderColor: colors.border,
												},
											]}
											value={newProductFat}
											onChangeText={setNewProductFat}
											placeholder='Жиры на 100 г'
											placeholderTextColor={colors.textMuted}
											keyboardType='decimal-pad'
										/>

										<TextInput
											style={[
												styles.createProductInput,
												{
													color: colors.text,
													borderColor: colors.border,
												},
											]}
											value={newProductCarbs}
											onChangeText={setNewProductCarbs}
											placeholder='Углеводы на 100 г'
											placeholderTextColor={colors.textMuted}
											keyboardType='decimal-pad'
										/>

										<Pressable
											onPress={handleCreateProduct}
											disabled={isCreatingProduct}
											style={[
												styles.createProductSaveButton,
												{
													backgroundColor: colors.primary,
													opacity: isCreatingProduct ? 0.5 : 1,
												},
											]}
										>
											<Text style={styles.nextButtonText}>
												{isCreatingProduct ? 'Добавление...' : 'Добавить'}
											</Text>
										</Pressable>
									</View>
								)}

								<Text style={[styles.productListTitle, { color: colors.text }]}>
									Каталог
								</Text>

								<View style={styles.productList}>
									{isLoadingProducts ? (
										<ActivityIndicator size='small' color={colors.primary} />
									) : products.length === 0 ? (
										<Text
											style={[
												styles.emptyProductsText,
												{ color: colors.textMuted },
											]}
										>
											Продукты не найдены
										</Text>
									) : (
										<ScrollView
											style={styles.productsScroll}
											keyboardShouldPersistTaps='handled'
											showsVerticalScrollIndicator={false}
										>
											{products.map(product => {
												const isSelected = selectedProducts.some(
													item => item.product.id === product.id,
												);

												return (
													<Pressable
														key={product.id}
														onPress={() => addProduct(product)}
														disabled={isSelected}
														style={[
															styles.productItem,
															{
																backgroundColor: colors.cardSecondary,
																opacity: isSelected ? 0.5 : 1,
															},
														]}
													>
														<View style={styles.productItemInfo}>
															<Text
																style={[
																	styles.productName,
																	{
																		color: colors.text,
																	},
																]}
															>
																{product.name}
															</Text>

															<Text
																style={[
																	styles.productNutrition,
																	{
																		color: colors.textMuted,
																	},
																]}
															>
																{product.nutritionPer100g.calories} ккал · Б{' '}
																{product.nutritionPer100g.proteinG} · Ж{' '}
																{product.nutritionPer100g.fatG} · У{' '}
																{product.nutritionPer100g.carbsG}
															</Text>
														</View>

														<Ionicons
															name={
																isSelected
																	? 'checkmark-circle'
																	: 'add-circle-outline'
															}
															size={24}
															color={colors.primary}
														/>
													</Pressable>
												);
											})}
										</ScrollView>
									)}
								</View>

								<View style={styles.modalButtons}>
									<Pressable
										style={[
											styles.modalButton,
											styles.cancelButton,
											{
												backgroundColor: colors.cardSecondary,
											},
										]}
										onPress={closeAddMealModal}
									>
										<Text
											style={[
												styles.cancelButtonText,
												{ color: colors.textSecondary },
											]}
										>
											Отмена
										</Text>
									</Pressable>
									<Pressable
										style={[
											styles.modalButton,
											{
												backgroundColor: colors.primary,
												opacity:
													selectedProducts.length === 0 || isSavingMeal
														? 0.5
														: 1,
											},
										]}
										onPress={handleSaveMeal}
										disabled={isSavingMeal || selectedProducts.length === 0}
									>
										<Text style={styles.nextButtonText}>
											{isSavingMeal ? 'Сохранение...' : 'Сохранить'}
										</Text>
									</Pressable>
								</View>
							</>
						)}
					</View>
				</View>
			</Modal>
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
		fontSize: 14,
		fontWeight: '600',
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

	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.45)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},

	modalCard: {
		borderRadius: 24,
		padding: 20,
	},

	modalTitle: {
		fontSize: 21,
		fontWeight: '800',
		textAlign: 'center',
	},

	modalSubtitle: {
		fontSize: 14,
		textAlign: 'center',
		marginTop: 6,
		marginBottom: 20,
	},

	modalHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},

	mealTypeList: {
		gap: 8,
		marginBottom: 16,
	},

	mealTypeGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},

	mealTypeButton: {
		width: '48%',
		minHeight: 52,
		borderRadius: 14,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},

	mealTypeText: {
		fontSize: 14,
		fontWeight: '600',
		textAlign: 'center',
	},

	mealTypeButtonText: {
		fontSize: 15,
		fontWeight: '700',
	},

	timeLabel: {
		fontSize: 15,
		fontWeight: '700',
		marginTop: 22,
		marginBottom: 8,
	},

	timeInput: {
		height: 52,
		borderRadius: 14,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		gap: 10,
	},

	timeText: {
		fontSize: 16,
		fontWeight: '600',
	},

	productSearchWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 12,
		marginBottom: 12,
	},

	productSearchInput: {
		flex: 1,
		height: 44,
		marginLeft: 8,
		fontSize: 15,
	},

	selectedProducts: {
		marginBottom: 12,
	},

	selectedProductsTitle: {
		fontSize: 14,
		fontWeight: '700',
		marginBottom: 8,
	},

	selectedProductRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		padding: 10,
		marginBottom: 8,
		gap: 8,
	},

	selectedProductInfo: {
		flex: 1,
	},

	selectedProductName: {
		fontSize: 14,
		fontWeight: '600',
	},

	selectedProductNutrition: {
		fontSize: 11,
		marginTop: 2,
	},

	gramsInputWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		paddingHorizontal: 8,
	},

	gramsInput: {
		width: 48,
		height: 34,
		fontSize: 14,
		textAlign: 'center',
	},

	gramsLabel: {
		fontSize: 12,
	},

	productListTitle: {
		fontSize: 14,
		fontWeight: '700',
		marginBottom: 8,
	},

	productList: {
		minHeight: 100,
		maxHeight: 220,
	},

	productsScroll: {
		flex: 1,
	},

	productItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
		padding: 12,
		marginBottom: 8,
	},

	productItemInfo: {
		flex: 1,
		paddingRight: 8,
	},

	productNutrition: {
		fontSize: 11,
		marginTop: 4,
	},

	emptyProductsText: {
		textAlign: 'center',
		paddingVertical: 24,
		fontSize: 13,
	},

	modalButtons: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 24,
	},

	modalButton: {
		flex: 1,
		height: 50,
		borderRadius: 15,
		alignItems: 'center',
		justifyContent: 'center',
	},

	cancelButton: {},

	cancelButtonText: {
		fontSize: 15,
		fontWeight: '700',
	},

	nextButtonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '800',
	},

	createProductButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 11,
		marginBottom: 12,
		gap: 8,
	},

	createProductButtonText: {
		fontSize: 14,
		fontWeight: '700',
	},

	createProductForm: {
		borderWidth: 1,
		borderRadius: 14,
		padding: 12,
		marginBottom: 12,
	},

	createProductTitle: {
		fontSize: 15,
		fontWeight: '700',
		marginBottom: 10,
	},

	createProductInput: {
		height: 44,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		marginBottom: 8,
		fontSize: 14,
	},

	createProductSaveButton: {
		height: 44,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 4,
	},
});
