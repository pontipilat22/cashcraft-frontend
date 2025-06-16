import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService, User as ApiUser } from '../services/auth';
import { ApiService } from '../services/api';
import { DatabaseService } from '../services/database';
import { UserDataService } from '../services/userDataService';

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

  // Проверка авторизации при запуске
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      
      // Сначала проверяем локально сохраненного пользователя
      const savedUser = await AsyncStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const parsedUser: AuthUser = JSON.parse(savedUser);
          
          // Если это гость, используем только локальные данные
          if (parsedUser.isGuest) {
            setUser(parsedUser);
            DatabaseService.setUserId(parsedUser.id);
            await DatabaseService.initDatabase();
            UserDataService.setUserId(parsedUser.id);
            await UserDataService.initializeUserData();
            return; // Выходим рано, не пытаемся подключиться к API
          }
        } catch (error) {
          await AsyncStorage.removeItem('currentUser');
        }
      }
      
      // Для не-гостей пытаемся подключиться к API
      try {
        await ApiService.initialize();
        const isAuthenticated = await AuthService.isAuthenticated();
        
        if (isAuthenticated) {
          // Получаем данные пользователя с сервера
          const apiUser = await AuthService.getCurrentUser();
          
          if (apiUser) {
            const authUser: AuthUser = {
              id: apiUser.id,
              email: apiUser.email,
              displayName: apiUser.name || apiUser.email.split('@')[0],
              isGuest: apiUser.isGuest,
              isPremium: apiUser.isPremium
            };
            
            setUser(authUser);
            await AsyncStorage.setItem('currentUser', JSON.stringify(authUser));
            
            // Инициализируем базу данных для пользователя
            DatabaseService.setUserId(apiUser.id);
            await DatabaseService.initDatabase();
            
            // Загружаем данные пользователя
            UserDataService.setUserId(apiUser.id);
            await UserDataService.initializeUserData();
          } else {
            // Токен есть, но пользователь не найден
            await AuthService.logout();
            setUser(null);
          }
        }
      } catch (networkError) {
        // Если нет интернета, но есть сохраненный пользователь - используем его
        if (savedUser) {
          try {
            const parsedUser: AuthUser = JSON.parse(savedUser);
            setUser(parsedUser);
            DatabaseService.setUserId(parsedUser.id);
            await DatabaseService.initDatabase();
            UserDataService.setUserId(parsedUser.id);
            await UserDataService.initializeUserData();
          } catch (error) {
            console.error('Failed to restore user:', error);
          }
        }
      }
    } catch (error) {
      console.error('Auth state check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await AuthService.login({ email, password });
      
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        displayName: response.user.name || response.user.email.split('@')[0],
        isGuest: false,
        isPremium: response.user.isPremium
      };
      
      setUser(authUser);
      await AsyncStorage.setItem('currentUser', JSON.stringify(authUser));
      
      // Инициализируем базу данных
      DatabaseService.setUserId(response.user.id);
      await DatabaseService.initDatabase();
      UserDataService.setUserId(response.user.id);
      await UserDataService.initializeUserData();
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      const response = await AuthService.register({ 
        email, 
        password, 
        name: displayName || email.split('@')[0] 
      });
      
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        displayName: response.user.name,
        isGuest: false,
        isPremium: response.user.isPremium
      };
      
      setUser(authUser);
      await AsyncStorage.setItem('currentUser', JSON.stringify(authUser));
      
      // Инициализируем базу данных
      DatabaseService.setUserId(response.user.id);
      await DatabaseService.initDatabase();
      UserDataService.setUserId(response.user.id);
      await UserDataService.initializeUserData();
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Очищаем данные
      UserDataService.setUserId(null);
      DatabaseService.setUserId(null);
      
      // Выходим из API только если это не гость и есть интернет
      if (!user?.isGuest) {
        try {
          await AuthService.logout();
        } catch (error) {
          // Игнорируем ошибки сети при выходе
          console.log('Logout network error (ignored):', error);
        }
      }
      
      // Очищаем локальное состояние
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Все равно очищаем локальное состояние
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
    }
  };

  const loginAsGuest = async () => {
    try {
      // Генерируем локальный ID для гостя
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const authUser: AuthUser = {
        id: guestId,
        email: `${guestId}@local`,
        displayName: 'Гость',
        isGuest: true,
        isPremium: false
      };
      
      setUser(authUser);
      await AsyncStorage.setItem('currentUser', JSON.stringify(authUser));
      
      // Инициализируем локальную базу данных
      DatabaseService.setUserId(guestId);
      await DatabaseService.initDatabase();
      UserDataService.setUserId(guestId);
      await UserDataService.initializeUserData();
    } catch (error) {
      console.error('Guest login error:', error);
      throw new Error('Не удалось войти как гость');
    }
  };

  const loginWithGoogle = async (googleData: { idToken: string; email: string; name: string; googleId: string }) => {
    try {
      const response = await ApiService.post<any>('/auth/google', googleData);
      
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        displayName: response.user.displayName,
        isGuest: false,
        isPremium: response.user.isPremium
      };
      
      setUser(authUser);
      await AsyncStorage.setItem('currentUser', JSON.stringify(authUser));
      
      // Сохраняем токены
      await ApiService.setAccessToken(response.accessToken);
      await ApiService.setRefreshToken(response.refreshToken);
      
      // Инициализируем базу данных
      DatabaseService.setUserId(response.user.id);
      await DatabaseService.initDatabase();
      UserDataService.setUserId(response.user.id);
      await UserDataService.initializeUserData();
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    loginAsGuest,
    loginWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
