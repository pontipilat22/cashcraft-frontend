import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { FirebaseAuthService } from '../services/firebaseAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from '../services/database';
import { UserDataService } from '../services/userDataService';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isGuest: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверка авторизации при запуске
  useEffect(() => {
    console.log('AuthContext: Setting up auth state listener');
    
    const unsubscribe = FirebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
      console.log('AuthContext: Auth state changed, firebaseUser:', firebaseUser?.email || 'null');
      
      try {
        setIsLoading(true);
        
        if (firebaseUser) {
          // Пользователь авторизован в Firebase
          const authUser: AuthUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            isGuest: false
          };
          
          console.log('AuthContext: Setting authenticated user:', authUser.email);
          setUser(authUser);
          setFirebaseUser(firebaseUser);
          
          // Сохраняем локально
          await AsyncStorage.setItem('currentUser', JSON.stringify(authUser));
          
          // Инициализируем базу данных для пользователя
          DatabaseService.setUserId(firebaseUser.uid);
          await DatabaseService.initDatabase();
          
          // Загружаем данные пользователя
          UserDataService.setUserId(firebaseUser.uid);
          await UserDataService.initializeUserData();
        } else {
          // Проверяем, есть ли гостевой пользователь
          console.log('AuthContext: No Firebase user, checking for guest');
          
          try {
            const savedUser = await AsyncStorage.getItem('currentUser');
            console.log('AuthContext: Raw AsyncStorage value:', savedUser);
            
            if (savedUser && savedUser !== 'null' && savedUser !== 'undefined') {
              // Проверяем, что это валидный JSON
              const parsedUser: AuthUser = JSON.parse(savedUser);
              
              if (parsedUser && typeof parsedUser === 'object' && parsedUser.id) {
                if (parsedUser.isGuest) {
                  console.log('AuthContext: Found guest user');
                  setUser(parsedUser);
                  DatabaseService.setUserId(parsedUser.id);
                  await DatabaseService.initDatabase();
                  UserDataService.setUserId(parsedUser.id);
                  await UserDataService.initializeUserData();
                } else {
                  // Сохраненный пользователь не гость, но Firebase не авторизован
                  console.log('AuthContext: Saved user is not guest, clearing');
                  await AsyncStorage.removeItem('currentUser');
                  setUser(null);
                  setFirebaseUser(null);
                }
              } else {
                console.log('AuthContext: Invalid user data structure, clearing');
                await AsyncStorage.removeItem('currentUser');
                setUser(null);
                setFirebaseUser(null);
              }
            } else {
              console.log('AuthContext: No valid saved user');
              setUser(null);
              setFirebaseUser(null);
            }
          } catch (parseError) {
            console.error('AuthContext: Error parsing saved user, clearing storage:', parseError);
            // Очищаем невалидные данные
            await AsyncStorage.removeItem('currentUser');
            setUser(null);
            setFirebaseUser(null);
          }
        }
      } catch (error) {
        console.error('AuthContext: Error in auth state handler:', error);
        setUser(null);
        setFirebaseUser(null);
      } finally {
        console.log('AuthContext: Setting isLoading to false');
        setIsLoading(false);
      }
    });

    return () => {
      console.log('AuthContext: Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await FirebaseAuthService.login(email, password);
      // onAuthStateChanged обработает остальное
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      await FirebaseAuthService.register(email, password, displayName);
      // onAuthStateChanged обработает остальное
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Очищаем данные
      UserDataService.setUserId(null);
      DatabaseService.setUserId(null);
      
      // Выходим из Firebase если это не гость
      if (!user?.isGuest) {
        await FirebaseAuthService.logout();
      }
      
      // Очищаем локальное состояние
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await FirebaseAuthService.resetPassword(email);
    } catch (error) {
      throw error;
    }
  };

  const loginAsGuest = async () => {
    const guestUser: AuthUser = {
      id: `guest_${Date.now()}`,
      email: 'guest@cashcraft.app',
      displayName: 'Guest',
      isGuest: true
    };
    
    await AsyncStorage.setItem('currentUser', JSON.stringify(guestUser));
    setUser(guestUser);
    
    DatabaseService.setUserId(guestUser.id);
    await DatabaseService.initDatabase();
    UserDataService.setUserId(guestUser.id);
    await UserDataService.initializeUserData();
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    isLoading,
    login,
    register,
    logout,
    resetPassword,
    loginAsGuest
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
