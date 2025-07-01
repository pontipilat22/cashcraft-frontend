import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { login, register, loginAsGuest } = useAuth();
  const { t } = useLocalization();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    name?: string;
  }>({});
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);

  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!email.trim()) {
      newErrors.email = t('auth.emailRequired');
    } else if (!validateEmail(email)) {
      newErrors.email = t('auth.invalidEmail');
    }
    
    if (!password) {
      newErrors.password = t('auth.passwordRequired');
    } else if (password.length < 6) {
      newErrors.password = t('auth.passwordTooShort');
    }
    
    if (!isLogin) {
      if (!name.trim()) {
        newErrors.name = t('auth.nameRequired');
      }
      
      if (password !== confirmPassword) {
        newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (error: any) {
      let errorMessage = error.message || (isLogin ? t('auth.loginError') : t('auth.registerError'));
      
      // Обработка специфичных ошибок
      if (error.message?.includes('Network request failed')) {
        errorMessage = t('auth.networkError') || 'Нет соединения с сервером. Проверьте подключение к интернету.';
      } else if (error.message?.includes('401')) {
        errorMessage = t('auth.invalidCredentials') || 'Неверный email или пароль';
      } else if (error.message?.includes('400')) {
        errorMessage = t('auth.invalidData') || 'Проверьте введенные данные';
      } else if (error.message?.includes('409')) {
        errorMessage = t('auth.emailExists') || 'Пользователь с таким email уже существует';
      }
      
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await loginAsGuest();
    } catch (error: any) {
      const errorMessage = error.message || t('auth.guestLoginError') || 'Не удалось войти как гость';
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {!keyboardVisible && (
              <View style={styles.header}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={[styles.logo, { tintColor: colors.primary }]}
                  resizeMode="contain"
                />
                <Text style={[styles.title, { color: colors.text }]}>CASHCRAFT</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {t('auth.tagline')}
                </Text>
              </View>
            )}

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
                    {t('auth.login')}
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
                    {t('auth.register')}
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
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: errors.name ? '#FF3B30' : colors.border },
                    ]}
                    placeholder={t('auth.name')}
                    placeholderTextColor={colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              )}
              {errors.name && <Text style={[styles.errorText, { color: '#FF3B30' }]}>{errors.name}</Text>}

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: errors.email ? '#FF3B30' : colors.border },
                  ]}
                  placeholder={t('auth.email')}
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={[styles.errorText, { color: '#FF3B30' }]}>{errors.email}</Text>}

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: errors.password ? '#FF3B30' : colors.border },
                  ]}
                  placeholder={t('auth.password')}
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
              {errors.password && <Text style={[styles.errorText, { color: '#FF3B30' }]}>{errors.password}</Text>}

              {!isLogin && (
                <>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        { color: colors.text, borderColor: errors.confirmPassword ? '#FF3B30' : colors.border },
                      ]}
                      placeholder={t('auth.confirmPassword')}
                      placeholderTextColor={colors.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && (
                    <Text style={[styles.errorText, { color: '#FF3B30' }]}>{errors.confirmPassword}</Text>
                  )}
                </>
              )}

              {isLogin && (
                <TouchableOpacity
                  onPress={() => setForgotPasswordVisible(true)}
                  style={styles.forgotPasswordButton}
                >
                  <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                    {t('auth.forgotPassword')}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isLogin ? t('auth.loginButton') : t('auth.registerButton')}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.orContainer}>
                <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.orText, { color: colors.textSecondary }]}>{t('auth.orLoginWith')}</Text>
                <View style={[styles.orLine, { backgroundColor: colors.border }]} />
              </View>

              <GoogleSignInButton
                forceAccountSelection={true}
                onSuccess={() => {
                  // Авторизация прошла успешно, AuthContext обработает навигацию
                }}
                onError={(error) => {
                  Alert.alert(t('common.error'), error.message || t('auth.googleSignInError'));
                }}
              />

              <GoogleSignInButton
                showSignOut={true}
                onError={(error) => {
                  Alert.alert(t('common.error'), error.message || 'Failed to sign out from Google');
                }}
              />

              <TouchableOpacity
                style={[styles.guestButton, { borderColor: colors.border }]}
                onPress={handleGuestLogin}
                disabled={loading}
              >
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.guestButtonText, { color: colors.textSecondary }]}>
                  {t('auth.skipAuth')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={switchMode} style={styles.switchButton}>
                <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                  {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
                  <Text style={{ color: colors.primary }}>
                    {isLogin ? t('auth.register') : t('auth.login')}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        visible={forgotPasswordVisible}
        onClose={() => setForgotPasswordVisible(false)}
      />
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
  formContainer: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 16,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  switchText: {
    fontSize: 14,
  },
}); 