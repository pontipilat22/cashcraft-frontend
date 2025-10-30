import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { AuthService, User, AuthResponse } from '../services/auth';
import { ApiService } from '../services/api';
import { LocalDatabaseService } from '../services/localDatabase';
import { useCurrency } from './CurrencyContext';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isGuest: boolean;
  isPremium?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isPreparing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  loginWithGoogle: (googleData: { idToken: string; email: string; name: string; googleId: string }) => Promise<void>;
  forceReauth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [hasShownOfflineNotification, setHasShownOfflineNotification] = useState(false);
  const { defaultCurrency } = useCurrency();

  const setupUserSession = useCallback(async (authUser: AuthUser, preserveLocalData: boolean = true) => {
    setIsPreparing(true);
    try {
      console.log('🔍 [AuthContext] setupUserSession called:');
      console.log('  - authUser:', authUser);
      console.log('  - preserveLocalData:', preserveLocalData);
      
      await AsyncStorage.setItem('currentUser', JSON.stringify(authUser));
      await AsyncStorage.setItem('isGuest', authUser.isGuest ? 'true' : 'false');
      LocalDatabaseService.setUserId(authUser.id);
      
      // НЕ очищаем данные при входе в аккаунт - данные всегда сохраняются
      // if (!preserveLocalData) {
      //   await LocalDatabaseService.clearAllData(defaultCurrency);
      //   await LocalDatabaseService.initDatabase(defaultCurrency);
      // }
      
      // Инициализируем курсы валют с backend
      try {
        console.log('Initializing exchange rates...');
        const { ExchangeRateService } = await import('../services/exchangeRate');
        const ratesInitialized = await ExchangeRateService.initializeRatesFromBackend();
        console.log('Exchange rates initialized:', ratesInitialized);
      } catch (rateError) {
        console.error('Failed to initialize exchange rates:', rateError);
        // Не критично, продолжаем работу
      }
      setUser(authUser);
    } catch (error) {
      console.error("Failed to setup user session", error);
      await logout();
    } finally {
      setIsPreparing(false);
    }
  }, [defaultCurrency]);
  
  const checkAuthState = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedUserStr = await AsyncStorage.getItem('currentUser');
      if (!savedUserStr) {
        // Автоматически создаем локального пользователя
        const localUserId = `local_${Date.now()}`;
        const localUser: AuthUser = {
          id: localUserId,
          email: `${localUserId}@local.app`,
          displayName: 'Локальный пользователь',
          isGuest: false,
          isPremium: false
        };
        await setupUserSession(localUser);
        return;
      }
      const savedUser: AuthUser = JSON.parse(savedUserStr);

      if (savedUser.isGuest) {
        await setupUserSession(savedUser);
        return;
      }
      
      const tokens = await ApiService.getTokens();
      if (tokens.accessToken && tokens.refreshToken) {
        ApiService.setAccessToken(tokens.accessToken);
        
        // Проверяем валидность токена
        try {
          const isValid = await AuthService.isAuthenticated();
          if (isValid) {
            await setupUserSession(savedUser);
            return;
          }
        } catch (error) {
          console.log('🔍 [AuthContext] Токен недействителен, пытаемся обновить...');
        }
        
        // Если токен недействителен, пытаемся обновить
        try {
          console.log('🔄 [AuthContext] Обновляем токен...');
          const newTokens = await AuthService.refreshToken(tokens.refreshToken);
          if (newTokens) {
            console.log('✅ [AuthContext] Токен успешно обновлен');
            await ApiService.saveTokens(newTokens.accessToken, newTokens.refreshToken);
            await setupUserSession(savedUser);
            return;
          } else {
            console.log('⚠️ [AuthContext] Не удалось обновить токен, но пользователь остается в системе');
            // НЕ выходим из системы, пользователь остается авторизованным
            await setupUserSession(savedUser);
            
            // Показываем уведомление только один раз
            if (!hasShownOfflineNotification && !savedUser.isGuest) {
              setHasShownOfflineNotification(true);
              Alert.alert(
                'Режим офлайн',
                'Соединение с сервером временно недоступно. Вы можете продолжать работать с приложением. Данные будут синхронизированы при восстановлении соединения.',
                [{ text: 'Понятно', style: 'default' }]
              );
            }
            return;
          }
                 } catch (refreshError) {
           console.log('⚠️ [AuthContext] Ошибка обновления токена, но пользователь остается в системе:', refreshError);
           // НЕ выходим из системы, пользователь остается авторизованным
           await setupUserSession(savedUser);
           
           // Показываем уведомление только один раз
           if (!hasShownOfflineNotification && !savedUser.isGuest) {
             setHasShownOfflineNotification(true);
             Alert.alert(
               'Режим офлайн',
               'Соединение с сервером временно недоступно. Вы можете продолжать работать с приложением. Данные будут синхронизированы при восстановлении соединения.',
               [{ text: 'Понятно', style: 'default' }]
             );
           }
           return;
         }
             } else {
         console.log('⚠️ [AuthContext] Токены отсутствуют, но пользователь остается в системе');
         // НЕ выходим из системы, пользователь остается авторизованным
         await setupUserSession(savedUser);
         
         // Показываем уведомление только один раз
         if (!hasShownOfflineNotification && !savedUser.isGuest) {
           setHasShownOfflineNotification(true);
           Alert.alert(
             'Режим офлайн',
             'Соединение с сервером временно недоступно. Вы можете продолжать работать с приложением. Данные будут синхронизированы при восстановлении соединения.',
             [{ text: 'Понятно', style: 'default' }]
           );
         }
       }
    } catch (error) {
      console.error('❌ [AuthContext] Критическая ошибка проверки состояния авторизации:', error);
      // Даже при критической ошибке НЕ выходим из системы
      // Пользователь может продолжать работать с локальными данными
      const savedUserStr = await AsyncStorage.getItem('currentUser');
      if (savedUserStr) {
        const savedUser: AuthUser = JSON.parse(savedUserStr);
        await setupUserSession(savedUser);
      }
    } finally {
      setIsLoading(false);
    }
  }, [setupUserSession]);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // Периодическая проверка и обновление токенов в фоне
  useEffect(() => {
    if (!user || user.isGuest) return;

    const checkAndRefreshTokens = async () => {
      try {
        const tokens = await ApiService.getTokens();
        if (tokens.accessToken && tokens.refreshToken) {
          // Проверяем валидность токена каждые 30 минут
          const isValid = await AuthService.isAuthenticated();
          if (!isValid) {
            console.log('🔄 [AuthContext] Токен истек, обновляем в фоне...');
            const newTokens = await AuthService.refreshToken(tokens.refreshToken);
            if (newTokens) {
              console.log('✅ [AuthContext] Токен обновлен в фоне');
              await ApiService.saveTokens(newTokens.accessToken, newTokens.refreshToken);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ [AuthContext] Ошибка фонового обновления токена:', error);
        // Не критично, пользователь продолжает работать
      }
    };

    // Проверяем токены каждые 30 минут
    const interval = setInterval(checkAndRefreshTokens, 30 * 60 * 1000);
    
    // Также проверяем при возвращении приложения в активное состояние
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        checkAndRefreshTokens();
      }
    };

    // Добавляем слушатель состояния приложения
    const { AppState } = require('react-native');
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, [user]);


  const handleAuthResponse = async (response: AuthResponse, preserveLocalData: boolean = false) => {
    await ApiService.saveTokens(response.accessToken, response.refreshToken);
    const authUser: AuthUser = {
      id: response.user.id,
      email: response.user.email,
      displayName: response.user.displayName,
      isGuest: response.user.isGuest,
      isPremium: response.user.isPremium,
    };
    await setupUserSession(authUser, preserveLocalData);
    
    // Сбрасываем флаг уведомления при успешном входе
    setHasShownOfflineNotification(false);
  }

  const login = async (email: string, password: string) => {
    console.log('🔍 [AuthContext] login called');
    const response = await AuthService.login({ email, password });
    // Всегда сохраняем локальные данные при входе
    await handleAuthResponse(response, true);
  };

  const register = async (email: string, password: string, displayName?: string) => {
    console.log('🔍 [AuthContext] register called');
    const response = await AuthService.register({ email, password, display_name: displayName });
    // Всегда сохраняем локальные данные при регистрации
    await handleAuthResponse(response, true);
  };

  const logout = async () => {
    console.log('🔍 [AuthContext] logout called');
    const isGuest = user?.isGuest;
    
    // Выходим из Google аккаунта (если пользователь не гость)
    if (!isGuest) {
      try {
        console.log('🔓 Signing out from Google...');
        const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
        await GoogleSignin.signOut();
        console.log('✅ Successfully signed out from Google');
      } catch (googleSignOutError) {
        console.error('❌ Failed to sign out from Google:', googleSignOutError);
      }
    }
    
    setUser(null);
    // НЕ очищаем локальные данные при выходе - они остаются на устройстве
    // LocalDatabaseService.setUserId(null); // УБРАНО, чтобы не терять локальные данные
    
    await ApiService.clearTokens();
    await AsyncStorage.removeItem('currentUser');
    await AsyncStorage.removeItem('isGuest'); // Очищаем флаг гостевого режима
    
    if (!isGuest) {
      try {
        await AuthService.logout();
      } catch (error) {
        console.log('Logout network error (ignored):', error);
      }
    }
    
    console.log('✅ [AuthContext] Logout completed, local data preserved');
  };

  const loginAsGuest = async () => {
    const guestId = `guest_${Date.now()}`;
    const authUser: AuthUser = {
      id: guestId,
      email: `${guestId}@local.guest`,
      displayName: 'Гость',
      isGuest: true,
      isPremium: false
    };
    await setupUserSession(authUser);
  };

  const loginWithGoogle = async (googleData: { idToken: string; email: string; name: string; googleId: string }) => {
    console.log('🔍 [AuthContext] loginWithGoogle called');
    const response = await AuthService.loginWithGoogle(googleData);
    // Всегда сохраняем локальные данные при входе через Google
    await handleAuthResponse(response, true);
  };

  const forceReauth = async () => {
    console.log('🔄 [AuthContext] Принудительная переавторизация...');
    await logout();
    // Пользователь будет перенаправлен на экран входа
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isPreparing, login, register, logout, loginAsGuest, loginWithGoogle, forceReauth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
