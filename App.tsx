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

import { AuthScreen } from './src/screens/AuthScreen';
import { SplashScreen } from './src/components/SplashScreen';
import { LocalDatabaseService } from './src/services/localDatabase';
import { PinLockScreen } from './src/screens/PinLockScreen';
import { pinService } from './src/services/pinService';

// Предотвращаем автоматическое скрытие нативного splash screen
SplashScreenExpo.preventAutoHideAsync();

/* ─────────────── AppContent ─────────────── */
function AppContent() {
  const { isDark } = useTheme();
  const { user, isLoading: authLoading, isPreparing } = useAuth();
  const { defaultCurrency } = useCurrency();
  const [dataProviderKey, setDataProviderKey] = useState(0);
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [isPinChecking, setIsPinChecking] = useState(true);

  // Скрываем сплэш-скрин после инициализации
  useEffect(() => {
    SplashScreenExpo.hideAsync();
  }, []);

  // Проверяем, нужна ли проверка PIN-кода
  useEffect(() => {
    const checkPinStatus = async () => {
      if (user) {
        try {
          const isPinEnabled = await pinService.isPinEnabled();
          setIsPinLocked(isPinEnabled);
        } catch (error) {
          console.error('Error checking PIN status:', error);
        }
      }
      setIsPinChecking(false);
    };

    checkPinStatus();
  }, [user]);

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

  if (authLoading || isPreparing || isPinChecking) {
    return <SplashScreen />;
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
      </SafeAreaProvider>
    );
  }

  if (isPinLocked) {
    return (
      <SafeAreaProvider>
        <PinLockScreen onSuccess={() => setIsPinLocked(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
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
