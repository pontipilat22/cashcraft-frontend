import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Modal,
  FlatList,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { CURRENCIES } from '../config/currencies';
import { useNavigation } from '@react-navigation/native';
import { LocalDatabaseService } from '../services/localDatabase';
import { ExchangeRatesManager } from '../components/ExchangeRatesManager';
import { ApiService } from '../services/api';
import { AuthService } from '../services/auth';
import { pinService } from '../services/pinService';
import AsyncStorage from '@react-native-async-storage/async-storage';


type ExchangeRates = { [accountId: string]: { 
  name: string; 
  currency: string; 
  rate: number;
  suggestedRate?: number;
  isModified?: boolean;
} };

export const SettingsScreen: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, currentLanguage, setLanguage, languages } = useLocalization();
  const { defaultCurrency, setDefaultCurrency, currencies, formatAmount } = useCurrency();
  const { user, logout } = useAuth();
  const { accounts, updateAccount } = useData();
  const navigation = useNavigation();
  
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showExchangeRatesModal, setShowExchangeRatesModal] = useState(false);
  const [showExchangeRatesManager, setShowExchangeRatesManager] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [newCurrency, setNewCurrency] = useState(defaultCurrency);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isPinEnabled, setIsPinEnabled] = useState(false);

  // Загружаем режим курсов при монтировании
  useEffect(() => {
    const loadExchangeRatesMode = async () => {
      try {
        const mode = await LocalDatabaseService.getExchangeRatesMode();
        setIsAutoMode(mode === 'auto');
      } catch (error) {
        console.error('Error loading exchange rates mode:', error);
      }
    };
    
    const preloadExchangeRates = async () => {
      try {
        // Предзагружаем курсы валют для мгновенного открытия модального окна
        await LocalDatabaseService.getAllExchangeRates();
      } catch (error) {
        console.error('Error preloading exchange rates:', error);
      }
    };
    
    const checkPinStatus = async () => {
      try {
        const enabled = await pinService.isPinEnabled();
        setIsPinEnabled(enabled);
      } catch (error) {
        console.error('Error checking PIN status:', error);
      }
    };
    
    loadExchangeRatesMode();
    preloadExchangeRates();
    checkPinStatus();
  }, []);

  // Обновляем состояние PIN при возвращении с экрана установки
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        const enabled = await pinService.isPinEnabled();
        setIsPinEnabled(enabled);
      } catch (error) {
        console.error('Error checking PIN status on focus:', error);
      }
    });

    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };




  const handleCurrencySelect = async (currencyCode: string) => {
    setShowCurrencyModal(false);
    
    // Проверяем, есть ли счета в других валютах
    const accountsInOtherCurrencies = accounts.filter(
      account => account.currency && account.currency !== currencyCode
    );
    
    if (accountsInOtherCurrencies.length > 0) {
      // Показываем модальное окно для ввода курсов
      setNewCurrency(currencyCode);
      const rates: ExchangeRates = {};
      
      // Быстро загружаем текущие курсы без сложных вычислений
      for (const account of accountsInOtherCurrencies) {
        const accountCurrency = account.currency || defaultCurrency;
        
        // Используем существующий курс из счета
        let currentRate = 1;
        if ('exchangeRate' in account && (account as any).exchangeRate > 0) {
          currentRate = (account as any).exchangeRate;
          
          // Если валюта по умолчанию меняется, пересчитываем курс
          if (defaultCurrency !== currencyCode) {
            const defaultToNew = await LocalDatabaseService.getLocalExchangeRate(defaultCurrency, currencyCode);
            if (defaultToNew && defaultToNew > 0) {
              currentRate = currentRate * defaultToNew;
            }
          }
        } else {
          // Если курса в счете нет, проверяем базу
          const savedRate = await LocalDatabaseService.getLocalExchangeRate(accountCurrency, currencyCode);
          if (savedRate && savedRate > 0) {
            currentRate = savedRate;
          }
        }
        
        rates[account.id] = {
          name: account.name,
          currency: accountCurrency,
          rate: currentRate,
          suggestedRate: undefined,
          isModified: false
        };
      }
      
      setExchangeRates(rates);
      setShowExchangeRatesModal(true);
    } else {
      // Просто меняем валюту
      await setDefaultCurrency(currencyCode);
    }
  };

  const handleSaveExchangeRates = async () => {
    try {
      // Обновляем курсы для всех счетов
      for (const [accountId, data] of Object.entries(exchangeRates)) {
        // Обновляем курс в счете
        await updateAccount(accountId, { exchangeRate: data.rate } as any);
        
        // Сохраняем курс в БД для будущего использования
        await LocalDatabaseService.saveExchangeRate(data.currency, newCurrency, data.rate);
        
        // Также сохраняем обратный курс
        if (data.rate > 0) {
          await LocalDatabaseService.saveExchangeRate(newCurrency, data.currency, 1 / data.rate);
        }
      }
      
      // Теперь меняем валюту по умолчанию
      await setDefaultCurrency(newCurrency);
      
      setShowExchangeRatesModal(false);
      Alert.alert(
        t('settings.success'),
        t('settings.currencyChangedWithRates')
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.errorChangingCurrency'));
    }
  };

  const handlePinToggle = async (value: boolean) => {
    if (value) {
      // Включаем PIN - переходим на экран установки
      (navigation as any).navigate('SetPin');
    } else {
      // Отключаем PIN - просим подтвердить текущий PIN
      Alert.alert(
        t('pin.disableTitle'),
        t('pin.disableMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: async () => {
              try {
                await pinService.disablePin();
                setIsPinEnabled(false);
                Alert.alert(t('common.success'), t('pin.disabled'));
              } catch (error) {
                Alert.alert(t('common.error'), t('pin.error'));
              }
            }
          }
        ]
      );
    }
  };

  const handleChangePin = () => {
    (navigation as any).navigate('SetPin', { isChangingPin: true });
  };

  const renderLanguageModal = () => (
    <Modal
      visible={showLanguageModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={() => setShowLanguageModal(false)}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.language')}
            </Text>
            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={Object.values(languages)}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  { borderBottomColor: colors.border },
                  item.code === currentLanguage && styles.selectedItem,
                ]}
                onPress={async () => {
                  await setLanguage(item.code);
                  setShowLanguageModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    { color: colors.text },
                    item.code === currentLanguage && { color: colors.primary },
                  ]}
                >
                  {item.nativeName}
                </Text>
                {item.code === currentLanguage && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSettingItem = (
    icon: string,
    title: string,
    value?: string,
    onPress?: () => void,
    showSwitch?: boolean,
    switchValue?: boolean,
    onSwitchChange?: (value: boolean) => void
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon as any} size={24} color={colors.primary} />
        <Text style={[styles.settingItemTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <View style={styles.settingItemRight}>
        {value && (
          <Text style={[styles.settingItemValue, { color: colors.textSecondary }]}>
            {value}
          </Text>
        )}
        {showSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('settings.title')}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('common.preferences')}
          </Text>
          
          {renderSettingItem(
            'language-outline',
            t('settings.language'),
            languages[currentLanguage]?.nativeName,
            () => setShowLanguageModal(true)
          )}
          
          {renderSettingItem(
            'cash-outline',
            t('settings.currency'),
            `${CURRENCIES[defaultCurrency]?.symbol} ${defaultCurrency}`,
            () => setShowCurrencyModal(true)
          )}
          
          {renderSettingItem(
            'calculator-outline',
            t('settings.exchangeRates'),
            isAutoMode ? t('settings.autoMode') : t('settings.manualMode'),
            () => setShowExchangeRatesManager(true)
          )}
          
          {renderSettingItem(
            'moon-outline',
            t('settings.darkMode'),
            undefined,
            undefined,
            true,
            isDark,
            toggleTheme
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('settings.security')}
          </Text>
          
          {renderSettingItem(
            'lock-closed-outline',
            t('pin.title'),
            isPinEnabled ? t('common.active') : t('common.inactive'),
            undefined,
            true,
            isPinEnabled,
            handlePinToggle
          )}
          
          {isPinEnabled && renderSettingItem(
            'key-outline',
            t('pin.changeTitle'),
            undefined,
            handleChangePin
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('common.about')}
          </Text>
          
          {renderSettingItem(
            'information-circle-outline',
            t('settings.version'),
            '1.0.0'
          )}
          
          {renderSettingItem(
            'shield-checkmark-outline',
            t('settings.privacyPolicy'),
            undefined,
            () => (navigation as any).navigate('PrivacyPolicy')
          )}
          
          {renderSettingItem(
            'document-text-outline',
            t('settings.termsOfService'),
            undefined,
            () => {}
          )}
        </View>

        {user && !user.isGuest && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('common.account')}
            </Text>
            
            <View style={[styles.userInfo, { borderBottomColor: colors.border }]}>
              <Text style={[styles.userEmail, { color: colors.text }]}>
                {user.email}
              </Text>
            </View>
          </View>
        )}

        {user && (
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: user.isGuest ? colors.primary : colors.danger }]}
            onPress={user.isGuest ? logout : handleLogout}
          >
            <Ionicons name={user.isGuest ? "log-in-outline" : "log-out-outline"} size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>
              {user.isGuest ? t('auth.login') : t('auth.logout')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {renderLanguageModal()}

      {/* Currency Picker Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('settings.selectCurrency')}
              </Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {Object.entries(currencies).map(([code, currency]) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.optionItem,
                    defaultCurrency === code && { backgroundColor: colors.background }
                  ]}
                  onPress={() => handleCurrencySelect(code)}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    {currency.symbol} {code} - {currency.name}
                  </Text>
                  {defaultCurrency === code && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Exchange Rates Modal */}
      <Modal
        visible={showExchangeRatesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExchangeRatesModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {t('settings.enterExchangeRates')}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      Keyboard.dismiss();
                      setShowExchangeRatesModal(false);
                    }}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView 
                    style={styles.ratesList} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={Keyboard.dismiss}
                  >
                    <Text style={[styles.ratesDescription, { color: colors.textSecondary }]}>
                      {t('settings.exchangeRatesDescription', { currency: newCurrency })}
                    </Text>
                    
                    {/* Кнопка для использования всех предложенных курсов */}
                    {Object.values(exchangeRates).some(data => data.suggestedRate) && (
                      <TouchableOpacity
                        style={[styles.useAllSuggestedButton, { backgroundColor: colors.primary + '10' }]}
                        onPress={() => {
                          const newRates = { ...exchangeRates };
                          Object.entries(newRates).forEach(([id, data]) => {
                            if (data.suggestedRate) {
                              newRates[id] = { ...data, rate: data.suggestedRate, isModified: false };
                            }
                          });
                          setExchangeRates(newRates);
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                        <Text style={[styles.useAllSuggestedText, { color: colors.primary }]}>
                          {t('settings.useAllSuggestedRates')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                                  {Object.entries(exchangeRates).map(([accountId, data], index) => (
                <View key={accountId} style={styles.rateItem}>
                  <View style={styles.rateHeader}>
                    <Text style={[styles.rateLabel, { color: colors.text }]}>
                      {data.name}
                    </Text>
                    <View style={styles.currencyBadge}>
                      <Text style={[styles.currencyBadgeText, { color: colors.primary }]}>
                        {currencies[data.currency]?.symbol} {data.currency}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.rateInputContainer}>
                    <Text style={[styles.rateText, { color: colors.textSecondary }]}>
                      1 {data.currency} =
                    </Text>
                    <TextInput
                      style={[styles.rateInput, { 
                        color: data.isModified ? colors.primary : colors.text,
                        borderColor: data.isModified ? colors.primary : colors.border,
                        backgroundColor: colors.background
                      }]}
                      value={data.rate.toString()}
                      onChangeText={(text) => {
                        const rate = parseFloat(text) || 0;
                        const isModified = data.suggestedRate ? 
                          Math.abs(rate - data.suggestedRate) > 0.0001 : true;
                        
                        setExchangeRates(prev => ({
                          ...prev,
                          [accountId]: { ...data, rate, isModified }
                        }));
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
                      autoFocus={index === 0}
                    />
                    <Text style={[styles.rateText, { color: colors.textSecondary }]}>
                      {currencies[newCurrency]?.symbol} {newCurrency}
                    </Text>
                    <TouchableOpacity
                      style={styles.swapButton}
                      onPress={() => {
                        const newRate = data.rate > 0 ? 1 / data.rate : 1;
                        setExchangeRates(prev => ({
                          ...prev,
                          [accountId]: { ...data, rate: newRate, isModified: true }
                        }));
                      }}
                    >
                      <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  {data.suggestedRate && Math.abs(data.rate - data.suggestedRate) > 0.0001 && (
                    <TouchableOpacity 
                      style={styles.suggestedRateButton}
                      onPress={() => {
                        setExchangeRates(prev => ({
                          ...prev,
                          [accountId]: { ...data, rate: data.suggestedRate!, isModified: false }
                        }));
                      }}
                    >
                      <Text style={[styles.suggestedRateText, { color: colors.primary }]}>
                        {t('settings.useSuggestedRate', { rate: data.suggestedRate.toFixed(4) })}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Показываем эквивалент для удобства */}
                  <View style={styles.equivalentContainer}>
                    <Text style={[styles.equivalentText, { color: colors.textSecondary }]}>
                      {currencies[data.currency]?.symbol}100 = {currencies[newCurrency]?.symbol}
                      {(100 * data.rate).toFixed(2)}
                    </Text>
                    <Text style={[styles.equivalentText, { color: colors.textSecondary, marginLeft: 12 }]}>
                      • {currencies[newCurrency]?.symbol}100 = {currencies[data.currency]?.symbol}
                      {data.rate > 0 ? (100 / data.rate).toFixed(2) : '0'}
                    </Text>
                  </View>
                </View>
              ))}
                  </ScrollView>
                  
                  <View style={[styles.modalActions, { paddingBottom: Platform.OS === 'ios' ? 20 : 10 }]}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.background }]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowExchangeRatesModal(false);
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: colors.text }]}>
                        {t('common.cancel')}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        Keyboard.dismiss();
                        handleSaveExchangeRates();
                      }}
                    >
                      <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                        {t('common.save')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Exchange Rates Manager */}
      <ExchangeRatesManager
        visible={showExchangeRatesManager}
        onClose={async () => {
          setShowExchangeRatesManager(false);
          // Обновляем режим после закрытия
          try {
            const mode = await LocalDatabaseService.getExchangeRatesMode();
            setIsAutoMode(mode === 'auto');
          } catch (error) {
            console.error('Error updating exchange rates mode:', error);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    opacity: 0.6,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemValue: {
    fontSize: 14,
    marginRight: 8,
  },
  userInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userEmail: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: Platform.OS === 'ios' ? '70%' : '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectedItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  modalItemText: {
    fontSize: 16,
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    width: 40,
  },
  currencyInfo: {
    marginLeft: 12,
    flex: 1,
  },
  currencyName: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  optionsList: {
    maxHeight: 300,
    paddingHorizontal: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionText: {
    fontSize: 16,
  },
  ratesList: {
    maxHeight: Platform.OS === 'ios' ? 250 : 200,
    paddingHorizontal: 16,
  },
  ratesDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  rateItem: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  rateLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swapButton: {
    padding: 8,
    marginLeft: 8,
  },
  rateText: {
    fontSize: 14,
    marginHorizontal: 8,
  },
  rateInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  suggestedRateButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  suggestedRateText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  equivalentText: {
    fontSize: 12,
    marginTop: 4,
  },
  equivalentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  useAllSuggestedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  useAllSuggestedText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    padding: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 