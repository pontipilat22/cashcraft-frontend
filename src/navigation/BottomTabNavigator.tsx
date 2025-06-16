import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';

import { AccountsNavigator } from './AccountsNavigator';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { MoreNavigator } from './MoreNavigator';

export type BottomTabParamList = {
  Accounts: undefined;
  Transactions: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

// Компонент для отображения баланса в заголовке
export const BalanceHeader: React.FC = () => {
  const { colors } = useTheme();
  const { totalBalance } = useData();
  const { t } = useLocalization();
  const { formatAmount } = useCurrency();

  return (
    <View style={styles.balanceHeader}>
      <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
        {t('accounts.totalBalance')}
      </Text>
      <Text style={[styles.balanceAmount, { color: colors.text }]}>
        {formatAmount(totalBalance)}
      </Text>
    </View>
  );
};

export const BottomTabNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Accounts') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'receipt' : 'receipt-outline';
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
          headerTitle: () => <BalanceHeader />,
          headerTitleAlign: 'left',
        }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen}
        options={{ 
          title: t('navigation.transactions'),
          headerTitle: () => <BalanceHeader />,
          headerTitleAlign: 'left',
        }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreNavigator}
        options={{ 
          title: t('navigation.more'),
          headerTitle: t('navigation.more'),
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  balanceHeader: {
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 15,
  },
  balanceLabel: {
    fontSize: 12,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '600',
  },
}); 