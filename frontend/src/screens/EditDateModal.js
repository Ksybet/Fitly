import React, { useContext, useEffect, useState } from 'react';
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemeContext } from '../context/ThemeContext';

const EditDateModal = ({
	visible,
	initialDate,
	onSave,
	onCancel,
	isSaving = false,
}) => {
	const { colors } = useContext(ThemeContext);

	const [date, setDate] = useState(new Date());

	useEffect(() => {
		if (initialDate) {
			const parsed = new Date(initialDate);
			if (!isNaN(parsed.getTime())) {
				setDate(parsed);
			}
		}
	}, [initialDate, visible]);

	const handleChange = (event, selectedDate) => {
		if (selectedDate) {
			setDate(selectedDate);
		}
	};

	const handleSave = () => {
		const isoDate = date.toISOString().split('T')[0];
		onSave(isoDate);
	};

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
						Выберите дату
					</Text>

					<View style={styles.pickerWrapper}>
						<DateTimePicker
							value={date}
							mode='date'
							display={Platform.OS === 'ios' ? 'spinner' : 'default'}
							onChange={handleChange}
							themeVariant={colors.background === '#0F172A' ? 'dark' : 'light'}
						/>
					</View>

					<View style={styles.buttons}>
						<TouchableOpacity
							onPress={onCancel}
							style={[
								styles.button,
								styles.cancelButton,
								{ backgroundColor: colors.cardSecondary },
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
							onPress={handleSave}
							style={[
								styles.button,
								styles.saveButton,
								{ backgroundColor: colors.primary },
							]}
							disabled={isSaving}
						>
							{isSaving ? (
								<ActivityIndicator size='small' color='#fff' />
							) : (
								<Text style={styles.saveText}>Сохранить</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.35)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},

	modal: {
		borderRadius: 24,
		padding: 20,
		elevation: 6,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.12,
		shadowRadius: 10,
	},

	title: {
		fontSize: 18,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 16,
	},

	pickerWrapper: {
		alignItems: 'center',
		marginBottom: 16,
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

export default EditDateModal;
