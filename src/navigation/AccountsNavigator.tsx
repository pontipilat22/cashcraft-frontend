import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AccountsScreen } from '../screens/AccountsScreen';
import { DebtListScreen } from '../screens/DebtListScreen';
import { CreditDetailsScreen } from '../screens/CreditDetailsScreen';
import { BalanceHeader } from '../components/BalanceHeader';
import { useTheme } from '../context/ThemeContext';
import { useBudgetContext } from '../context/BudgetContext';

export type AccountsStackParamList = {
  AccountsMain: undefined;
  DebtList: { type: 'owed_to_me' | 'owed_by_me' };
  CreditDetails: { accountId: string };
};

const Stack = createStackNavigator<AccountsStackParamList>();

export const AccountsNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { isEnabled: isBudgetEnabled } = useBudgetContext();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#232323' : '#FFFFFF',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="AccountsMain"
        component={AccountsScreen}
        options={{
          headerShown: true,
          headerTitle: () => (
            <BalanceHeader
              key={`accounts-header-budget-${isBudgetEnabled ? 'on' : 'off'}`} // Принудительное обновление
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
      <Stack.Screen
        name="DebtList"
        component={DebtListScreen}
        options={{
          headerShown: true,
          headerTitle: () => (
            <BalanceHeader
              key={`debt-header-budget-${isBudgetEnabled ? 'on' : 'off'}`} // Принудительное обновление
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
      <Stack.Screen
        name="CreditDetails"
        component={CreditDetailsScreen}
        options={{
          headerShown: true,
          title: 'Детали кредита',
          headerStyle: {
            backgroundColor: isDark ? '#232323' : '#FFFFFF',
            shadowColor: 'transparent',
            elevation: 0,
          },
        }}
      />
    </Stack.Navigator>
  );
}; 