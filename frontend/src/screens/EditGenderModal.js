import React from 'react';
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
	return (
		<Modal visible={visible} transparent animationType='fade'>
			<View style={styles.overlay}>
				<View style={styles.modal}>
					<Text style={styles.title}>Выберите пол</Text>

					<View style={styles.options}>
						{OPTIONS.map(option => {
							const isActive = selectedValue === option.value;

							return (
								<TouchableOpacity
									key={option.value}
									style={[styles.option, isActive && styles.optionActive]}
									onPress={() => onSave(option.value)}
									activeOpacity={0.8}
									disabled={isSaving}
								>
									<View style={styles.optionLeft}>
										<View
											style={[
												styles.iconWrapper,
												isActive && styles.iconWrapperActive,
											]}
										>
											<Ionicons
												name={option.icon}
												size={20}
												color={isActive ? '#FFFFFF' : '#18B67A'}
											/>
										</View>

										<Text
											style={[
												styles.optionText,
												isActive && styles.optionTextActive,
											]}
										>
											{option.label}
										</Text>
									</View>

									{isActive && (
										<Ionicons
											name='checkmark-circle'
											size={22}
											color='#18B67A'
										/>
									)}
								</TouchableOpacity>
							);
						})}
					</View>

					<TouchableOpacity
						onPress={onCancel}
						style={styles.cancelButton}
						activeOpacity={0.8}
						disabled={isSaving}
					>
						{isSaving ? (
							<ActivityIndicator size='small' color='#18B67A' />
						) : (
							<Text style={styles.cancelText}>Закрыть</Text>
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
		backgroundColor: '#FFFFFF',
		borderRadius: 24,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.12,
		shadowRadius: 10,
		elevation: 6,
	},

	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1F2937',
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
		borderColor: '#E5E7EB',
		backgroundColor: '#F9FAFB',
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},

	optionActive: {
		borderColor: '#18B67A',
		backgroundColor: '#F4FFF9',
	},

	optionLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	iconWrapper: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: '#EAF8F2',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},

	iconWrapperActive: {
		backgroundColor: '#18B67A',
	},

	optionText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
	},

	optionTextActive: {
		color: '#111827',
	},

	cancelButton: {
		height: 48,
		borderRadius: 16,
		backgroundColor: '#F3F4F6',
		alignItems: 'center',
		justifyContent: 'center',
	},

	cancelText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#6B7280',
	},
});
