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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { useDatePicker } from '../hooks/useDatePicker';
import { useBudgetContext } from '../context/BudgetContext';
import { getLocalizedCategory } from '../utils/categoryUtils';
import { CURRENCIES } from '../config/currencies';
import { AddCategoryModal } from './AddCategoryModal';
import { useInterstitialAd } from '../hooks/useInterstitialAd';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: 'income' | 'expense';
  isBudgetEnabled?: boolean;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  initialType,
  isBudgetEnabled = false,
}) => {
  const { colors, isDark } = useTheme();
  const { accounts, categories, createTransaction } = useData();
  const { t } = useLocalization();
  const { processIncome, recordExpense, reloadData } = useBudgetContext();
  const { trackTransaction } = useInterstitialAd(); // Отслеживание транзакций для рекламы
  
  // Используем новый хук для DatePicker
  const datePicker = useDatePicker({
    initialDate: new Date()
  });
  
  const [isIncome, setIsIncome] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [includeBudget, setIncludeBudget] = useState(false);
  
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
      console.log('📝 [AddTransactionModal] Opening with:', {
        initialType,
        isBudgetEnabled,
        willSetIncludeBudget: initialType === 'income' && isBudgetEnabled
      });
      setIsIncome(initialType === 'income');
      // Если это доход и бюджет включен, сразу устанавливаем includeBudget
      if (initialType === 'income' && isBudgetEnabled) {
        setIncludeBudget(true);
      }
    }
  }, [visible, initialType, isBudgetEnabled]);

  // Управляем includeBudget при смене типа транзакции
  React.useEffect(() => {
    if (!isIncome) {
      setIncludeBudget(false);
    } else if (isIncome && isBudgetEnabled && visible) {
      // Автоматически включаем для доходов если система бюджета активна
      setIncludeBudget(true);
    }
  }, [isIncome, isBudgetEnabled, visible]);
  
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
  
  // Function to determine if a category is essential
  const isEssentialCategory = (category: any) => {
    if (!category) return false;

    // If category has budgetCategory field, use it
    if (category.budgetCategory) {
      return category.budgetCategory === 'essential';
    }

    // Otherwise, determine by category name (basic logic)
    const essentialKeywords = [
      'продукты', 'еда', 'food', 'groceries', 'utilities', 'коммунальные',
      'аренда', 'rent', 'mortgage', 'ипотека', 'транспорт', 'transport',
      'медицина', 'medicine', 'health', 'здоровье', 'образование', 'education',
      'налоги', 'taxes', 'страховка', 'insurance'
    ];

    const categoryName = category.name?.toLowerCase() || '';
    return essentialKeywords.some(keyword => categoryName.includes(keyword));
  };

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
      const transactionAmount = parseFloat(amount);

      // If it's income and budget tracking is enabled, process the income distribution
      if (isIncome && includeBudget) {
        await processIncome(transactionAmount, true);
      }

      // If it's expense and budget is enabled, record the expense
      if (!isIncome && isBudgetEnabled) {
        // Determine if expense is essential or non-essential based on category
        const isEssentialExpense = isEssentialCategory(selectedCategory);
        console.log('🏷️ [AddTransactionModal] Category classification:', {
          categoryName: selectedCategory?.name,
          categoryBudgetCategory: selectedCategory?.budgetCategory,
          isEssentialExpense,
          transactionAmount
        });
        await recordExpense(transactionAmount, isEssentialExpense ? 'essential' : 'nonEssential');
      }

      await createTransaction({
        amount: transactionAmount,
        type: isIncome ? 'income' : 'expense',
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        description: description.trim() || undefined,
        date: datePicker.selectedDate.toISOString(),
        includeBudget: isIncome ? includeBudget : undefined,
      });

      // Принудительно обновляем данные бюджета после создания транзакции
      await reloadData();

      console.log('✅ [AddTransactionModal] Transaction created and budget data reloaded');

      // Отслеживаем создание транзакции для рекламы (каждые 6 транзакций)
      await trackTransaction();

      // Очищаем форму и ошибки
      setAmount('');
      setDescription('');
      setIsIncome(false);
      setIncludeBudget(false);
      setErrors({});
      setShowErrors(false);
      datePicker.setSelectedDate(new Date());
      setSelectedCategoryId('');
      onClose();
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };
  
  const handleClose = () => {
    setAmount('');
    setDescription('');
    setIsIncome(false);
    setIncludeBudget(false);
    setErrors({});
    setShowErrors(false);
    datePicker.setSelectedDate(new Date());
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
  
  // Удалена старая функция handleDateChange - теперь используем из хука
  
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

            {/* Amount */}
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

            {/* Budget System Toggle - только для доходов */}
            {__DEV__ && (
              <View style={{ padding: 8, backgroundColor: '#FF9800', borderRadius: 4, marginBottom: 8 }}>
                <Text style={{ fontSize: 10, color: '#000', fontWeight: 'bold' }}>
                  🐛 DEBUG: isIncome={isIncome ? '✓' : '✗'} | isBudgetEnabled={isBudgetEnabled ? '✓' : '✗'} | Show={isIncome && isBudgetEnabled ? '✓' : '✗'}
                </Text>
                {!isBudgetEnabled && (
                  <Text style={{ fontSize: 10, color: '#F44336', marginTop: 4, fontWeight: 'bold' }}>
                    ⚠️ Система бюджетирования ВЫКЛЮЧЕНА! Перейдите в Планы и включите её.
                  </Text>
                )}
              </View>
            )}
            {isIncome && isBudgetEnabled && (
              <View style={styles.inputContainer}>
                <View style={[styles.budgetToggleContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.budgetToggleInfo}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      {t('plans.includeBudgetSystem')}
                    </Text>
                    <Text style={[styles.budgetToggleSubtitle, { color: colors.textSecondary }]}>
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

            {/* Дата */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.date')}
              </Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={datePicker.openDatePicker}
              >
                <View style={styles.selectorContent}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    {formatDate(datePicker.selectedDate)}
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

      {datePicker.showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={datePicker.selectedDate}
          mode="date"
          display="default"
          onChange={datePicker.handleDateChange}
          locale="ru"
        />
      )}
      {datePicker.showDatePicker && Platform.OS === 'ios' && (
        <Modal
          visible={datePicker.showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <TouchableOpacity
            style={styles.datePickerOverlay}
            activeOpacity={1}
            onPress={datePicker.closeDatePicker}
          >
            <View style={[styles.datePickerContent, { backgroundColor: colors.card }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={datePicker.closeDatePicker}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={datePicker.closeDatePicker}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={datePicker.selectedDate}
                mode="date"
                display="spinner"
                onChange={datePicker.handleDateChange}
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
                const getBudgetCategoryColor = (budgetCategory?: string) => {
                  switch (budgetCategory) {
                    case 'essential':
                      return '#FF5722'; // Orange for essential
                    case 'nonEssential':
                      return '#9C27B0'; // Purple for non-essential
                    default:
                      return colors.textSecondary; // Gray for not set
                  }
                };

                const getBudgetCategoryLabel = (budgetCategory?: string) => {
                  switch (budgetCategory) {
                    case 'essential':
                      return t('plans.essential');
                    case 'nonEssential':
                      return t('plans.nonEssential');
                    default:
                      return null;
                  }
                };

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
                    <View style={styles.categoryItemContent}>
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>
                        {localizedCategory.name}
                      </Text>
                      {category.type === 'expense' && category.budgetCategory && (
                        <Text style={[styles.budgetCategoryChip, {
                          color: getBudgetCategoryColor(category.budgetCategory),
                          borderColor: getBudgetCategoryColor(category.budgetCategory)
                        }]}>
                          {getBudgetCategoryLabel(category.budgetCategory)}
                        </Text>
                      )}
                    </View>
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
  categoryItemContent: {
    flex: 1,
  },
  budgetCategoryChip: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
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