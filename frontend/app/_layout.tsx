import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
	return (
		<AuthProvider>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name='login' />
				<Stack.Screen name='(tabs)' />
				<Stack.Screen name='+not-found' />
			</Stack>
		</AuthProvider>
	);
}
