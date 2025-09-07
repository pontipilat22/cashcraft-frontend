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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { Debt } from '../types';

interface AddDebtModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingDebt?: Debt | null;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  visible,
  onClose,
  onSave,
  editingDebt,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { defaultCurrency, currencies, formatAmount } = useCurrency();
  
  const [type, setType] = useState<'owed_to_me' | 'owed_by_me'>('owed_to_me');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [exchangeRate, setExchangeRate] = useState('1');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isIncludedInTotal, setIsIncludedInTotal] = useState(true);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDatePickerOpening, setIsDatePickerOpening] = useState(false);

  // Функция для правильного закрытия модального окна
  const handleClose = () => {
    console.log('📅 [AddDebtModal] Closing modal and resetting states...');
    setShowDatePicker(false);
    setIsDatePickerOpening(false);
    onClose();
  };

  // Загружаем предложенный курс при изменении валюты
  useEffect(() => {
    const loadSuggestedRate = async () => {
      if (selectedCurrency !== defaultCurrency) {
        try {
          // Используем безопасный метод ExchangeRateService
          const { ExchangeRateService } = await import('../services/exchangeRate');
          
          // Пытаемся найти сохраненный курс
          const rate = await ExchangeRateService.getRate(selectedCurrency, defaultCurrency);
          if (rate) {
            setExchangeRate(rate.toString());
          } else {
            // Если курса нет, устанавливаем 1:1
            setExchangeRate('1');
          }
        } catch (error) {
          console.error('Error loading exchange rate:', error);
          setExchangeRate('1');
        }
      } else {
        setExchangeRate('1');
      }
    };
    
    loadSuggestedRate();
  }, [selectedCurrency, defaultCurrency]);

  useEffect(() => {
    if (editingDebt) {
      setType(editingDebt.type);
      setName(editingDebt.name);
      setAmount(editingDebt.amount.toString());
      setSelectedCurrency(editingDebt.currency || defaultCurrency);
      setExchangeRate(editingDebt.exchangeRate?.toString() || '1');
      setIsIncludedInTotal(editingDebt.isIncludedInTotal !== false);
      setDueDate(editingDebt.dueDate ? new Date(editingDebt.dueDate) : undefined);
    } else {
      // Сброс формы для нового долга
      setType('owed_to_me');
      setName('');
      setAmount('');
      setSelectedCurrency(defaultCurrency);
      setExchangeRate('1');
      setIsIncludedInTotal(true);
      setDueDate(undefined);
    }
  }, [editingDebt, visible, defaultCurrency]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('debts.nameError'));
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('common.error'), t('debts.amountError'));
      return;
    }

    onSave({
      type,
      name: name.trim(),
      amount: numAmount,
      currency: selectedCurrency,
      exchangeRate: selectedCurrency !== defaultCurrency ? parseFloat(exchangeRate) : undefined,
      isIncludedInTotal,
      dueDate: dueDate?.toISOString(),
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              {editingDebt ? t('debts.editDebt') : t('debts.newDebt')}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Тип долга */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('debts.debtType')}
              </Text>
              <View style={[styles.segmentedControl, { backgroundColor: colors.card }]}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    type === 'owed_to_me' && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setType('owed_to_me')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: type === 'owed_to_me' ? '#fff' : colors.text,
                      },
                    ]}
                  >
                    {t('debts.owedToMe')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    type === 'owed_by_me' && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setType('owed_by_me')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: type === 'owed_by_me' ? '#fff' : colors.text,
                      },
                    ]}
                  >
                    {t('debts.iOwe')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Имя должника */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {type === 'owed_to_me' ? t('debts.whoOwes') : t('debts.toWhomOwe')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder={type === 'owed_to_me' ? t('debts.debtorName') : t('debts.creditorName')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Сумма */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('debts.amount')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.currencyButton}
                  onPress={() => setShowCurrencyPicker(true)}
                >
                  <Text style={[styles.currency, { color: colors.textSecondary }]}>
                    {selectedCurrency}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Курс обмена (если валюта отличается от основной) */}
            {selectedCurrency !== defaultCurrency && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Курс обмена ({selectedCurrency}/{defaultCurrency})
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={exchangeRate}
                    onChangeText={setExchangeRate}
                    placeholder="1"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.currency, { color: colors.textSecondary }]}>
                    {defaultCurrency}
                  </Text>
                </View>
              </View>
            )}

            {/* Дата возврата */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('debts.dueDate')}
              </Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.card }]}
                onPress={() => {
                  if (!showDatePicker && !isDatePickerOpening) {
                    console.log('📅 [AddDebtModal] Opening DatePicker...');
                    setIsDatePickerOpening(true);
                    setTimeout(() => {
                      setShowDatePicker(true);
                      setIsDatePickerOpening(false);
                    }, 100);
                  } else {
                    console.log('📅 [AddDebtModal] DatePicker already opening/open, ignoring...');
                  }
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.dateText,
                    { color: dueDate ? colors.text : colors.textSecondary },
                  ]}
                >
                  {dueDate ? formatDate(dueDate) : t('debts.selectDate')}
                </Text>
                {dueDate && (
                  <TouchableOpacity
                    onPress={() => setDueDate(undefined)}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Включить в общий баланс */}
            <View style={[styles.switchRow, { backgroundColor: colors.card }]}>
              <View style={styles.switchLeft}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>
                  {t('debts.includeInBalance')}
                </Text>
                <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                  {t('debts.includeInBalanceDescription')}
                </Text>
              </View>
              <Switch
                value={isIncludedInTotal}
                onValueChange={setIsIncludedInTotal}
                trackColor={{ false: '#767577', true: colors.primary }}
              />
            </View>
          </ScrollView>
        </View>

        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              console.log('📅 [AddDebtModal] DatePicker onChange (Android):', {
                event: event?.type,
                selectedDate: selectedDate?.toISOString(),
                platform: Platform.OS,
                nativeEvent: event?.nativeEvent
              });
              
              // Всегда закрываем пикер для Android
              console.log('📅 [AddDebtModal] Closing DatePicker (Android)...');
              setShowDatePicker(false);
              setIsDatePickerOpening(false);
              
              // Устанавливаем дату только если пользователь действительно выбрал
              if (selectedDate) {
                if (event?.type === 'set') {
                  // Пользователь нажал OK/выбрал дату
                  setTimeout(() => {
                    setDueDate(selectedDate);
                    console.log('✅ [AddDebtModal] Date set (Android):', selectedDate.toISOString());
                  }, 50);
                } else if (event?.type === 'dismissed') {
                  // Пользователь отменил выбор
                  console.log('❌ [AddDebtModal] Date dismissed (Android)');
                } else {
                  // Неопределенный тип события - попробуем установить дату
                  console.log('⚠️ [AddDebtModal] Unknown event type, trying to set date:', event?.type);
                  setTimeout(() => {
                    setDueDate(selectedDate);
                    console.log('✅ [AddDebtModal] Date set (fallback):', selectedDate.toISOString());
                  }, 50);
                }
              } else {
                console.log('❌ [AddDebtModal] No selectedDate provided');
              }
            }}
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
                console.log('📅 [AddDebtModal] Closing DatePicker (iOS overlay)...');
                setShowDatePicker(false);
                setIsDatePickerOpening(false);
              }}
            >
              <View style={[styles.datePickerContent, { backgroundColor: colors.card }]}>
                <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity onPress={() => {
                    console.log('📅 [AddDebtModal] Closing DatePicker (iOS cancel)...');
                    setShowDatePicker(false);
                    setIsDatePickerOpening(false);
                  }}>
                    <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    console.log('📅 [AddDebtModal] Closing DatePicker (iOS done)...');
                    setShowDatePicker(false);
                    setIsDatePickerOpening(false);
                  }}>
                    <Text style={[styles.datePickerButton, { color: colors.primary }]}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dueDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    console.log('📅 [AddDebtModal] DatePicker onChange (iOS):', {
                      event: event?.type,
                      selectedDate: selectedDate?.toISOString(),
                      platform: Platform.OS
                    });
                    
                    if (selectedDate) {
                      setDueDate(selectedDate);
                      console.log('✅ [AddDebtModal] Date set (iOS):', selectedDate.toISOString());
                    }
                  }}
                  themeVariant={isDark ? 'dark' : 'light'}
                  style={{ height: 200 }}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Модальное окно выбора валюты */}
        <Modal
          visible={showCurrencyPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCurrencyPicker(false)}
        >
          <View style={styles.currencyModalOverlay}>
            <View style={[styles.currencyModal, { backgroundColor: colors.background }]}>
              <View style={[styles.currencyModalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.currencyModalTitle, { color: colors.text }]}>
                  Выберите валюту
                </Text>
                <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.currencyList}>
                {Object.keys(currencies).map((currency) => (
                  <TouchableOpacity
                    key={currency}
                    style={[
                      styles.currencyItem,
                      { backgroundColor: colors.card },
                      selectedCurrency === currency && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => {
                      setSelectedCurrency(currency);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.currencyItemText,
                      { color: selectedCurrency === currency ? '#fff' : colors.text }
                    ]}>
                      {currency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 70,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    width: 70,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  currency: {
    fontSize: 16,
    marginLeft: 8,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  switchLeft: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  currencyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyModal: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  currencyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  currencyModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  currencyList: {
    maxHeight: 300,
  },
  currencyItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  currencyItemText: {
    fontSize: 16,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  datePickerButton: {
    fontSize: 17,
    fontWeight: '600',
  },
}); 