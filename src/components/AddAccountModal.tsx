import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  FlatList,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { AccountType, AccountTypeLabels } from '../types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useData } from '../context/DataContext';
import { LocalDatabaseService } from '../services/localDatabase';

interface AddAccountModalProps {
  visible: boolean;
  accountType: AccountType;
  onClose: () => void;
  onSave: (data: { 
    name: string; 
    balance: number; 
    currency?: string;
    exchangeRate?: number;
    cardNumber?: string;
    isDefault?: boolean;
    isIncludedInTotal?: boolean;
    icon?: string;
    targetAmount?: number;
    linkedAccountId?: string;
    interestRate?: number;
    openDate?: string;
    interestDay?: number;
    creditStartDate?: string;
    creditTerm?: number;
    creditRate?: number;
    creditPaymentType?: 'annuity' | 'differentiated';
    creditInitialAmount?: number;
  }) => void;
}

const SAVINGS_ICONS = [
  'home-outline',
  'car-outline',
  'airplane-outline',
  'gift-outline',
  'laptop-outline',
  'phone-portrait-outline',
  'game-controller-outline',
  'bicycle-outline',
  'boat-outline',
  'camera-outline',
  'cart-outline',
  'cash-outline',
  'gift-outline',
  'heart-outline',
  'paw-outline',
  'school-outline',
  'ticket-outline',
  'umbrella-outline',
  'wallet-outline',
  'watch-outline',
] as const;

type SavingsIcon = typeof SAVINGS_ICONS[number];

