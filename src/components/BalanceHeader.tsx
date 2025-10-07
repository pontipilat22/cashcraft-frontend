import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useBudgetContext } from '../context/BudgetContext';

interface BalanceHeaderProps {
  showDailyAllowance?: boolean;
  isBudgetEnabled?: boolean; // Проп для принудительного обновления
}

export const BalanceHeader: React.FC<BalanceHeaderProps> = ({
  showDailyAllowance = false,
  isBudgetEnabled: propIsBudgetEnabled
}) => {
  const { colors } = useTheme();
  const { totalBalance } = useData();
  const { t } = useLocalization();
  const { formatAmount } = useCurrency();
  const { isEnabled: contextIsBudgetEnabled, getDailyAllowance, trackingData } = useBudgetContext();

  // Используем проп, если передан, иначе берем из контекста
  const isBudgetEnabled = propIsBudgetEnabled !== undefined ? propIsBudgetEnabled : contextIsBudgetEnabled;

  // Пересчитываем дневной лимит при изменении данных
  const dailyAllowance = React.useMemo(() => {
    if (!isBudgetEnabled) {
      console.log('🔴 [BalanceHeader] Budget disabled, returning 0');
      return 0;
    }
    const allowance = getDailyAllowance();
    console.log('💰 [BalanceHeader] Daily allowance calculated:', {
      isBudgetEnabled,
      showDailyAllowance,
      dailyBudget: trackingData.dailyBudget,
      spentToday: trackingData.spentToday,
      allowance
    });
    return allowance;
  }, [isBudgetEnabled, getDailyAllowance, trackingData.dailyBudget, trackingData.spentToday, showDailyAllowance]);

  return (
    <View style={styles.balanceHeader}>
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
          {t('accounts.totalBalance')}
        </Text>
        <Text style={[styles.balanceAmount, { color: colors.text }]}>
          {formatAmount(totalBalance)}
        </Text>
      </View>
      {isBudgetEnabled && showDailyAllowance && (
        <View style={styles.dailyAllowanceSection}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
            {t('plans.canSpendToday')}
          </Text>
          <Text style={[styles.dailyAllowanceAmount, {
            color: dailyAllowance > 0 ? '#4CAF50' : dailyAllowance === 0 ? '#FF9800' : '#F44336'
          }]}>
            {formatAmount(dailyAllowance)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 5,
    paddingTop: 4,
    width: '100%',
  },
  balanceSection: {
    alignItems: 'flex-start',
  },
  dailyAllowanceSection: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '600',
  },
  dailyAllowanceAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
});