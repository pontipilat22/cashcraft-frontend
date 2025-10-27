import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { PlansScreen } from '../screens/PlansScreen';
import { BudgetSystemSettings } from '../screens/BudgetSystemSettings';
import { CategorySettingsScreen } from '../screens/CategorySettingsScreen';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';

export type PlansStackParamList = {
  PlansMain: undefined;
  BudgetSystemSettings: undefined;
  CategorySettings: undefined;
};

const Stack = createStackNavigator<PlansStackParamList>();

export const PlansNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="PlansMain"
        component={PlansScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="BudgetSystemSettings"
        component={BudgetSystemSettings}
        options={{
          headerShown: true,
          title: t('plans.budgetSystemSettings'),
          headerBackTitle: t('common.back'),
        }}
      />
      <Stack.Screen
        name="CategorySettings"
        component={CategorySettingsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};
