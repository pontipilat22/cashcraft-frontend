import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
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
import Svg, { Circle } from 'react-native-svg';

type PlansScreenNavigationProp = StackNavigationProp<PlansStackParamList, 'PlansMain'>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with 16px padding on sides and 16px gap

// Circular Progress Component
const CircularProgress: React.FC<{
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  backgroundColor: string;
}> = ({ size, strokeWidth, progress, color, backgroundColor }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={progressOffset}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
};

export const PlansScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
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

  const renderCompactBudgetCard = (
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
      spent = trackingData.savingsAmount || 0;
    }

    const remaining = allocated - spent;
    const progress = allocated > 0 ? (spent / allocated) * 100 : 0;
    const isOverspent = spent > allocated;

    return (
      <View style={[styles.compactCard, {
        backgroundColor: colors.card,
        width: CARD_WIDTH,
      }]}>
        {/* Icon and Title */}
        <View style={styles.compactHeader}>
          <View style={[styles.compactIcon, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
        </View>

        {/* Circular Progress */}
        <View style={styles.progressContainer}>
          <CircularProgress
            size={80}
            strokeWidth={8}
            progress={progress}
            color={isOverspent ? '#F44336' : color}
            backgroundColor={isDark ? '#2A2A2A' : '#F0F0F0'}
          />
          <View style={styles.progressCenter}>
            <Text style={[styles.progressPercentage, { color: isOverspent ? '#F44336' : color }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>

        {/* Amounts */}
        <View style={styles.amountRow}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
            {type === 'savings' ? t('plans.saved') : t('plans.spent')}
          </Text>
          <Text style={[styles.amountValue, { color: isOverspent ? '#F44336' : colors.text }]}>
            {formatAmount(spent)}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
            {t('plans.remaining')}
          </Text>
          <Text style={[styles.amountValue, {
            color: remaining >= 0 ? '#4CAF50' : '#F44336',
            fontWeight: '700'
          }]}>
            {formatAmount(remaining)}
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
          style={[styles.settingsCard, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('BudgetSystemSettings')}
          activeOpacity={0.7}
        >
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIconContainer, { backgroundColor: budgetSettings.enabled ? '#4CAF50' + '15' : colors.border }]}>
              <Ionicons
                name={budgetSettings.enabled ? "checkmark-circle" : "settings-outline"}
                size={24}
                color={budgetSettings.enabled ? '#4CAF50' : colors.textSecondary}
              />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={[styles.settingsTitle, { color: colors.text }]}>
                {t('plans.budgetSystem')}
              </Text>
              <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
                {budgetSettings.enabled
                  ? t('plans.budgetEnabled')
                  : t('plans.budgetDisabled')
                }
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Category Management Card */}
        <TouchableOpacity
          style={[styles.settingsCard, { backgroundColor: colors.card, marginTop: 12 }]}
          onPress={() => navigation.navigate('CategorySettings')}
          activeOpacity={0.7}
        >
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIconContainer, { backgroundColor: '#2196F3' + '15' }]}>
              <Ionicons name="pricetags-outline" size={24} color="#2196F3" />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={[styles.settingsTitle, { color: colors.text }]}>
                {t('plans.categoryManagement')}
              </Text>
              <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
                {t('plans.categoryManagementDescription')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {budgetSettings.enabled && (
          <>
            {/* Income Summary - Compact */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <View style={styles.summaryHeader}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  {t('plans.currentMonth')}
                </Text>
                <View style={[styles.incomeBadge, { backgroundColor: '#4CAF50' + '15' }]}>
                  <Ionicons name="trending-up" size={16} color="#4CAF50" />
                  <Text style={[styles.incomeBadgeText, { color: '#4CAF50' }]}>
                    {formatAmount(trackingData.totalIncomeThisMonth)}
                  </Text>
                </View>
              </View>

              {trackingData.totalIncomeThisMonth > 0 && (
                <View style={styles.dailyStatsGrid}>
                  <View style={styles.dailyStatItem}>
                    <Ionicons name="calendar-outline" size={18} color="#45B7D1" />
                    <View style={styles.dailyStatInfo}>
                      <Text style={[styles.dailyStatLabel, { color: colors.textSecondary }]}>
                        {t('plans.dailyBudget')}
                      </Text>
                      <Text style={[styles.dailyStatValue, { color: colors.text }]}>
                        {formatAmount(getDailyBudget())}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dailyStatItem}>
                    <Ionicons name="remove-circle-outline" size={18} color="#FF5722" />
                    <View style={styles.dailyStatInfo}>
                      <Text style={[styles.dailyStatLabel, { color: colors.textSecondary }]}>
                        {t('plans.spentToday')}
                      </Text>
                      <Text style={[styles.dailyStatValue, { color: colors.text }]}>
                        {formatAmount(getSpentToday())}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dailyStatItem}>
                    <Ionicons
                      name={getDailyAllowance() >= 0 ? "checkmark-circle-outline" : "alert-circle-outline"}
                      size={18}
                      color={getDailyAllowance() >= 0 ? '#4CAF50' : '#F44336'}
                    />
                    <View style={styles.dailyStatInfo}>
                      <Text style={[styles.dailyStatLabel, { color: colors.textSecondary }]}>
                        {t('plans.canSpendToday')}
                      </Text>
                      <Text style={[styles.dailyStatValue, {
                        color: getDailyAllowance() >= 0 ? '#4CAF50' : '#F44336',
                        fontWeight: '700'
                      }]}>
                        {formatAmount(getDailyAllowance())}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {trackingData.totalIncomeThisMonth === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="information-circle-outline" size={32} color={colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                    {t('plans.addIncomeToStart')}
                  </Text>
                </View>
              )}
            </View>

            {/* Budget Cards Grid - Compact */}
            {trackingData.totalIncomeThisMonth > 0 && (
              <View style={styles.budgetGrid}>
                {renderCompactBudgetCard(
                  t('plans.essentialExpenses'),
                  budgetSettings.essentialPercentage,
                  '#FF6B6B',
                  'home-outline',
                  'essential'
                )}
                {renderCompactBudgetCard(
                  t('plans.nonEssentialExpenses'),
                  budgetSettings.nonEssentialPercentage,
                  '#4ECDC4',
                  'gift-outline',
                  'nonEssential'
                )}
                {renderCompactBudgetCard(
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
        <View style={{ height: 20 }} />
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
  settingsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsInfo: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 13,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  incomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  incomeBadgeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dailyStatsGrid: {
    gap: 12,
  },
  dailyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dailyStatInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyStatLabel: {
    fontSize: 14,
  },
  dailyStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 16,
  },
  compactCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  compactHeader: {
    marginBottom: 12,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  progressCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    minHeight: 36,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: 12,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
