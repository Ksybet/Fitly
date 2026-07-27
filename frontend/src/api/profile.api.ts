import httpClient from './httpClient';
import { unwrapData } from './response';
import type {
	ActionResult,
	Profile,
	SuccessEnvelope,
	UpdateProfileRequest,
} from './contracts';

export async function getMyProfile(): Promise<Profile> {
	const response =
		await httpClient.get<SuccessEnvelope<Profile>>('/profile');

	return unwrapData(response);
}

export async function updateMyProfile(
	profileData: UpdateProfileRequest,
): Promise<Profile> {
	const response = await httpClient.put<SuccessEnvelope<Profile>>(
		'/profile',
		profileData,
	);

	return unwrapData(response);
}

export async function deleteMyAccount(
	password: string,
): Promise<ActionResult> {
	const response = await httpClient.delete<SuccessEnvelope<ActionResult>>(
		'/account',
		{
			data: {
				password,
				confirmation: 'DELETE',
			},
		},
	);

	return unwrapData(response);
}
