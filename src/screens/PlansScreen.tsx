import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
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
    icon: keyof typeof Ionicons.glyphMap,
    type: 'essential' | 'nonEssential' | 'savings'
  ) => {
    const allocated = calculateAmount(percentage);
    let spent = 0;

    if (type === 'essential') {
      spent = trackingData.essentialSpent || 0;
    } else if (type === 'nonEssential') {
      spent = trackingData.nonEssentialSpent || 0;
    } else if (type === 'savings') {
      spent = trackingData.savingsAllocated || 0;
    }

    const remaining = allocated - spent;
    const progress = allocated > 0 ? (spent / allocated) * 100 : 0;
    const isOverspent = spent > allocated;

    return (
      <View style={[styles.budgetCard, { backgroundColor: colors.card }]}>
        <View style={styles.budgetHeader}>
          <View style={[styles.budgetIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <Text style={[styles.budgetTitle, { color: colors.text }]}>{title}</Text>
        </View>

        <View style={styles.budgetDetails}>
          <View style={styles.budgetRow}>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>
              {t('plans.allocated')}:
            </Text>
            <Text style={[styles.budgetValue, { color: colors.text }]}>
              {formatAmount(allocated)}
            </Text>
          </View>

          <View style={styles.budgetRow}>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>
              {type === 'savings' ? t('plans.saved') : t('plans.spent')}:
            </Text>
            <Text style={[styles.budgetValue, { color: isOverspent ? '#F44336' : color }]}>
              {formatAmount(spent)}
            </Text>
          </View>

          <View style={styles.budgetRow}>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>
              {t('plans.remaining')}:
            </Text>
            <Text style={[styles.budgetValue, {
              color: remaining >= 0 ? '#4CAF50' : '#F44336',
              fontWeight: '600'
            }]}>
              {formatAmount(remaining)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: isOverspent ? '#F44336' : color,
                  width: `${Math.min(progress, 100)}%`
                }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {progress.toFixed(0)}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <StatusBar backgroundColor={colors.card} barStyle={colors.text === '#FFFFFF' ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Верхний блок с закругленным низом - пустой, только для декора */}
        <View style={[styles.topCard, { backgroundColor: colors.card }]} />

        {/* Budget System Card - Clickable */}
        <TouchableOpacity
          style={[styles.card, styles.firstCard, { backgroundColor: colors.card, marginHorizontal: 16 }]}
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
          style={[styles.card, styles.regularCard, { backgroundColor: colors.card, marginHorizontal: 16 }]}
          onPress={() => navigation.navigate('CategorySettings')}
          activeOpacity={0.7}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>
                {t('plans.categoryManagement')}
              </Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                {t('plans.categoryManagementDescription')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {budgetSettings.enabled && (
          <>
            {/* Income Summary */}
            <View style={[styles.card, styles.regularCard, { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 16 }]}>
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
              <View style={[styles.budgetGrid, { paddingHorizontal: 16 }]}>
                {renderBudgetCard(
                  t('plans.essentialExpenses'),
                  budgetSettings.essentialPercentage,
                  '#FF6B6B',
                  'home-outline',
                  'essential'
                )}
                {renderBudgetCard(
                  t('plans.nonEssentialExpenses'),
                  budgetSettings.nonEssentialPercentage,
                  '#4ECDC4',
                  'gift-outline',
                  'nonEssential'
                )}
                {renderBudgetCard(
                  t('plans.savings'),
                  budgetSettings.savingsPercentage,
                  '#45B7D1',
                  'wallet-outline',
                  'savings'
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 16,
  },
  topCard: {
    height: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  firstCard: {
    marginTop: 16,
  },
  regularCard: {
    marginTop: 0,
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
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  budgetDetails: {
    marginBottom: 16,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 14,
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
});