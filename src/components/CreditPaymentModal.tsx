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
import { Account } from '../types';

// Локальный интерфейс для графика платежей
interface CreditPaymentSchedule {
  id: string;
  accountId: string;
  paymentNumber: number;
  paymentDate: string;
  totalPayment: number;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  paidAmount?: number;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

interface CreditPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  payment: CreditPaymentSchedule | null;
  currency: string;
  creditAccountId: string;
  onConfirm: (paidAmount: number, paidDate: Date, fromAccountId: string | null) => Promise<void>;
}

export const CreditPaymentModal: React.FC<CreditPaymentModalProps> = ({
  visible,
  onClose,
  payment,
  currency,
  creditAccountId,
  onConfirm,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = useCurrency();
  const { t } = useLocalization();
  const { accounts } = useData();

  const [paidAmount, setPaidAmount] = useState('');
  const [paidDate, setPaidDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Фильтруем счета - исключаем кредиты и цели
  const availableAccounts = React.useMemo(
    () => accounts.filter(
      acc => acc.type !== 'credit' && acc.type !== 'savings' && acc.id !== creditAccountId
    ),
    [accounts, creditAccountId]
  );

  // Сброс при открытии
  React.useEffect(() => {
    if (visible && payment) {
      setPaidAmount(payment.totalPayment.toString());
      setPaidDate(new Date());
      setIsPartialPayment(false);
      // Выбираем первый доступный счёт по умолчанию
      setSelectedAccountId(availableAccounts[0]?.id || null);
    }
  }, [visible, payment, availableAccounts]);

  const handleConfirm = async () => {
    if (!payment) return;

    const amount = parseFloat(paidAmount);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert(
        t('credit.error') || 'Ошибка',
        t('credit.invalidAmount') || 'Введите корректную сумму'
      );
      return;
    }

    if (amount > payment.totalPayment) {
      Alert.alert(
        t('credit.error') || 'Ошибка',
        t('credit.amountExceedsPayment') || 'Сумма не может превышать сумму платежа'
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
      if (selectedAccount && selectedAccount.balance < amount) {
        Alert.alert(
          t('credit.error') || 'Ошибка',
          `${t('credit.insufficientFunds') || 'Недостаточно средств на счете'}. ${t('accounts.available') || 'Доступно'}: ${formatAmount(selectedAccount.balance, selectedAccount.currency)}`
        );
        return;
      }
    }

    try {
      setLoading(true);
      await onConfirm(amount, paidDate, selectedAccountId);
      onClose();
    } catch (error: any) {
      Alert.alert(
        t('credit.error') || 'Ошибка',
        error.message || t('credit.paymentError') || 'Ошибка при отметке платежа'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setPaidDate(selectedDate);
    }
  };

  if (!payment) return null;

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
              {t('credit.markPayment') || 'Отметить платёж'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Информация о платеже */}
          <View style={[styles.paymentInfo, { backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t('credit.paymentNumber') || 'Платёж №'}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {payment.paymentNumber}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t('credit.scheduledAmount') || 'Сумма по графику'}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {formatAmount(payment.totalPayment, currency)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t('credit.scheduledDate') || 'Дата по графику'}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(payment.paymentDate).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          </View>

          {/* Переключатель полный/частичный */}
          <View style={styles.paymentTypeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                !isPartialPayment && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                setIsPartialPayment(false);
                setPaidAmount(payment.totalPayment.toString());
              }}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: !isPartialPayment ? '#FFFFFF' : colors.text },
                ]}
              >
                {t('credit.fullPayment') || 'Полный платёж'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                isPartialPayment && { backgroundColor: colors.primary },
              ]}
              onPress={() => setIsPartialPayment(true)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: isPartialPayment ? '#FFFFFF' : colors.text },
                ]}
              >
                {t('credit.partialPayment') || 'Частичный платёж'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Ввод суммы */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('credit.paidAmount') || 'Сумма платежа'}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5',
                  color: isPartialPayment ? colors.text : colors.textSecondary,
                  borderColor: colors.border,
                },
              ]}
              value={paidAmount}
              onChangeText={setPaidAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              editable={isPartialPayment}
            />
            {!isPartialPayment && (
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {t('credit.fullPaymentHint') || 'Сумма установлена автоматически'}
              </Text>
            )}
          </View>

          {/* Выбор даты */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('credit.paymentDate') || 'Дата платежа'}
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
                {paidDate.toLocaleDateString('ru-RU')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={paidDate}
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
  paymentInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  hint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
