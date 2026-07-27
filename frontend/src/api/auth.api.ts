import httpClient from './httpClient';
import { unwrapData } from './response';
import type {
	ActionResult,
	AuthData,
	AuthTokens,
	SuccessEnvelope,
	User,
} from './contracts';

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

export async function refreshTokens(
	refreshToken: string,
): Promise<AuthTokens> {
	const response = await httpClient.post<SuccessEnvelope<AuthTokens>>(
		'/auth/refresh',
		{ refreshToken },
	);

	return unwrapData(response);
}

export async function logout(
	refreshToken: string,
): Promise<ActionResult> {
	const response = await httpClient.post<SuccessEnvelope<ActionResult>>(
		'/auth/logout',
		{ refreshToken },
	);

	return unwrapData(response);
}

export async function getMe(): Promise<User> {
	const response =
		await httpClient.get<SuccessEnvelope<User>>('/auth/me');

	return unwrapData(response);
}
