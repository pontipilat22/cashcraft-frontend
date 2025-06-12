import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { LocalDatabaseService } from '../services/localDatabase';
import { CURRENCIES } from '../config/currencies';

interface ExchangeRatesManagerProps {
  visible: boolean;
  onClose: () => void;
}

interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  isEditing?: boolean;
}

export const ExchangeRatesManager: React.FC<ExchangeRatesManagerProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { currencies, defaultCurrency } = useCurrency();
  
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCurrency, setFromCurrency] = useState(defaultCurrency);
  const [toCurrency, setToCurrency] = useState('USD');
  const [fromAmount, setFromAmount] = useState('1');
  const [toAmount, setToAmount] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      loadExchangeRates();
    }
  }, [visible]);

  const loadExchangeRates = async () => {
    try {
      setLoading(true);
      
      // Получаем все уникальные пары валют
      const allRates: ExchangeRate[] = [];
      const processedPairs = new Set<string>();
      
      // Загружаем курсы для основной валюты
      const mainRates = await LocalDatabaseService.getStoredRates(defaultCurrency);
      for (const [currency, rate] of Object.entries(mainRates)) {
        const pairKey = `${defaultCurrency}-${currency}`;
        if (!processedPairs.has(pairKey)) {
          allRates.push({
            fromCurrency: defaultCurrency,
            toCurrency: currency,
            rate: rate,
          });
          processedPairs.add(pairKey);
        }
      }
      
      // Загружаем остальные сохраненные курсы
      const currencyCodes = Object.keys(currencies);
      for (const from of currencyCodes) {
        for (const to of currencyCodes) {
          if (from !== to) {
            const pairKey1 = `${from}-${to}`;
            const pairKey2 = `${to}-${from}`;
            
            if (!processedPairs.has(pairKey1) && !processedPairs.has(pairKey2)) {
              const rate = await LocalDatabaseService.getExchangeRate(from, to);
              if (rate) {
                allRates.push({
                  fromCurrency: from,
                  toCurrency: to,
                  rate: rate,
                });
                processedPairs.add(pairKey1);
              }
            }
          }
        }
      }
      
      setExchangeRates(allRates);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRate = async () => {
    const fromValue = parseFloat(fromAmount);
    const toValue = parseFloat(toAmount);
    
    if (!fromAmount || fromValue <= 0 || !toAmount || toValue <= 0) {
      Alert.alert(t('common.error'), t('settings.invalidExchangeRate'));
      return;
    }
    
    if (fromCurrency === toCurrency) {
      Alert.alert(t('common.error'), t('settings.sameCurrencyError'));
      return;
    }
    
    try {
      // Рассчитываем курс: сколько единиц toCurrency за 1 единицу fromCurrency
      const rate = toValue / fromValue;
      
      // Сохраняем курс
      await LocalDatabaseService.saveExchangeRate(fromCurrency, toCurrency, rate);
      
      // Очищаем поля сразу для лучшего UX
      setFromAmount('1');
      setToAmount('');
      
      // Обновляем список
      await loadExchangeRates();
      
      // Убираем блокирующий Alert чтобы список обновился визуально
      // Alert.alert(t('common.success'), t('settings.exchangeRateSaved'));
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.errorSavingRate'));
    }
  };

  const handleDeleteRate = async (from: string, to: string) => {
    Alert.alert(
      t('common.confirm'),
      t('settings.deleteRateConfirm', { from, to }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Удаляем курс (установив его в null)
              await LocalDatabaseService.saveExchangeRate(from, to, 0);
              await loadExchangeRates();
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.errorDeletingRate'));
            }
          },
        },
      ]
    );
  };

  const handleUpdateRate = async (from: string, to: string, newRateValue: string) => {
    const rate = parseFloat(newRateValue);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert(t('common.error'), t('settings.invalidExchangeRate'));
      return;
    }
    
    try {
      await LocalDatabaseService.saveExchangeRate(from, to, rate);
      await loadExchangeRates();
      Alert.alert(t('common.success'), t('settings.exchangeRateUpdated'));
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.errorUpdatingRate'));
    }
  };

  const renderCurrencyPicker = (
    visible: boolean,
    onClose: () => void,
    onSelect: (currency: string) => void,
    selectedCurrency: string,
    excludeCurrency?: string
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.pickerOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              {t('settings.selectCurrency')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {Object.entries(currencies)
              .filter(([code]) => code !== excludeCurrency)
              .map(([code, currency]) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.currencyItem,
                    selectedCurrency === code && { backgroundColor: colors.background }
                  ]}
                  onPress={() => {
                    onSelect(code);
                    onClose();
                  }}
                >
                  <Text style={[styles.currencyText, { color: colors.text }]}>
                    {currency.symbol} {code} - {currency.name}
                  </Text>
                  {selectedCurrency === code && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('settings.manageExchangeRates')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              {/* Форма добавления нового курса */}
              <View style={[styles.addRateSection, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('settings.addNewRate')}
                </Text>
                
                <View style={styles.addRateForm}>
                  <View style={styles.currencyAmountGroup}>
                    <TextInput
                      style={[styles.amountInput, { 
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.card
                      }]}
                      value={fromAmount}
                      onChangeText={setFromAmount}
                      placeholder="1"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[styles.currencySelector, { borderColor: colors.border }]}
                      onPress={() => setShowFromPicker(true)}
                    >
                      <Text style={[styles.currencyCode, { color: colors.text }]}>
                        {currencies[fromCurrency]?.symbol} {fromCurrency}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={[styles.equals, { color: colors.textSecondary }]}>=</Text>
                  
                  <View style={styles.currencyAmountGroup}>
                    <TextInput
                      style={[styles.amountInput, { 
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.card
                      }]}
                      value={toAmount}
                      onChangeText={setToAmount}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[styles.currencySelector, { borderColor: colors.border }]}
                      onPress={() => setShowToPicker(true)}
                    >
                      <Text style={[styles.currencyCode, { color: colors.text }]}>
                        {currencies[toCurrency]?.symbol} {toCurrency}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddRate}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Список существующих курсов */}
              <ScrollView style={styles.ratesList} showsVerticalScrollIndicator={false}>
                {exchangeRates.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {t('settings.noExchangeRates')}
                  </Text>
                ) : (
                  exchangeRates.map((rate, index) => (
                    <View
                      key={`${rate.fromCurrency}-${rate.toCurrency}-${index}`}
                      style={[styles.rateItem, { backgroundColor: colors.background }]}
                    >
                      <View style={styles.rateInfo}>
                        <Text style={[styles.currencyPair, { color: colors.text }]}>
                          {currencies[rate.fromCurrency]?.symbol} {rate.fromCurrency} → {currencies[rate.toCurrency]?.symbol} {rate.toCurrency}
                        </Text>
                        
                        <View>
                          <Text style={[styles.currencyPair, { color: colors.text, fontSize: 14 }]}>
                            1 {currencies[rate.fromCurrency]?.symbol} = {rate.rate.toFixed(4)} {currencies[rate.toCurrency]?.symbol}
                          </Text>
                          <Text style={[styles.rateEquivalent, { color: colors.textSecondary }]}>
                            100 {currencies[rate.fromCurrency]?.symbol} = {(100 * rate.rate).toFixed(2)} {currencies[rate.toCurrency]?.symbol}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.rateActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteRate(rate.fromCurrency, rate.toCurrency)}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {renderCurrencyPicker(
        showFromPicker,
        () => setShowFromPicker(false),
        setFromCurrency,
        fromCurrency,
        toCurrency
      )}

      {renderCurrencyPicker(
        showToPicker,
        () => setShowToPicker(false),
        setToCurrency,
        toCurrency,
        fromCurrency
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  addRateSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  addRateForm: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  currencyCode: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  equals: {
    fontSize: 16,
    marginHorizontal: 8,
  },
  rateInput: {
    flex: 1,
    minWidth: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  rateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  rateInfo: {
    flex: 1,
  },
  currencyPair: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  editRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editRateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 16,
    marginRight: 8,
  },
  rateActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  currencyText: {
    fontSize: 16,
  },
  currencyAmountGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  amountInput: {
    minWidth: 60,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
  },
  rateEquivalent: {
    fontSize: 12,
    marginTop: 2,
  },
}); 