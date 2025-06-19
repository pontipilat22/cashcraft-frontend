import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Switch,
  Animated,
  FlatList,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useData } from '../context/DataContext';
import { LocalDatabaseService } from '../services/localDatabase';
import { ExchangeRateService } from '../services/exchangeRate';
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
  editValue?: string;
}

export const ExchangeRatesManager: React.FC<ExchangeRatesManagerProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { currencies, defaultCurrency } = useCurrency();
  const { accounts, updateAccount } = useData();
  
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Анимация для плавного появления
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(300))[0];
  
  // Ref для списка
  const flatListRef = useRef<FlatList>(null);

  // Получаем уникальные валюты из счетов пользователя
  const userCurrencies = useMemo(() => {
    const currenciesSet = new Set<string>();
    currenciesSet.add(defaultCurrency);
    
    accounts.forEach(account => {
      if (account.currency) {
        currenciesSet.add(account.currency);
      }
    });
    
    return Array.from(currenciesSet);
  }, [accounts, defaultCurrency]);

  // Получаем только релевантные курсы для отображения
  const relevantRates = useMemo(() => {
    const rates: ExchangeRate[] = [];
    const addedPairs = new Set<string>();
    
    // Показываем курсы относительно основной валюты для каждой валюты счетов
    userCurrencies.forEach(currency => {
      if (currency !== defaultCurrency) {
        // Курс из валюты в основную
        const key1 = `${currency}-${defaultCurrency}`;
        const rate1 = exchangeRates.find(
          rate => rate.fromCurrency === currency && rate.toCurrency === defaultCurrency
        );
        if (rate1 && !addedPairs.has(key1)) {
          rates.push(rate1);
          addedPairs.add(key1);
        }
        
        // Курс из основной в валюту
        const key2 = `${defaultCurrency}-${currency}`;
        const rate2 = exchangeRates.find(
          rate => rate.fromCurrency === defaultCurrency && rate.toCurrency === currency
        );
        if (rate2 && !addedPairs.has(key2)) {
          rates.push(rate2);
          addedPairs.add(key2);
        }
      }
    });
    
    return rates;
  }, [exchangeRates, userCurrencies, defaultCurrency]);

  // Быстрое открытие модального окна
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Загружаем данные асинхронно
      setTimeout(() => {
        loadDataAsync();
      }, 100);
    } else {
      // Быстрое закрытие
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Сброс состояния редактирования при закрытии
      setEditingIndex(null);
    }
  }, [visible]);

  // Загрузка только нужных курсов
  const loadDataAsync = useCallback(async () => {
    setLoading(true);
    try {
      const [mode, updateTime] = await Promise.all([
        LocalDatabaseService.getExchangeRatesMode(),
        LocalDatabaseService.getLastRatesUpdate(),
      ]);
      
      // Загружаем только курсы между валютами, которые есть у пользователя
      const rates: ExchangeRate[] = [];
      
      for (const fromCur of userCurrencies) {
        for (const toCur of userCurrencies) {
          if (fromCur !== toCur) {
            const rate = await LocalDatabaseService.getLocalExchangeRate(fromCur, toCur);
            if (rate && rate > 0) {
              rates.push({
                fromCurrency: fromCur,
                toCurrency: toCur,
                rate: rate,
                isEditing: false,
              });
            } else if (fromCur === defaultCurrency || toCur === defaultCurrency) {
              // Если курса нет, но одна из валют - основная, создаем с курсом 1
              rates.push({
                fromCurrency: fromCur,
                toCurrency: toCur,
                rate: 1,
                isEditing: false,
              });
            }
          }
        }
      }
      
      setExchangeRates(rates);
      setIsAutoMode(mode === 'auto');
      setLastUpdate(updateTime);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [userCurrencies, defaultCurrency]);

  // Оптимизированное обновление курсов
  const handleModeChange = useCallback(async (value: boolean) => {
    try {
      setIsAutoMode(value);
      await LocalDatabaseService.setExchangeRatesMode(value ? 'auto' : 'manual');
      
      if (value) {
        console.log('Auto mode enabled');
      }
    } catch (error) {
      console.error('Error changing mode:', error);
    }
  }, []);

  // Быстрое обновление курсов
  const handleUpdateRates = useCallback(async () => {
    try {
      setUpdating(true);
      
      // Сначала очищаем все локальные курсы валют
      await LocalDatabaseService.clearAllExchangeRates();
      
      // Сбрасываем режим на auto
      await LocalDatabaseService.setExchangeRatesMode('auto');
      setIsAutoMode(true);
      
      // Загружаем новые курсы с сервера
      await LocalDatabaseService.updateRatesFromBackend();
      await loadDataAsync();
      
      const updateTime = await LocalDatabaseService.getLastRatesUpdate();
      setLastUpdate(updateTime);
      
      // Обновляем счета в фоне
      updateAccountExchangeRates();
      
      Alert.alert(
        t('common.success'),
        t('settings.exchangeRatesResetAndUpdated')
      );
    } catch (error) {
      console.error('Error updating rates:', error);
      Alert.alert(t('common.error'), t('settings.errorUpdatingRates'));
    } finally {
      setUpdating(false);
    }
  }, [loadDataAsync, t]);

  // Обновление курсов в счетах (в фоне)
  const updateAccountExchangeRates = useCallback(async () => {
    try {
      const updatePromises = accounts
        .filter(account => account.currency && account.currency !== defaultCurrency)
        .map(async account => {
          if (!account.currency) return;
          const rate = await LocalDatabaseService.getLocalExchangeRate(account.currency, defaultCurrency);
          if (rate && (!('exchangeRate' in account) || (account as any).exchangeRate !== rate)) {
            return updateAccount(account.id, { exchangeRate: rate } as any);
          }
        });
      
      await Promise.all(updatePromises.filter(Boolean));
    } catch (error) {
      console.error('Error updating account exchange rates:', error);
    }
  }, [accounts, defaultCurrency, updateAccount]);

  // Начать редактирование курса
  const startEditRate = useCallback((index: number) => {
    setEditingIndex(index);
    setExchangeRates(prev => prev.map((rate, i) => 
      i === index 
        ? { ...rate, isEditing: true, editValue: rate.rate.toString() }
        : { ...rate, isEditing: false }
    ));
    
    // Прокручиваем к редактируемому элементу
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: true });
    }, 100);
  }, []);

  // Отменить редактирование
  const cancelEditRate = useCallback((index: number) => {
    setEditingIndex(null);
    setExchangeRates(prev => prev.map((rate, i) => 
      i === index 
        ? { ...rate, isEditing: false, editValue: undefined }
        : rate
    ));
    Keyboard.dismiss();
  }, []);

  // Сохранить изменение курса
  const saveEditRate = useCallback(async (index: number) => {
    const rate = exchangeRates[index];
    if (!rate.editValue) return;
    
    const newRate = parseFloat(rate.editValue);
    if (isNaN(newRate) || newRate <= 0) {
      Alert.alert(t('common.error'), t('settings.invalidExchangeRate'));
      return;
    }
    
    try {
      // Сохраняем на backend и локально
      const success = await ExchangeRateService.saveUserRate(rate.fromCurrency, rate.toCurrency, newRate);
      
      if (success) {
        // Также обновляем обратный курс
        await ExchangeRateService.saveUserRate(rate.toCurrency, rate.fromCurrency, 1 / newRate);
        
        // Если режим был auto, переключаем на manual
        if (isAutoMode) {
          await LocalDatabaseService.setExchangeRatesMode('manual');
          await setIsAutoMode(false);
        }
      } else {
        // Если не удалось сохранить на backend, сохраняем только локально
        await LocalDatabaseService.saveExchangeRate(rate.fromCurrency, rate.toCurrency, newRate);
        await LocalDatabaseService.saveExchangeRate(rate.toCurrency, rate.fromCurrency, 1 / newRate);
      }
      
      // Обновляем UI
      setEditingIndex(null);
      setExchangeRates(prev => prev.map((r, i) => 
        i === index 
          ? { ...r, rate: newRate, isEditing: false, editValue: undefined }
          : rate.fromCurrency === r.toCurrency && rate.toCurrency === r.fromCurrency
            ? { ...r, rate: 1 / newRate }
            : r
      ));
      
      Keyboard.dismiss();
      
      // Обновляем счета в фоне
      updateAccountExchangeRates();
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.errorUpdatingRate'));
    }
  }, [exchangeRates, t, updateAccountExchangeRates, isAutoMode]);

  // Оптимизированный рендер списка курсов
  const renderRateItem = useCallback(({ item: rate, index }: { item: ExchangeRate, index: number }) => (
    <TouchableOpacity
      style={[styles.rateItem, { backgroundColor: colors.background }]}
      activeOpacity={0.7}
      onPress={() => !rate.isEditing && startEditRate(index)}
    >
      <View style={styles.rateInfo}>
        <View style={styles.rateHeader}>
          <Text style={[styles.currencyPair, { color: colors.text }]}>
            {currencies[rate.fromCurrency]?.symbol} {rate.fromCurrency}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
          <Text style={[styles.currencyPair, { color: colors.text }]}>
            {currencies[rate.toCurrency]?.symbol} {rate.toCurrency}
          </Text>
        </View>
        
        {rate.isEditing ? (
          <View style={styles.editContainer}>
            <Text style={[styles.editLabel, { color: colors.textSecondary }]}>
              1 {currencies[rate.fromCurrency]?.symbol} =
            </Text>
            <TextInput
              style={[styles.editInput, { 
                color: colors.text,
                backgroundColor: colors.card,
                borderColor: colors.primary,
              }]}
              value={rate.editValue}
              onChangeText={(text) => {
                setExchangeRates(prev => prev.map((r, i) => 
                  i === index ? { ...r, editValue: text } : r
                ));
              }}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
            />
            <Text style={[styles.editLabel, { color: colors.textSecondary }]}>
              {currencies[rate.toCurrency]?.symbol}
            </Text>
          </View>
        ) : (
          <Text style={[styles.rateValue, { color: colors.primary }]}>
            1 {currencies[rate.fromCurrency]?.symbol} = {rate.rate.toFixed(4)} {currencies[rate.toCurrency]?.symbol}
          </Text>
        )}
      </View>
      
      {rate.isEditing ? (
        <View style={styles.editActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => saveEditRate(index)}
          >
            <Ionicons name="checkmark" size={24} color={colors.success || '#4CAF50'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => cancelEditRate(index)}
          >
            <Ionicons name="close" size={24} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.editIconButton}
          onPress={() => startEditRate(index)}
        >
          <Ionicons name="pencil" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  ), [colors, currencies, startEditRate, saveEditRate, cancelEditRate]);

  // Показываем информацию если нет счетов в разных валютах
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="information-circle-outline" size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
        {t('settings.noMultiCurrencyAccounts')}
      </Text>
      <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
        {t('settings.addAccountsInDifferentCurrencies')}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -500}
      >
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
          
          <Animated.View 
            style={[
              styles.content,
              { 
                backgroundColor: colors.card,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Заголовок */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('settings.manageExchangeRates')}
              </Text>
              <View style={styles.headerButtons}>
                {userCurrencies.length > 1 && (
                  <TouchableOpacity 
                    style={styles.settingsButton}
                    onPress={() => setShowSettings(!showSettings)}
                  >
                    <Ionicons 
                      name={showSettings ? "settings" : "settings-outline"} 
                      size={24} 
                      color={colors.text} 
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {userCurrencies.length <= 1 ? (
              // Показываем заглушку если нет счетов в разных валютах
              renderEmptyState()
            ) : (
              <>
                {/* Настройки (скрыты по умолчанию) */}
                {showSettings && (
                  <Animated.View style={[styles.settingsSection, { backgroundColor: colors.background }]}>
                    <View style={styles.settingRow}>
                      <View style={styles.settingInfo}>
                        <Text style={[styles.settingTitle, { color: colors.text }]}>
                          {t('settings.autoUpdateRates')}
                        </Text>
                        <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                          {t('settings.autoUpdateRatesDescription')}
                        </Text>
                      </View>
                      <Switch
                        value={isAutoMode}
                        onValueChange={handleModeChange}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={isAutoMode ? '#fff' : colors.textSecondary}
                      />
                    </View>

                    {isAutoMode && (
                      <TouchableOpacity
                        style={[styles.updateButton, { backgroundColor: colors.primary }]}
                        onPress={handleUpdateRates}
                        disabled={updating}
                      >
                        {updating ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="refresh" size={20} color="#fff" />
                            <Text style={styles.updateButtonText}>
                              {t('settings.updateNow')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </Animated.View>
                )}

                {/* Информация о валютах */}
                <View style={[styles.currencyInfo, { backgroundColor: colors.background }]}>
                  <Text style={[styles.currencyInfoText, { color: colors.textSecondary }]}>
                    {t('settings.currentlyUsedCurrencies')}: {userCurrencies.join(', ')}
                  </Text>
                  <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                    {t('settings.tapToEditRate')}
                  </Text>
                </View>

                {/* Список курсов */}
                {loading && relevantRates.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : (
                  <View style={[
                    styles.listContainer,
                    editingIndex !== null && { paddingBottom: 200 }
                  ]}>
                    <FlatList
                      ref={flatListRef}
                      data={relevantRates}
                      keyExtractor={(item, index) => `${item.fromCurrency}-${item.toCurrency}-${index}`}
                      renderItem={renderRateItem}
                      contentContainerStyle={[
                        styles.ratesList,
                        editingIndex !== null && { paddingBottom: 100 }
                      ]}
                      showsVerticalScrollIndicator={false}
                      scrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                      getItemLayout={(data, index) => ({
                        length: 84, // высота элемента + отступ
                        offset: 84 * index,
                        index,
                      })}
                      ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                          {t('settings.noExchangeRates')}
                        </Text>
                      }
                    />
                  </View>
                )}
              </>
            )}
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    marginRight: 12,
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
  settingsSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  currencyInfo: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  currencyInfoText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  listContainer: {
    flex: 1,
  },
  ratesList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    minHeight: 76,
  },
  rateInfo: {
    flex: 1,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  currencyPair: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editLabel: {
    fontSize: 14,
    marginHorizontal: 4,
  },
  editInput: {
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 80,
    textAlign: 'center',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginLeft: 4,
  },
  editIconButton: {
    padding: 8,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 