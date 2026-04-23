import React, { useContext } from 'react';
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';

const OPTIONS = [
	{ label: 'Мужской', value: 'male', icon: 'male-outline' },
	{ label: 'Женский', value: 'female', icon: 'female-outline' },
	{ label: 'Другое', value: 'other', icon: 'person-outline' },
];

export default function EditGenderModal({
	visible,
	selectedValue,
	onSave,
	onCancel,
	isSaving = false,
}) {
	const { colors, isDark } = useContext(ThemeContext);

	return (
		<Modal visible={visible} transparent animationType='fade'>
			<View style={styles.overlay}>
				<View
					style={[
						styles.modal,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<Text style={[styles.title, { color: colors.text }]}>
						Выберите пол
					</Text>

					<View style={styles.options}>
						{OPTIONS.map(option => {
							const isActive = selectedValue === option.value;

							return (
								<TouchableOpacity
									key={option.value}
									style={[
										styles.option,
										{
											borderColor: isActive ? colors.primary : colors.border,
											backgroundColor: isActive
												? isDark
													? colors.iconBg
													: '#F4FFF9'
												: colors.cardSecondary,
										},
									]}
									onPress={() => onSave(option.value)}
									activeOpacity={0.8}
									disabled={isSaving}
								>
									<View style={styles.optionLeft}>
										<View
											style={[
												styles.iconWrapper,
												{
													backgroundColor: isActive
														? colors.primary
														: colors.iconBg,
												},
											]}
										>
											<Ionicons
												name={option.icon}
												size={20}
												color={isActive ? '#FFFFFF' : colors.primary}
											/>
										</View>

										<Text
											style={[
												styles.optionText,
												{
													color: isActive ? colors.text : colors.text,
												},
											]}
										>
											{option.label}
										</Text>
									</View>

									{isActive && (
										<Ionicons
											name='checkmark-circle'
											size={22}
											color={colors.primary}
										/>
									)}
								</TouchableOpacity>
							);
						})}
					</View>

					<TouchableOpacity
						onPress={onCancel}
						style={[
							styles.cancelButton,
							{
								backgroundColor: isDark ? colors.cardSecondary : '#F3F4F6',
							},
						]}
						activeOpacity={0.8}
						disabled={isSaving}
					>
						{isSaving ? (
							<ActivityIndicator size='small' color={colors.primary} />
						) : (
							<Text
								style={[styles.cancelText, { color: colors.textSecondary }]}
							>
								Закрыть
							</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.35)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
	},

	modal: {
		width: '100%',
		borderRadius: 24,
		padding: 20,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.12,
		shadowRadius: 10,
		elevation: 6,
	},

	title: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 18,
		textAlign: 'center',
	},

	options: {
		gap: 12,
		marginBottom: 20,
	},

	option: {
		minHeight: 60,
		borderRadius: 18,
		borderWidth: 1,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},

	optionLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	iconWrapper: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},

	optionText: {
		fontSize: 16,
		fontWeight: '600',
	},

	cancelButton: {
		height: 48,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},

	cancelText: {
		fontSize: 16,
		fontWeight: '600',
	},
});
