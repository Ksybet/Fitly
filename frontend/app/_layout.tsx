import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider, ThemeContext } from '../src/context/ThemeContext';

function AppNavigator() {
	const { colors } = useContext(ThemeContext);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack
				screenOptions={{
					headerShown: false,
					animation: 'fade',
					animationDuration: 220,
					contentStyle: {
						backgroundColor: colors.background,
					},
				}}
			>
				<Stack.Screen name='index' />
				<Stack.Screen name='login' />
				<Stack.Screen name='home' />
				<Stack.Screen name='profile' />
				<Stack.Screen name='personal-data' />
				<Stack.Screen name='settings' />
				<Stack.Screen name='goals' />
				<Stack.Screen name='sleep' />
				<Stack.Screen name='mood' />
				<Stack.Screen name='favorites' />
			</Stack>
		</View>
	);
}

export default function RootLayout() {
	return (
		<AuthProvider>
			<ThemeProvider>
				<AppNavigator />
			</ThemeProvider>
		</AuthProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
