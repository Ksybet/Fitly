import React, { useEffect, useState } from 'react';
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
	ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const EditDateModal = ({
	visible,
	initialDate,
	onSave,
	onCancel,
	isSaving = false,
}) => {
	const [selectedDate, setSelectedDate] = useState(
		initialDate ? new Date(initialDate) : new Date('2000-01-01'),
	);
	const [showPicker, setShowPicker] = useState(false);

	useEffect(() => {
		const nextDate =
			initialDate && !Number.isNaN(new Date(initialDate).getTime())
				? new Date(initialDate)
				: new Date('2000-01-01');

		setSelectedDate(nextDate);
		setShowPicker(false);
	}, [initialDate, visible]);

	const onChange = (event, date) => {
		if (Platform.OS === 'android') {
			setShowPicker(false);
		}

		if (date) {
			setSelectedDate(date);
		}
	};

	const formatDate = date => {
		return date.toISOString().split('T')[0];
	};

	return (
		<Modal visible={visible} transparent animationType='fade'>
			<View style={styles.overlay}>
				<View style={styles.modal}>
					<Text style={styles.title}>Дата рождения</Text>

					<TouchableOpacity
						style={styles.dateButton}
						onPress={() => setShowPicker(true)}
						disabled={isSaving}
						activeOpacity={0.8}
					>
						<Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
					</TouchableOpacity>

					{showPicker && (
						<DateTimePicker
							value={selectedDate}
							mode='date'
							display='default'
							onChange={onChange}
							maximumDate={new Date()}
						/>
					)}

					<View style={styles.buttons}>
						<TouchableOpacity
							onPress={onCancel}
							style={[styles.button, styles.cancelButton]}
							disabled={isSaving}
						>
							<Text style={styles.cancelText}>Отмена</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => onSave(formatDate(selectedDate))}
							style={[styles.button, styles.saveButton]}
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
			</View>
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
		marginBottom: 16,
		textAlign: 'center',
	},

	dateButton: {
		height: 52,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 16,
		paddingHorizontal: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F9FAFB',
		marginBottom: 20,
	},

	dateText: {
		fontSize: 16,
		color: '#1F2937',
		fontWeight: '500',
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

	cancelButton: {
		backgroundColor: '#F3F4F6',
	},

	saveButton: {
		backgroundColor: '#18B67A',
	},

	cancelText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#6B7280',
	},

	saveText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FFFFFF',
	},
});

export default EditDateModal;
