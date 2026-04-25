import React, { useState, useContext, useEffect, useRef } from 'react';
import {
	StyleSheet,
	Text,
	View,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	ScrollView,
	Keyboard,
	Animated,
	LayoutAnimation,
	UIManager,
	Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

if (
	Platform.OS === 'android' &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_CONTAINER_WIDTH = SCREEN_WIDTH - 48;

export default function LoginScreen() {
	const [activeTab, setActiveTab] = useState('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isKeyboardVisible, setKeyboardVisible] = useState(false);

	const tabAnim = useRef(new Animated.Value(0)).current;

	const { token, login, register, isLoading, error, setError } =
		useContext(AuthContext);
	const { colors, isDark } = useContext(ThemeContext);

	useEffect(() => {
		Animated.spring(tabAnim, {
			toValue: activeTab === 'login' ? 0 : 1,
			useNativeDriver: false,
			friction: 8,
			tension: 50,
		}).start();

		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
	}, [activeTab, tabAnim]);

	useEffect(() => {
		const keyboardDidShowListener = Keyboard.addListener(
			'keyboardDidShow',
			() => {
				setKeyboardVisible(true);
			},
		);

		const keyboardDidHideListener = Keyboard.addListener(
			'keyboardDidHide',
			() => {
				setKeyboardVisible(false);
			},
		);

		return () => {
			keyboardDidShowListener.remove();
			keyboardDidHideListener.remove();
		};
	}, []);

	useEffect(() => {
		if (token) {
			router.replace('/home');
		}
	}, [token]);

	if (token) {
		return null;
	}

	const validateEmail = value => {
		return /\S+@\S+\.\S+/.test(value);
	};

	const handleSubmit = () => {
		setError('');

		if (!email.trim() || !password.trim()) {
			setError('Пожалуйста, заполните все поля');
			return;
		}

		if (!validateEmail(email.trim())) {
			setError('Введите корректный email');
			return;
		}

		if (password.trim().length < 8) {
			setError('Пароль должен содержать минимум 8 символов');
			return;
		}

		if (activeTab === 'register') {
			if (!confirmPassword.trim()) {
				setError('Пожалуйста, подтвердите пароль');
				return;
			}

			if (password !== confirmPassword) {
				setError('Пароли не совпадают');
				return;
			}

			register(email.trim(), password);
		} else {
			login(email.trim(), password);
		}
	};

	return (
		<SafeAreaView
			style={[styles.safeArea, { backgroundColor: colors.background }]}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				style={styles.container}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps='handled'
				>
					<View style={styles.content}>
						<View style={styles.logoContainer}>
							<Text
								style={[
									styles.logoText,
									{
										color: colors.primary,
										textShadowColor: isDark
											? 'rgba(52, 211, 153, 0.18)'
											: 'rgba(0, 208, 132, 0.2)',
									},
								]}
							>
								Fitly
							</Text>

							<Text style={[styles.subtitleText, { color: colors.textMuted }]}>
								Трекер здоровья и привычек{'\n'}для осознанного контроля
							</Text>
						</View>

						<View
							style={[
								styles.tabsContainer,
								{
									backgroundColor: colors.cardSecondary,
									borderColor: colors.border,
								},
							]}
						>
							<Animated.View
								style={[
									styles.tabSlider,
									{
										width: '56%',
										backgroundColor: colors.card,
										shadowColor: colors.shadow,
										left: tabAnim.interpolate({
											inputRange: [0, 1],
											outputRange: [4, TAB_CONTAINER_WIDTH * 0.44 - 4],
										}),
									},
								]}
							/>

							<TouchableOpacity
								style={[
									styles.tab,
									{ flex: activeTab === 'login' ? 1.2 : 0.8 },
								]}
								onPress={() => {
									setActiveTab('login');
									setError('');
								}}
								activeOpacity={1}
							>
								<Text
									style={[
										styles.tabText,
										{ color: colors.textMuted },
										activeTab === 'login' && [
											styles.activeTabText,
											{ color: colors.text },
										],
									]}
								>
									Вход
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.tab,
									{ flex: activeTab === 'register' ? 1.2 : 0.8 },
								]}
								onPress={() => {
									setActiveTab('register');
									setError('');
								}}
								activeOpacity={1}
							>
								<Text
									style={[
										styles.tabText,
										{ color: colors.textMuted },
										activeTab === 'register' && [
											styles.activeTabText,
											{ color: colors.text },
										],
									]}
								>
									Регистрация
								</Text>
							</TouchableOpacity>
						</View>

						{error ? <Text style={styles.errorText}>{error}</Text> : null}

						<View style={styles.inputContainer}>
							<TextInput
								style={[
									styles.input,
									{
										backgroundColor: colors.card,
										borderColor: colors.border,
										color: colors.text,
									},
								]}
								placeholder='Email'
								placeholderTextColor={colors.textMuted}
								value={email}
								onChangeText={text => {
									setEmail(text);
									setError('');
								}}
								autoCapitalize='none'
								keyboardType='email-address'
							/>

							<TextInput
								style={[
									styles.input,
									styles.inputSpacing,
									{
										backgroundColor: colors.card,
										borderColor: colors.border,
										color: colors.text,
									},
								]}
								placeholder='Пароль'
								placeholderTextColor={colors.textMuted}
								value={password}
								onChangeText={text => {
									setPassword(text);
									setError('');
								}}
								secureTextEntry
							/>

							{activeTab === 'register' && (
								<TextInput
									style={[
										styles.input,
										styles.inputSpacing,
										{
											backgroundColor: colors.card,
											borderColor: colors.border,
											color: colors.text,
										},
									]}
									placeholder='Подтвердите пароль'
									placeholderTextColor={colors.textMuted}
									value={confirmPassword}
									onChangeText={text => {
										setConfirmPassword(text);
										setError('');
									}}
									secureTextEntry
								/>
							)}
						</View>

						<TouchableOpacity
							style={[styles.submitButton, { backgroundColor: colors.primary }]}
							onPress={handleSubmit}
							disabled={isLoading}
							activeOpacity={0.8}
						>
							{isLoading ? (
								<ActivityIndicator color='#fff' />
							) : (
								<Text style={styles.submitButtonText}>Продолжить</Text>
							)}
						</TouchableOpacity>

						{activeTab === 'login' && (
							<TouchableOpacity style={styles.forgotPasswordContainer}>
								<Text
									style={[
										styles.forgotPasswordText,
										{ color: colors.textMuted },
									]}
								>
									Забыли пароль?
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			{!isKeyboardVisible && (
				<View
					style={[
						styles.footerContainer,
						{ backgroundColor: colors.background },
					]}
				>
					<View
						style={[styles.separator, { backgroundColor: colors.border }]}
					/>

					<Text style={[styles.footerText, { color: colors.textMuted }]}>
						Продолжая, вы соглашаетесь с{'\n'}условиями и политикой
						конфиденциальности.
					</Text>
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	container: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
	},
	content: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 60,
	},
	logoContainer: {
		alignItems: 'center',
		marginBottom: 40,
	},
	logoText: {
		fontSize: 48,
		fontWeight: '700',
		marginBottom: 16,
		textShadowOffset: { width: 0, height: 4 },
		textShadowRadius: 10,
	},
	subtitleText: {
		fontSize: 14,
		textAlign: 'center',
		lineHeight: 20,
		fontWeight: '500',
	},
	tabsContainer: {
		flexDirection: 'row',
		borderRadius: 25,
		padding: 4,
		marginBottom: 24,
		position: 'relative',
		borderWidth: 1,
	},
	tab: {
		paddingVertical: 12,
		alignItems: 'center',
		zIndex: 1,
	},
	tabSlider: {
		position: 'absolute',
		top: 4,
		bottom: 4,
		borderRadius: 21,
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.12,
		shadowRadius: 6,
		elevation: 2,
	},
	tabText: {
		fontSize: 15,
		fontWeight: '600',
	},
	activeTabText: {},

	inputContainer: {
		marginBottom: 24,
	},
	input: {
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 16,
		fontSize: 16,
	},
	inputSpacing: {
		marginTop: 16,
	},
	errorText: {
		color: '#FF3B30',
		fontSize: 14,
		marginBottom: 16,
		textAlign: 'center',
	},
	submitButton: {
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		marginBottom: 24,
	},
	submitButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	forgotPasswordContainer: {
		alignItems: 'center',
	},
	forgotPasswordText: {
		fontSize: 15,
	},
	footerContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 24,
		paddingBottom: 20,
		alignItems: 'center',
	},
	separator: {
		width: '100%',
		height: 1,
		marginBottom: 16,
	},
	footerText: {
		fontSize: 12,
		textAlign: 'center',
		lineHeight: 18,
	},
});
