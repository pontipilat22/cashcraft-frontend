import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AccountsScreen } from '../screens/AccountsScreen';
import { DebtListScreen } from '../screens/DebtListScreen';
import { BalanceHeader } from './BottomTabNavigator';

export type AccountsStackParamList = {
  AccountsMain: undefined;
  DebtList: { type: 'owe' | 'owed'; onUpdate?: () => void };
};

const Stack = createStackNavigator<AccountsStackParamList>();

export const AccountsNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="AccountsMain" 
        component={AccountsScreen}
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="DebtList" 
        component={DebtListScreen}
        options={{ 
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
}; 