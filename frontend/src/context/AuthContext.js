import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import httpClient from '../api/httpClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [token, setToken] = useState(null);
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const loadSession = async () => {
			try {
				const storedToken = await AsyncStorage.getItem('userToken');

				if (storedToken) {
					setToken(storedToken);
					httpClient.defaults.headers.common['Authorization'] =
						`Bearer ${storedToken}`;
				}
			} catch (e) {
				console.error('Ошибка загрузки сессии', e);
			} finally {
				setIsLoading(false);
			}
		};

		loadSession();
	}, []);

	const translateError = message => {
		const translations = {
			'Invalid credentials': 'Неверный email или пароль',
			'User account is inactive': 'Аккаунт деактивирован',
			'User already exists': 'Пользователь с таким email уже зарегистрирован',
			'Too many requests': 'Слишком много попыток. Попробуйте позже',
			Unauthorized: 'Необходима авторизация',
		};

		return translations[message] || message || 'Произошла ошибка';
	};

	const login = async (loginId, password) => {
		setIsLoading(true);
		setError('');

		try {
			const response = await httpClient.post('/auth/login', {
				login: loginId,
				password,
				appVersion: '1.0.0',
			});

			if (response?.data?.data?.accessToken) {
				const accessToken = response.data.data.accessToken;
				const userData = response.data.data.user;

				await AsyncStorage.setItem('userToken', accessToken);

				setToken(accessToken);
				setUser(userData);

				httpClient.defaults.headers.common['Authorization'] =
					`Bearer ${accessToken}`;
			} else {
				setError('Некорректный ответ сервера');
			}
		} catch (e) {
			if (e?.response?.data?.message) {
				setError(translateError(e.response.data.message));
			} else {
				setError('Произошла ошибка при соединении с сервером');
			}
		} finally {
			setIsLoading(false);
		}
	};

	const register = async (email, password) => {
		setIsLoading(true);
		setError('');

		try {
			const response = await httpClient.post('/auth/register', {
				email,
				password,
				appVersion: '1.0.0',
			});

			if (response?.data?.data?.accessToken) {
				const accessToken = response.data.data.accessToken;
				const userData = response.data.data.user;

				await AsyncStorage.setItem('userToken', accessToken);

				setToken(accessToken);
				setUser(userData);

				httpClient.defaults.headers.common['Authorization'] =
					`Bearer ${accessToken}`;
			} else {
				setError('Некорректный ответ сервера при регистрации');
			}
		} catch (e) {
			if (e?.response?.data?.message) {
				setError(translateError(e.response.data.message));
			} else {
				setError('Произошла ошибка при соединении с сервером');
			}
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async () => {
		try {
			await AsyncStorage.removeItem('userToken');
			setToken(null);
			setUser(null);
			setError('');
			delete httpClient.defaults.headers.common['Authorization'];
		} catch (e) {
			console.error('Ошибка при выходе', e);
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
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
