import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import * as AppleAuthentication from 'expo-apple-authentication';
import { clearAllStorage, debugAsyncStorage } from '../utils/clearStorage';

export const AuthScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { login, register, loginAsGuest } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  useEffect(() => {
    checkAppleAuthAvailability();
  }, []);

  const checkAppleAuthAvailability = async () => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setIsAppleAuthAvailable(isAvailable);
    } catch (error) {
      console.log('Apple Auth check error:', error);
    }
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAuth = async () => {
    // Валидация
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
      return;
    }

    if (!isLogin) {
      if (!name) {
        Alert.alert('Ошибка', 'Введите имя');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Ошибка', 'Пароли не совпадают');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Вход через Firebase
        await login(email, password);
      } else {
        // Регистрация через Firebase
        await register(email, password, name);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Ошибка', error.message || 'Произошла ошибка при авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      Alert.alert(
        'В разработке', 
        'Apple Sign In с Firebase пока не настроен. Используйте email/пароль или гостевой вход.'
      );
      // TODO: Интегрировать Apple Sign In с Firebase
      // 1. Импортировать OAuthProvider из firebase/auth
      // 2. Создать провайдер: const provider = new OAuthProvider('apple.com');
      // 3. Использовать credential от Apple:
      // const credential = await AppleAuthentication.signInAsync({
      //   requestedScopes: [
      //     AppleAuthentication.AppleAuthenticationScope.EMAIL,
      //     AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      //   ],
      // });
      // 4. Конвертировать в Firebase credential:
      // const oAuthCredential = provider.credential({
      //   idToken: credential.identityToken,
      //   rawNonce: credential.authorizationCode, // или использовать nonce
      // });
      // 5. Войти через Firebase:
      // await signInWithCredential(auth, oAuthCredential);
    } catch (error: any) {
      if (error.code !== 'ERR_CANCELED') {
        Alert.alert('Ошибка', 'Не удалось войти через Apple ID');
      }
    }
  };

  const handleSkipAuth = async () => {
    try {
      setIsLoading(true);
      await loginAsGuest();
    } catch (error) {
      console.error('Skip auth error:', error);
      Alert.alert('Ошибка', 'Не удалось войти как гость');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Восстановление пароля',
      'Функция восстановления пароля будет доступна в ближайшее время'
    );
    // TODO: Реализовать восстановление пароля через Firebase
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Ionicons name="cash-outline" size={80} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>CashCraft</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Управляйте финансами легко
            </Text>
          </View>

          <View style={[styles.form, { backgroundColor: colors.card }]}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  isLogin && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
                onPress={() => setIsLogin(true)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isLogin ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Вход
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  !isLogin && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
                onPress={() => setIsLogin(false)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: !isLogin ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Регистрация
                </Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Имя"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Пароль"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Подтвердите пароль"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? 'Войти' : 'Зарегистрироваться'}
                </Text>
              )}
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                  Забыли пароль?
                </Text>
              </TouchableOpacity>
            )}

            {isAppleAuthAvailable && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textSecondary }]}>или</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                <TouchableOpacity
                  style={[styles.appleButton, { backgroundColor: isDark ? '#fff' : '#000' }]}
                  onPress={handleAppleSignIn}
                >
                  <Ionicons 
                    name="logo-apple" 
                    size={20} 
                    color={isDark ? '#000' : '#fff'} 
                    style={styles.appleIcon}
                  />
                  <Text style={[styles.appleButtonText, { color: isDark ? '#000' : '#fff' }]}>
                    Войти через Apple
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                {isLogin ? 'Зарегистрироваться' : 'Войти'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkipAuth}
          >
            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
              Пропустить
            </Text>
          </TouchableOpacity>

          {/* Временная кнопка отладки */}
          <TouchableOpacity 
            style={[styles.skipButton, { backgroundColor: 'rgba(255,0,0,0.1)' }]}
            onPress={async () => {
              await debugAsyncStorage();
              Alert.alert(
                'Очистить хранилище?',
                'Это удалит все сохраненные данные',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { 
                    text: 'Очистить', 
                    style: 'destructive',
                    onPress: async () => {
                      await clearAllStorage();
                      Alert.alert('Готово', 'Хранилище очищено. Перезапустите приложение.');
                    }
                  }
                ]
              );
            }}
          >
            <Text style={[styles.skipButtonText, { color: 'red' }]}>
              🔧 Отладка: Очистить хранилище
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  appleIcon: {
    marginRight: 8,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 