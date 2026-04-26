import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { getMyProfile, updateMyProfile } from '../api/profile.api';

import EditFieldModal from './EditFieldModal';
import EditDateModal from './EditDateModal';
import EditGenderModal from './EditGenderModal';

function DataRow({
	icon,
	label,
	value,
	onPress,
	noBorder = false,
	editable = true,
	colors,
}) {
	return (
		<TouchableOpacity
			style={[
				styles.row,
				{ borderBottomColor: colors.border },
				noBorder && styles.rowNoBorder,
			]}
			onPress={editable ? onPress : undefined}
			activeOpacity={editable ? 0.8 : 1}
			disabled={!editable}
		>
			<View style={styles.rowLeft}>
				<View style={[styles.iconWrapper, { backgroundColor: colors.iconBg }]}>
					{icon}
				</View>

				<View style={styles.textBlock}>
					<Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
				</View>
			</View>

			<View style={styles.rowRight}>
				<Text
					style={[styles.rowValue, { color: colors.textSecondary }]}
					numberOfLines={1}
					ellipsizeMode='tail'
				>
					{value || 'Не указано'}
				</Text>

				{editable && (
					<Ionicons name='chevron-forward' size={20} color={colors.textMuted} />
				)}
			</View>
		</TouchableOpacity>
	);
}

