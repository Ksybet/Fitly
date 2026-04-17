import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
	return (
		<AuthProvider>
			<Stack
				screenOptions={{
					headerShown: false,
					animation: 'fade',
				}}
			>
				<Stack.Screen name='index' />
				<Stack.Screen name='login' />
				<Stack.Screen name='home' />
				<Stack.Screen name='profile' />
				<Stack.Screen name='personal-data' />
			</Stack>
		</AuthProvider>
	);
}
