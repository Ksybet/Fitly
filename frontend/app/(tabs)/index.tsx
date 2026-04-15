import { Text, Button, ScrollView, View } from 'react-native';
import { useState } from 'react';
import { login, getMe } from '../../src/api/auth.api';
import { getMyProfile, updateMyProfile } from '../../src/api/profile.api';

export default function HomeScreen() {
	const [result, setResult] = useState('Нажми кнопку для проверки API');

	const handleTestApi = async () => {
		try {
			setResult('1) Login...');

			const loginData = await login({
				login: 'user@example.com',
				password: '12345678',
				appVersion: '1.0.0',
			});

			const token = loginData.accessToken;

			setResult(
				`1) Login OK\n\nLOGIN DATA:\n${JSON.stringify(loginData, null, 2)}\n\n2) getMe...`,
			);

			const me = await getMe(token);

			setResult(
				`1) Login OK\n2) getMe OK\n\nME:\n${JSON.stringify(me, null, 2)}\n\n3) getProfile...`,
			);

			const profileBefore = await getMyProfile(token);

			setResult(
				`1) Login OK\n2) getMe OK\n3) getProfile OK\n\nPROFILE BEFORE:\n${JSON.stringify(
					profileBefore,
					null,
					2,
				)}\n\n4) updateProfile...`,
			);

			const updatedProfile = await updateMyProfile(token, {
				firstName: 'Roman',
				lastName: 'Testov',
				birthDate: '2004-05-10',
				gender: 'male',
				heightCm: 180,
			});

			setResult(
				`1) Login OK\n2) getMe OK\n3) getProfile OK\n4) updateProfile OK\n\nUPDATED PROFILE:\n${JSON.stringify(
					updatedProfile,
					null,
					2,
				)}\n\n5) getProfile again...`,
			);

			const profileAfter = await getMyProfile(token);

			setResult(
				`ВСЁ РАБОТАЕТ\n\n` +
					`LOGIN DATA:\n${JSON.stringify(loginData, null, 2)}\n\n` +
					`ME:\n${JSON.stringify(me, null, 2)}\n\n` +
					`PROFILE BEFORE:\n${JSON.stringify(profileBefore, null, 2)}\n\n` +
					`UPDATED PROFILE:\n${JSON.stringify(updatedProfile, null, 2)}\n\n` +
					`PROFILE AFTER:\n${JSON.stringify(profileAfter, null, 2)}`,
			);
		} catch (e: any) {
			console.log('FULL ERROR:', e?.response?.data || e);
			setResult(
				'ERROR:\n' +
					JSON.stringify(
						e?.response?.data || { message: e?.message || 'Unknown error' },
						null,
						2,
					),
			);
		}
	};

	return (
		<ScrollView style={{ flex: 1, backgroundColor: '#ffffff' }}>
			<View style={{ padding: 16 }}>
				<Text style={{ fontSize: 22, marginBottom: 16, color: '#000000' }}>
					API TEST
				</Text>

				<Button title='Проверить API' onPress={handleTestApi} />

				<Text
					selectable
					style={{
						marginTop: 20,
						color: '#000000',
						fontSize: 16,
					}}
				>
					{result}
				</Text>
			</View>
		</ScrollView>
	);
}