export default function PersonalDataScreen() {
	const { user, updateUserData } = useContext(AuthContext);
	const { colors } = useContext(ThemeContext);

	const [profile, setProfile] = useState({
		email: '',
		firstName: '',
		birthDate: '',
		weightKg: '',
		heightCm: '',
		gender: '',
	});

	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const [fieldModalVisible, setFieldModalVisible] = useState(false);
	const [dateModalVisible, setDateModalVisible] = useState(false);
	const [genderModalVisible, setGenderModalVisible] = useState(false);

	const [selectedField, setSelectedField] = useState(null);
	const [selectedLabel, setSelectedLabel] = useState('');
	const [selectedValue, setSelectedValue] = useState('');
	const [selectedKeyboardType, setSelectedKeyboardType] = useState('default');

	useEffect(() => {
		loadProfile();
	}, []);

	const loadProfile = async () => {
		try {
			setIsLoading(true);

			const data = await getMyProfile();

			setProfile({
				email: user?.email || '',
				firstName: data?.firstName || user?.firstName || user?.name || '',
				birthDate: data?.birthDate || user?.birthDate || '',
				weightKg:
					data?.weightKg !== undefined && data?.weightKg !== null
						? String(data.weightKg)
						: user?.weightKg !== undefined && user?.weightKg !== null
							? String(user.weightKg)
							: '',
				heightCm:
					data?.heightCm !== undefined && data?.heightCm !== null
						? String(data.heightCm)
						: user?.heightCm !== undefined && user?.heightCm !== null
							? String(user.heightCm)
							: '',
				gender: data?.gender || user?.gender || '',
			});
		} catch (e) {
			console.log('Ошибка загрузки профиля', e);

			setProfile({
				email: user?.email || '',
				firstName: user?.firstName || user?.name || '',
				birthDate: user?.birthDate || '',
				weightKg:
					user?.weightKg !== undefined && user?.weightKg !== null
						? String(user.weightKg)
						: '',
				heightCm:
					user?.heightCm !== undefined && user?.heightCm !== null
						? String(user.heightCm)
						: '',
				gender: user?.gender || '',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const formattedBirthDate = useMemo(() => {
		if (!profile.birthDate) return 'Не указано';

		const date = new Date(profile.birthDate);
		if (Number.isNaN(date.getTime())) return profile.birthDate;

		return date.toLocaleDateString('ru-RU', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	}, [profile.birthDate]);

	const weightText = profile.weightKg ? `${profile.weightKg} кг` : 'Не указано';
	const heightText = profile.heightCm ? `${profile.heightCm} см` : 'Не указано';

	const genderText =
		profile.gender === 'male'
			? 'Мужской'
			: profile.gender === 'female'
				? 'Женский'
				: profile.gender === 'other'
					? 'Другое'
					: 'Не указано';

	const emailText = profile.email || 'Не указано';

	const openFieldModal = (field, label, value, keyboardType = 'default') => {
		setSelectedField(field);
		setSelectedLabel(label);
		setSelectedValue(value || '');
		setSelectedKeyboardType(keyboardType);
		setFieldModalVisible(true);
	};

	const openDateModal = (field, label, value) => {
		setSelectedField(field);
		setSelectedLabel(label);
		setSelectedValue(value || '');
		setDateModalVisible(true);
	};

	const openGenderModal = () => {
		setSelectedField('gender');
		setSelectedValue(profile.gender || '');
		setGenderModalVisible(true);
	};

	const saveField = async newValue => {
		if (!selectedField) return;

		try {
			setIsSaving(true);

			if (
				['weightKg', 'heightCm'].includes(selectedField) &&
				newValue !== '' &&
				Number.isNaN(Number(String(newValue).replace(',', '.')))
			) {
				Alert.alert(
					'Ошибка',
					selectedField === 'weightKg'
						? 'Введите корректный вес'
						: 'Введите корректный рост',
				);
				return;
			}

			const payload = buildPayload(selectedField, newValue);
			const updated = await updateMyProfile(payload);

			const nextProfile = applyLocalChange(profile, selectedField, newValue);

			setProfile({
				email: profile.email,
				firstName: updated?.firstName ?? nextProfile.firstName,
				birthDate: updated?.birthDate ?? nextProfile.birthDate,
				weightKg:
					updated?.weightKg !== undefined && updated?.weightKg !== null
						? String(updated.weightKg)
						: nextProfile.weightKg,
				heightCm:
					updated?.heightCm !== undefined && updated?.heightCm !== null
						? String(updated.heightCm)
						: nextProfile.heightCm,
				gender: updated?.gender ?? nextProfile.gender,
			});

			updateUserData({
				email: profile.email,
				firstName: updated?.firstName ?? nextProfile.firstName,
				name: updated?.firstName ?? nextProfile.firstName ?? user?.name ?? '',
				birthDate: updated?.birthDate ?? nextProfile.birthDate,
				weightKg:
					updated?.weightKg !== undefined && updated?.weightKg !== null
						? updated.weightKg
						: nextProfile.weightKg
							? Number(nextProfile.weightKg)
							: undefined,
				heightCm:
					updated?.heightCm !== undefined && updated?.heightCm !== null
						? updated.heightCm
						: nextProfile.heightCm
							? Number(nextProfile.heightCm)
							: undefined,
				gender: updated?.gender ?? nextProfile.gender,
			});

			setFieldModalVisible(false);
			setDateModalVisible(false);
			setGenderModalVisible(false);
			setSelectedField(null);
			setSelectedValue('');
		} catch (e) {
			console.log('Ошибка обновления профиля статус:', e?.response?.status);
			console.log('Ошибка обновления профиля данные:', e?.response?.data);
			console.log(
				'Ошибка обновления профиля payload:',
				buildPayload(selectedField, newValue),
			);

			Alert.alert(
				'Ошибка',
				e?.response?.data?.message || 'Не удалось сохранить данные',
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteAccount = () => {
		Alert.alert(
			'Удалить аккаунт',
			'Удаление аккаунта лучше делать отдельным подтверждением через пароль.',
		);
	};

	if (isLoading) {
		return (
			<SafeAreaView
				style={[styles.safeArea, { backgroundColor: colors.background }]}
			>
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color={colors.primary} />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView
			style={[styles.safeArea, { backgroundColor: colors.background }]}
		>
			<View
				style={[
					styles.header,
					{
						backgroundColor: colors.background,
						borderBottomColor: colors.border,
					},
				]}
			>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					activeOpacity={0.8}
				>
					<Ionicons name='arrow-back' size={28} color={colors.primary} />
				</TouchableOpacity>

				<Text style={[styles.headerTitle, { color: colors.text }]}>
					Личные данные
				</Text>

				<View style={styles.headerSpacer} />
			</View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
				<View
					style={[
						styles.card,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<DataRow
						colors={colors}
						icon={
							<MaterialCommunityIcons
								name='email-outline'
								size={20}
								color={colors.primary}
							/>
						}
						label='Email'
						value={emailText}
						editable={false}
					/>

					<DataRow
						colors={colors}
						icon={<Ionicons name='person' size={20} color={colors.primary} />}
						label='Имя'
						value={profile.firstName || 'Не указано'}
						onPress={() =>
							openFieldModal('firstName', 'Имя', profile.firstName)
						}
					/>

					<DataRow
						colors={colors}
						icon={
							<MaterialCommunityIcons
								name='calendar-month-outline'
								size={20}
								color={colors.primary}
							/>
						}
						label='Дата рождения'
						value={formattedBirthDate}
						onPress={() =>
							openDateModal('birthDate', 'Дата рождения', profile.birthDate)
						}
					/>

					<DataRow
						colors={colors}
						icon={
							<MaterialCommunityIcons
								name='weight-kilogram'
								size={20}
								color={colors.primary}
							/>
						}
						label='Вес'
						value={weightText}
						onPress={() =>
							openFieldModal('weightKg', 'Вес', profile.weightKg, 'numeric')
						}
					/>

					<DataRow
						colors={colors}
						icon={
							<MaterialCommunityIcons
								name='human-male-height'
								size={20}
								color={colors.primary}
							/>
						}
						label='Рост'
						value={heightText}
						onPress={() =>
							openFieldModal('heightCm', 'Рост', profile.heightCm, 'numeric')
						}
					/>

					<DataRow
						colors={colors}
						icon={
							<Ionicons name='male-outline' size={20} color={colors.primary} />
						}
						label='Пол'
						value={genderText}
						onPress={openGenderModal}
						noBorder
					/>
				</View>

				<TouchableOpacity
					style={styles.deleteButton}
					onPress={handleDeleteAccount}
					activeOpacity={0.8}
				>
					<Text style={[styles.deleteText, { color: colors.danger }]}>
						Удалить аккаунт
					</Text>
				</TouchableOpacity>
			</ScrollView>

			<EditFieldModal
				visible={fieldModalVisible}
				title={selectedLabel}
				initialValue={selectedValue}
				keyboardType={selectedKeyboardType}
				onCancel={() => setFieldModalVisible(false)}
				onSave={saveField}
				isSaving={isSaving}
			/>

			<EditDateModal
				visible={dateModalVisible}
				initialDate={selectedValue || '2000-01-01'}
				onCancel={() => setDateModalVisible(false)}
				onSave={saveField}
				isSaving={isSaving}
			/>

			<EditGenderModal
				visible={genderModalVisible}
				selectedValue={selectedValue}
				onCancel={() => setGenderModalVisible(false)}
				onSave={saveField}
				isSaving={isSaving}
			/>
		</SafeAreaView>
	);
}

function buildPayload(field, value) {
	switch (field) {
		case 'firstName':
			return { firstName: value.trim() };

		case 'birthDate':
			return { birthDate: value };

		case 'weightKg':
			return { weightKg: Number(String(value).replace(',', '.')) };

		case 'heightCm':
			return { heightCm: Number(String(value).replace(',', '.')) };

		case 'gender':
			return { gender: value };

		default:
			return {};
	}
}

function applyLocalChange(profile, field, value) {
	switch (field) {
		case 'firstName':
			return { ...profile, firstName: value };

		case 'birthDate':
			return { ...profile, birthDate: value };

		case 'weightKg':
			return { ...profile, weightKg: value };

		case 'heightCm':
			return { ...profile, heightCm: value };

		case 'gender':
			return { ...profile, gender: value };

		default:
			return profile;
	}
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		paddingTop: 20,
	},

	header: {
		height: 64,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
	},

	backButton: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},

	headerTitle: {
		fontSize: 16,
		fontWeight: '700',
	},

	headerSpacer: {
		width: 40,
		height: 40,
	},

	content: {
		paddingHorizontal: 14,
		paddingTop: 20,
		paddingBottom: 32,
	},

	card: {
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 4,
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

	rowRight: {
		flexDirection: 'row',
		alignItems: 'center',
		maxWidth: '55%',
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

	rowValue: {
		fontSize: 15,
		marginRight: 6,
		textAlign: 'right',
		flexShrink: 1,
	},

	deleteButton: {
		marginTop: 28,
		alignItems: 'center',
		paddingVertical: 10,
	},

	deleteText: {
		fontSize: 16,
		fontWeight: '700',
	},

	loaderContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
