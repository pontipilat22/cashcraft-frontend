import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { MoreScreen } from '../screens/MoreScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { HelpScreen } from '../screens/HelpScreen';

export type MoreStackParamList = {
  MoreMain: undefined;
  Settings: undefined;
  Categories: undefined;
  Statistics: undefined;
  PrivacyPolicy: undefined;
  Help: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export const MoreNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="MoreMain"
        component={MoreScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}; 