import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useBudgetContext } from '../context/BudgetContext';
import { BalanceHeader } from '../components/BalanceHeader';

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

export const BottomTabNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { isEnabled: isBudgetEnabled } = useBudgetContext();

  return (
    <Tab.Navigator
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
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      })}
    >
      <Tab.Screen
        name="Accounts"
        component={AccountsNavigator}
        options={{
          title: t('navigation.accounts'),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
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
            backgroundColor: isDark ? '#232323' : '#FFFFFF',
            shadowColor: 'transparent',
            elevation: 0,
          },
        }}
      />
      <Tab.Screen
        name="Plans"
        component={PlansNavigator}
        options={{
          title: t('navigation.plans'),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          title: t('navigation.more'),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

 