import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useBudgetContext } from '../context/BudgetContext';
import { useFAB } from '../context/FABContext';
import { BalanceHeader } from '../components/BalanceHeader';
import { LiquidGlassTabBar } from '../components/LiquidGlassTabBar';
import { useInterstitialAd } from '../hooks/useInterstitialAd';

import { AccountsNavigator } from './AccountsNavigator';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { PlansNavigator } from './PlansNavigator';
import { MoreNavigator } from './MoreNavigator';

export type BottomTabParamList = {
  Accounts: undefined;
  Transactions: undefined;
  Plans: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

// Компонент для отслеживания фокуса экрана и показа рекламы
const ScreenWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigation = useNavigation();
  const { trackTabSwitch } = useInterstitialAd();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[BottomTabNavigator] Tab focused, checking ad...');
      trackTabSwitch();
    });

    return unsubscribe;
  }, [navigation, trackTabSwitch]);

  return <>{children}</>;
};

export const BottomTabNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { isEnabled: isBudgetEnabled } = useBudgetContext();
  const { toggleFABMenu } = useFAB();

  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} onFABPress={toggleFABMenu} />}
      initialRouteName="Accounts"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Accounts') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
          } else if (route.name === 'Plans') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'menu' : 'menu-outline';
          } else {
            iconName = 'alert-circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarHideOnKeyboard: true,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.text,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        animation: 'none', // Отключаем анимацию переходов
      })}
      sceneContainerStyle={{
        backgroundColor: colors.background,
      }}
    >
      <Tab.Screen
        name="Accounts"
        options={{
          title: t('navigation.accounts'),
          headerShown: false,
        }}
      >
        {() => (
          <ScreenWrapper>
            <AccountsNavigator />
          </ScreenWrapper>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Transactions"
        options={{
          title: t('navigation.transactions'),
          headerTitle: () => (
            <BalanceHeader
              key={`header-budget-${isBudgetEnabled ? 'on' : 'off'}`} // Принудительное обновление
              showDailyAllowance={true}
              isBudgetEnabled={isBudgetEnabled}
            />
          ),
          headerTitleAlign: 'left',
          headerStyle: {
            backgroundColor: colors.card,
            shadowColor: 'transparent',
            elevation: 0,
          },
        }}
      >
        {() => (
          <ScreenWrapper>
            <TransactionsScreen />
          </ScreenWrapper>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Plans"
        options={{
          title: t('navigation.plans'),
          headerShown: false,
        }}
      >
        {() => (
          <ScreenWrapper>
            <PlansNavigator />
          </ScreenWrapper>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="More"
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);

          // Скрываем tab bar на следующих экранах:
          const hideTabBarScreens = ['AIAssistant', 'Settings', 'Help', 'ExportImport', 'SetPin'];

          return {
            title: t('navigation.more'),
            headerShown: false,
            tabBarStyle: hideTabBarScreens.includes(routeName || '')
              ? { display: 'none' }
              : { display: 'flex' }, // Явно указываем display: flex
          };
        }}
      >
        {() => (
          <ScreenWrapper>
            <MoreNavigator />
          </ScreenWrapper>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

 