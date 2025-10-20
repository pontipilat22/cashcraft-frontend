import React, { useState, useEffect } from 'react'; // экспорт Реакта
import {//Импорт компонентов
  View,//Импорт компонентов
  Text,//Импорт компонентов
  StyleSheet,//Импорт компонентов
  ScrollView,//Импорт компонентов
  TouchableOpacity,//Импорт компонентов
  TextInput,//Импорт компонентов
  Switch,//Импорт компонентов 
  Alert,//Импорт компонентов 
} from 'react-native'; //Импорт компонентов
import { SafeAreaView } from 'react-native-safe-area-context'; // Чтобы обьекты не укодили за рамки экрана
import { Ionicons } from '@expo/vector-icons';//Импорт иконок
import { useNavigation } from '@react-navigation/native'; // Импорт навигации
import { useTheme } from '../context/ThemeContext'; //Импорт Темы
import { useLocalization } from '../context/LocalizationContext'; // Импорт перевода страницы
import { useBudgetContext } from '../context/BudgetContext'; //Импорт базы данных

export const BudgetSystemSettings: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation();
  const { budgetSettings, saveBudgetSettings, reloadData } = useBudgetContext();

  const [isEnabled, setIsEnabled] = useState(budgetSettings.enabled);
  const [tempPercentages, setTempPercentages] = useState({
    essential: budgetSettings.essentialPercentage.toString(),
    nonEssential: budgetSettings.nonEssentialPercentage.toString(),
    savings: budgetSettings.savingsPercentage.toString(),
  });

  // Update state when budget settings change
  useEffect(() => {
    setIsEnabled(budgetSettings.enabled);
    setTempPercentages({
      essential: budgetSettings.essentialPercentage.toString(),
      nonEssential: budgetSettings.nonEssentialPercentage.toString(),
      savings: budgetSettings.savingsPercentage.toString(),
    });
  }, [budgetSettings]);

  const getCurrentTotal = () => {
    const essential = parseFloat(tempPercentages.essential) || 0;
    const nonEssential = parseFloat(tempPercentages.nonEssential) || 0;
    const savings = parseFloat(tempPercentages.savings) || 0;
    return essential + nonEssential + savings;
  };

  const handleToggleBudgetSystem = async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    const newSettings = { ...budgetSettings, enabled: newValue };
    await saveBudgetSettings(newSettings);
    await reloadData();
  };

  const resetToDefault = () => {
    setTempPercentages({
      essential: '50',
      nonEssential: '30',
      savings: '20',
    });
  };

  const saveSettings = async () => {
    const total = getCurrentTotal();
    if (total !== 100) {
      Alert.alert(t('plans.totalMustBe100'), `${t('plans.currentTotal')}: ${total}%`);
      return;
    }

    const newSettings = {
      ...budgetSettings,
      enabled: isEnabled,
      essentialPercentage: parseFloat(tempPercentages.essential),
      nonEssentialPercentage: parseFloat(tempPercentages.nonEssential),
      savingsPercentage: parseFloat(tempPercentages.savings),
    };

    await saveBudgetSettings(newSettings);
    await reloadData();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('plans.budgetSystemSettings')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('plans.budgetSystemDescription')}
          </Text>
        </View>

        {/* Enable/Disable Toggle */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>
                {t('plans.enableBudgetSystem')}
              </Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                {isEnabled ? t('plans.budgetEnabled') : t('plans.budgetDisabled')}
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={handleToggleBudgetSystem}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* Percentage Settings */}
        {isEnabled && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
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

              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: colors.border }]}
                onPress={resetToDefault}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.text} />
                <Text style={[styles.resetButtonText, { color: colors.text }]}>
                  {t('common.reset')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Information Card */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {t('plans.budgetSystemInfo')}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={saveSettings}
        >
          <Text style={styles.saveButtonText}>{t('common.save')}</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
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
    marginBottom: 20,
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
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
