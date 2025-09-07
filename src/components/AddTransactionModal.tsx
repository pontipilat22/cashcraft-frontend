import React, { useState } from 'react';
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
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { getLocalizedCategory } from '../utils/categoryUtils';
import { CURRENCIES } from '../config/currencies';
import { AddCategoryModal } from './AddCategoryModal';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: 'income' | 'expense';
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  initialType,
}) => {
  const { colors, isDark } = useTheme();
  const { accounts, categories, createTransaction } = useData();
  const { t } = useLocalization();
  
  const [isIncome, setIsIncome] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDatePickerOpening, setIsDatePickerOpening] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  
  // Состояние для валидации
  const [errors, setErrors] = useState<{
    amount?: boolean;
    account?: boolean;
    category?: boolean;
  }>({});
  const [showErrors, setShowErrors] = useState(false);
  
  // Устанавливаем тип транзакции при открытии
  React.useEffect(() => {
    if (visible && initialType) {
      setIsIncome(initialType === 'income');
    }
  }, [visible, initialType]);
  
  // Устанавливаем счет по умолчанию при открытии модального окна
  React.useEffect(() => {
    const availableAccounts = accounts.filter(acc => acc.type !== 'savings');
    if (visible && availableAccounts.length > 0) {
      const defaultAccount = availableAccounts.find(acc => acc.isDefault);
      setSelectedAccountId(defaultAccount?.id || availableAccounts[0].id);
    }
  }, [visible, accounts]);
  
  // Фильтруем категории по типу транзакции
  const filteredCategories = categories.filter(cat => cat.type === (isIncome ? 'income' : 'expense'));
  
  // Устанавливаем счет по умолчанию или первый счет
  React.useEffect(() => {
    const availableAccounts = accounts.filter(acc => acc.type !== 'savings');
    if (availableAccounts.length > 0 && !selectedAccountId) {
      const defaultAccount = availableAccounts.find(acc => acc.isDefault);
      setSelectedAccountId(defaultAccount?.id || availableAccounts[0].id);
    }
  }, [accounts]);
  
  React.useEffect(() => {
    if (filteredCategories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(filteredCategories[0].id);
    } else if (filteredCategories.length > 0 && !filteredCategories.find(c => c.id === selectedCategoryId)) {
      // Если текущая категория не подходит для нового типа, выбираем первую
      setSelectedCategoryId(filteredCategories[0].id);
    }
  }, [isIncome]);
  
  const handleSave = async () => {
    // Валидация обязательных полей
    const newErrors: typeof errors = {};
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = true;
    }
    
    if (!selectedAccountId) {
      newErrors.account = true;
    }
    
    if (!selectedCategoryId) {
      newErrors.category = true;
    }
    
    setErrors(newErrors);
    
    // Если есть ошибки, показываем их и не сохраняем
    if (Object.keys(newErrors).length > 0) {
      setShowErrors(true);
      return;
    }
    
    try {
      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      
      await createTransaction({
        amount: parseFloat(amount),
        type: isIncome ? 'income' : 'expense',
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        description: description.trim() || undefined,
        date: selectedDate.toISOString(),
      });
      
      // Очищаем форму и ошибки
      setAmount('');
      setDescription('');
      setIsIncome(false);
      setSelectedDate(new Date());
      setSelectedCategoryId('');
      setErrors({});
      setShowErrors(false);
      onClose();
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };
  
  const handleClose = () => {
    setAmount('');
    setDescription('');
    setIsIncome(false);
    setSelectedDate(new Date());
    setSelectedCategoryId('');
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
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    console.log('📅 [AddTransactionModal] DatePicker onChange:', {
      event: event?.type,
      selectedDate: selectedDate?.toISOString(),
      platform: Platform.OS
    });
    
    // Для Android всегда закрываем пикер при любом событии
    if (Platform.OS === 'android') {
      console.log('📅 [AddTransactionModal] Closing DatePicker (Android)...');
      setShowDatePicker(false);
      setIsDatePickerOpening(false);
    }
    
    // Устанавливаем дату только если она действительно выбрана
    if (selectedDate && event?.type !== 'dismissed') {
      setSelectedDate(selectedDate);
      console.log('✅ [AddTransactionModal] Date set:', selectedDate.toISOString());
    } else {
      console.log('❌ [AddTransactionModal] Date not set:', { selectedDate: !!selectedDate, eventType: event?.type });
    }
  };
  
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  
  // Получаем символ валюты выбранного счета
  const { defaultCurrency } = useCurrency();
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
              {t('transactions.addTransaction')}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Переключатель типа транзакции */}
            <View style={styles.typeContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('common.type')}
              </Text>
              <View style={[styles.typeSwitch, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    !isIncome && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setIsIncome(false)}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: !isIncome ? '#fff' : colors.text }
                  ]}>
                    {t('transactions.expense')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    isIncome && { backgroundColor: '#4CAF50' },
                  ]}
                  onPress={() => setIsIncome(true)}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: isIncome ? '#fff' : colors.text }
                  ]}>
                    {t('transactions.income')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Сумма */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.amount')}
              </Text>
              <View style={[styles.amountInput, { 
                backgroundColor: colors.background, 
                borderColor: showErrors && errors.amount ? '#FF4444' : colors.border 
              }]}>
                <Text style={[styles.currencySymbol, { color: isIncome ? '#4CAF50' : colors.primary }]}>
                  {isIncome ? '+' : '-'}{currencySymbol}
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

            {/* Дата */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.date')}
              </Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => {
                  if (!showDatePicker && !isDatePickerOpening) {
                    console.log('📅 [AddTransactionModal] Opening DatePicker...');
                    setIsDatePickerOpening(true);
                    setTimeout(() => {
                      setShowDatePicker(true);
                      setIsDatePickerOpening(false);
                    }, 100);
                  } else {
                    console.log('📅 [AddTransactionModal] DatePicker already opening/open, ignoring...');
                  }
                }}
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

            {/* Категория */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.category')}
              </Text>
              <TouchableOpacity
                style={[styles.selector, { 
                  backgroundColor: colors.background, 
                  borderColor: showErrors && errors.category ? '#FF4444' : colors.border 
                }]}
                onPress={() => setShowCategoryPicker(true)}
              >
                <View style={styles.selectorContent}>
                  {selectedCategory && (
                    <View style={[styles.categoryIcon, { backgroundColor: selectedCategory.color + '20' }]}>
                      <Ionicons name={selectedCategory.icon as any} size={20} color={selectedCategory.color} />
                    </View>
                  )}
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    {selectedCategory ? getLocalizedCategory(selectedCategory, t).name : t('transactions.selectCategory')}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {showErrors && errors.category && (
                <Text style={[styles.errorText, { color: '#FF4444' }]}>
                  {t('validation.categoryRequired')}
                </Text>
              )}
            </View>

            {/* Счет */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.account')}
              </Text>
              <TouchableOpacity
                style={[styles.selector, { 
                  backgroundColor: colors.background, 
                  borderColor: showErrors && errors.account ? '#FF4444' : colors.border 
                }]}
                onPress={() => setShowAccountPicker(true)}
              >
                <Text style={[styles.selectorText, { color: colors.text }]}>
                  {selectedAccount?.name || t('transactions.selectAccount')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {showErrors && errors.account && (
                <Text style={[styles.errorText, { color: '#FF4444' }]}>
                  {t('validation.accountRequired')}
                </Text>
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
                { backgroundColor: isIncome ? '#4CAF50' : colors.primary }
              ]}
              onPress={handleSave}
              disabled={!amount || parseFloat(amount) === 0}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          locale="ru"
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
            onPress={() => {
              console.log('📅 [AddTransactionModal] Closing DatePicker (iOS overlay)...');
              setShowDatePicker(false);
              setIsDatePickerOpening(false);
            }}
          >
            <View style={[styles.datePickerContent, { backgroundColor: colors.card }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => {
                  console.log('📅 [AddTransactionModal] Closing DatePicker (iOS cancel)...');
                  setShowDatePicker(false);
                  setIsDatePickerOpening(false);
                }}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  console.log('📅 [AddTransactionModal] Closing DatePicker (iOS done)...');
                  setShowDatePicker(false);
                  setIsDatePickerOpening(false);
                }}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                locale="ru"
                themeVariant={isDark ? 'dark' : 'light'}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {t('transactions.selectCategory')}
              </Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)} style={styles.pickerCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {filteredCategories.map(category => {
                const localizedCategory = getLocalizedCategory(category, t);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryPickerItem, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setSelectedCategoryId(category.id);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                      <Ionicons name={category.icon as any} size={20} color={category.color} />
                    </View>
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>
                      {localizedCategory.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
              {/* Кнопка добавления новой категории */}
              <TouchableOpacity
                style={[styles.categoryPickerItem, { 
                  backgroundColor: colors.background,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  marginTop: 8,
                }]}
                onPress={() => {
                  setShowCategoryPicker(false);
                  setShowAddCategoryModal(true);
                }}
              >
                <View style={[styles.categoryIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="add" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.pickerItemText, { color: colors.primary, fontWeight: '600' }]}>
                  {t('categories.addCategory')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
              <TouchableOpacity onPress={() => setShowAccountPicker(false)} style={styles.pickerCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {accounts.filter(acc => acc.type !== 'savings').map(account => (
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
                    {CURRENCIES[account.currency || defaultCurrency]?.symbol || CURRENCIES[defaultCurrency]?.symbol}{account.balance.toLocaleString('ru-RU')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <AddCategoryModal
        visible={showAddCategoryModal}
        type={isIncome ? 'income' : 'expense'}
        onClose={() => setShowAddCategoryModal(false)}
      />
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
  typeContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  typeSwitch: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
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
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
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