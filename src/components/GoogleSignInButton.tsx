import React, { useEffect } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View, 
  ActivityIndicator,
  Image,
  Platform 
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';

// Завершаем браузерную сессию для корректной работы на iOS
WebBrowser.maybeCompleteAuthSession();

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ 
  onSuccess,
  onError 
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = React.useState(false);

  // Настройка Google OAuth
  // ВАЖНО: Замените эти ID на ваши из Google Cloud Console
  const [request, response, promptAsync] = Google.useAuthRequest({
    // Для Expo Go используйте Web Client ID
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '457720015497-gkarur46ep22kptgra8qm4v58r686jab.apps.googleusercontent.com',
    // Для Android (только для standalone приложения)
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '457720015497-phj9gjn84anqsnoufvv6bro3ca9oud03.apps.googleusercontent.com',
    // Для iOS (только для standalone приложения)
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    // Скоупы для получения данных пользователя
    scopes: ['profile', 'email'],
    // Для build версии важно получить ID token
    // responseType: 'id_token', // Раскомментируйте для build версии
    // Для веб-версии указываем redirect URI
    ...(Platform.OS === 'web' && {
      redirectUri: `${window.location.origin}/`,
    }),
  });

  useEffect(() => {
    if (response) {
      console.log('Google Auth Response:', response);
    }
    handleResponse();
  }, [response]);

  const handleResponse = async () => {
    if (response?.type === 'success') {
      setLoading(true);
      try {
        const { authentication, params } = response;
        
        // Для build версии с ID token
        if (params?.id_token) {
          // Декодируем JWT токен для получения информации о пользователе
          const base64Url = params.id_token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          
          const userInfo = JSON.parse(jsonPayload);
          
          await loginWithGoogle({
            idToken: params.id_token,
            email: userInfo.email,
            name: userInfo.name,
            googleId: userInfo.sub,
          });
        } 
        // Для Expo Go с access token
        else if (authentication?.accessToken) {
          const userInfoResponse = await fetch(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${authentication.accessToken}`
          );
          
          const userInfo = await userInfoResponse.json();
          
          await loginWithGoogle({
            idToken: authentication.idToken || '',
            email: userInfo.email,
            name: userInfo.name,
            googleId: userInfo.id,
          });
        } else {
          throw new Error('No authentication data received');
        }
        
        onSuccess?.();
      } catch (error) {
        console.error('Google sign in error:', error);
        onError?.(error as Error);
      } finally {
        setLoading(false);
      }
    } else if (response?.type === 'error') {
      onError?.(new Error(response.error?.message || 'Google sign in failed'));
    }
  };

  const handlePress = () => {
    console.log('Google Sign-In button pressed');
    console.log('Request state:', request);
    console.log('Web Client ID:', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
    console.log('Android Client ID:', process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
    console.log('iOS Client ID:', process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
    
    if (!request) {
      console.error('Request is null - Google Sign-In not configured properly');
      onError?.(new Error('Google Sign-In is not configured properly'));
      alert(
        'Google Sign-In не настроен правильно.\n\n' +
        'Для build версии проверьте:\n' +
        '1. SHA-1 fingerprint в Google Console\n' +
        '2. Client ID в файле .env\n' +
        '3. google-services.json актуален\n' +
        '4. Package name: com.pontipilat.cashcraft'
      );
      return;
    }
    
    console.log('Calling promptAsync...');
    promptAsync();
  };

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: '#FFFFFF', borderColor: '#DADCE0' }]}
      onPress={handlePress}
      disabled={loading || !request}
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
