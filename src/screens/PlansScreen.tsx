import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useBudgetContext } from '../context/BudgetContext';
import { PlansStackParamList } from '../navigation/PlansNavigator';

type PlansScreenNavigationProp = StackNavigationProp<PlansStackParamList, 'PlansMain'>;

export const PlansScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { formatAmount } = useCurrency();
  const navigation = useNavigation<PlansScreenNavigationProp>();
  const { budgetSettings, trackingData, reloadData, getDailyAllowance, getDailyBudget, getSpentToday } = useBudgetContext();

  // Reload data when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 [PlansScreen] Screen focused, reloading budget data...');
      reloadData();
    }, [reloadData])
  );

  // Debug состояния бюджета
  React.useEffect(() => {
    console.log('📊 [PlansScreen] Budget settings:', {
      enabled: budgetSettings.enabled,
      totalIncome: trackingData.totalIncomeThisMonth,
      dailyBudget: trackingData.dailyBudget
    });
  }, [budgetSettings.enabled, trackingData.totalIncomeThisMonth, trackingData.dailyBudget]);

  const calculateAmount = (percentage: number) => {
    return (trackingData.totalIncomeThisMonth * percentage) / 100;
  };

  const renderBudgetCard = (
    title: string,
    percentage: number,
    color: string,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <View style={[styles.budgetCard, { backgroundColor: colors.card }]}>
      <View style={styles.budgetHeader}>
        <View style={[styles.budgetIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <Text style={[styles.budgetTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.budgetPercentage, { color: color }]}>{percentage}%</Text>
      {trackingData.totalIncomeThisMonth > 0 && (
        <Text style={[styles.budgetAmount, { color: colors.textSecondary }]}>
          {formatAmount(calculateAmount(percentage))}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Budget System Card - Clickable */}
        <TouchableOpacity
          style={[styles.card, styles.firstCard, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('BudgetSystemSettings')}
          activeOpacity={0.7}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>
                {t('plans.budgetSystem')}
              </Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                {budgetSettings.enabled
                  ? t('plans.budgetEnabled')
                  : t('plans.budgetDisabled')
                }
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Category Management Card */}
        <TouchableOpacity
          style={[styles.card, styles.regularCard, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('CategorySettings')}
          activeOpacity={0.7}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>
                Управление категориями
              </Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                Создавайте и настраивайте категории
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {budgetSettings.enabled && (
          <>
            {/* Income Summary */}
            <View style={[styles.card, styles.regularCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t('plans.currentMonth')}
              </Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t('transactions.income')}:
                </Text>
                <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
                  {formatAmount(trackingData.totalIncomeThisMonth)}
                </Text>
              </View>
              {trackingData.totalIncomeThisMonth > 0 && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      {t('plans.dailyBudget')}:
                    </Text>
                    <Text style={[styles.summaryAmount, { color: '#45B7D1' }]}>
                      {formatAmount(getDailyBudget())}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      {t('plans.spentToday')}:
                    </Text>
                    <Text style={[styles.summaryAmount, { color: '#FF5722' }]}>
                      {formatAmount(getSpentToday())}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      {t('plans.canSpendToday')}:
                    </Text>
                    <Text style={[styles.summaryAmount, { color: getDailyAllowance() >= 0 ? '#4CAF50' : '#F44336' }]}>
                      {formatAmount(getDailyAllowance())}
                    </Text>
                  </View>
                </>
              )}
              {trackingData.totalIncomeThisMonth === 0 && (
                <Text style={[styles.incomeHint, { color: colors.textSecondary }]}>
                  {t('plans.addIncomeToStart')}
                </Text>
              )}
            </View>

            {/* Budget Cards */}
            {trackingData.totalIncomeThisMonth > 0 && (
              <View style={styles.budgetGrid}>
                {renderBudgetCard(
                  t('plans.essentialExpenses'),
                  budgetSettings.essentialPercentage,
                  '#FF6B6B',
                  'home-outline'
                )}
                {renderBudgetCard(
                  t('plans.nonEssentialExpenses'),
                  budgetSettings.nonEssentialPercentage,
                  '#4ECDC4',
                  'gift-outline'
                )}
                {renderBudgetCard(
                  t('plans.savings'),
                  budgetSettings.savingsPercentage,
                  '#45B7D1',
                  'wallet-outline'
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  firstCard: {
    marginTop: 60,
  },
  regularCard: {
    marginTop: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  incomeHint: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '600',
  },
  budgetGrid: {
    gap: 12,
    marginBottom: 16,
  },
  budgetCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  budgetPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: '500',
  },
});