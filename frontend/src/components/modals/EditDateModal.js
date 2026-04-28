import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	ScrollView,
} from 'react-native';
import { ThemeContext } from '../../context/ThemeContext';

const months = [
	'Январь',
	'Февраль',
	'Март',
	'Апрель',
	'Май',
	'Июнь',
	'Июль',
	'Август',
	'Сентябрь',
	'Октябрь',
	'Ноябрь',
	'Декабрь',
];

const currentYear = new Date().getFullYear();

const getDaysInMonth = (month, year) => {
	return new Date(year, month, 0).getDate();
};

const EditDateModal = ({
	visible,
	initialDate,
	onSave,
	onCancel,
	isSaving = false,
}) => {
	const { colors } = useContext(ThemeContext);

	const [day, setDay] = useState(1);
	const [month, setMonth] = useState(1);
	const [year, setYear] = useState(2000);

	useEffect(() => {
		if (initialDate) {
			const [parsedYear, parsedMonth, parsedDay] = initialDate
				.split('-')
				.map(Number);

			if (parsedYear && parsedMonth && parsedDay) {
				setYear(parsedYear);
				setMonth(parsedMonth);
				setDay(parsedDay);
			}
		}
	}, [initialDate, visible]);

	const days = useMemo(() => {
		const count = getDaysInMonth(month, year);
		return Array.from({ length: count }, (_, index) => index + 1);
	}, [month, year]);

	const years = useMemo(() => {
		return Array.from({ length: 101 }, (_, index) => currentYear - index);
	}, []);

	useEffect(() => {
		const maxDay = getDaysInMonth(month, year);
		if (day > maxDay) {
			setDay(maxDay);
		}
	}, [month, year]);

	const handleSave = () => {
		const formattedDay = String(day).padStart(2, '0');
		const formattedMonth = String(month).padStart(2, '0');

		onSave(`${year}-${formattedMonth}-${formattedDay}`);
	};

	const renderOption = (label, active, onPress) => (
		<TouchableOpacity
			key={label}
			onPress={onPress}
			style={[
				styles.option,
				{
					backgroundColor: active ? colors.primary : colors.cardSecondary,
				},
			]}
		>
			<Text
				style={[
					styles.optionText,
					{
						color: active ? '#FFFFFF' : colors.text,
					},
				]}
			>
				{label}
			</Text>
		</TouchableOpacity>
	);

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

					<View style={styles.columns}>
						<View style={styles.column}>
							<Text
								style={[styles.columnTitle, { color: colors.textSecondary }]}
							>
								День
							</Text>
							<ScrollView
								style={styles.list}
								showsVerticalScrollIndicator={false}
							>
								{days.map(item =>
									renderOption(item, item === day, () => setDay(item)),
								)}
							</ScrollView>
						</View>

						<View style={styles.column}>
							<Text
								style={[styles.columnTitle, { color: colors.textSecondary }]}
							>
								Месяц
							</Text>
							<ScrollView
								style={styles.list}
								showsVerticalScrollIndicator={false}
							>
								{months.map((item, index) =>
									renderOption(item, index + 1 === month, () =>
										setMonth(index + 1),
									),
								)}
							</ScrollView>
						</View>

						<View style={styles.column}>
							<Text
								style={[styles.columnTitle, { color: colors.textSecondary }]}
							>
								Год
							</Text>
							<ScrollView
								style={styles.list}
								showsVerticalScrollIndicator={false}
							>
								{years.map(item =>
									renderOption(item, item === year, () => setYear(item)),
								)}
							</ScrollView>
						</View>
					</View>

					<View style={styles.buttons}>
						<TouchableOpacity
							onPress={onCancel}
							style={[styles.button, { backgroundColor: colors.cardSecondary }]}
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
							style={[styles.button, { backgroundColor: colors.primary }]}
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

	columns: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 16,
	},

	column: {
		flex: 1,
	},

	columnTitle: {
		fontSize: 13,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 8,
	},

	list: {
		maxHeight: 190,
	},

	option: {
		minHeight: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
		paddingHorizontal: 6,
	},

	optionText: {
		fontSize: 14,
		fontWeight: '600',
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
