import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreenExpo from 'expo-splash-screen';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { DataProvider } from './src/context/DataContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { LocalizationProvider } from './src/context/LocalizationContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { SplashScreen } from './src/components/SplashScreen';
import { useCurrency } from './src/context/CurrencyContext';

// Предотвращаем автоматическое скрытие нативного splash screen
SplashScreenExpo.preventAutoHideAsync();

function AppContent() {
  const { isDark, colors } = useTheme();
  const { user, isLoading: authLoading } = useAuth();
  const { defaultCurrency } = useCurrency();
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [forceHideSplash, setForceHideSplash] = useState(false);
  const [dataProviderKey, setDataProviderKey] = useState(0);



  useEffect(() => {
    const prepare = async () => {
      try {
        // Скрываем нативный splash screen
        await SplashScreenExpo.hideAsync();
      } catch (error) {
        // Игнорируем ошибку
      }
      
      // Показываем кастомный splash screen минимум 2 секунды
      setTimeout(() => {
        setShowCustomSplash(false);
      }, 2000);
      
      // Аварийный таймаут - скрываем splash через 5 секунд в любом случае
      setTimeout(() => {
        setForceHideSplash(true);
      }, 5000);
    };
    
    prepare();
  }, []);

  // Обновляем DataProvider при изменении валюты
  useEffect(() => {
    // Принудительно перемонтируем DataProvider чтобы обновить валюту
    setDataProviderKey(prev => prev + 1);
  }, [defaultCurrency]);

  if ((showCustomSplash || authLoading) && !forceHideSplash) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      {!user ? (
        <AuthScreen />
      ) : (
        <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
          <SubscriptionProvider userId={user.id} isGuest={user.isGuest}>
            <DataProvider key={dataProviderKey} userId={user.id} defaultCurrency={defaultCurrency}>
              <BottomTabNavigator />
            </DataProvider>
          </SubscriptionProvider>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LocalizationProvider>
        <CurrencyProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </CurrencyProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