const ACCOUNT_TYPES: AccountType[] = ['cash', 'card', 'savings', 'debt', 'credit'];

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  visible,
  accountType,
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { defaultCurrency, currencies, formatAmount } = useCurrency();
  const { accounts } = useData();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [exchangeRate, setExchangeRate] = useState('1');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isIncludedInTotal, setIsIncludedInTotal] = useState(true);
  const [selectedIcon, setSelectedIcon] = useState<SavingsIcon>(SAVINGS_ICONS[0]);
  const [targetAmount, setTargetAmount] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [interestRate, setInterestRate] = useState('');
  const [openDate, setOpenDate] = useState('');
  const [interestDay, setInterestDay] = useState('');

  // Поля для кредитов
  const [creditStartDate, setCreditStartDate] = useState(new Date());
  const [showCreditDatePicker, setShowCreditDatePicker] = useState(false);
  const [creditTerm, setCreditTerm] = useState('');
  const [creditRate, setCreditRate] = useState('');
  const [creditPaymentType, setCreditPaymentType] = useState<'annuity' | 'differentiated'>('annuity');
  const [suggestedRate, setSuggestedRate] = useState<number | null>(null);
  
  // Для накоплений - связанный счет
  const [linkedAccountId, setLinkedAccountId] = useState<string>('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // Загружаем предложенный курс при изменении валюты
  useEffect(() => {
    const loadSuggestedRate = async () => {
      if (selectedCurrency !== defaultCurrency) {
        // Пытаемся найти сохраненный курс
        const rate = await LocalDatabaseService.getExchangeRate(selectedCurrency, defaultCurrency);
        if (rate) {
          setSuggestedRate(rate);
          setExchangeRate(rate.toString());
        } else {
          // Пытаемся найти через кросс-курс
          const crossRate = await LocalDatabaseService.calculateCrossRate(
            selectedCurrency,
            defaultCurrency,
            'USD' // используем USD как промежуточную валюту
          );
          if (crossRate) {
            setSuggestedRate(crossRate);
            setExchangeRate(crossRate.toString());
          }
        }
      } else {
        setSuggestedRate(null);
        setExchangeRate('1');
      }
    };
    
    loadSuggestedRate();
  }, [selectedCurrency, defaultCurrency]);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    // Сохраняем курс в БД для будущего использования
    if (selectedCurrency !== defaultCurrency && exchangeRate) {
      const rate = parseFloat(exchangeRate);
      if (rate > 0) {
        await LocalDatabaseService.saveExchangeRate(selectedCurrency, defaultCurrency, rate);
        // Сохраняем и обратный курс
        await LocalDatabaseService.saveExchangeRate(defaultCurrency, selectedCurrency, 1 / rate);
      }
    }
    
    const accountData: any = {
      name: name.trim(),
      balance: accountType === 'savings' ? 0 : (parseFloat(balance) || 0),
      currency: selectedCurrency,
      exchangeRate: selectedCurrency !== defaultCurrency ? parseFloat(exchangeRate) || 1 : undefined,
      cardNumber: cardNumber.trim() ? cardNumber.trim() : undefined,
      isDefault: accountType !== 'savings' ? isDefault : false,
      isIncludedInTotal: accountType === 'savings' ? false : isIncludedInTotal,
    };

    if (accountType === 'savings') {
      accountData.icon = selectedIcon;
      accountData.savedAmount = 0; // Начальная сумма накоплений всегда 0
      if (targetAmount) {
        accountData.targetAmount = parseFloat(targetAmount);
      }
      if (linkedAccountId) {
        accountData.linkedAccountId = linkedAccountId;
      }
    }

    if (accountType === 'bank') {
      if (interestRate) accountData.interestRate = parseFloat(interestRate);
      if (openDate) accountData.openDate = openDate;
      if (interestDay) accountData.interestDay = parseInt(interestDay);
    }

    if (accountType === 'credit') {
      accountData.creditStartDate = creditStartDate.toISOString();
      accountData.creditTerm = parseInt(creditTerm) || 0;
      accountData.creditRate = parseFloat(creditRate) || 0;
      accountData.creditPaymentType = creditPaymentType;
      accountData.creditInitialAmount = parseFloat(balance) || 0;
    }

    onSave(accountData);
    
    // Очищаем форму
    setName('');
    setBalance('');
    setSelectedCurrency(defaultCurrency);
    setExchangeRate('1');
    setCardNumber('');
    setIsDefault(false);
    setIsIncludedInTotal(true);
    setSelectedIcon(SAVINGS_ICONS[0]);
    setTargetAmount('');
    setLinkedAccountId('');
    setInterestRate('');
    setOpenDate('');
    setInterestDay('');
    setCreditStartDate(new Date());
    setCreditTerm('');
    setCreditRate('');
    setCreditPaymentType('annuity');
  };

  const getIcon = () => {
    if (accountType === 'savings' && selectedIcon) {
      return selectedIcon;
    }
    switch (accountType) {
      case 'cash':
        return 'cash-outline';
      case 'card':
        return 'card-outline';
      case 'bank':
        return 'business-outline';
      case 'savings':
        return 'trending-up-outline';
      case 'debt':
        return 'arrow-down-circle-outline';
      case 'credit':
        return 'card-outline';
      default:
        return 'wallet-outline';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('accounts.addAccount')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name={getIcon()} size={32} color="#fff" />
              </View>
            </View>

            {accountType === 'savings' && (
              <TouchableOpacity
                style={[styles.iconSelector, { backgroundColor: colors.background }]}
                onPress={() => setShowIconPicker(true)}
              >
                <Text style={[styles.iconSelectorText, { color: colors.text }]}>
                  {t('accounts.selectIcon')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.accountName')}</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={name}
                onChangeText={setName}
                placeholder={t('accounts.accountName')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {accountType !== 'savings' && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.initialBalance')}</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={balance}
                  onChangeText={setBalance}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Выбор валюты */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.currency')}</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowCurrencyPicker(true)}
              >
                <View style={styles.selectorContent}>
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    {currencies[selectedCurrency]?.symbol} {selectedCurrency} - {currencies[selectedCurrency]?.name}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Курс конвертации */}
            {selectedCurrency !== defaultCurrency && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.exchangeRate')}</Text>
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  1 {selectedCurrency} = ? {defaultCurrency}
                </Text>
                <View style={styles.rateInputWrapper}>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: suggestedRate && parseFloat(exchangeRate) === suggestedRate ? colors.primary : colors.text,
                      borderColor: suggestedRate && parseFloat(exchangeRate) === suggestedRate ? colors.primary : colors.border,
                    }]}
                    value={exchangeRate}
                    onChangeText={setExchangeRate}
                    placeholder="1"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  {suggestedRate && (
                    <View style={styles.rateIndicator}>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={20} 
                        color={colors.primary} 
                      />
                      <Text style={[styles.rateIndicatorText, { color: colors.textSecondary }]}>
                        {t('accounts.savedRate')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {accountType === 'savings' && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.targetAmount')}</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    }]}
                    value={targetAmount}
                    onChangeText={setTargetAmount}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                
                {/* Выбор связанного счета */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.linkedAccount')}</Text>
                  <TouchableOpacity
                    style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setShowAccountPicker(true)}
                  >
                    <View style={styles.selectorContent}>
                      <Text style={[styles.selectorText, { color: linkedAccountId ? colors.text : colors.textSecondary }]}>
                        {linkedAccountId 
                          ? accounts.find(acc => acc.id === linkedAccountId)?.name || t('accounts.selectLinkedAccount')
                          : t('accounts.selectLinkedAccount')
                        }
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: 4 }]}>
                    {t('accounts.linkedAccountDescription')}
                  </Text>
                </View>
              </>
            )}

            {accountType === 'card' && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.cardNumber')}</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  placeholder="XXXX XXXX XXXX XXXX"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>
            )}

            {accountType !== 'savings' && (
              <View style={styles.switchContainer}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>{t('accounts.defaultAccount')}</Text>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: '#767577', true: colors.primary }}
                />
              </View>
            )}

            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{t('accounts.includeInBalance')}</Text>
              <Switch
                value={isIncludedInTotal}
                onValueChange={setIsIncludedInTotal}
                trackColor={{ false: '#767577', true: colors.primary }}
              />
            </View>

            {accountType === 'bank' && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.interestRate')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={interestRate}
                    onChangeText={setInterestRate}
                    placeholder="7.5"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.openDate')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={openDate}
                    onChangeText={setOpenDate}
                    placeholder="DD.MM.YYYY"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.interestDay')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={interestDay}
                    onChangeText={setInterestDay}
                    placeholder="15"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            {/* Поля для кредитов */}
            {accountType === 'credit' && (
              <>
                {/* Дата получения кредита */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.creditDate')}</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setShowCreditDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={[styles.dateText, { color: colors.text }]}>
                      {creditStartDate.toLocaleDateString('ru-RU')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Сумма кредита */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.creditAmount')}</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    }]}
                    value={balance}
                    onChangeText={setBalance}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                {/* Срок кредита */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.creditTerm')}</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    }]}
                    value={creditTerm}
                    onChangeText={setCreditTerm}
                    placeholder="12"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                {/* Процентная ставка */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.creditRate')}</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    }]}
                    value={creditRate}
                    onChangeText={setCreditRate}
                    placeholder="15.5"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                {/* Тип платежей */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.paymentType')}</Text>
                  <View style={styles.paymentTypeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.paymentTypeButton,
                        { 
                          backgroundColor: creditPaymentType === 'annuity' ? colors.primary : colors.background,
                          borderColor: colors.border,
                        }
                      ]}
                      onPress={() => setCreditPaymentType('annuity')}
                    >
                      <Text style={[
                        styles.paymentTypeText,
                        { color: creditPaymentType === 'annuity' ? '#fff' : colors.text }
                      ]}>
                        {t('accounts.annuity')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paymentTypeButton,
                        { 
                          backgroundColor: creditPaymentType === 'differentiated' ? colors.primary : colors.background,
                          borderColor: colors.border,
                        }
                      ]}
                      onPress={() => setCreditPaymentType('differentiated')}
                    >
                      <Text style={[
                        styles.paymentTypeText,
                        { color: creditPaymentType === 'differentiated' ? '#fff' : colors.text }
                      ]}>
                        {t('accounts.differentiated')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showIconPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIconPicker(false)}
      >
        <View style={[styles.iconPickerContainer, { backgroundColor: colors.card }]}>
          <View style={styles.iconPickerHeader}>
            <Text style={[styles.iconPickerTitle, { color: colors.text }]}>
              {t('accounts.selectIcon')}
            </Text>
            <TouchableOpacity onPress={() => setShowIconPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={SAVINGS_ICONS}
            numColumns={4}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.iconItem,
                  { backgroundColor: colors.background },
                  selectedIcon === item && { borderColor: colors.primary, borderWidth: 2 }
                ]}
                onPress={() => {
                  setSelectedIcon(item);
                  setShowIconPicker(false);
                }}
              >
                <Ionicons name={item} size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
            keyExtractor={item => item}
            contentContainerStyle={styles.iconGrid}
          />
        </View>
      </Modal>

      {/* Date Picker для кредитов */}
      {showCreditDatePicker && (
        <Modal
          visible={showCreditDatePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCreditDatePicker(false)}
        >
          <View style={styles.datePickerModal}>
            <View style={[styles.datePickerContent, { backgroundColor: colors.card }]}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowCreditDatePicker(false)}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <Text style={[styles.datePickerTitle, { color: colors.text }]}>{t('accounts.creditDate')}</Text>
                <TouchableOpacity onPress={() => setShowCreditDatePicker(false)}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={creditStartDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  if (date) {
                    setCreditStartDate(date);
                  }
                  if (Platform.OS === 'android') {
                    setShowCreditDatePicker(false);
                  }
                }}
                maximumDate={new Date()}
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Currency Picker */}
      <Modal
        visible={showCurrencyPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <TouchableOpacity
          style={styles.datePickerModal}
          activeOpacity={1}
          onPress={() => setShowCurrencyPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.datePickerContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.datePickerHeader}>
              <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                {t('accounts.selectCurrency')}
              </Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {Object.entries(currencies).map(([code, currency]) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.currencyItem,
                    { backgroundColor: colors.background },
                    selectedCurrency === code && { borderColor: colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    setSelectedCurrency(code);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <View style={styles.currencyItemContent}>
                    <Text style={[styles.currencySymbol, { color: colors.text }]}>
                      {currency.symbol}
                    </Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.currencyCode, { color: colors.text }]}>
                        {code}
                      </Text>
                      <Text style={[styles.currencyName, { color: colors.textSecondary }]}>
                        {currency.name}
                      </Text>
                    </View>
                    {selectedCurrency === code && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Account Picker for Savings */}
      <Modal
        visible={showAccountPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <TouchableOpacity
          style={styles.datePickerModal}
          activeOpacity={1}
          onPress={() => setShowAccountPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.datePickerContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.datePickerHeader}>
              <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                {t('accounts.selectLinkedAccount')}
              </Text>
              <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {accounts
                .filter(acc => acc.type !== 'savings' && acc.type !== 'debt' && acc.type !== 'credit')
                .map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.currencyItem,
                      { backgroundColor: colors.background },
                      linkedAccountId === account.id && { borderColor: colors.primary, borderWidth: 2 }
                    ]}
                    onPress={() => {
                      setLinkedAccountId(account.id);
                      setShowAccountPicker(false);
                    }}
                  >
                    <View style={styles.currencyItemContent}>
                      <View style={[styles.iconCircle, { width: 40, height: 40, backgroundColor: colors.primary }]}>
                        <Ionicons 
                          name={account.type === 'cash' ? 'cash-outline' : 'card-outline'} 
                          size={20} 
                          color="#fff" 
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.currencyCode, { color: colors.text }]}>
                          {account.name}
                        </Text>
                        <Text style={[styles.currencyName, { color: colors.textSecondary }]}>
                          {t('accounts.balance')}: {formatAmount(account.balance, account.currency || defaultCurrency)}
                        </Text>
                      </View>
                      {linkedAccountId === account.id && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  rateInputWrapper: {
    position: 'relative',
  },
  rateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  rateIndicatorText: {
    fontSize: 12,
    marginLeft: 4,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  iconSelectorText: {
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    marginRight: 12,
  },
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconPickerContainer: {
    flex: 1,
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  iconPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  iconPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  iconGrid: {
    padding: 16,
  },
  iconItem: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  paymentTypeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  selectorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 4,
  },
  currencyItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 8,
  },
  currencyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '500',
    width: 40,
    textAlign: 'center',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 14,
    marginTop: 2,
  },
}); 