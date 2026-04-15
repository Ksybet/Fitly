import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../src/context/AuthContext';
import { router } from 'expo-router';

export default function HomeScreen() {
	const { user, logout } = useContext(AuthContext);

	const handleLogout = async () => {
		await logout();
		router.replace('/login');
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.logo}>Fitly</Text>
			</View>

			<View style={styles.greeting}>
				<Text style={styles.greetingText}>
					Привет, {user?.email || 'пользователь'}!
				</Text>
				<Text style={styles.subText}>Вот твои показатели на сегодня</Text>
			</View>

			<View style={styles.cards}>
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Шаги</Text>
					<Text style={styles.cardValue}>0</Text>
				</View>

				<View style={styles.card}>
					<Text style={styles.cardTitle}>Сон</Text>
					<Text style={styles.cardValue}>0 ч</Text>
				</View>

				<View style={styles.card}>
					<Text style={styles.cardTitle}>Калории</Text>
					<Text style={styles.cardValue}>0</Text>
				</View>
			</View>

			<TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
				<Text style={styles.logoutText}>Выйти</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F7F8FA',
		padding: 20,
	},
	header: {
		alignItems: 'center',
		marginBottom: 20,
		marginTop: 20,
	},
	logo: {
		fontSize: 28,
		fontWeight: '700',
		color: '#00D084',
	},
	greeting: {
		marginBottom: 20,
	},
	greetingText: {
		fontSize: 22,
		fontWeight: '600',
		marginBottom: 6,
	},
	subText: {
		color: '#7A7A7A',
	},
	cards: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20,
	},
	card: {
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 12,
		width: '30%',
		alignItems: 'center',
	},
	cardTitle: {
		fontSize: 12,
		color: '#7A7A7A',
	},
	cardValue: {
		fontSize: 18,
		fontWeight: '600',
		marginTop: 6,
	},
	logoutBtn: {
		marginTop: 20,
		backgroundColor: '#00D084',
		padding: 14,
		borderRadius: 10,
		alignItems: 'center',
	},
	logoutText: {
		color: '#fff',
		fontWeight: '600',
	},
});
