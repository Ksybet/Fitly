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
}) {
	return (
		<TouchableOpacity
			style={[styles.row, noBorder && styles.rowNoBorder]}
			onPress={editable ? onPress : undefined}
			activeOpacity={editable ? 0.8 : 1}
			disabled={!editable}
		>
			<View style={styles.rowLeft}>
				<View style={styles.iconWrapper}>{icon}</View>

				<View style={styles.textBlock}>
					<Text style={styles.rowLabel}>{label}</Text>
				</View>
			</View>

			<View style={styles.rowRight}>
				<Text style={styles.rowValue} numberOfLines={1} ellipsizeMode='tail'>
					{value || 'Не указано'}
				</Text>

				{editable && (
					<Ionicons name='chevron-forward' size={20} color='#8E97A8' />
				)}
			</View>
		</TouchableOpacity>
	);
}

export default function PersonalDataScreen() {
	const { user, updateUserData } = useContext(AuthContext);

	const [profile, setProfile] = useState({
		email: '',
		firstName: '',
		lastName: '',
		birthDate: '',
		weightKg: '',
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

			const normalized = {
				email: user?.email || '',
				firstName: data?.firstName || user?.firstName || user?.name || '',
				lastName: data?.lastName || user?.lastName || '',
				birthDate: data?.birthDate || user?.birthDate || '',
				weightKg:
					data?.weightKg !== undefined && data?.weightKg !== null
						? String(data.weightKg)
						: '',
				gender: data?.gender || user?.gender || '',
			};

			setProfile(normalized);
		} catch (e) {
			console.log('Ошибка загрузки профиля', e);

			setProfile({
				email: user?.email || '',
				firstName: user?.firstName || user?.name || '',
				lastName: user?.lastName || '',
				birthDate: user?.birthDate || '',
				weightKg:
					user?.weightKg !== undefined && user?.weightKg !== null
						? String(user.weightKg)
						: user?.weight !== undefined && user?.weight !== null
							? String(user.weight)
							: '',
				gender: user?.gender || '',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const fullName = useMemo(() => {
		return (
			[profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
			'Не указано'
		);
	}, [profile.firstName, profile.lastName]);

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
				selectedField === 'weightKg' &&
				newValue !== '' &&
				Number.isNaN(Number(String(newValue).replace(',', '.')))
			) {
				Alert.alert('Ошибка', 'Введите корректный вес');
				return;
			}

			const payload = buildPayload(selectedField, newValue);
			const updated = await updateMyProfile(payload);

			const nextProfile = applyLocalChange(profile, selectedField, newValue);

			setProfile({
				email: profile.email,
				firstName: updated?.firstName ?? nextProfile.firstName,
				lastName: updated?.lastName ?? nextProfile.lastName,
				birthDate: updated?.birthDate ?? nextProfile.birthDate,
				weightKg:
					updated?.weightKg !== undefined && updated?.weightKg !== null
						? String(updated.weightKg)
						: nextProfile.weightKg,
				gender: updated?.gender ?? nextProfile.gender,
			});

			updateUserData({
				email: profile.email,
				firstName: updated?.firstName ?? nextProfile.firstName,
				lastName: updated?.lastName ?? nextProfile.lastName,
				name: updated?.firstName ?? nextProfile.firstName ?? user?.name ?? '',
				birthDate: updated?.birthDate ?? nextProfile.birthDate,
				weightKg:
					updated?.weightKg !== undefined && updated?.weightKg !== null
						? updated.weightKg
						: nextProfile.weightKg
							? Number(nextProfile.weightKg)
							: undefined,
				weight:
					updated?.weightKg !== undefined && updated?.weightKg !== null
						? updated.weightKg
						: nextProfile.weightKg
							? Number(nextProfile.weightKg)
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
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#18B67A' />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					activeOpacity={0.8}
				>
					<Ionicons name='arrow-back' size={28} color='#18B67A' />
				</TouchableOpacity>

				<Text style={styles.headerTitle}>Личные данные</Text>

				<View style={styles.headerSpacer} />
			</View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
				<View style={styles.card}>
					<DataRow
						icon={
							<MaterialCommunityIcons
								name='email-outline'
								size={20}
								color='#19B97A'
							/>
						}
						label='Email'
						value={emailText}
						editable={false}
						noBorder={false}
					/>

					<DataRow
						icon={<Ionicons name='person' size={20} color='#19B97A' />}
						label='Имя'
						value={fullName}
						onPress={() =>
							openFieldModal('firstName', 'Имя', profile.firstName)
						}
					/>

					<DataRow
						icon={
							<MaterialCommunityIcons
								name='calendar-month-outline'
								size={20}
								color='#19B97A'
							/>
						}
						label='Дата рождения'
						value={formattedBirthDate}
						onPress={() =>
							openDateModal('birthDate', 'Дата рождения', profile.birthDate)
						}
					/>

					<DataRow
						icon={
							<MaterialCommunityIcons
								name='weight-kilogram'
								size={20}
								color='#19B97A'
							/>
						}
						label='Вес'
						value={weightText}
						onPress={() =>
							openFieldModal('weightKg', 'Вес', profile.weightKg, 'numeric')
						}
					/>

					<DataRow
						icon={<Ionicons name='male-outline' size={20} color='#19B97A' />}
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
					<Text style={styles.deleteText}>Удалить аккаунт</Text>
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

		case 'gender':
			return { ...profile, gender: value };

		default:
			return profile;
	}
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#F4F4F4',
		paddingTop: 20,
	},

	header: {
		height: 64,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomColor: '#ECECEC',
		backgroundColor: '#F4F4F4',
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
		color: '#1F2937',
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
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 4,
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

	rowRight: {
		flexDirection: 'row',
		alignItems: 'center',
		maxWidth: '55%',
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

	rowValue: {
		fontSize: 15,
		color: '#6B7280',
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
		color: '#FF6B6B',
	},

	loaderContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
