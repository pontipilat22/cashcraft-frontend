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
import { CURRENCIES } from '../config/currencies';

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { accounts, createTransaction } = useData();
  const { formatAmount, defaultCurrency } = useCurrency();
  const { t } = useLocalization();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFromAccountPicker, setShowFromAccountPicker] = useState(false);
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Состояние для валидации
  const [errors, setErrors] = useState<{
    amount?: boolean;
    fromAccount?: boolean;
    toAccount?: boolean;
  }>({});
  const [showErrors, setShowErrors] = useState(false);
  
  // Фильтруем счета
  const sourceAccounts = accounts.filter(acc => acc.type !== 'savings');
  const targetAccounts = accounts.filter(acc => acc.id !== fromAccountId);
  
  // Проверяем, достаточно ли счетов для перевода
  const canTransfer = accounts.length >= 2;
  
  useEffect(() => {
    if (!fromAccountId && sourceAccounts.length > 0) {
      setFromAccountId(sourceAccounts[0].id);
    }
  }, [sourceAccounts, fromAccountId]);
  
  const handleSave = async () => {
    // Валидация обязательных полей
    const newErrors: typeof errors = {};
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = true;
    }
    
    if (!fromAccountId) {
      newErrors.fromAccount = true;
    }
    
    if (!toAccountId) {
      newErrors.toAccount = true;
    }
    
    setErrors(newErrors);
    
    // Если есть ошибки, показываем их и не сохраняем
    if (Object.keys(newErrors).length > 0) {
      setShowErrors(true);
      return;
    }
    
    try {
      const fromAccount = accounts.find(a => a.id === fromAccountId);
      const toAccount = accounts.find(a => a.id === toAccountId);
      
      if (!fromAccount || !toAccount) {
        console.error('Account not found');
        return;
      }
      
      const transferAmount = parseFloat(amount);
      const transferDate = selectedDate.toISOString();
      const transferDescription = description.trim() || t('transactions.transfer');
      
      // Конвертируем сумму в валюту счета-получателя если валюты разные
      let toAmount = transferAmount;
      if (fromAccount.currency !== toAccount.currency) {
        // TODO: Использовать курсы обмена
        toAmount = transferAmount; // Пока без конвертации
      }
      
      // Создаем расходную транзакцию (в валюте счета-источника)
      await createTransaction({
        amount: transferAmount,
        type: 'expense',
        accountId: fromAccountId,
        categoryId: 'other_expense',
        description: `${transferDescription} → ${toAccount.name}`,
        date: transferDate,
      });
      
      // Создаем доходную транзакцию (в валюте счета-получателя)
      await createTransaction({
        amount: toAmount,
        type: 'income',
        accountId: toAccountId,
        categoryId: 'other_income',
        description: `${transferDescription} ← ${fromAccount.name}`,
        date: transferDate,
      });
      
      handleClose();
    } catch (error) {
      console.error('Error creating transfer:', error);
    }
  };
  
  const handleClose = () => {
    setAmount('');
    setDescription('');
    setFromAccountId(sourceAccounts.length > 0 ? sourceAccounts[0].id : '');
    setToAccountId('');
    setSelectedDate(new Date());
    setErrors({});
    setShowErrors(false);
    onClose();
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
      return date.toLocaleDateString();
    }
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };
  
  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const toAccount = accounts.find(a => a.id === toAccountId);
  
  // Получаем символ валюты из счета-источника
  const accountCurrency = fromAccount?.currency || defaultCurrency;
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
              {t('transactions.transfer')}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Сумма */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.amount')}
              </Text>
              <View style={[styles.amountInput, { 
                backgroundColor: colors.background, 
                borderColor: showErrors && errors.amount ? '#FF4444' : colors.border 
              }]}>
                <Text style={[styles.currencySymbol, { color: colors.primary }]}>
                  {currencySymbol}
                </Text>
                <TextInput
                  style={[styles.amountTextInput, { color: colors.text }]}
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    if (showErrors && errors.amount && text && parseFloat(text) > 0) {
                      setErrors(prev => ({ ...prev, amount: false }));
                    }
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              {showErrors && errors.amount && (
                <Text style={[styles.errorText, { color: '#FF4444' }]}>
                  {t('validation.amountRequired')}
                </Text>
              )}
            </View>

            {/* Со счета */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.fromAccount')}
              </Text>
              <TouchableOpacity
                style={[styles.selector, { 
                  backgroundColor: colors.background, 
                  borderColor: showErrors && errors.fromAccount ? '#FF4444' : colors.border 
                }]}
                onPress={() => setShowFromAccountPicker(true)}
              >
                <Text style={[styles.selectorText, { color: colors.text }]}>
                  {fromAccount?.name || t('transactions.selectAccount')}
                </Text>
                <View style={styles.accountBalance}>
                  {fromAccount && (
                    <Text style={[styles.balanceText, { color: colors.textSecondary }]}>
                      {formatAmount(fromAccount.balance)}
                    </Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
              {showErrors && errors.fromAccount && (
                <Text style={[styles.errorText, { color: '#FF4444' }]}>
                  {t('validation.accountRequired')}
                </Text>
              )}
            </View>

            {/* На счет */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.toAccount')}
              </Text>
              <TouchableOpacity
                style={[styles.selector, { 
                  backgroundColor: colors.background, 
                  borderColor: showErrors && errors.toAccount ? '#FF4444' : colors.border 
                }]}
                onPress={() => setShowToAccountPicker(true)}
                disabled={!fromAccountId}
              >
                <Text style={[styles.selectorText, { color: !fromAccountId ? colors.textSecondary : colors.text }]}>
                  {toAccount?.name || t('transactions.selectAccount')}
                </Text>
                <View style={styles.accountBalance}>
                  {toAccount && (
                    <Text style={[styles.balanceText, { color: colors.textSecondary }]}>
                      {formatAmount(toAccount.balance)}
                    </Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
              {showErrors && errors.toAccount && (
                <Text style={[styles.errorText, { color: '#FF4444' }]}>
                  {t('validation.accountRequired')}
                </Text>
              )}
            </View>

            {/* Дата */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.date')}
              </Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.selectorContent}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    {formatDate(selectedDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
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
                placeholder={t('transactions.enterDescription')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button, 
                styles.saveButton, 
                { backgroundColor: colors.primary }
              ]}
              onPress={handleSave}
              disabled={!amount || parseFloat(amount) === 0 || !fromAccountId || !toAccountId || fromAccountId === toAccountId}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <TouchableOpacity
            style={styles.datePickerOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={[styles.datePickerContent, { backgroundColor: colors.card }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* From Account Picker */}
      <Modal
        visible={showFromAccountPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFromAccountPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowFromAccountPicker(false)}
        >
          <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {t('transactions.fromAccount')}
              </Text>
              <TouchableOpacity onPress={() => setShowFromAccountPicker(false)} style={styles.pickerCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {sourceAccounts.map(account => (
                <TouchableOpacity
                  key={account.id}
                  style={[styles.pickerItem, { backgroundColor: colors.background }]}
                  onPress={() => {
                    setFromAccountId(account.id);
                    if (toAccountId === account.id) {
                      setToAccountId('');
                    }
                    setShowFromAccountPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>
                    {account.name}
                  </Text>
                  <Text style={[styles.pickerItemBalance, { color: colors.textSecondary }]}>
                    {formatAmount(account.balance)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* To Account Picker */}
      <Modal
        visible={showToAccountPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowToAccountPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowToAccountPicker(false)}
        >
          <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {t('transactions.toAccount')}
              </Text>
              <TouchableOpacity onPress={() => setShowToAccountPicker(false)} style={styles.pickerCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {targetAccounts.map(account => (
                <TouchableOpacity
                  key={account.id}
                  style={[styles.pickerItem, { backgroundColor: colors.background }]}
                  onPress={() => {
                    setToAccountId(account.id);
                    setShowToAccountPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>
                    {account.name}
                  </Text>
                  <Text style={[styles.pickerItemBalance, { color: colors.textSecondary }]}>
                    {formatAmount(account.balance)}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: 4,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 12,
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
    flex: 1,
  },
  accountBalance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 14,
    marginRight: 8,
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
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
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
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  datePickerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#FF4444',
    marginTop: 4,
  },
});
