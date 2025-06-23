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
import { LocalDatabaseService } from './src/services/localDatabase';

// Предотвращаем автоматическое скрытие нативного splash screen
SplashScreenExpo.preventAutoHideAsync();

function AppContent() {
  const { isDark, colors } = useTheme();
  const { user, isLoading: authLoading, isPreparing } = useAuth();
  const { defaultCurrency } = useCurrency();
  const [dataProviderKey, setDataProviderKey] = useState(0);

  useEffect(() => {
    // Принудительно скрываем нативный сплэш-скрин после инициализации
    SplashScreenExpo.hideAsync();
  }, []);

  // Обновляем DataProvider при изменении валюты
  useEffect(() => {
    if (user) {
      setDataProviderKey(prev => prev + 1);
    }
  }, [defaultCurrency, user]);

  // Обновляем валюту по умолчанию в базе данных после инициализации
  useEffect(() => {
    if (user && !isPreparing && LocalDatabaseService.isDatabaseReady()) {
      LocalDatabaseService.updateDefaultCurrency(defaultCurrency);
    }
  }, [user, isPreparing, defaultCurrency]);

  if (authLoading || isPreparing) {
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
