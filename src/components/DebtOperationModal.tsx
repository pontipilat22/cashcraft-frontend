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
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { LocalDatabaseService } from '../services/localDatabase';
import { Debt } from '../types';
import { CURRENCIES } from '../config/currencies';
import { useDatePicker } from '../hooks/useDatePicker'; // ⬅️ добавили хук

type OperationType = 'give' | 'return' | 'borrow' | 'payback';

interface DebtOperationModalProps {
  visible: boolean;
  operationType: OperationType | null;
  onClose: () => void;
  onOperationComplete?: () => void;
}

export const DebtOperationModal: React.FC<DebtOperationModalProps> = ({
  visible,
  operationType,
  onClose,
  onOperationComplete,
}) => {
  const { colors, isDark } = useTheme();
  const { accounts, createTransaction, refreshData } = useData();
  const { defaultCurrency } = useCurrency();
  const { t } = useLocalization();
  
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [existingDebts, setExistingDebts] = useState<Debt[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date());

  // ⬇️ единый хук выбора даты: он будет управлять модалкой и датой
  const datePicker = useDatePicker({
    initialDate: transactionDate,
    onDateChange: (d) => setTransactionDate(d),
  });

  // Загружаем существующие долги при открытии
  useEffect(() => {
    if (visible && (operationType === 'return' || operationType === 'payback')) {
      loadExistingDebts();
    }
  }, [visible, operationType]);

  // Устанавливаем счет по умолчанию
  useEffect(() => {
    const availableAccounts = accounts.filter(acc => acc.type !== 'savings');
    if (visible && availableAccounts.length > 0 && !selectedAccountId) {
      const defaultAccount = availableAccounts.find(acc => acc.isDefault);
      setSelectedAccountId(defaultAccount?.id || availableAccounts[0].id);
    }
  }, [visible, accounts, selectedAccountId]);

  const loadExistingDebts = async () => {
    try {
      const allDebts = await LocalDatabaseService.getDebts();
      const filtered = operationType === 'return' 
        ? allDebts.filter(d => d.type === 'owed_to_me')   // мне должны
        : allDebts.filter(d => d.type === 'owed_by_me');  // я должен
      setExistingDebts(filtered);
    } catch (error) {
      console.error('Error loading debts:', error);
    }
  };

  const getTitle = () => {
    switch (operationType) {
      case 'give': return t('debts.giveLoan');
      case 'return': return t('debts.receiveLoan');
      case 'borrow': return t('debts.borrowMoney');
      case 'payback': return t('debts.returnDebt');
      default: return '';
    }
  };

  const getPersonLabel = () => {
    switch (operationType) {
      case 'give': return t('debts.toWhomGive');
      case 'return': return t('debts.whoReturns');
      case 'borrow': return t('debts.fromWhomBorrow');
      case 'payback': return t('debts.toWhomReturn');
      default: return t('debts.person');
    }
  };

  const handleSave = async () => {
    if (!selectedAccountId) {
      Alert.alert(t('common.error'), t('transactions.selectAccount'));
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      Alert.alert(t('common.error'), t('debts.amountError'));
      return;
    }

    if (!person.trim() && !selectedDebt) {
      Alert.alert(t('common.error'), t('debts.personNameError'));
      return;
    }

    try {
      const personName = selectedDebt ? selectedDebt.name : person.trim();
      
      if (operationType === 'give' || operationType === 'borrow') {
        // Создаем новый долг
        await LocalDatabaseService.createDebt({
          type: operationType === 'give' ? 'owed_to_me' : 'owed_by_me',
          name: personName,
          amount: parseFloat(amount),
          isIncludedInTotal: true
        });

        // Создаем транзакцию
        await createTransaction({
          amount: amountNum,
          type: operationType === 'give' ? 'expense' : 'income',
          accountId: selectedAccountId,
          categoryId: operationType === 'give' ? 'other_expense' : 'other_income',
          description: `[DEBT:${operationType}] ${description.trim() || `${operationType === 'give' ? t('transactions.gaveLoan') : t('transactions.borrowedMoney')}: ${personName}`}`,
          date: transactionDate.toISOString(),
        });
      } else {
        // Погашаем долг
        if (!selectedDebt) {
          Alert.alert(t('common.error'), t('debts.selectDebtForPayment'));
          return;
        }

        if (amountNum > selectedDebt.amount) {
          Alert.alert(t('common.error'), t('debts.amountExceedsDebt', { 
            amount: selectedDebt.amount.toLocaleString('ru-RU'), 
            currency: currencySymbol 
          }));
          return;
        }

        // Обновляем или удаляем долг
        const newAmount = selectedDebt.amount - amountNum;
        if (newAmount <= 0) {
          await LocalDatabaseService.deleteDebt(selectedDebt.id);
        } else {
          await LocalDatabaseService.updateDebt(selectedDebt.id, { amount: newAmount });
        }

        // Создаем транзакцию
        await createTransaction({
          amount: amountNum,
          type: operationType === 'return' ? 'income' : 'expense',
          accountId: selectedAccountId,
          categoryId: operationType === 'return' ? 'other_income' : 'other_expense',
          description: `[DEBT:${operationType}] ${description.trim() || `${operationType === 'return' ? t('transactions.receivedLoan') : t('transactions.paidBackDebt')}: ${personName}`}`,
          date: transactionDate.toISOString(),
        });
      }

      await refreshData();
      resetForm();
      Alert.alert(t('common.success'), t('debts.operationSuccess'));
      onOperationComplete?.();
      onClose();
    } catch (error) {
      console.error('Error processing debt operation:', error);
      Alert.alert(t('common.error'), t('debts.operationError'));
    }
  };

  const resetForm = () => {
    setAmount('');
    setPerson('');
    setDescription('');
    setSelectedDebt(null);
    setTransactionDate(new Date());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setPerson(debt.name);
    setShowPersonPicker(false);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('transactions.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('transactions.yesterday');
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (!operationType) return null;

  const isReturnOperation = operationType === 'return' || operationType === 'payback';
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  
  const accountCurrency = selectedAccount?.currency || defaultCurrency;
  const currencySymbol = CURRENCIES[accountCurrency]?.symbol || CURRENCIES[defaultCurrency]?.symbol || '$';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {getTitle()}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Сумма */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('debts.amount')}
                {selectedDebt && (
                  <Text style={{ fontSize: 12 }}>
                    {' '}({t('debts.notInTotal')}: {selectedDebt.amount.toLocaleString('ru-RU')} {currencySymbol})
                  </Text>
                )}
              </Text>
              <View style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.currencySymbol, { color: colors.primary }]}>
                  {currencySymbol}
                </Text>
                <TextInput
                  style={[styles.amountTextInput, { color: colors.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              {selectedDebt && amount && parseFloat(amount) > selectedDebt.amount && (
                <Text style={{ color: '#FF5252', fontSize: 12, marginTop: 4 }}>
                  {t('debts.amountExceedsDebt', { 
                    amount: selectedDebt.amount.toLocaleString('ru-RU'), 
                    currency: currencySymbol 
                  })}
                </Text>
              )}
            </View>

            {/* Человек */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {getPersonLabel()}
              </Text>
              {isReturnOperation && existingDebts.length > 0 ? (
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setShowPersonPicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    {selectedDebt ? selectedDebt.name : t('debts.selectPerson')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={person}
                  onChangeText={setPerson}
                  placeholder={t('debts.personPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                />
              )}
            </View>

            {/* Описание */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.description')} ({t('common.optional')})
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('debts.forWhat')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Дата */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.date')}
              </Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => {
                  // открываем пикер на текущей дате операции
                  datePicker.setSelectedDate(transactionDate);
                  datePicker.openDatePicker();
                }}
              >
                <View style={styles.selectorContent}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    {formatDate(transactionDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Счет */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.account')}
              </Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowAccountPicker(true)}
              >
                <Text style={[styles.selectorText, { color: colors.text }]}>
                  {selectedAccount?.name || t('transactions.selectAccount')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={!amount || parseFloat(amount) === 0 || (!person.trim() && !selectedDebt)}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

 {/* ANDROID: показываем только системный диалог */}
{Platform.OS === 'android' && datePicker.showDatePicker && (
  <DateTimePicker
    value={datePicker.selectedDate}
    mode="date"
    display="default"
    locale="ru"
    onChange={datePicker.handleDateChange}
  />
)}

{/* iOS: своя модалка со спиннером */}
{Platform.OS === 'ios' && datePicker.showDatePicker && (
  <Modal
    visible={datePicker.showDatePicker}
    animationType="slide"
    transparent={true}
    onRequestClose={datePicker.closeDatePicker}
  >
    <View style={styles.datePickerModal}>
      <View style={[styles.datePickerContent, { backgroundColor: colors.card }]}>
        <View style={styles.datePickerHeader}>
          <TouchableOpacity onPress={datePicker.closeDatePicker}>
            <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.datePickerTitle, { color: colors.text }]}>
            {t('debts.selectDate')}
          </Text>
          <TouchableOpacity onPress={datePicker.closeDatePicker}>
            <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
        <DateTimePicker
          value={datePicker.selectedDate}
          mode="date"
          display="spinner"
          locale="ru"
          onChange={datePicker.handleDateChange}
          textColor={colors.text}
          themeVariant={isDark ? 'dark' : 'light'}
          style={{ height: 200 }}
        />
      </View>
    </View>
  </Modal>
)}


      {/* Person Picker for return operations */}
      <Modal
        visible={showPersonPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPersonPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowPersonPicker(false)}
        >
          <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {t('debts.selectDebtForPayment')}
              </Text>
              <TouchableOpacity onPress={() => setShowPersonPicker(false)} style={styles.pickerCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {existingDebts.map(debt => (
                <TouchableOpacity
                  key={debt.id}
                  style={[styles.pickerItem, { backgroundColor: colors.background }]}
                  onPress={() => handleSelectDebt(debt)}
                >
                  <View style={styles.debtInfo}>
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>
                      {debt.name}
                    </Text>
                    <Text style={[styles.debtDate, { color: colors.textSecondary }]}>
                      {debt.createdAt ? new Date(debt.createdAt).toLocaleDateString('ru-RU') : ''}
                    </Text>
                  </View>
                  <View style={styles.debtAmountInfo}>
                    <Text style={[styles.pickerItemBalance, { color: colors.primary }]}>
                      {debt.amount.toLocaleString('ru-RU')} {currencySymbol}
                    </Text>
                    <Text style={[styles.debtLabel, { color: colors.textSecondary }]}>
                      {t('debts.notInTotal')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

          {/* Account Picker */}
    <Modal
      visible={showAccountPicker}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAccountPicker(false)}
    >
      <TouchableOpacity
        style={styles.pickerOverlay}
        activeOpacity={1}
        onPress={() => setShowAccountPicker(false)}
      >
        <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              {t('transactions.selectAccount')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowAccountPicker(false)}
              style={styles.pickerCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
                
          <ScrollView>
            {accounts
              .filter((acc) => acc.type !== 'savings')
              .map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[styles.pickerItem, { backgroundColor: colors.background }]}
                  onPress={() => {
                    setSelectedAccountId(account.id);
                    setShowAccountPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>
                    {account.name}
                  </Text>
                  <Text style={[styles.pickerItemBalance, { color: colors.textSecondary }]}>
                    {(CURRENCIES[account.currency || defaultCurrency]?.symbol ||
                      CURRENCIES[defaultCurrency]?.symbol)}
                    {account.balance.toLocaleString('ru-RU')}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  </Modal>
  );
};
    
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '500',
    marginRight: 8,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '500',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  pickerContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  pickerCloseButton: {
    padding: 4,
    marginLeft: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  pickerItemText: {
    fontSize: 16,
  },
  pickerItemBalance: {
    fontSize: 14,
  },
  debtDate: {
    fontSize: 12,
    marginTop: 4,
  },
  debtInfo: {
    flex: 1,
  },
  debtAmountInfo: {
    alignItems: 'flex-end',
  },
  debtLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  datePickerContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  datePickerButton: {
    fontSize: 16,
    fontWeight: '500',
  },
});
