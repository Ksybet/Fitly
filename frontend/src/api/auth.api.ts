import httpClient from './httpClient';
import { unwrapData } from './response';
import type { AuthData, SuccessEnvelope, User } from './contracts';

type LoginRequest = {
	login: string;
	password: string;
	appVersion?: string;
};

type RegisterRequest = {
	email: string;
	password: string;
	passwordConfirmation?: string;
	appVersion?: string;
};

export async function login(payload: LoginRequest): Promise<AuthData> {
	const response = await httpClient.post<SuccessEnvelope<AuthData>>(
		'/auth/login',
		payload,
	);

	return unwrapData(response);
}

export async function register(payload: RegisterRequest): Promise<AuthData> {
	const response = await httpClient.post<SuccessEnvelope<AuthData>>(
		'/auth/register',
		payload,
	);

	return unwrapData(response);
}

export async function getMe(): Promise<User> {
	const response =
		await httpClient.get<SuccessEnvelope<User>>('/auth/me');

	return unwrapData(response);
}
