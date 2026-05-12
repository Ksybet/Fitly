import React, { createContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import httpClient from '../api/httpClient';

type User = {
	userId?: string;
	id?: string;
	email?: string;
	name?: string;
	firstName?: string;
	lastName?: string;
	birthDate?: string;
	weightKg?: number;
	heightCm?: number;
	gender?: string;
	role?: string;
	appVersion?: string;
};

type AuthContextType = {
	token: string | null;
	user: User | null;
	isLoading: boolean;
	error: string;
	login: (loginId: string, password: string) => Promise<void>;
	register: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	setError: React.Dispatch<React.SetStateAction<string>>;
	updateUserData: (data: Partial<User>) => void;
};

type Props = {
	children: ReactNode;
};

export const AuthContext = createContext<AuthContextType>({
	token: null,
	user: null,
	isLoading: true,
	error: '',
	login: async () => {},
	register: async () => {},
	logout: async () => {},
	setError: () => {},
	updateUserData: () => {},
});

export const AuthProvider = ({ children }: Props) => {
	const [token, setToken] = useState<string | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string>('');

	const clearSession = async () => {
		await AsyncStorage.removeItem('userToken');
		await AsyncStorage.removeItem('profile');

		setToken(null);
		setUser(null);
		setError('');

		delete httpClient.defaults.headers.common.Authorization;
	};

	useEffect(() => {
		const loadSession = async () => {
			try {
				const storedToken = await AsyncStorage.getItem('userToken');

				if (!storedToken) {
					setIsLoading(false);
					return;
				}

				httpClient.defaults.headers.common.Authorization = `Bearer ${storedToken}`;

				try {
					const response = await httpClient.get('/auth/me');

					setToken(storedToken);
					setUser(response?.data?.data?.user || null);
				} catch (e: any) {
					console.log('SESSION ERROR:', e?.message);
					console.log('SESSION RESPONSE:', e?.response?.data);

					if (e?.response?.status === 401) {
						await clearSession();
					} else {
						await clearSession();
					}
				}
			} catch (e: any) {
				console.log('LOAD SESSION ERROR:', e?.message);
				await clearSession();
			} finally {
				setIsLoading(false);
			}
		};

		loadSession();
	}, []);

	const updateUserData = (data: Partial<User>) => {
		setUser(prev => ({
			...(prev || {}),
			...data,
		}));
	};

	const translateError = (message?: string): string => {
		const translations: Record<string, string> = {
			'Invalid credentials': 'Неверный email или пароль',
			'User account is inactive': 'Аккаунт деактивирован',
			'User already exists': 'Пользователь с таким email уже зарегистрирован',
			'Too many requests': 'Слишком много попыток. Попробуйте позже',
			Unauthorized: 'Необходима авторизация',
		};

		return translations[message || ''] || message || 'Произошла ошибка';
	};

	const login = async (loginId: string, password: string): Promise<void> => {
		setIsLoading(true);
		setError('');

		try {
			console.log('LOGIN REQUEST START');

			const response = await httpClient.post('/auth/login', {
				login: loginId,
				password,
				appVersion: '1.0.0',
			});

			console.log('LOGIN RESPONSE:', response?.data);

			if (response?.data?.data?.accessToken) {
				const accessToken: string = response.data.data.accessToken;
				const userData: User = response.data.data.user;

				await AsyncStorage.setItem('userToken', accessToken);

				httpClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

				setToken(accessToken);
				setUser(userData);

				console.log('LOGIN SUCCESS');
			} else {
				setError('Некорректный ответ сервера');
			}
		} catch (e: any) {
			console.log('LOGIN ERROR MESSAGE:', e?.message);
			console.log('LOGIN ERROR RESPONSE:', e?.response?.data);
			console.log('LOGIN ERROR STATUS:', e?.response?.status);

			if (e?.response?.data?.message) {
				setError(translateError(e.response.data.message));
			} else {
				setError(`Ошибка соединения: ${e?.message || 'unknown error'}`);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const register = async (email: string, password: string): Promise<void> => {
		setIsLoading(true);
		setError('');

		try {
			console.log('REGISTER REQUEST START');

			const response = await httpClient.post('/auth/register', {
				email,
				password,
				appVersion: '1.0.0',
			});

			console.log('REGISTER RESPONSE:', response?.data);

			if (response?.data?.data?.accessToken) {
				const accessToken: string = response.data.data.accessToken;
				const userData: User = response.data.data.user;

				await AsyncStorage.setItem('userToken', accessToken);

				httpClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

				setToken(accessToken);
				setUser(userData);

				console.log('REGISTER SUCCESS');
			} else {
				setError('Некорректный ответ сервера при регистрации');
			}
		} catch (e: any) {
			console.log('REGISTER ERROR MESSAGE:', e?.message);
			console.log('REGISTER ERROR RESPONSE:', e?.response?.data);
			console.log('REGISTER ERROR STATUS:', e?.response?.status);

			if (e?.response?.data?.message) {
				setError(translateError(e.response.data.message));
			} else {
				setError(`Ошибка соединения: ${e?.message || 'unknown error'}`);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async (): Promise<void> => {
		try {
			await clearSession();
			router.replace('/login');
		} catch (e: any) {
			console.log('LOGOUT ERROR:', e?.message);
		}
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
				updateUserData,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
