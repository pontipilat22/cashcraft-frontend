import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { useData } from '../context/DataContext';

interface CreditEarlyRepaymentModalProps {
  visible: boolean;
  onClose: () => void;
  currency: string;
  creditAccountId: string;
  remainingBalance: number;
  onConfirm: (amount: number, repaymentDate: Date, fromAccountId: string | null) => Promise<void>;
}

export const CreditEarlyRepaymentModal: React.FC<CreditEarlyRepaymentModalProps> = ({
  visible,
  onClose,
  currency,
  creditAccountId,
  remainingBalance,
  onConfirm,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount, convertAmount } = useCurrency();
  const { t } = useLocalization();
  const { accounts } = useData();

  const [amount, setAmount] = useState('');
  const [repaymentDate, setRepaymentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);

  // Фильтруем счета - исключаем кредиты и цели
  const availableAccounts = React.useMemo(
    () => accounts.filter(
      acc => acc.type !== 'credit' && acc.type !== 'savings' && acc.id !== creditAccountId
    ),
    [accounts, creditAccountId]
  );

  // Сброс при открытии
  React.useEffect(() => {
    if (visible) {
      setAmount('');
      setRepaymentDate(new Date());
      setConvertedAmount(null);
      // Выбираем первый доступный счёт по умолчанию
      setSelectedAccountId(availableAccounts[0]?.id || null);
    }
  }, [visible, availableAccounts]);

  // Автоматический расчет конвертации
  React.useEffect(() => {
    const calculateConversion = async () => {
      if (!selectedAccountId || !amount) {
        setConvertedAmount(null);
        return;
      }

      const selectedAccount = availableAccounts.find(acc => acc.id === selectedAccountId);
      if (!selectedAccount) return;

      const repaymentAmount = parseFloat(amount);
      if (isNaN(repaymentAmount)) return;

      if (selectedAccount.currency !== currency) {
        const converted = await convertAmount(repaymentAmount, currency, selectedAccount.currency);
        setConvertedAmount(converted);
      } else {
        setConvertedAmount(null);
      }
    };

    calculateConversion();
  }, [selectedAccountId, amount, currency, availableAccounts, convertAmount]);

  const handleConfirm = async () => {
    const repaymentAmount = parseFloat(amount);

    if (isNaN(repaymentAmount) || repaymentAmount <= 0) {
      Alert.alert(
        t('credit.error') || 'Ошибка',
        t('credit.invalidAmount') || 'Введите корректную сумму'
      );
      return;
    }

    if (repaymentAmount > remainingBalance) {
      Alert.alert(
        t('credit.error') || 'Ошибка',
        t('credit.earlyRepaymentExceedsDebt') || 'Сумма не может превышать остаток долга'
      );
      return;
    }

    if (!selectedAccountId && availableAccounts.length > 0) {
      Alert.alert(
        t('credit.error') || 'Ошибка',
        t('credit.selectAccount') || 'Выберите счёт для списания'
      );
      return;
    }

    // Проверка достаточности средств на выбранном счете
    if (selectedAccountId) {
      const selectedAccount = availableAccounts.find(acc => acc.id === selectedAccountId);
      if (selectedAccount && selectedAccount.balance < repaymentAmount) {
        Alert.alert(
          t('credit.error') || 'Ошибка',
          `${t('credit.insufficientFunds') || 'Недостаточно средств на счете'}. ${t('accounts.available') || 'Доступно'}: ${formatAmount(selectedAccount.balance, selectedAccount.currency)}`
        );
        return;
      }
    }

    try {
      setLoading(true);
      await onConfirm(repaymentAmount, repaymentDate, selectedAccountId);
      onClose();
    } catch (error: any) {
      Alert.alert(
        t('credit.error') || 'Ошибка',
        error.message || t('credit.earlyRepaymentError') || 'Ошибка при досрочном погашении'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setRepaymentDate(selectedDate);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          {/* Заголовок */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('credit.earlyRepayment') || 'Досрочное погашение'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Информация об остатке */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {t('credit.remainingDebt') || 'Остаток долга'}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {formatAmount(remainingBalance, currency)}
            </Text>
          </View>

          {/* Описание */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('credit.earlyRepaymentDescription') ||
              'Внесённая сумма будет распределена по неоплаченным платежам в порядке очереди'}
          </Text>

          {/* Ввод суммы */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('credit.repaymentAmount') || 'Сумма погашения'}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Выбор даты */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('credit.repaymentDate') || 'Дата погашения'}
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5',
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateButtonText, { color: colors.text }]}>
                {repaymentDate.toLocaleDateString('ru-RU')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={repaymentDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Выбор счёта для списания */}
          {availableAccounts.length > 0 && (
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t('credit.payFromAccount') || 'Списать со счёта'}
              </Text>
              <View style={styles.accountSelector}>
                {availableAccounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountButton,
                      {
                        backgroundColor: selectedAccountId === acc.id ? colors.primary : (isDark ? '#2C2C2C' : '#F5F5F5'),
                        borderColor: selectedAccountId === acc.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedAccountId(acc.id)}
                  >
                    <Text
                      style={[
                        styles.accountButtonText,
                        { color: selectedAccountId === acc.id ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {acc.name}
                    </Text>
                    <Text
                      style={[
                        styles.accountBalance,
                        { color: selectedAccountId === acc.id ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {formatAmount(acc.balance, acc.currency)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Предупреждение о конвертации валют */}
          {convertedAmount !== null && selectedAccountId && (
            <View style={[styles.conversionBox, { backgroundColor: isDark ? '#1A3A5A' : '#E3F2FD' }]}>
              <Ionicons name="swap-horizontal" size={20} color="#1976D2" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.conversionTitle, { color: '#1976D2' }]}>
                  {t('credit.currencyConversion') || 'Конвертация валют'}
                </Text>
                <Text style={[styles.conversionText, { color: isDark ? '#90CAF9' : '#1565C0' }]}>
                  {t('credit.willBeDebited') || 'Будет списано'}: {formatAmount(convertedAmount, availableAccounts.find(a => a.id === selectedAccountId)?.currency || currency)}
                </Text>
              </View>
            </View>
          )}

          {availableAccounts.length === 0 && (
            <View style={[styles.warningBox, { backgroundColor: isDark ? '#4A3000' : '#FFF3CD' }]}>
              <Ionicons name="warning-outline" size={20} color="#856404" />
              <Text style={[styles.warningText, { color: '#856404' }]}>
                {t('credit.noAccountsForPayment') || 'Нет доступных счетов для оплаты. Платёж будет отмечен без списания.'}
              </Text>
            </View>
          )}

          {/* Кнопки действий */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                {t('common.cancel') || 'Отмена'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {loading ? (t('common.saving') || 'Сохранение...') : (t('common.confirm') || 'Подтвердить')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
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
    borderWidth: 1,
  },
  accountButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountBalance: {
    fontSize: 13,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  conversionBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
    gap: 8,
  },
  conversionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  conversionText: {
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // backgroundColor будет установлен динамически
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
