import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';

interface AccountTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AccountTabs: React.FC<AccountTabsProps> = ({ activeTab, onTabChange }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();

  const tabs = [
    { id: 'cards', label: t('accounts.cardsAndAccounts') },
    { id: 'debts', label: t('accounts.debts') },
    { id: 'credits', label: t('accounts.credits') },
    { id: 'goals', label: t('accounts.savingsAccounts') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#2a2a2a' : '#F3F5F7' }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab,
              activeTab === tab.id && { borderBottomColor: colors.primary }
            ]}
            onPress={() => onTabChange(tab.id)}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.id ? colors.primary : colors.textSecondary },
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  tab: {
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
});
