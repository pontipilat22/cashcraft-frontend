import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Platform, Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

// Получаем ID из environment переменных или expo config
const ids = {
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || Constants.expoConfig?.extra?.googleAndroidClientId || '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || Constants.expoConfig?.extra?.googleIosClientId || '',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || Constants.expoConfig?.extra?.googleWebClientId || '',
};

export interface GoogleSignInButtonProps {
  onSuccess?: (idToken: string) => void;
  onError?: (error: { message?: string } | Error) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onSuccess, onError }) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const [loading, setLoading] = React.useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: Platform.select({
      android: ids.googleAndroidClientId,
      ios:     ids.googleIosClientId,
      default: ids.googleWebClientId,
    }),
    scopes: ['openid', 'profile', 'email'],
  });

  // Логирование для отладки
  console.log('Platform:', Platform.OS);
  console.log('Client ID:', Platform.select({
    android: ids.googleAndroidClientId,
    ios: ids.googleIosClientId,
    default: ids.googleWebClientId,
  }));
  console.log('App ownership →', Constants.appOwnership); // guest | standalone | expo

  React.useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      const { id_token, access_token } = response.params;
      const cred = GoogleAuthProvider.credential(id_token, access_token);
      signInWithCredential(auth, cred)
        .then(() => {
          onSuccess?.(id_token || '');
        })
        .catch((error) => {
          console.error('Firebase auth error:', error);
          onError?.(error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (response?.type === 'error') {
      onError?.(response.error || new Error('Google authentication failed'));
    }
  }, [response, onSuccess, onError]);

  return (
    <Pressable
      disabled={!request || loading}
      onPress={() => {
        console.log('Google Sign In button pressed');
        promptAsync();
      }}
      style={[styles.button, { backgroundColor: '#fff', borderColor: colors.border }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : (
        <View style={styles.content}>
          <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.icon} />
          <Text style={[styles.text, { color: '#000' }]}>{t('auth.loginWithGoogle')}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});
