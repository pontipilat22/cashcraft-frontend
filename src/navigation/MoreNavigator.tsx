import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { MoreScreen } from '../screens/MoreScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/TermsOfServiceScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { ExportImportScreen } from '../screens/ExportImportScreen';
import { SetPinScreen } from '../screens/SetPinScreen';
import { CategorySettingsScreen } from '../screens/CategorySettingsScreen';
// AI временно отключен
// import { AIAssistantScreen } from '../screens/AIAssistantScreen';

export type MoreStackParamList = {
  MoreMain: undefined;
  Settings: undefined;
  Categories: undefined;
  CategorySettings: undefined;
  Statistics: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  Help: undefined;
  ExportImport: undefined;
  SetPin: { isChangingPin?: boolean } | undefined;
  // AI временно отключен
  // AIAssistant: undefined;
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
      {/* Все ваши существующие экраны остаются без изменений */}
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
        name="CategorySettings"
        component={CategorySettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ExportImport"
        component={ExportImportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SetPin"
        component={SetPinScreen}
        options={{ headerShown: false }}
      />
      {/* AI временно отключен */}
      {/* <Stack.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
        listeners={({ navigation }) => ({
          focus: () => {
            const parent = navigation.getParent();
            if (parent) { parent.setOptions({ tabBarStyle: { display: 'none' } }); }
          },
          blur: () => {
            const parent = navigation.getParent();
            if (parent) { parent.setOptions({ tabBarStyle: { display: 'flex' } }); }
          },
        })}
      /> */}
    </Stack.Navigator>
  );
};