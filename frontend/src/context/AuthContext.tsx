import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, {
	createContext,
	ReactNode,
	useCallback,
	useEffect,
	useState,
} from 'react';
import {
	getMe,
	login as loginRequest,
	register as registerRequest,
} from '../api/auth.api';
import {
	getApiErrorMessage,
	normalizeApiError,
	withRequestId,
} from '../api/api-error';
import type { User } from '../api/contracts';
import { setUnauthorizedHandler } from '../api/httpClient';
import {
	clearStoredSession,
	getStoredSession,
	saveAuthSession,
	updateStoredUser,
} from '../api/session.storage';

type AuthContextType = {
	token: string | null;
	user: User | null;
	isLoading: boolean;
	error: string;
	login: (loginId: string, password: string) => Promise<void>;
	register: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	setError: React.Dispatch<React.SetStateAction<string>>;
};

type Props = {
	children: ReactNode;
};

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const AuthContext = createContext<AuthContextType>({
	token: null,
	user: null,
	isLoading: true,
	error: '',
	login: async () => {},
	register: async () => {},
	logout: async () => {},
	setError: () => {},
});

function getAuthenticationErrorMessage(
	error: unknown,
	mode: 'login' | 'register',
): string {
	const apiError = normalizeApiError(error);
	const translations: Partial<Record<string, string>> = {
		INVALID_CREDENTIALS: 'Неверный email или пароль',
		UNAUTHORIZED: 'Не удалось выполнить авторизацию',
		VALIDATION_ERROR: 'Проверьте введённые данные',
		RATE_LIMIT_EXCEEDED:
			'Слишком много попыток. Попробуйте повторить позже',
		SERVICE_UNAVAILABLE: 'Сервис временно недоступен',
		INTERNAL_ERROR: 'Сервис временно недоступен',
	};

	if (mode === 'register' && apiError.code === 'STATE_CONFLICT') {
		return withRequestId(
			'Пользователь с таким email уже зарегистрирован',
			apiError.requestId,
		);
	}

	return getApiErrorMessage(
		apiError,
		mode === 'login'
			? 'Не удалось выполнить вход'
			: 'Не удалось зарегистрироваться',
		translations,
	);
}

export const AuthProvider = ({ children }: Props) => {
	const [token, setToken] = useState<string | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	const clearSession = useCallback(async () => {
		await clearStoredSession();
		setToken(null);
		setUser(null);
		setError('');
	}, []);

	useEffect(() => {
		setUnauthorizedHandler(async () => {
			await clearSession();
			router.replace('/login');
		});

		return () => setUnauthorizedHandler(null);
	}, [clearSession]);

	useEffect(() => {
		let isMounted = true;

		const loadSession = async () => {
			try {
				const storedSession = await getStoredSession();

				if (!storedSession) return;

				if (isMounted) {
					setToken(storedSession.token);
					setUser(storedSession.user.id > 0 ? storedSession.user : null);
				}

				try {
					const currentUser = await getMe();
					await updateStoredUser(currentUser);

					if (isMounted) {
						setToken(storedSession.token);
						setUser(currentUser);
					}
				} catch (sessionError) {
					const apiError = normalizeApiError(sessionError);

					if (apiError.status === 401) {
						await clearSession();
					}
				}
			} catch {
				await clearSession();
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};

		void loadSession();

		return () => {
			isMounted = false;
		};
	}, [clearSession]);

	const login = async (loginId: string, password: string): Promise<void> => {
		setIsLoading(true);
		setError('');

		try {
			const authData = await loginRequest({
				login: loginId,
				password,
				appVersion: APP_VERSION,
			});

			await saveAuthSession(authData);
			setToken(authData.token);
			setUser(authData.user);
		} catch (requestError) {
			setError(getAuthenticationErrorMessage(requestError, 'login'));
		} finally {
			setIsLoading(false);
		}
	};

	const register = async (
		email: string,
		password: string,
	): Promise<void> => {
		setIsLoading(true);
		setError('');

		try {
			const authData = await registerRequest({
				email,
				password,
				passwordConfirmation: password,
				appVersion: APP_VERSION,
			});

			await saveAuthSession(authData);
			setToken(authData.token);
			setUser(authData.user);
		} catch (requestError) {
			setError(getAuthenticationErrorMessage(requestError, 'register'));
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async (): Promise<void> => {
		await clearSession();
		router.replace('/login');
	};

	return (
		<AuthContext.Provider
			value={{
				token,
				user,
				isLoading,
				error,
				login,
				register,
				logout,
				setError,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
