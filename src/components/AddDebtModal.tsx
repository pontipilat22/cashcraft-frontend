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
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { DatabaseService } from '../services/database';
import { Debt } from '../types';

interface AddDebtModalProps {
  visible: boolean;
  onClose: () => void;
  onDebtCreated?: () => void;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  visible,
  onClose,
  onDebtCreated,
}) => {
  const { colors, isDark } = useTheme();
  const { accounts } = useData();
  
  const [debtType, setDebtType] = useState<'owe' | 'owed'>('owe');
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [existingPeople, setExistingPeople] = useState<string[]>([]);
  const [allDebts, setAllDebts] = useState<Debt[]>([]);

  // Загружаем существующие долги при открытии
  React.useEffect(() => {
    if (visible) {
      loadExistingDebts();
    }
  }, [visible]);

  const loadExistingDebts = async () => {
    try {
      const debts = await DatabaseService.getDebts();
      setAllDebts(debts);
      
      // Получаем уникальные имена людей
      const people = Array.from(new Set(debts.map(d => d.name))).sort();
      setExistingPeople(people);
    } catch (error) {
      console.error('Error loading debts:', error);
    }
  };

  // Проверяем, есть ли уже долг с этим человеком
  const checkExistingDebt = () => {
    if (person.trim()) {
      const existing = allDebts.find(d => 
        d.name.toLowerCase() === person.trim().toLowerCase() && 
        d.type === debtType
      );
      return existing;
    }
    return null;
  };

  const handleSave = async () => {
    if (!person.trim()) {
      Alert.alert('Ошибка', 'Введите имя человека');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }
    
    try {
      await DatabaseService.createDebt({
        type: debtType,
        amount: parseFloat(amount),
        name: person.trim(),
        isIncludedInTotal: false,
      });
      
      // Очищаем форму
      setAmount('');
      setPerson('');
      setDescription('');
      setSelectedAccountId(null);
      setDueDate(null);
      setDebtType('owe');
      
      onDebtCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating debt:', error);
      Alert.alert('Ошибка', 'Не удалось создать долг');
    }
  };

  const handleClose = () => {
    setAmount('');
    setPerson('');
    setDescription('');
    setSelectedAccountId(null);
    setDueDate(null);
    setDebtType('owe');
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

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
              Новый долг
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Тип долга */}
            <View style={styles.typeContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Тип долга
              </Text>
              <View style={[styles.typeSwitch, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    debtType === 'owe' && { backgroundColor: '#FF5252' },
                  ]}
                  onPress={() => setDebtType('owe')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: debtType === 'owe' ? '#fff' : colors.text }
                  ]}>
                    Я должен
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    debtType === 'owed' && { backgroundColor: '#4CAF50' },
                  ]}
                  onPress={() => setDebtType('owed')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: debtType === 'owed' ? '#fff' : colors.text }
                  ]}>
                    Мне должны
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
                <Text style={[styles.currencySymbol, { color: debtType === 'owed' ? '#4CAF50' : '#FF5252' }]}>
                  ₽
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

            {/* Человек */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {debtType === 'owe' ? 'Кому я должен' : 'Кто мне должен'}
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                    paddingRight: existingPeople.length > 0 ? 40 : 12,
                  }]}
                  value={person}
                  onChangeText={setPerson}
                  placeholder="Имя человека"
                  placeholderTextColor={colors.textSecondary}
                />
                {existingPeople.length > 0 && (
                  <TouchableOpacity
                    style={styles.personPickerButton}
                    onPress={() => setShowPersonPicker(true)}
                  >
                    <Ionicons name="people" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              {checkExistingDebt() && (
                <Text style={[styles.existingDebtInfo, { color: colors.primary }]}>
                  Уже есть долг: {checkExistingDebt()?.amount.toLocaleString('ru-RU')} ₽
                </Text>
              )}
            </View>

            {/* Описание */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                За что (необязательно)
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Например: За обед"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Дата возврата */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Дата возврата (необязательно)
              </Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.selectorContent}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    {dueDate ? formatDate(dueDate) : 'Не указана'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Связанный счет */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Связанный счет (необязательно)
              </Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowAccountPicker(true)}
              >
                <Text style={[styles.selectorText, { color: colors.text }]}>
                  {selectedAccount?.name || 'Не выбран'}
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
              <Text style={[styles.buttonText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button, 
                styles.saveButton, 
                { backgroundColor: debtType === 'owed' ? '#4CAF50' : '#FF5252' }
              ]}
              onPress={handleSave}
              disabled={!amount || parseFloat(amount) === 0 || !person.trim()}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>Сохранить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
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
                <TouchableOpacity onPress={() => {
                  setDueDate(null);
                  setShowDatePicker(false);
                }}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>Сбросить</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerButton, { color: colors.primary }]}>Готово</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

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
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              Выберите счет
            </Text>
            <ScrollView>
              <TouchableOpacity
                style={[styles.pickerItem, { backgroundColor: colors.background }]}
                onPress={() => {
                  setSelectedAccountId(null);
                  setShowAccountPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, { color: colors.text }]}>
                  Не выбран
                </Text>
              </TouchableOpacity>
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
                    {account.balance.toLocaleString('ru-RU')} ₽
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Person Picker */}
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
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              Выберите человека
            </Text>
            <ScrollView>
              {existingPeople.map(name => {
                const debtsWithPerson = allDebts.filter(d => d.name === name);
                const owedAmount = debtsWithPerson
                  .filter(d => d.type === 'owed')
                  .reduce((sum, d) => sum + d.amount, 0);
                const oweAmount = debtsWithPerson
                  .filter(d => d.type === 'owe')
                  .reduce((sum, d) => sum + d.amount, 0);
                
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.personPickerItem, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setPerson(name);
                      setShowPersonPicker(false);
                    }}
                  >
                    <View style={styles.personInfo}>
                      <Text style={[styles.personName, { color: colors.text }]}>
                        {name}
                      </Text>
                      <View style={styles.personDebts}>
                        {owedAmount > 0 && (
                          <Text style={[styles.personDebtAmount, { color: '#4CAF50' }]}>
                            Мне должны: {owedAmount.toLocaleString('ru-RU')} ₽
                          </Text>
                        )}
                        {oweAmount > 0 && (
                          <Text style={[styles.personDebtAmount, { color: '#FF5252' }]}>
                            Я должен: {oweAmount.toLocaleString('ru-RU')} ₽
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    marginBottom: 16,
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
  personPickerButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  existingDebtInfo: {
    fontSize: 12,
    marginTop: 4,
  },
  personPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '500',
  },
  personDebts: {
    marginTop: 4,
  },
  personDebtAmount: {
    fontSize: 12,
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
    padding: 16,
    borderBottomWidth: 1,
  },
  datePickerButton: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 