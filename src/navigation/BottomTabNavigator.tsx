import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

import { AccountsScreen } from '../screens/AccountsScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { MoreScreen } from '../screens/MoreScreen';

export type BottomTabParamList = {
  Accounts: undefined;
  Transactions: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

// Компонент для отображения баланса в заголовке
const BalanceHeader: React.FC = () => {
  const { colors } = useTheme();
  const { totalBalance } = useData();

  return (
    <View style={styles.balanceHeader}>
      <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
        Общий баланс
      </Text>
      <Text style={[styles.balanceAmount, { color: colors.text }]}>
        {`₽${totalBalance.toLocaleString('ru-RU')}`}
      </Text>
    </View>
  );
};

export const BottomTabNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Accounts') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'list' : 'list-outline';
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
        component={AccountsScreen}
        options={{ 
          title: 'Счета',
          headerTitle: () => <BalanceHeader />
        }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen}
        options={{ 
          title: 'Транзакции',
          headerTitle: () => <BalanceHeader />
        }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreScreen}
        options={{ 
          title: 'Еще',
          headerTitle: () => <BalanceHeader />
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  balanceHeader: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
}); 