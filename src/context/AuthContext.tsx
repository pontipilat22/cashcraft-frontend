import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const { defaultCurrency } = useCurrency();

  const setupUserSession = useCallback(async (authUser: AuthUser) => {
    setIsPreparing(true);
    try {
      await AsyncStorage.setItem('currentUser', JSON.stringify(authUser));
      
      LocalDatabaseService.setUserId(authUser.id);
      await LocalDatabaseService.initDatabase(defaultCurrency);
      
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
        const isValid = await AuthService.isAuthenticated();
        if (isValid) {
          await setupUserSession(savedUser);
        } else {
          try {
            const newTokens = await AuthService.refreshToken(tokens.refreshToken);
            if (newTokens) {
              await ApiService.saveTokens(newTokens.accessToken, newTokens.refreshToken);
              await setupUserSession(savedUser);
            } else {
              await logout();
            }
          } catch (e) {
            await logout();
          }
        }
      }
    } catch (error) {
      console.error('Auth state check error:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  }, [setupUserSession]);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);


  const handleAuthResponse = async (response: AuthResponse) => {
    await ApiService.saveTokens(response.accessToken, response.refreshToken);
    const authUser: AuthUser = {
      id: response.user.id,
      email: response.user.email,
      displayName: response.user.displayName,
      isGuest: response.user.isGuest,
      isPremium: response.user.isPremium,
    };
    await setupUserSession(authUser);
  }

  const login = async (email: string, password: string) => {
    const response = await AuthService.login({ email, password });
    await handleAuthResponse(response);
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const response = await AuthService.register({ email, password, display_name: displayName });
    await handleAuthResponse(response);
  };

  const logout = async () => {
    const isGuest = user?.isGuest;
    setUser(null);
    LocalDatabaseService.setUserId(null);
    await ApiService.clearTokens();
    await AsyncStorage.removeItem('currentUser');
    if (!isGuest) {
      try {
        await AuthService.logout();
      } catch (error) {
        console.log('Logout network error (ignored):', error);
      }
    }
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
    const response = await AuthService.loginWithGoogle(googleData);
    await handleAuthResponse(response);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isPreparing, login, register, logout, loginAsGuest, loginWithGoogle }}>
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
