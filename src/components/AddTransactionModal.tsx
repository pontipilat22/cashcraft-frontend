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

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { accounts, categories, createTransaction } = useData();
  
  const [isIncome, setIsIncome] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Устанавливаем счет по умолчанию при открытии модального окна
  React.useEffect(() => {
    if (visible && accounts.length > 0) {
      const defaultAccount = accounts.find(acc => acc.isDefault);
      setSelectedAccountId(defaultAccount?.id || accounts[0].id);
    }
  }, [visible, accounts]);
  
  // Фильтруем категории по типу транзакции
  const filteredCategories = categories.filter(cat => cat.type === (isIncome ? 'income' : 'expense'));
  
  // Устанавливаем счет по умолчанию или первый счет
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const defaultAccount = accounts.find(acc => acc.isDefault);
      setSelectedAccountId(defaultAccount?.id || accounts[0].id);
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
    if (!selectedAccountId) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите счет');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }
    
    try {
      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      
      await createTransaction({
        amount: parseFloat(amount),
        type: isIncome ? 'income' : 'expense',
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        description: description.trim() || selectedCategory?.name || (isIncome ? 'Доход' : 'Расход'),
        date: selectedDate.toISOString(),
      });
      
      // Очищаем форму
      setAmount('');
      setDescription('');
      setIsIncome(false);
      setSelectedDate(new Date());
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
    setSelectedDate(new Date());
    setSelectedCategoryId('');
    onClose();
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
              Новая транзакция
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Переключатель типа транзакции */}
            <View style={styles.typeContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Тип операции
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
                    Расход
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
                    Доход
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Сумма */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Сумма
              </Text>
              <View style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.currencySymbol, { color: isIncome ? '#4CAF50' : colors.primary }]}>
                  {isIncome ? '+' : '-'}₽
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

            {/* Категория */}
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
                    {selectedCategory?.name || 'Выберите категорию'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Счет */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Счет
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
              onPress={handleClose}
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
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              Выберите категорию
            </Text>
            <ScrollView>
              {filteredCategories.map(category => (
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
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
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
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              Выберите счет
            </Text>
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
                    {account.balance.toLocaleString('ru-RU')} ₽
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
    marginBottom: 16,
    textAlign: 'center',
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
}); 