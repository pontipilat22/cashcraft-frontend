import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/AuthNavigator';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Auth'>;

export const AuthScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { loginAsGuest } = useAuth();
  const { t, currentLanguage } = useLocalization();
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  console.log('🌐 [AuthScreen] Current language:', currentLanguage);
  console.log('📝 [AuthScreen] Terms translations:', {
    agreeToTerms: t('auth.agreeToTerms'),
    and: t('auth.and'),
    termsOfService: t('auth.termsOfService'),
    privacyPolicy: t('auth.privacyPolicy')
  });

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


  const handleGoogleSignIn = () => {
    if (!agreedToTerms) {
      Alert.alert(
        t('auth.termsRequired'),
        t('auth.pleaseAcceptTerms')
      );
      return false; // Validation failed
    }
    return true; // Validation passed
  };

  const handleGuestLogin = async () => {
    if (!agreedToTerms) {
      Alert.alert(
        t('auth.termsRequired'),
        t('auth.pleaseAcceptTerms')
      );
      return;
    }

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

  const openTermsOfService = () => {
    navigation.navigate('TermsOfService');
  };

  const openPrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
          <View style={styles.header}>
            <Image
              source={require('../../assets/splash-icon.png')}
              style={[styles.logo, { tintColor: colors.primary }]}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.text }]}>CASHCRAFT</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('auth.tagline')}
            </Text>
          </View>

          <View style={[styles.form, { backgroundColor: colors.card }]}>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              {t('auth.welcomeTitle')}
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              {t('auth.welcomeSubtitle')}
            </Text>

            <GoogleSignInButton
              forceAccountSelection={true}
              onSuccess={() => {
                // Авторизация прошла успешно, AuthContext обработает навигацию
              }}
              onError={(error) => {
                Alert.alert(t('common.error'), error.message || t('auth.googleSignInError'));
              }}
              onPress={handleGoogleSignIn}
            />

            <View style={styles.orContainer}>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.textSecondary }]}>{t('auth.orLoginWith')}</Text>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.guestButton, { borderColor: colors.border }]}
              onPress={handleGuestLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : (
                <>
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.guestButtonText, { color: colors.textSecondary }]}>
                    {t('auth.skipAuth')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Чекбокс согласия с условиями */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <View style={[
                styles.checkbox,
                {
                  borderColor: colors.border,
                  backgroundColor: agreedToTerms ? colors.primary : 'transparent'
                }
              ]}>
                {agreedToTerms && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <View style={styles.termsTextContainer}>
                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                  {t('auth.agreeToTerms')}{' '}
                </Text>
                <TouchableOpacity onPress={openTermsOfService}>
                  <Text style={[styles.termsLink, { color: colors.primary }]}>
                    {t('auth.termsOfService')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                  {' '}{t('auth.and')}{' '}
                </Text>
                <TouchableOpacity onPress={openPrivacyPolicy}>
                  <Text style={[styles.termsLink, { color: colors.primary }]}>
                    {t('auth.privacyPolicy')}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
    textAlign: 'center',
  },
  form: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
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
    marginBottom: 24,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
}); 