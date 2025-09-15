import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showSignOut?: boolean;
  forceAccountSelection?: boolean;
  onPress?: () => boolean; // Returns true if validation passes, false otherwise
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  showSignOut = false,
  forceAccountSelection = false,
  onPress,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    // Конфигурируем Google Sign-In один раз при монтировании компонента.
    GoogleSignin.configure({
      webClientId: Constants.expoConfig?.extra?.googleWebClientId,
      scopes: ['profile', 'email'],
      offlineAccess: true, // Важно для получения idToken в релизных сборках
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Если нужно принудительно показать выбор аккаунта, сначала выходим
      if (forceAccountSelection) {
        try {
          const currentUser = await GoogleSignin.getCurrentUser();
          if (currentUser) {
            console.log('Force account selection: signing out current user...');
            await GoogleSignin.signOut();
          }
        } catch (error) {
          console.log('No current user found, proceeding with sign in...');
        }
      } else {
        // Проверяем, есть ли уже авторизованный пользователь
        try {
          const currentUser = await GoogleSignin.getCurrentUser();
          if (currentUser) {
            // Если пользователь уже авторизован, сначала выходим, чтобы показать выбор аккаунта
            console.log('User already signed in, signing out to show account selection...');
            await GoogleSignin.signOut();
          }
        } catch (error) {
          // Если getCurrentUser выбросил ошибку, значит пользователь не авторизован
          console.log('No current user found, proceeding with sign in...');
        }
      }
      
      const response = await GoogleSignin.signIn();

      console.log('Google Sign-In Response:', JSON.stringify(response, null, 2));

      // Используем официальный type guard для безопасной работы с типами.
      if (isSuccessResponse(response)) {
        const { idToken, user } = response.data;
        if (!idToken) {
          // Резервный вариант, если idToken не пришел сразу
          console.log('idToken is missing, trying getTokens()');
          const tokens = await GoogleSignin.getTokens();
          if (!tokens.idToken) {
            throw new Error('Google Sign-In failed: Could not retrieve idToken.');
          }
          await loginWithGoogle({
            idToken: tokens.idToken,
            email: user.email,
            name: user.name ?? user.email.split('@')[0],
            googleId: user.id,
          });
        } else {
           await loginWithGoogle({
            idToken,
            email: user.email,
            name: user.name ?? user.email.split('@')[0],
            googleId: user.id,
          });
        }
        
        onSuccess?.();
      } else {
        console.log(`Google Sign-In was not successful. Type: ${response.type}`);
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('User cancelled the login flow');
            break;
          case statusCodes.IN_PROGRESS:
            console.log('Sign in is in progress already');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert(t('common.error'), 'Google Play Services not available or outdated');
            break;
          default:
            Alert.alert('Google Sign-In Error', `Code: ${error.code}\n${error.message}`);
        }
      } else {
        Alert.alert('Google Sign-In Error', error.message || 'An unknown error occurred.');
      }
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await GoogleSignin.signOut();
      Alert.alert(
        'Google Account Signed Out',
        'You have been signed out of your Google account. You can now sign in with a different account.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Google Sign-Out Error:', error);
      Alert.alert('Error', 'Failed to sign out of Google account');
    }
  };

  if (showSignOut) {
    return (
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#F8F9FA', borderColor: '#DADCE0' }]}
        onPress={handleGoogleSignOut}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: '#5F6368' }]}>
          {t('auth.signOutGoogle') || 'Sign Out from Google'}
        </Text>
      </TouchableOpacity>
    );
  }

  const handlePress = () => {
    // If there's an external onPress handler, call it first (for validation)
    if (onPress) {
      const shouldProceed = onPress();
      if (!shouldProceed) {
        return; // Validation failed, don't proceed
      }
    }
    // If no external handler or validation passed, proceed with Google Sign-In
    handleGoogleSignIn();
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: '#FFFFFF', borderColor: '#DADCE0' }]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#5F6368" />
      ) : (
        <>
          <View style={styles.googleLogoContainer}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={[styles.buttonText, { color: '#3C4043' }]}>
            {t('auth.continueWithGoogle') || 'Continue with Google'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  googleLogoContainer: {
    width: 20,
    height: 20,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
