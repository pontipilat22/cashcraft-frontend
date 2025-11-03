import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Q } from '@nozbe/watermelondb';
import { K2D_400Regular, K2D_600SemiBold, useFonts } from '@expo-google-fonts/k2d';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { useData } from '../context/DataContext';
import { Account as AccountType } from '../types';
import { generatePaymentSchedule, calculateTotalPayment, calculateTotalInterest } from '../services/CreditCalculationService';
import { markPaymentAsPaid, updateOverduePayments, makeEarlyRepayment } from '../services/CreditOperationsService';
import { CreditPaymentModal } from '../components/CreditPaymentModal';
import { CreditEarlyRepaymentModal } from '../components/CreditEarlyRepaymentModal';
import database from '../database';
import Account from '../database/models/Account';
import CreditPaymentSchedule from '../database/models/CreditPaymentSchedule';

// Локальный интерфейс для графика платежей (обходим кэш TypeScript)
interface CreditPaymentScheduleType {
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

type RouteParams = {
  CreditDetails: {
    accountId: string;
  };
};

export const CreditDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'CreditDetails'>>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { colors, isDark } = useTheme();
  const { formatAmount, convertAmount } = useCurrency();
  const { t } = useLocalization();
  const { accounts } = useData();

  const [fontsLoaded] = useFonts({
    K2D_400Regular,
    K2D_600SemiBold,
  });

  const [loading, setLoading] = useState(true);
  const [paymentSchedule, setPaymentSchedule] = useState<CreditPaymentScheduleType[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<CreditPaymentScheduleType | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEarlyRepaymentModal, setShowEarlyRepaymentModal] = useState(false);

  const accountId = route.params?.accountId;
  const account = accounts.find(acc => acc.id === accountId);

  // Загрузка графика платежей
  useEffect(() => {
    loadPaymentSchedule();
  }, [accountId]);

  // Проверка просрочек при загрузке
  useEffect(() => {
    if (accountId) {
      updateOverduePayments(accountId);
    }
  }, [accountId]);

