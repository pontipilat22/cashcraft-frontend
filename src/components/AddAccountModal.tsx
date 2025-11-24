import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  FlatList,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useData } from '../context/DataContext';
import { useBudgetContext } from '../context/BudgetContext';
import { AccountType, AccountTypeLabels } from '../types/index';
import { useDatePicker } from '../hooks/useDatePicker';
import { validateNumericInput } from '../utils/numberInput';
import { modalStyles } from '../styles/modalStyles';
import { ModalWrapper } from './common/ModalWrapper';
import { ModalFooter } from './common/ModalFooter';
import { InputField } from './common/InputField';
import { CurrencyPicker } from './common/CurrencyPicker';

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
    isTargetedSavings?: boolean;
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
  const { isEnabled: isBudgetEnabled } = useBudgetContext();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [includeBudget, setIncludeBudget] = useState(false);
  const [exchangeRate, setExchangeRate] = useState('1');
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
  const creditDatePicker = useDatePicker({
    initialDate: new Date()
  });
  const [creditTerm, setCreditTerm] = useState('');
  const [creditRate, setCreditRate] = useState('');
  const [creditPaymentType, setCreditPaymentType] = useState<'annuity' | 'differentiated'>('annuity');
  const [suggestedRate, setSuggestedRate] = useState<number | null>(null);
  const [creditDepositAccountId, setCreditDepositAccountId] = useState<string>('');
  const [creditDepositAmount, setCreditDepositAmount] = useState<string>('');

  // Для накоплений - связанный счет
  const [linkedAccountId, setLinkedAccountId] = useState<string>('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [isTargetedSavings, setIsTargetedSavings] = useState(true);

  // Состояние для валидации
  const [errors, setErrors] = useState<{
    name?: boolean;
    balance?: boolean;
    creditTerm?: boolean;
    creditRate?: boolean;
    targetAmount?: boolean;
  }>({});
  const [showErrors, setShowErrors] = useState(false);

  // Устанавливаем счет по умолчанию при открытии модального окна для накоплений
  useEffect(() => {
    if (visible && accountType === 'savings') {
      const defaultAccount = accounts.find(acc => acc.isDefault && acc.type !== 'savings' && acc.type !== 'debt' && acc.type !== 'credit');
      if (defaultAccount) {
        setLinkedAccountId(defaultAccount.id);
        setSelectedCurrency(defaultAccount.currency || defaultCurrency);
      } else {
        const firstAccount = accounts.find(acc => acc.type !== 'savings' && acc.type !== 'debt' && acc.type !== 'credit');
        if (firstAccount) {
          setLinkedAccountId(firstAccount.id);
          setSelectedCurrency(firstAccount.currency || defaultCurrency);
        }
      }
    }
  }, [visible, accountType, accounts, defaultCurrency]);

  // Устанавливаем счет по умолчанию при открытии модального окна для кредитов
  useEffect(() => {
    if (visible && accountType === 'credit') {
      const availableAccounts = accounts.filter(acc => acc.type !== 'savings' && acc.type !== 'credit' && acc.type !== 'debt');

      if (availableAccounts.length > 0) {
        if (!creditDepositAccountId) {
          const defaultAccount = availableAccounts.find(acc => acc.isDefault);
          setCreditDepositAccountId(defaultAccount?.id || availableAccounts[0].id);
        }
      }
    }
  }, [visible, accountType, accounts, creditDepositAccountId]);

  // Обновляем валюту при изменении привязанного счета
  useEffect(() => {
    if (accountType === 'savings' && linkedAccountId) {
      const linkedAccount = accounts.find(acc => acc.id === linkedAccountId);
      if (linkedAccount) {
        setSelectedCurrency(linkedAccount.currency || defaultCurrency);
      }
    }
  }, [linkedAccountId, accounts, accountType, defaultCurrency]);

  // Загружаем предложенный курс при изменении валюты
  useEffect(() => {
    const loadSuggestedRate = async () => {
      if (selectedCurrency !== defaultCurrency) {
        try {
          const { ExchangeRateService } = await import('../services/exchangeRate');

          const rate = await ExchangeRateService.getRate(selectedCurrency, defaultCurrency);
          if (rate) {
            setSuggestedRate(rate);
            setExchangeRate(rate.toString());
          } else {
            setSuggestedRate(null);
            setExchangeRate('1');
          }
        } catch (error) {
          console.error('Error loading exchange rate:', error);
          setSuggestedRate(null);
          setExchangeRate('1');
        }
      } else {
        setSuggestedRate(null);
        setExchangeRate('1');
      }
    };

    loadSuggestedRate();
  }, [selectedCurrency, defaultCurrency]);

  // Автоматически включаем отслеживание бюджета для начального баланса если система бюджетирования включена
  useEffect(() => {
    if (visible && isBudgetEnabled && accountType !== 'savings' && accountType !== 'credit') {
      setIncludeBudget(true);
    }
  }, [visible, isBudgetEnabled, accountType]);

  const handleSave = async () => {
    // Валидация обязательных полей
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = true;
    }

    if (accountType !== 'savings' && (!balance || parseFloat(balance) < 0)) {
      newErrors.balance = true;
    }

    if (accountType === 'credit') {
      if (!creditTerm || parseInt(creditTerm) <= 0) {
        newErrors.creditTerm = true;
      }
      if (!creditRate || parseFloat(creditRate) < 0) {
        newErrors.creditRate = true;
      }
    }

    if (accountType === 'savings' && targetAmount && parseFloat(targetAmount) <= 0) {
      newErrors.targetAmount = true;
    }

    setErrors(newErrors);

    // Если есть ошибки, показываем их и не сохраняем
    if (Object.keys(newErrors).length > 0) {
      setShowErrors(true);
      return;
    }

    // Сохраняем курс если он был указан
    if (selectedCurrency !== defaultCurrency && exchangeRate) {
      const rate = parseFloat(exchangeRate);
      if (rate > 0) {
        console.log(`Exchange rate ${selectedCurrency}/${defaultCurrency} = ${rate} will be cached on next request`);
      }
    }

    const accountData: any = {
      name: name.trim(),
      balance: accountType === 'savings' ? 0 : (parseFloat(balance) || 0),
      currency: selectedCurrency,
      exchangeRate: selectedCurrency !== defaultCurrency ? parseFloat(exchangeRate) || 1 : undefined,
      cardNumber: cardNumber.trim() ? cardNumber.trim() : undefined,
      isDefault: (accountType !== 'savings' && accountType !== 'credit' && accountType !== 'debt') ? isDefault : false,
      isIncludedInTotal: (accountType === 'savings' || accountType === 'credit') ? false : isIncludedInTotal,
      includeBudget: (accountType !== 'savings' && accountType !== 'credit') ? includeBudget : undefined,
    };

    if (accountType === 'savings') {
      accountData.icon = selectedIcon;
      accountData.savedAmount = 0;
      accountData.isTargetedSavings = isTargetedSavings;
      if (isTargetedSavings && targetAmount) {
        accountData.targetAmount = parseFloat(targetAmount);
      } else if (!isTargetedSavings) {
        accountData.targetAmount = undefined;
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
      accountData.creditStartDate = creditDatePicker.selectedDate.toISOString();
      accountData.creditTerm = parseInt(creditTerm) || 0;
      accountData.creditRate = parseFloat(creditRate) || 0;
      accountData.creditPaymentType = creditPaymentType;
      accountData.creditInitialAmount = parseFloat(balance) || 0;
      accountData.creditDepositAccountId = creditDepositAccountId;

      const enteredAmount = creditDepositAmount.trim();
      if (enteredAmount === '') {
        accountData.creditDepositAmount = parseFloat(balance) || 0;
      } else {
        accountData.creditDepositAmount = parseFloat(enteredAmount) || 0;
      }

      console.log('AddAccountModal - Credit data being sent:', {
        creditDepositAccountId: accountData.creditDepositAccountId,
        creditDepositAmount: accountData.creditDepositAmount,
        creditDepositAmountInput: creditDepositAmount,
        balance,
        enteredAmount
      });
    }

    onSave(accountData);

    // Очищаем форму и ошибки
    setName('');
    setBalance('');
    setSelectedCurrency(defaultCurrency);
    setExchangeRate('1');
    setCardNumber('');
    setIsDefault(false);
    setIsIncludedInTotal(true);
    setIncludeBudget(false);
    setSelectedIcon(SAVINGS_ICONS[0]);
    setTargetAmount('');
    setLinkedAccountId('');
    setIsTargetedSavings(true);
    setInterestRate('');
    setOpenDate('');
    setInterestDay('');
    creditDatePicker.setSelectedDate(new Date());
    setCreditTerm('');
    setCreditRate('');
    setCreditPaymentType('annuity');
    setCreditDepositAccountId('');
    setCreditDepositAmount('');
    setErrors({});
    setShowErrors(false);
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

  const getTitle = () => {
    if (accountType === 'credit') return t('accounts.addCredit') || 'Добавить кредит';
    if (accountType === 'savings') return t('accounts.addSavings') || 'Добавить накопление';
    if (accountType === 'debt') return t('accounts.addDebt') || 'Добавить долг';
    return t('accounts.addAccount');
  };

  return (
    <ModalWrapper
      visible={visible}
      onClose={onClose}
      title={getTitle()}
      showScrollView={false}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={modalStyles.iconContainer}>
          <View style={[modalStyles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name={getIcon()} size={32} color="#fff" />
          </View>
        </View>

        {/* Icon selector for savings */}
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

        {/* Account Name */}
        <InputField
          label={t('accounts.accountName')}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (showErrors && errors.name && text.trim()) {
              setErrors(prev => ({ ...prev, name: false }));
            }
          }}
          placeholder={t('accounts.accountName')}
          showError={showErrors && errors.name}
          errorMessage={t('validation.accountNameRequired')}
        />

        {/* Initial Balance - НЕ показываем для savings и credit */}
        {accountType !== 'savings' && accountType !== 'credit' && (
          <>
            <InputField
              label={t('accounts.initialBalance')}
              value={balance}
              onChangeText={(text) => {
                const validated = validateNumericInput(text);
                setBalance(validated);
                if (showErrors && errors.balance && validated && parseFloat(validated) >= 0) {
                  setErrors(prev => ({ ...prev, balance: false }));
                }
              }}
              placeholder="0"
              keyboardType="numeric"
              showError={showErrors && errors.balance}
              errorMessage={t('validation.balanceRequired')}
            />

            {/* Budget System Toggle - только если система бюджетирования включена */}
            {isBudgetEnabled && (
              <View style={modalStyles.inputContainer}>
                <View style={[styles.budgetToggleContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.budgetToggleInfo}>
                    <Text style={[modalStyles.label, { color: colors.textSecondary, fontSize: 13 }]}>
                      {t('plans.includeBudgetSystem')}
                    </Text>
                    <Text style={[styles.budgetToggleSubtitle, { color: colors.textSecondary, fontSize: 11 }]}>
                      {includeBudget ? t('plans.budgetTrackingEnabled') : t('plans.budgetTrackingDisabled')}
                    </Text>
                  </View>
                  <Switch
                    value={includeBudget}
                    onValueChange={setIncludeBudget}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={Platform.OS === 'android' ? (includeBudget ? '#fff' : '#f4f3f4') : undefined}
                  />
                </View>
              </View>
            )}
          </>
        )}

        {/* Currency Picker - НЕ показываем для savings */}
        {accountType !== 'savings' && (
          <>
            <CurrencyPicker
              label={t('accounts.currency')}
              value={selectedCurrency}
              onChange={setSelectedCurrency}
            />

            {/* Exchange Rate */}
            {selectedCurrency !== defaultCurrency && (
              <View style={modalStyles.inputContainer}>
                <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
                  {t('accounts.exchangeRate')}
                </Text>
                <Text style={[modalStyles.helperText, { color: colors.textSecondary }]}>
                  1 {selectedCurrency} = ? {defaultCurrency}
                </Text>
                <View style={styles.rateInputWrapper}>
                  <TextInput
                    style={[modalStyles.input, {
                      backgroundColor: colors.background,
                      color: suggestedRate && parseFloat(exchangeRate) === suggestedRate ? colors.primary : colors.text,
                      borderColor: suggestedRate && parseFloat(exchangeRate) === suggestedRate ? colors.primary : colors.border,
                    }]}
                    value={exchangeRate}
                    onChangeText={(text) => setExchangeRate(validateNumericInput(text))}
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
          </>
        )}

        {/* Savings fields */}
        {accountType === 'savings' && (
          <>
            {/* Targeted Savings Switch */}
            <View style={modalStyles.switchContainer}>
              <Text style={[modalStyles.switchLabel, { color: colors.text }]}>
                {t('accounts.targetedSavings') || 'Целевое накопление'}
              </Text>
              <Switch
                value={isTargetedSavings}
                onValueChange={setIsTargetedSavings}
                trackColor={{ false: '#767577', true: colors.primary }}
              />
            </View>

            {/* Target Amount */}
            {isTargetedSavings && (
              <InputField
                label={t('accounts.targetAmount')}
                value={targetAmount}
                onChangeText={(text) => {
                  const validated = validateNumericInput(text);
                  setTargetAmount(validated);
                  if (showErrors && errors.targetAmount && validated && parseFloat(validated) > 0) {
                    setErrors(prev => ({ ...prev, targetAmount: false }));
                  }
                }}
                placeholder="0"
                keyboardType="numeric"
                showError={showErrors && errors.targetAmount}
                errorMessage={t('validation.targetAmountInvalid')}
              />
            )}

            {/* Linked Account Picker */}
            <View style={modalStyles.inputContainer}>
              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
                {t('accounts.linkedAccount')}
              </Text>
              <TouchableOpacity
                style={[modalStyles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowAccountPicker(true)}
              >
                <View style={modalStyles.selectorContent}>
                  <Text style={[modalStyles.selectorText, { color: linkedAccountId ? colors.text : colors.textSecondary }]}>
                    {linkedAccountId
                      ? accounts.find(acc => acc.id === linkedAccountId)?.name || t('accounts.selectLinkedAccount')
                      : t('accounts.selectLinkedAccount')
                    }
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[modalStyles.helperText, { color: colors.textSecondary, marginTop: 4 }]}>
                {t('accounts.linkedAccountDescription')}
              </Text>
            </View>
          </>
        )}

        {/* Card Number */}
        {accountType === 'card' && (
          <InputField
            label={t('accounts.cardNumber') + ' (необязательно)'}
            value={cardNumber}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '');
              if (cleaned.length <= 4) {
                setCardNumber(cleaned);
              }
            }}
            placeholder="Последние 4 цифры"
            keyboardType="numeric"
            maxLength={4}
          />
        )}

        {/* Default Account & Include in Total switches */}
        {accountType !== 'savings' && accountType !== 'credit' && accountType !== 'debt' && (
          <>
            <View style={modalStyles.switchContainer}>
              <Text style={[modalStyles.switchLabel, { color: colors.text }]}>
                {t('accounts.defaultAccount')}
              </Text>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: '#767577', true: colors.primary }}
              />
            </View>

            <View style={modalStyles.switchContainer}>
              <Text style={[modalStyles.switchLabel, { color: colors.text }]}>
                {t('accounts.includeInBalance')}
              </Text>
              <Switch
                value={isIncludedInTotal}
                onValueChange={setIsIncludedInTotal}
                trackColor={{ false: '#767577', true: colors.primary }}
              />
            </View>
          </>
        )}

        {/* Bank account fields */}
        {accountType === 'bank' && (
          <>
            <InputField
              label={t('accounts.interestRate')}
              value={interestRate}
              onChangeText={(text) => setInterestRate(validateNumericInput(text))}
              placeholder="7.5"
              keyboardType="numeric"
            />
            <InputField
              label={t('accounts.openDate')}
              value={openDate}
              onChangeText={setOpenDate}
              placeholder="DD.MM.YYYY"
            />
            <InputField
              label={t('accounts.interestDay')}
              value={interestDay}
              onChangeText={(text) => setInterestDay(text.replace(/[^0-9]/g, ''))}
              placeholder="15"
              keyboardType="numeric"
            />
          </>
        )}

        {/* Credit fields */}
        {accountType === 'credit' && (
          <>
            {/* Основная информация */}
            <View style={[styles.sectionContainer, { backgroundColor: isDark ? '#1C1C1C' : '#F9FAFB' }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Основная информация
              </Text>

              {/* Сумма кредита */}
              <View style={[modalStyles.inputContainer, { marginBottom: 12 }]}>
                <Text style={[modalStyles.label, { color: colors.textSecondary, fontSize: 13 }]}>
                  Сумма кредита
                </Text>
                <TextInput
                  style={[modalStyles.input, {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: showErrors && errors.balance ? '#FF4444' : colors.border,
                    fontSize: 18,
                    fontWeight: '600',
                  }]}
                  value={balance}
                  onChangeText={(text) => setBalance(validateNumericInput(text))}
                  placeholder="100 000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              {/* Дата начала */}
              <View style={modalStyles.inputContainer}>
                <Text style={[modalStyles.label, { color: colors.textSecondary, fontSize: 13 }]}>
                  Когда взяли кредит
                </Text>
                <TouchableOpacity
                  style={[modalStyles.selector, {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }]}
                  onPress={creditDatePicker.openDatePicker}
                >
                  <Text style={{ fontSize: 16, color: colors.text }}>
                    {creditDatePicker.selectedDate.toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Условия кредита */}
            <View style={[styles.sectionContainer, { backgroundColor: isDark ? '#1C1C1C' : '#F9FAFB' }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Условия кредита
              </Text>

              {/* Срок и ставка */}
              <View style={[styles.rowContainer, { marginBottom: 12 }]}>
                <View style={[modalStyles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={[modalStyles.label, { color: colors.textSecondary, fontSize: 13 }]}>
                    Срок
                  </Text>
                  <TextInput
                    style={[modalStyles.input, {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: showErrors && errors.creditTerm ? '#FF4444' : colors.border,
                    }]}
                    value={creditTerm}
                    onChangeText={(text) => {
                      const validated = text.replace(/[^0-9]/g, '');
                      setCreditTerm(validated);
                      if (showErrors && errors.creditTerm && validated && parseInt(validated) > 0) {
                        setErrors(prev => ({ ...prev, creditTerm: false }));
                      }
                    }}
                    placeholder="12"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>месяцев</Text>
                </View>

                <View style={[modalStyles.inputContainer, { flex: 1 }]}>
                  <Text style={[modalStyles.label, { color: colors.textSecondary, fontSize: 13 }]}>
                    Ставка
                  </Text>
                  <TextInput
                    style={[modalStyles.input, {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: showErrors && errors.creditRate ? '#FF4444' : colors.border,
                    }]}
                    value={creditRate}
                    onChangeText={(text) => {
                      const validated = validateNumericInput(text);
                      setCreditRate(validated);
                      if (showErrors && errors.creditRate && validated && parseFloat(validated) >= 0) {
                        setErrors(prev => ({ ...prev, creditRate: false }));
                      }
                    }}
                    placeholder="15.5"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>% годовых</Text>
                </View>
              </View>

              {/* Тип платежей */}
              <View style={modalStyles.inputContainer}>
                <Text style={[modalStyles.label, { color: colors.textSecondary, fontSize: 13, marginBottom: 8 }]}>
                  Тип платежей
                </Text>
                <View style={styles.paymentTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.paymentTypeButton,
                      {
                        backgroundColor: creditPaymentType === 'annuity' ? colors.primary : colors.background,
                        borderColor: creditPaymentType === 'annuity' ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setCreditPaymentType('annuity')}
                  >
                    <Text style={[
                      styles.paymentTypeText,
                      { color: creditPaymentType === 'annuity' ? '#fff' : colors.text }
                    ]}>
                      Аннуитет
                    </Text>
                    <Text style={[
                      styles.paymentTypeHint,
                      { color: creditPaymentType === 'annuity' ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                    ]}>
                      Равные платежи
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paymentTypeButton,
                      {
                        backgroundColor: creditPaymentType === 'differentiated' ? colors.primary : colors.background,
                        borderColor: creditPaymentType === 'differentiated' ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setCreditPaymentType('differentiated')}
                  >
                    <Text style={[
                      styles.paymentTypeText,
                      { color: creditPaymentType === 'differentiated' ? '#fff' : colors.text }
                    ]}>
                      Дифференцированный
                    </Text>
                    <Text style={[
                      styles.paymentTypeHint,
                      { color: creditPaymentType === 'differentiated' ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                    ]}>
                      Убывающие платежи
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Зачисление денег */}
            <View style={[styles.sectionContainer, { backgroundColor: isDark ? '#1C1C1C' : '#F9FAFB' }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Зачисление денег
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 12 }]}>
                Если деньги уже потрачены, оставьте сумму 0
              </Text>

              {accounts.filter(acc => acc.type !== 'savings' && acc.type !== 'credit' && acc.type !== 'debt').length > 0 ? (
                <>
                  <View style={[modalStyles.inputContainer, { marginBottom: 12 }]}>
                    <Text style={[modalStyles.label, { color: colors.textSecondary, fontSize: 13, marginBottom: 8 }]}>
                      Выберите счёт
                    </Text>
                    <View style={styles.accountSelector}>
                      {accounts
                        .filter(acc => acc.type !== 'savings' && acc.type !== 'credit' && acc.type !== 'debt')
                        .map((acc) => (
                          <TouchableOpacity
                            key={acc.id}
                            style={[
                              styles.accountButton,
                              {
                                backgroundColor: creditDepositAccountId === acc.id ? colors.primary : colors.background,
                                borderColor: creditDepositAccountId === acc.id ? colors.primary : colors.border,
                              },
                            ]}
                            onPress={() => setCreditDepositAccountId(acc.id)}
                          >
                            <Text
                              style={[
                                styles.accountButtonText,
                                { color: creditDepositAccountId === acc.id ? '#FFFFFF' : colors.text },
                              ]}
                            >
                              {acc.name}
                            </Text>
                            <Text
                              style={[
                                styles.accountBalance,
                                { color: creditDepositAccountId === acc.id ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
                              ]}
                            >
                              {formatAmount(acc.balance, acc.currency || defaultCurrency)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>

                  <View style={modalStyles.inputContainer}>
                    <Text style={[modalStyles.label, { color: colors.textSecondary, fontSize: 13 }]}>
                      Сумма для зачисления
                    </Text>
                    <TextInput
                      style={[
                        modalStyles.input,
                        {
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={creditDepositAmount}
                      onChangeText={(text) => setCreditDepositAmount(validateNumericInput(text))}
                      keyboardType="numeric"
                      placeholder={balance || "0"}
                      placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      По умолчанию = сумме кредита. Укажите 0 если деньги уже потрачены
                    </Text>
                  </View>
                </>
              ) : (
                <View style={[{ backgroundColor: isDark ? '#2C2C2C' : '#FEF3C7', borderRadius: 8, padding: 12 }]}>
                  <Text style={[{ color: isDark ? colors.textSecondary : '#92400E', fontSize: 13 }]}>
                    ⚠️ Нет доступных счетов. Сначала создайте обычный счёт для зачисления денег.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer with buttons */}
      <ModalFooter
        onCancel={onClose}
        onSave={handleSave}
      />

      {/* Icon Picker Modal for Savings */}
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

      {/* Date Picker for Credit */}
      {creditDatePicker.showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={creditDatePicker.selectedDate}
          mode="date"
          display="default"
          onChange={creditDatePicker.handleDateChange}
        />
      )}

      {creditDatePicker.showDatePicker && Platform.OS === 'ios' && (
        <Modal
          visible={creditDatePicker.showDatePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={creditDatePicker.closeDatePicker}
        >
          <View style={modalStyles.datePickerOverlay}>
            <View style={[modalStyles.datePickerContent, { backgroundColor: colors.card }]}>
              <View style={[modalStyles.datePickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={creditDatePicker.closeDatePicker}>
                  <Text style={[modalStyles.datePickerButton, { color: colors.primary }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                  {t('accounts.creditDate')}
                </Text>
                <TouchableOpacity onPress={creditDatePicker.closeDatePicker}>
                  <Text style={[modalStyles.datePickerButton, { color: colors.primary }]}>
                    {t('common.done')}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={creditDatePicker.selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={creditDatePicker.handleDateChange}
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Account Picker for Savings */}
      <Modal
        visible={showAccountPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <TouchableOpacity
          style={modalStyles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowAccountPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[modalStyles.pickerContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={modalStyles.pickerHeader}>
              <Text style={[modalStyles.pickerTitle, { color: colors.text }]}>
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
                      styles.accountPickerItem,
                      { backgroundColor: colors.background },
                      linkedAccountId === account.id && { borderColor: colors.primary, borderWidth: 2 }
                    ]}
                    onPress={() => {
                      setLinkedAccountId(account.id);
                      setShowAccountPicker(false);
                    }}
                  >
                    <View style={styles.accountPickerContent}>
                      <View style={[modalStyles.iconCircle, { width: 40, height: 40, backgroundColor: colors.primary }]}>
                        <Ionicons
                          name={account.type === 'cash' ? 'cash-outline' : 'card-outline'}
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.accountPickerName, { color: colors.text }]}>
                          {account.name}
                        </Text>
                        <Text style={[styles.accountPickerBalance, { color: colors.textSecondary }]}>
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
    </ModalWrapper>
  );
};

const styles = StyleSheet.create({
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
  sectionContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  paymentTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    marginHorizontal: 4,
  },
  paymentTypeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  paymentTypeHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  accountSelector: {
    gap: 8,
  },
  accountButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  accountButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountBalance: {
    fontSize: 12,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  accountPickerItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 8,
  },
  accountPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountPickerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountPickerBalance: {
    fontSize: 14,
    marginTop: 2,
  },
  budgetToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  budgetToggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  budgetToggleSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
