import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
	AuthData,
	AuthTokens,
	StoredAuthSession,
	User,
} from './contracts';

const SESSION_KEY = 'fitly_auth_session';
const LEGACY_TOKEN_KEY = 'userToken';
const LEGACY_PROFILE_KEY = 'profile';
let sessionMutationQueue: Promise<void> = Promise.resolve();

function runSessionMutation<T>(mutation: () => Promise<T>): Promise<T> {
	const result = sessionMutationQueue.then(mutation, mutation);

	sessionMutationQueue = result.then(
		() => undefined,
		() => undefined,
	);

	return result;
}

function isStoredSession(value: unknown): value is StoredAuthSession {
	if (!value || typeof value !== 'object') return false;

	const session = value as Partial<StoredAuthSession>;
	return (
		typeof session.token === 'string' &&
		typeof session.refreshToken === 'string' &&
		session.tokenType === 'Bearer' &&
		typeof session.expiresIn === 'number' &&
		typeof session.expiresAt === 'number' &&
		!!session.user &&
		typeof session.user.id === 'number'
	);
}

export async function getStoredSession(): Promise<StoredAuthSession | null> {
	const rawSession = await AsyncStorage.getItem(SESSION_KEY);

	if (rawSession) {
		try {
			const parsed: unknown = JSON.parse(rawSession);
			if (isStoredSession(parsed)) return parsed;
		} catch {
			await AsyncStorage.removeItem(SESSION_KEY);
		}
	}

	const legacyToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
	if (!legacyToken) return null;

	return {
		token: legacyToken,
		refreshToken: '',
		tokenType: 'Bearer',
		expiresIn: 0,
		expiresAt: 0,
		user: {
			id: 0,
			email: '',
			role: 'user',
			status: 'active',
			emailVerified: false,
			appVersion: null,
			createdAt: new Date(0).toISOString(),
		},
	};
}

export async function saveAuthSession(
	authData: AuthData,
): Promise<StoredAuthSession> {
	return runSessionMutation(async () => {
		const session: StoredAuthSession = {
			...authData,
			expiresAt: Date.now() + authData.expiresIn * 1000,
		};

		await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
		await AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_PROFILE_KEY]);

		return session;
	});
}

export async function saveRefreshedTokens(
	tokens: AuthTokens,
	expectedRefreshToken: string,
): Promise<StoredAuthSession | null> {
	return runSessionMutation(async () => {
		const currentSession = await getStoredSession();

		if (
			!currentSession
			|| currentSession.refreshToken !== expectedRefreshToken
		) {
			return null;
		}

		const nextSession: StoredAuthSession = {
			...currentSession,
			...tokens,
			expiresAt: Date.now() + tokens.expiresIn * 1000,
		};

		await AsyncStorage.setItem(
			SESSION_KEY,
			JSON.stringify(nextSession),
		);

		return nextSession;
	});
}

export async function updateStoredUser(user: User): Promise<void> {
	await runSessionMutation(async () => {
		const session = await getStoredSession();
		if (!session) return;

		await AsyncStorage.setItem(
			SESSION_KEY,
			JSON.stringify({
				...session,
				user,
			}),
		);
	});
}

export async function clearStoredSession(): Promise<void> {
	await runSessionMutation(async () => {
		await AsyncStorage.multiRemove([
			SESSION_KEY,
			LEGACY_TOKEN_KEY,
			LEGACY_PROFILE_KEY,
		]);
	});
}
