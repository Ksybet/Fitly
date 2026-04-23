import React, { useContext, useEffect, useState } from 'react';
import {
	Modal,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

const EditFieldModal = ({
	visible,
	title,
	initialValue,
	onSave,
	onCancel,
	keyboardType = 'default',
	isSaving = false,
}) => {
	const { colors, isDark } = useContext(ThemeContext);
	const [value, setValue] = useState(initialValue || '');

	useEffect(() => {
		setValue(initialValue || '');
	}, [initialValue, visible]);

	return (
		<Modal visible={visible} transparent animationType='fade'>
			<KeyboardAvoidingView
				style={styles.overlay}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<View
					style={[
						styles.modal,
						{
							backgroundColor: colors.card,
							shadowColor: colors.shadow,
						},
					]}
				>
					<Text style={[styles.title, { color: colors.text }]}>{title}</Text>

					<TextInput
						style={[
							styles.input,
							{
								borderColor: colors.border,
								backgroundColor: colors.cardSecondary,
								color: colors.text,
							},
						]}
						value={value}
						onChangeText={setValue}
						keyboardType={keyboardType}
						autoFocus
						placeholder='Введите значение'
						placeholderTextColor={colors.textMuted}
						editable={!isSaving}
					/>

					<View style={styles.buttons}>
						<TouchableOpacity
							onPress={onCancel}
							style={[
								styles.button,
								styles.cancelButton,
								{
									backgroundColor: isDark ? colors.cardSecondary : '#F3F4F6',
								},
							]}
							disabled={isSaving}
						>
							<Text
								style={[styles.cancelText, { color: colors.textSecondary }]}
							>
								Отмена
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => onSave(value)}
							style={[
								styles.button,
								styles.saveButton,
								{ backgroundColor: colors.primary },
							]}
							disabled={isSaving}
						>
							{isSaving ? (
								<ActivityIndicator size='small' color='#FFFFFF' />
							) : (
								<Text style={styles.saveText}>Сохранить</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};

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
		marginBottom: 16,
		textAlign: 'center',
	},

	input: {
		height: 52,
		borderWidth: 1,
		borderRadius: 16,
		paddingHorizontal: 16,
		fontSize: 16,
		marginBottom: 20,
	},

	buttons: {
		flexDirection: 'row',
		gap: 12,
	},

	button: {
		flex: 1,
		height: 48,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},

	cancelButton: {},

	saveButton: {},

	cancelText: {
		fontSize: 16,
		fontWeight: '600',
	},

	saveText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FFFFFF',
	},
});

export default EditFieldModal;
