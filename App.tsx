// ───────────────────────────────
// 1. Полифил и глобальный генератор UUID
//    (ставим ПЕРЕД любыми другими импортами!)
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
setGenerator(() => uuidv4());


/* Остальной код приложения */
import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreenExpo from 'expo-splash-screen';

import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { DataProvider } from './src/context/DataContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { LocalizationProvider } from './src/context/LocalizationContext';
import { CurrencyProvider, useCurrency } from './src/context/CurrencyContext';

import { AuthNavigator } from './src/navigation/AuthNavigator';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SplashScreen } from './src/components/SplashScreen';
import { LocalDatabaseService } from './src/services/localDatabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Предотвращаем автоматическое скрытие нативного splash screen
SplashScreenExpo.preventAutoHideAsync();

/* ─────────────── AppContent ─────────────── */
function AppContent() {
  const { isDark } = useTheme();
  const { user, isLoading: authLoading, isPreparing } = useAuth();
  const { defaultCurrency } = useCurrency();
  const [dataProviderKey, setDataProviderKey] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  // Скрываем нативный сплэш-скрин сразу
  useEffect(() => {
    SplashScreenExpo.hideAsync();
  }, []);

  // Проверяем, был ли пройден onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        setShowOnboarding(!onboardingCompleted);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setShowOnboarding(true); // Показываем onboarding в случае ошибки
      } finally {
        setOnboardingLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  // Показываем кастомный сплэш-скрин на 10 секунд
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);

  // Пересоздаём DataProvider, если пользователь сменил валюту
  useEffect(() => {
    if (user) {
      setDataProviderKey(prev => prev + 1);
    }
  }, [defaultCurrency, user]);

  // Обновляем валюту в БД, когда всё готово
  useEffect(() => {
    if (user && !isPreparing && LocalDatabaseService.isDatabaseReady()) {
      LocalDatabaseService.updateDefaultCurrency(defaultCurrency);
    }
  }, [user, isPreparing, defaultCurrency]);

  // Обработчик завершения onboarding
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Показываем сплэш-скрин в течение 10 секунд или пока идет загрузка
  if (showSplash || authLoading || isPreparing || onboardingLoading) {
    return <SplashScreen />;
  }

  // Показываем onboarding для новых пользователей
  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {!user ? (
        <AuthNavigator />
      ) : (
        <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
          <SubscriptionProvider userId={user.id} isGuest={user.isGuest}>
            <DataProvider
              key={dataProviderKey}
              userId={user.id}
              defaultCurrency={defaultCurrency}
            >
              <BottomTabNavigator />
            </DataProvider>
          </SubscriptionProvider>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

/* ─────────────── Корневой компонент ─────────────── */
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