  const loadPaymentSchedule = async () => {
    if (!account || account.type !== 'credit') {
      setLoading(false);
      return;
    }

    try {
      // Пытаемся загрузить существующий график из БД
      const scheduleCollection = database.get<CreditPaymentSchedule>('credit_payment_schedules');
      const scheduleItems = await scheduleCollection
        .query(Q.where('account_id', accountId))
        .fetch();

      if (scheduleItems.length > 0) {
        // Преобразуем модели в интерфейсы
        const scheduleData: CreditPaymentScheduleType[] = scheduleItems.map(item => ({
          id: item.id,
          accountId: item.accountId,
          paymentNumber: item.paymentNumber,
          paymentDate: item.paymentDate,
          totalPayment: item.totalPayment,
          principalPayment: item.principalPayment,
          interestPayment: item.interestPayment,
          remainingBalance: item.remainingBalance,
          status: item.status as 'pending' | 'paid' | 'partial' | 'overdue',
          paidAmount: item.paidAmount,
          paidDate: item.paidDate,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          syncedAt: item.syncedAt?.toISOString(),
        }));

        setPaymentSchedule(scheduleData);
      } else {
        // Генерируем новый график
        await generateAndSaveSchedule();
      }
    } catch (error) {
      console.error('Ошибка загрузки графика платежей:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAndSaveSchedule = async () => {
    if (!account || !account.creditInitialAmount || !account.creditRate ||
        !account.creditTerm || !account.creditStartDate || !account.creditPaymentType) {
      console.log('Недостаточно данных для генерации графика');
      return;
    }

    try {
      // Генерируем график
      const schedule = generatePaymentSchedule({
        principal: account.creditInitialAmount,
        annualRate: account.creditRate,
        termMonths: account.creditTerm,
        startDate: new Date(account.creditStartDate),
        paymentType: account.creditPaymentType,
      });

      // Сохраняем в БД
      await database.write(async () => {
        const scheduleCollection = database.get<CreditPaymentSchedule>('credit_payment_schedules');

        for (const item of schedule) {
          await scheduleCollection.create((record: any) => {
            record.accountId = accountId;
            record.paymentNumber = item.paymentNumber;
            record.paymentDate = item.paymentDate.toISOString();
            record.totalPayment = item.totalPayment;
            record.principalPayment = item.principalPayment;
            record.interestPayment = item.interestPayment;
            record.remainingBalance = item.remainingBalance;
            record.status = 'pending';
          });
        }
      });

      // Перезагружаем график
      await loadPaymentSchedule();
    } catch (error) {
      console.error('Ошибка генерации графика:', error);
    }
  };

  // Обработчик подтверждения платежа
  const handlePaymentConfirm = async (paidAmount: number, paidDate: Date, fromAccountId: string | null) => {
    if (!selectedPayment || !account) return;

    try {
      // 1. Отмечаем платёж как оплаченный
      await markPaymentAsPaid({
        scheduleItemId: selectedPayment.id,
        paidAmount,
        paidDate,
      });

      // 2. Если указан счёт для списания - списываем деньги и создаём транзакцию расхода
      if (fromAccountId) {
        // Получаем счёт для списания
        const accountsCollection = database.get<Account>('accounts');
        const fromAccount = await accountsCollection.find(fromAccountId);

        // Конвертируем сумму если валюты разные
        let amountToDebit = paidAmount;
        let descriptionSuffix = '';

        if (fromAccount.currency && account.currency && fromAccount.currency !== account.currency) {
          amountToDebit = await convertAmount(paidAmount, account.currency, fromAccount.currency);
          descriptionSuffix = ` (${formatAmount(paidAmount, account.currency)} → ${formatAmount(amountToDebit, fromAccount.currency)})`;
        }

        await database.write(async () => {
          // Обновляем баланс счета (списываем конвертированную сумму)
          await fromAccount.update((acc: Account) => {
            acc.balance = acc.balance - amountToDebit;
          });

          // Создаём транзакцию расхода
          const transactionsCollection = database.get('transactions');
          await transactionsCollection.create((transaction: any) => {
            transaction.accountId = fromAccountId;
            transaction.amount = amountToDebit;
            transaction.type = 'expense';
            transaction.description = `Платёж по кредиту ${account.name} №${selectedPayment.paymentNumber}${descriptionSuffix}`;
            transaction.date = paidDate.toISOString();
          });
        });
      }

      // 3. Перезагружаем график и данные аккаунта
      await loadPaymentSchedule();
      setShowPaymentModal(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error('Ошибка при отметке платежа:', error);
      throw error;
    }
  };

  // Открыть модальное окно для платежа
  const handleOpenPaymentModal = (payment: CreditPaymentScheduleType) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  // Обработчик досрочного погашения
  const handleEarlyRepayment = async (amount: number, repaymentDate: Date, fromAccountId: string | null) => {
    if (!account) return;

    try {
      // 1. Выполняем досрочное погашение
      await makeEarlyRepayment({
        accountId,
        amount,
        repaymentDate,
      });

      // 2. Если указан счёт для списания - списываем деньги и создаём транзакцию расхода
      if (fromAccountId) {
        // Получаем счёт для списания
        const accountsCollection = database.get<Account>('accounts');
        const fromAccount = await accountsCollection.find(fromAccountId);

        // Конвертируем сумму если валюты разные
        let amountToDebit = amount;
        let descriptionSuffix = '';

        if (fromAccount.currency && account.currency && fromAccount.currency !== account.currency) {
          amountToDebit = await convertAmount(amount, account.currency, fromAccount.currency);
          descriptionSuffix = ` (${formatAmount(amount, account.currency)} → ${formatAmount(amountToDebit, fromAccount.currency)})`;
        }

        await database.write(async () => {
          // Обновляем баланс счета (списываем конвертированную сумму)
          await fromAccount.update((acc: Account) => {
            acc.balance = acc.balance - amountToDebit;
          });

          // Создаём транзакцию расхода
          const transactionsCollection = database.get('transactions');
          await transactionsCollection.create((transaction: any) => {
            transaction.accountId = fromAccountId;
            transaction.amount = amountToDebit;
            transaction.type = 'expense';
            transaction.description = `Досрочное погашение кредита ${account.name}${descriptionSuffix}`;
            transaction.date = repaymentDate.toISOString();
          });
        });
      }

      // 3. Перезагружаем график и данные аккаунта
      await loadPaymentSchedule();
      setShowEarlyRepaymentModal(false);
    } catch (error) {
      console.error('Ошибка при досрочном погашении:', error);
      throw error;
    }
  };

  // Вычисления для отображения
  const creditInfo = useMemo(() => {
    if (!account || !account.creditInitialAmount) {
      return null;
    }

    const totalPayable = paymentSchedule.length > 0
      ? paymentSchedule.reduce((sum, p) => sum + p.totalPayment, 0)
      : account.creditInitialAmount;

    // Учитываем как полностью оплаченные, так и частично оплаченные платежи
    const paidAmount = paymentSchedule
      .filter(p => p.status === 'paid' || p.status === 'partial')
      .reduce((sum, p) => sum + (p.paidAmount || p.totalPayment), 0);

    const remainingBalance = account.balance < 0 ? Math.abs(account.balance) : 0;
    const progressPercent = totalPayable > 0 ? (paidAmount / totalPayable) * 100 : 0;

    // Ближайший платёж
    const nextPayment = paymentSchedule.find(p => p.status === 'pending');

    return {
      remainingBalance,
      paidAmount,
      totalPayable,
      progressPercent,
      nextPayment,
    };
  }, [account, paymentSchedule]);

  if (!account || account.type !== 'credit') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t('credit.notFound') || 'Кредит не найден'}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('credit.loading') || 'Загрузка...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!creditInfo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="information-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t('credit.noData') || 'Недостаточно данных для отображения графика'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Шапка с основной информацией */}
      <View style={[styles.headerCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
          {t('credit.remainingDebt') || 'Остаток долга'}
        </Text>
        <Text style={[styles.headerAmount, { color: isDark ? '#FF6800' : '#4287f5' }]}>
          {formatAmount(creditInfo.remainingBalance, account.currency)}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('credit.paid') || 'Выплачено'}
            </Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatAmount(creditInfo.paidAmount, account.currency)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('credit.totalPayable') || 'Всего к выплате'}
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatAmount(creditInfo.totalPayable, account.currency)}
            </Text>
          </View>
        </View>

        {/* Прогресс-бар */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(creditInfo.progressPercent, 100)}%`,
                  backgroundColor: colors.success,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {Math.round(creditInfo.progressPercent)}% {t('credit.paidOff') || 'погашено'}
          </Text>
        </View>

        {/* Кнопка досрочного погашения */}
        {creditInfo.remainingBalance > 0 && (
          <TouchableOpacity
            style={[styles.earlyRepaymentButton, { borderColor: colors.primary }]}
            onPress={() => setShowEarlyRepaymentModal(true)}
          >
            <Ionicons name="flash-outline" size={20} color={colors.primary} />
            <Text style={[styles.earlyRepaymentButtonText, { color: colors.primary }]}>
              {t('credit.earlyRepayment') || 'Досрочное погашение'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ближайший платёж */}
      {creditInfo.nextPayment && (
        <View style={[styles.nextPaymentCard, { backgroundColor: colors.card }]}>
          <View style={styles.nextPaymentHeader}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            <Text style={[styles.nextPaymentTitle, { color: colors.text }]}>
              {t('credit.nextPayment') || 'Ближайший платёж'}
            </Text>
          </View>

          <View style={styles.nextPaymentContent}>
            <View style={styles.nextPaymentRow}>
              <Text style={[styles.nextPaymentLabel, { color: colors.textSecondary }]}>
                {t('credit.date') || 'Дата'}
              </Text>
              <Text style={[styles.nextPaymentValue, { color: colors.text }]}>
                {new Date(creditInfo.nextPayment.paymentDate).toLocaleDateString('ru-RU')}
              </Text>
            </View>

            <View style={styles.nextPaymentRow}>
              <Text style={[styles.nextPaymentLabel, { color: colors.textSecondary }]}>
                {t('credit.amount') || 'Сумма'}
              </Text>
              <Text style={[styles.nextPaymentValue, { color: colors.primary, fontWeight: '700' }]}>
                {formatAmount(creditInfo.nextPayment.totalPayment, account.currency)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.markPaidButton, { backgroundColor: colors.primary }]}
            onPress={() => creditInfo.nextPayment && handleOpenPaymentModal(creditInfo.nextPayment)}
          >
            <Text style={styles.markPaidButtonText}>
              {t('credit.markAsPaid') || 'Отметить как оплачено'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Список платежей */}
      <View style={[styles.scheduleCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.scheduleTitle, { color: colors.text }]}>
          {t('credit.paymentSchedule') || 'График платежей'}
        </Text>

        {paymentSchedule.map((payment) => (
          <View
            key={payment.id}
            style={[
              styles.paymentItem,
              {
                backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5',
                borderLeftColor:
                  payment.status === 'paid'
                    ? colors.success
                    : payment.status === 'overdue'
                    ? colors.error
                    : colors.border,
              },
            ]}
          >
            <View style={styles.paymentHeader}>
              <Text style={[styles.paymentNumber, { color: colors.textSecondary }]}>
                №{payment.paymentNumber}
              </Text>
              <Text style={[styles.paymentDate, { color: colors.text }]}>
                {new Date(payment.paymentDate).toLocaleDateString('ru-RU')}
              </Text>
            </View>

            <View style={styles.paymentDetails}>
              <View style={styles.paymentDetailRow}>
                <Text style={[styles.paymentDetailLabel, { color: colors.textSecondary }]}>
                  {t('credit.totalPayment') || 'Платёж'}:
                </Text>
                <Text style={[styles.paymentDetailValue, { color: colors.text }]}>
                  {formatAmount(payment.totalPayment, account.currency)}
                </Text>
              </View>

              <View style={styles.paymentDetailRow}>
                <Text style={[styles.paymentDetailLabel, { color: colors.textSecondary }]}>
                  {t('credit.principal') || 'Тело'}:
                </Text>
                <Text style={[styles.paymentDetailValue, { color: colors.text }]}>
                  {formatAmount(payment.principalPayment, account.currency)}
                </Text>
              </View>

              <View style={styles.paymentDetailRow}>
                <Text style={[styles.paymentDetailLabel, { color: colors.textSecondary }]}>
                  {t('credit.interest') || 'Проценты'}:
                </Text>
                <Text style={[styles.paymentDetailValue, { color: colors.text }]}>
                  {formatAmount(payment.interestPayment, account.currency)}
                </Text>
              </View>

              <View style={styles.paymentDetailRow}>
                <Text style={[styles.paymentDetailLabel, { color: colors.textSecondary }]}>
                  {t('credit.remaining') || 'Остаток'}:
                </Text>
                <Text style={[styles.paymentDetailValue, { color: colors.primary, fontWeight: '600' }]}>
                  {formatAmount(payment.remainingBalance, account.currency)}
                </Text>
              </View>
            </View>

            {payment.status === 'paid' && (
              <View style={[styles.statusBadge, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.statusText, { color: colors.success }]}>
                  {t('credit.paid') || 'Оплачено'}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Модальное окно для отметки платежа */}
      <CreditPaymentModal
        visible={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        currency={account.currency}
        creditAccountId={accountId}
        onConfirm={handlePaymentConfirm}
      />

      {/* Модальное окно для досрочного погашения */}
      <CreditEarlyRepaymentModal
        visible={showEarlyRepaymentModal}
        onClose={() => setShowEarlyRepaymentModal(false)}
        currency={account.currency}
        creditAccountId={accountId}
        remainingBalance={creditInfo?.remainingBalance || 0}
        onConfirm={handleEarlyRepayment}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'K2D_400Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'K2D_400Regular',
    textAlign: 'center',
  },
  headerCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'K2D_400Regular',
    marginBottom: 8,
  },
  headerAmount: {
    fontSize: 36,
    fontFamily: 'K2D_600SemiBold',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'K2D_400Regular',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'K2D_600SemiBold',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'K2D_400Regular',
    marginTop: 8,
    textAlign: 'center',
  },
  nextPaymentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  nextPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextPaymentTitle: {
    fontSize: 18,
    fontFamily: 'K2D_600SemiBold',
    marginLeft: 12,
  },
  nextPaymentContent: {
    marginBottom: 16,
  },
  nextPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nextPaymentLabel: {
    fontSize: 14,
    fontFamily: 'K2D_400Regular',
  },
  nextPaymentValue: {
    fontSize: 14,
    fontFamily: 'K2D_600SemiBold',
  },
  markPaidButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  markPaidButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'K2D_600SemiBold',
  },
  scheduleCard: {
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scheduleTitle: {
    fontSize: 18,
    fontFamily: 'K2D_600SemiBold',
    marginBottom: 16,
  },
  paymentItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentNumber: {
    fontSize: 14,
    fontFamily: 'K2D_400Regular',
  },
  paymentDate: {
    fontSize: 14,
    fontFamily: 'K2D_600SemiBold',
  },
  paymentDetails: {
    gap: 8,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentDetailLabel: {
    fontSize: 13,
    fontFamily: 'K2D_400Regular',
  },
  paymentDetailValue: {
    fontSize: 13,
    fontFamily: 'K2D_400Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'K2D_600SemiBold',
    marginLeft: 4,
  },
  earlyRepaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    marginTop: 16,
    gap: 8,
  },
  earlyRepaymentButtonText: {
    fontSize: 15,
    fontFamily: 'K2D_600SemiBold',
  },
});
