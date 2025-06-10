import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreenExpo from 'expo-splash-screen';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { DataProvider } from './src/context/DataContext';
import { AuthProvider } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { SplashScreen } from './src/components/SplashScreen';

// Предотвращаем автоматическое скрытие нативного splash screen
SplashScreenExpo.preventAutoHideAsync();

function AppContent() {
  const { isDark, colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      // Скрываем нативный splash screen
      await SplashScreenExpo.hideAsync();
      
      // Проверяем статус авторизации
      await checkAuthStatus();
      
      // Показываем кастомный splash screen минимум 2 секунды
      setTimeout(() => {
        setShowCustomSplash(false);
      }, 2000);
    };
    
    prepare();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await AsyncStorage.getItem('currentUser');
      const guestStatus = await AsyncStorage.getItem('isGuest');
      
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        setIsGuest(guestStatus === 'true');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (userId: string) => {
    setCurrentUser(userId);
    setIsAuthenticated(true);
    // Проверяем, гость ли это
    const guestStatus = await AsyncStorage.getItem('isGuest');
    setIsGuest(guestStatus === 'true');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('currentUser');
      await AsyncStorage.removeItem('isGuest');
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsGuest(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (showCustomSplash || isLoading) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      {!isAuthenticated ? (
        <AuthScreen onLogin={handleLogin} />
      ) : (
        <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
          <AuthProvider onLogout={handleLogout}>
            <SubscriptionProvider userId={currentUser} isGuest={isGuest}>
              <DataProvider userId={currentUser}>
                <BottomTabNavigator />
              </DataProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
