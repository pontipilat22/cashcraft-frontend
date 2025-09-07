import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';

const { width: screenWidth } = Dimensions.get('window');

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

  // Рассчитываем ширину каждой вкладки
  const tabWidth = screenWidth / tabs.length;
  
  // Проверяем, помещаются ли все вкладки без прокрутки
  // Минимальная ширина вкладки для комфортного чтения - 90px
  // Для планшетов и больших экранов используем равномерное распределение
  const needsScroll = tabWidth < 90;

  const styles = StyleSheet.create({
    container: {
      height: 48,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    scrollContent: {
      paddingHorizontal: needsScroll ? 16 : 0,
      flexGrow: 1,
    },
    flexContainer: {
      flexDirection: 'row',
      flex: 1,
    },
    tab: {
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      // Адаптивная ширина
      ...(needsScroll 
        ? { paddingHorizontal: 16, marginRight: 8 } // Для скролла - фиксированные отступы
        : { flex: 1 } // Для больших экранов - равномерное распределение
      ),
    },
    activeTab: {
      borderBottomWidth: 2,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      ...(needsScroll 
        ? {} // Для скролла - обычный текст
        : { paddingHorizontal: 4 } // Для больших экранов - небольшие отступы
      ),
    },
    activeTabText: {
      fontWeight: '600',
    },
  });

  if (needsScroll) {
    // Маленькие экраны - используем ScrollView
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
  } else {
    // Большие экраны - равномерное распределение без скролла
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#2a2a2a' : '#F3F5F7' }]}>
        <View style={styles.flexContainer}>
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
              ]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
};

