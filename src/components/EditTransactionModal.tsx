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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { Transaction } from '../types';
import { getLocalizedCategory } from '../utils/categoryUtils';
import { CURRENCIES } from '../config/currencies';
import { LocalDatabaseService } from '../services/localDatabase';

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { accounts, categories, updateTransaction, transactions } = useData();
  const { t } = useLocalization();
  const { defaultCurrency } = useCurrency();
  
  const [isIncome, setIsIncome] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Проверяем, является ли транзакция переводом
  const isTransfer = transaction && (transaction.categoryId === 'other_income' || transaction.categoryId === 'other_expense') 
    && transaction.description?.match(/[→←]/);
  
  // Извлекаем чистое описание перевода (без стрелок и названий счетов)
  const getCleanTransferDescription = (desc: string) => {
    if (!desc) return '';
    // Удаляем стрелку и всё после неё
    const arrowIndex = desc.search(/[→←]/);
    if (arrowIndex === -1) return desc;
    return desc.substring(0, arrowIndex).trim();
  };
  
  // Для переводов нужно найти второй счет
  const [transferToAccountId, setTransferToAccountId] = useState<string>('');
  const [showTransferAccountPicker, setShowTransferAccountPicker] = useState(false);
  
  // Заполняем форму данными транзакции
  useEffect(() => {
    if (transaction) {
      setIsIncome(transaction.type === 'income');
      setAmount(transaction.amount.toString());
      
      // Проверяем, является ли транзакция переводом
      const checkIsTransfer = (transaction.categoryId === 'other_income' || transaction.categoryId === 'other_expense') 
        && transaction.description?.match(/[→←]/);
      
      // Для переводов используем чистое описание
      if (checkIsTransfer) {
        setDescription(getCleanTransferDescription(transaction.description || ''));
        
        // Для перевода нужно определить второй счет
        // Если это расход (→), то нужно найти парную доходную транзакцию
        // Если это доход (←), то нужно найти парную расходную транзакцию
        const findPairedTransferAccount = () => {
          // Находим все транзакции в эту же дату
          const sameDate = transactions.filter(t => 
            new Date(t.date).toDateString() === new Date(transaction.date).toDateString()
          );
          
          // Ищем парную транзакцию
          const pairedTransaction = sameDate.find(t => {
            if (t.id === transaction.id) return false;
            
            // Проверяем, что это перевод
            const isOtherTransfer = (t.categoryId === 'other_income' || t.categoryId === 'other_expense') 
              && t.description?.match(/[→←]/);
            if (!isOtherTransfer) return false;
            
            // Проверяем, что описания совпадают (без учета стрелок и счетов)
            const otherCleanDesc = getCleanTransferDescription(t.description || '');
            const thisCleanDesc = getCleanTransferDescription(transaction.description || '');
            if (otherCleanDesc !== thisCleanDesc) return false;
            
            // Проверяем, что типы противоположные
            if (transaction.type === 'expense' && t.type === 'income') {
              return true;
            } else if (transaction.type === 'income' && t.type === 'expense') {
              return true;
            }
            
            return false;
          });
          
          if (pairedTransaction) {
            // Для расходной транзакции второй счет - это счет парной доходной транзакции
            // Для доходной транзакции второй счет - это счет парной расходной транзакции
            setTransferToAccountId(pairedTransaction.accountId);
          }
        };
        
        findPairedTransferAccount();
      } else {
        setDescription(transaction.description || '');
      }
      
      setSelectedAccountId(transaction.accountId);
      setSelectedCategoryId(transaction.categoryId || '');
      setSelectedDate(new Date(transaction.date));
    }
  }, [transaction?.id]); // Используем только id для избежания циклов
  
  // Фильтруем категории по типу транзакции
  const filteredCategories = categories.filter(cat => cat.type === (isIncome ? 'income' : 'expense'));
  
  const handleSave = async () => {
    if (!amount || !selectedAccountId || !transaction) return;
    
    try {
      if (isTransfer && transferToAccountId) {
        // Для переводов нужно обновить обе транзакции
        const cleanDesc = description.trim();
        
        // Находим парную транзакцию
        const pairedTransaction = transactions.find(t => {
          if (t.id === transaction.id) return false;
          
          const isOtherTransfer = (t.categoryId === 'other_income' || t.categoryId === 'other_expense') 
            && t.description?.match(/[→←]/);
          if (!isOtherTransfer) return false;
          
          const otherCleanDesc = getCleanTransferDescription(t.description || '');
          const thisCleanDesc = getCleanTransferDescription(transaction.description || '');
          if (otherCleanDesc !== thisCleanDesc) return false;
          
          // Проверяем дату
          if (new Date(t.date).toDateString() !== new Date(transaction.date).toDateString()) return false;
          
          return (transaction.type === 'expense' && t.type === 'income') ||
                 (transaction.type === 'income' && t.type === 'expense');
        });
        
        if (pairedTransaction) {
          // Определяем счета и валюты
          const fromAccount = transaction.type === 'expense' 
            ? accounts.find(a => a.id === selectedAccountId)
            : accounts.find(a => a.id === transferToAccountId);
          const toAccount = transaction.type === 'expense'
            ? accounts.find(a => a.id === transferToAccountId)
            : accounts.find(a => a.id === selectedAccountId);
            
          if (!fromAccount || !toAccount) return;
          
          // Проверяем нужна ли конверсия валют
          let fromAmount = parseFloat(amount);
          let toAmount = parseFloat(amount);
          
          if (fromAccount.currency !== toAccount.currency) {
            // Нужна конверсия
            const exchangeRate = await LocalDatabaseService.getExchangeRate(
              fromAccount.currency || defaultCurrency,
              toAccount.currency || defaultCurrency
            );
            
            if (exchangeRate) {
              toAmount = fromAmount * exchangeRate;
            } else {
              // Попробуем через базовую валюту
              const fromToDefault = await LocalDatabaseService.getExchangeRate(
                fromAccount.currency || defaultCurrency,
                defaultCurrency
              );
              const defaultToTo = await LocalDatabaseService.getExchangeRate(
                defaultCurrency,
                toAccount.currency || defaultCurrency
              );
              
              if (fromToDefault && defaultToTo) {
                toAmount = fromAmount * fromToDefault * defaultToTo;
              }
            }
          }
          
          // Обновляем расходную транзакцию
          const expenseTransaction = transaction.type === 'expense' ? transaction : pairedTransaction;
          const incomeTransaction = transaction.type === 'income' ? transaction : pairedTransaction;
          
          await updateTransaction(expenseTransaction.id, {
            amount: fromAmount,
            type: 'expense',
            accountId: fromAccount.id,
            categoryId: 'other_expense',
            description: cleanDesc ? `${cleanDesc} → ${toAccount.name}` : `→ ${toAccount.name}`,
            date: selectedDate.toISOString(),
          });
          
          // Обновляем доходную транзакцию
          await updateTransaction(incomeTransaction.id, {
            amount: toAmount,
            type: 'income',
            accountId: toAccount.id,
            categoryId: 'other_income',
            description: cleanDesc ? `${cleanDesc} ← ${fromAccount.name}` : `← ${fromAccount.name}`,
            date: selectedDate.toISOString(),
          });
        }
      } else {
        // Обычная транзакция
        await updateTransaction(transaction.id, {
          amount: parseFloat(amount),
          type: isIncome ? 'income' : 'expense',
          accountId: selectedAccountId,
          categoryId: selectedCategoryId || undefined,
          description: description.trim() || undefined,
          date: selectedDate.toISOString(),
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };
  
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
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
  
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  
  // Получаем символ валюты выбранного счета
  const accountCurrency = selectedAccount?.currency || defaultCurrency;
  const currencySymbol = CURRENCIES[accountCurrency]?.symbol || CURRENCIES[defaultCurrency]?.symbol || '$';
  
  if (!transaction) return null;
  
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
              {t('transactions.editTransaction')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Для переводов показываем специальную метку */}
            {isTransfer && (
              <View style={styles.typeContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('common.type')}
                </Text>
                <View style={[styles.transferLabel, { backgroundColor: '#2196F3' + '20' }]}>
                  <Ionicons name="swap-horizontal" size={20} color="#2196F3" style={{ marginRight: 8 }} />
                  <Text style={[styles.transferLabelText, { color: '#2196F3' }]}>
                    {t('transactions.transfer')}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Переключатель типа транзакции (скрываем для переводов) */}
            {!isTransfer && (
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
            )}

            {/* Сумма */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.amount')}
              </Text>
              <View style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.currencySymbol, { color: isIncome ? '#4CAF50' : colors.primary }]}>
                  {isIncome ? '+' : '-'}{currencySymbol}
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
            </View>

            {/* Дата */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Дата
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

            {/* Категория (скрываем для переводов) */}
            {!isTransfer && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Категория
                </Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
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
              </View>
            )}

            {/* Счет */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {isTransfer && transaction?.type === 'expense' ? 'Со счета' : isTransfer && transaction?.type === 'income' ? 'На счет' : 'Счет'}
              </Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowAccountPicker(true)}
              >
                <Text style={[styles.selectorText, { color: colors.text }]}>
                  {selectedAccount?.name || 'Выберите счет'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Второй счет для переводов */}
            {isTransfer && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {transaction?.type === 'expense' ? 'На счет' : 'Со счета'}
                </Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setShowTransferAccountPicker(true)}
                >
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    {accounts.find(a => a.id === transferToAccountId)?.name || 'Выберите счет'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Описание */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Описание (необязательно)
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder={isIncome ? "Например: Зарплата" : "Например: Продукты"}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Отмена</Text>
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
              <Text style={[styles.buttonText, { color: '#fff' }]}>Сохранить</Text>
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
          maximumDate={new Date()}
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
            onPress={() => setShowDatePicker(false)}
          >
            <View style={[styles.datePickerContent, { backgroundColor: colors.card }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>Готово</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
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
                Выберите категорию
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
                Выберите счет
              </Text>
              <TouchableOpacity onPress={() => setShowAccountPicker(false)} style={styles.pickerCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {accounts.map(account => (
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
      
      {/* Модальное окно для выбора второго счета при переводах */}
      <Modal
        visible={showTransferAccountPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTransferAccountPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowTransferAccountPicker(false)}
        >
          <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {transaction?.type === 'expense' ? 'Выберите счет назначения' : 'Выберите счет источник'}
              </Text>
              <TouchableOpacity onPress={() => setShowTransferAccountPicker(false)} style={styles.pickerCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {accounts
                .filter(account => account.id !== selectedAccountId) // Исключаем уже выбранный счет
                .map(account => (
                  <TouchableOpacity
                    key={account.id}
                    style={[styles.pickerItem, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setTransferToAccountId(account.id);
                      setShowTransferAccountPicker(false);
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
  transferLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  transferLabelText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 