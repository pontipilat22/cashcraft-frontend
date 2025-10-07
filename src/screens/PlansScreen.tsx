import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useBudgetContext } from '../context/BudgetContext';

export const PlansScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { formatAmount } = useCurrency();
  const { budgetSettings, saveBudgetSettings, getBudgetAmounts, trackingData, reloadData, getDailyAllowance, getDailyBudget, getSpentToday } = useBudgetContext();

  const [showCustomization, setShowCustomization] = useState(false);
  const [tempPercentages, setTempPercentages] = useState({
    essential: budgetSettings.essentialPercentage.toString(),
    nonEssential: budgetSettings.nonEssentialPercentage.toString(),
    savings: budgetSettings.savingsPercentage.toString(),
  });

  // Update temp percentages when budget settings change
  useEffect(() => {
    setTempPercentages({
      essential: budgetSettings.essentialPercentage.toString(),
      nonEssential: budgetSettings.nonEssentialPercentage.toString(),
      savings: budgetSettings.savingsPercentage.toString(),
    });
  }, [budgetSettings]);

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

  const toggleBudgetSystem = async () => {
    const newSettings = { ...budgetSettings, enabled: !budgetSettings.enabled };
    await saveBudgetSettings(newSettings);
    // Перезагружаем данные для немедленного обновления UI
    await reloadData();
  };


  const getCurrentTotal = () => {
    const essential = parseFloat(tempPercentages.essential) || 0;
    const nonEssential = parseFloat(tempPercentages.nonEssential) || 0;
    const savings = parseFloat(tempPercentages.savings) || 0;
    return essential + nonEssential + savings;
  };

  const saveCustomPercentages = async () => {
    const total = getCurrentTotal();
    if (total !== 100) {
      Alert.alert(t('plans.totalMustBe100'), `${t('plans.currentTotal')}: ${total}%`);
      return;
    }

    const newSettings = {
      ...budgetSettings,
      essentialPercentage: parseFloat(tempPercentages.essential),
      nonEssentialPercentage: parseFloat(tempPercentages.nonEssential),
      savingsPercentage: parseFloat(tempPercentages.savings),
    };

    await saveBudgetSettings(newSettings);
    setShowCustomization(false);
  };

  const resetToDefault = () => {
    setTempPercentages({
      essential: '50',
      nonEssential: '30',
      savings: '20',
    });
  };

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

  const renderCustomizationModal = () => (
    <View style={[styles.customizationCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.customizationTitle, { color: colors.text }]}>
        {t('plans.customizePercentages')}
      </Text>

      <View style={styles.inputRow}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
          {t('plans.essentialExpenses')}:
        </Text>
        <TextInput
          style={[styles.percentageInput, { backgroundColor: colors.background, color: colors.text }]}
          value={tempPercentages.essential}
          onChangeText={(value) => setTempPercentages(prev => ({ ...prev, essential: value }))}
          keyboardType="numeric"
          maxLength={3}
        />
        <Text style={[styles.percentSign, { color: colors.textSecondary }]}>%</Text>
      </View>

      <View style={styles.inputRow}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
          {t('plans.nonEssentialExpenses')}:
        </Text>
        <TextInput
          style={[styles.percentageInput, { backgroundColor: colors.background, color: colors.text }]}
          value={tempPercentages.nonEssential}
          onChangeText={(value) => setTempPercentages(prev => ({ ...prev, nonEssential: value }))}
          keyboardType="numeric"
          maxLength={3}
        />
        <Text style={[styles.percentSign, { color: colors.textSecondary }]}>%</Text>
      </View>

      <View style={styles.inputRow}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
          {t('plans.savings')}:
        </Text>
        <TextInput
          style={[styles.percentageInput, { backgroundColor: colors.background, color: colors.text }]}
          value={tempPercentages.savings}
          onChangeText={(value) => setTempPercentages(prev => ({ ...prev, savings: value }))}
          keyboardType="numeric"
          maxLength={3}
        />
        <Text style={[styles.percentSign, { color: colors.textSecondary }]}>%</Text>
      </View>

      <Text style={[styles.totalText, {
        color: getCurrentTotal() === 100 ? colors.success || '#4CAF50' : colors.error || '#F44336'
      }]}>
        {t('plans.currentTotal')}: {getCurrentTotal()}%
      </Text>

      <View style={styles.customizationButtons}>
        <TouchableOpacity
          style={[styles.customButton, { backgroundColor: colors.border }]}
          onPress={() => setShowCustomization(false)}
        >
          <Text style={[styles.customButtonText, { color: colors.text }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.customButton, { backgroundColor: colors.textSecondary }]}
          onPress={resetToDefault}
        >
          <Text style={[styles.customButtonText, { color: '#fff' }]}>
            {t('common.reset')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.customButton, { backgroundColor: colors.primary }]}
          onPress={saveCustomPercentages}
        >
          <Text style={[styles.customButtonText, { color: '#fff' }]}>
            {t('common.save')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('plans.title')}</Text>
        </View>

        {/* Budget System Toggle */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>
                {t('plans.budgetSystem')}
              </Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                {budgetSettings.enabled ? t('plans.budgetEnabled') : t('plans.budgetDisabled')}
              </Text>
            </View>
            <Switch
              value={budgetSettings.enabled}
              onValueChange={toggleBudgetSystem}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {budgetSettings.enabled && (
          <>
            {/* Income Summary */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
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

            {/* Customize Button */}
            <TouchableOpacity
              style={[styles.customizeButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowCustomization(true)}
            >
              <Ionicons name="settings-outline" size={20} color="#fff" />
              <Text style={styles.customizeButtonText}>
                {t('plans.customizePercentages')}
              </Text>
            </TouchableOpacity>

            {/* Customization Panel */}
            {showCustomization && renderCustomizationModal()}
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
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  incomeInput: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  setIncomeButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  setIncomeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  customizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  customizationCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  customizationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: {
    flex: 1,
    fontSize: 16,
  },
  percentageInput: {
    width: 80,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    marginRight: 8,
  },
  percentSign: {
    fontSize: 16,
    width: 20,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 16,
  },
  customizationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  customButton: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});