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

// Предотвращаем автоматическое скрытие нативного splash screen
SplashScreenExpo.preventAutoHideAsync();

function AppContent() {
  const { isDark, colors } = useTheme();
  const { user, isLoading: authLoading } = useAuth();
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [forceHideSplash, setForceHideSplash] = useState(false);

  console.log('AppContent render:', {
    user: user?.email || 'null',
    authLoading,
    showCustomSplash,
    forceHideSplash
  });

  useEffect(() => {
    const prepare = async () => {
      console.log('App: Starting prepare function');
      
      try {
        // Скрываем нативный splash screen
        await SplashScreenExpo.hideAsync();
        console.log('App: Native splash hidden');
      } catch (error) {
        console.error('App: Error hiding native splash:', error);
      }
      
      // Показываем кастомный splash screen минимум 2 секунды
      setTimeout(() => {
        console.log('App: Setting showCustomSplash to false');
        setShowCustomSplash(false);
      }, 2000);
      
      // Аварийный таймаут - скрываем splash через 5 секунд в любом случае
      setTimeout(() => {
        console.log('App: Force hiding splash screen');
        setForceHideSplash(true);
      }, 5000);
    };
    
    prepare();
  }, []);

  console.log('App: Rendering, conditions:', {
    showCustomSplash,
    authLoading,
    forceHideSplash,
    shouldShowSplash: (showCustomSplash || authLoading) && !forceHideSplash
  });

  if ((showCustomSplash || authLoading) && !forceHideSplash) {
    console.log('App: Showing splash screen');
    return <SplashScreen />;
  }

  console.log('App: Showing main content, user:', user?.email || 'none');

  return (
    <SafeAreaProvider>
      {!user ? (
        <AuthScreen />
      ) : (
        <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
          <SubscriptionProvider userId={user.id} isGuest={user.isGuest}>
            <DataProvider userId={user.id}>
              <BottomTabNavigator />
            </DataProvider>
          </SubscriptionProvider>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  console.log('App: Root component render');
  
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
