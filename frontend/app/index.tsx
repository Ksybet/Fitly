import React, { useContext } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { AuthContext } from '../src/context/AuthContext';

export default function Index() {
	const { token, isLoading } = useContext(AuthContext);

	if (isLoading) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size='large' color='#20C07A' />
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
		backgroundColor: '#FFFFFF',
		justifyContent: 'center',
		alignItems: 'center',
	},
});
