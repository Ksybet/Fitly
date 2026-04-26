import React, { useContext } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { AuthContext } from '../src/context/AuthContext';
import { ThemeContext } from '../src/context/ThemeContext';

export default function Index() {
	const { token, isLoading } = useContext(AuthContext);
	const { colors } = useContext(ThemeContext);

	if (isLoading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ActivityIndicator size='large' color={colors.primary} />
			</View>
		);
	}

	if (token) {
		return <Redirect href='/home' />;
	}

	return <Redirect href='/login' />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
