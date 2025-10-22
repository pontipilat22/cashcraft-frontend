/**
 * Сервис для операций с платежами по кредитам
 * Обрабатывает отметки платежей, частичные платежи и досрочное погашение
 */

import database from '../database';
import CreditPaymentSchedule from '../database/models/CreditPaymentSchedule';
import Account from '../database/models/Account';
import { Q } from '@nozbe/watermelondb';
import {
  recalculateScheduleAfterEarlyPayment,
  CreditParams,
  PaymentScheduleItem,
} from './CreditCalculationService';

export interface MarkPaymentParams {
  scheduleItemId: string;
  paidAmount?: number; // Если не указано - полная сумма
  paidDate?: Date; // Если не указано - текущая дата
}

export interface PartialPaymentParams {
  scheduleItemId: string;
  paidAmount: number;
  paidDate?: Date;
}

export interface EarlyRepaymentParams {
  accountId: string;
  amount: number;
  repaymentDate?: Date;
}

/**
 * Отметить платёж как оплаченный (полностью или частично)
 */
export async function markPaymentAsPaid(params: MarkPaymentParams): Promise<void> {
  const { scheduleItemId, paidAmount, paidDate } = params;

  await database.write(async () => {
    const scheduleItem = await database.get<CreditPaymentSchedule>('credit_payment_schedules').find(scheduleItemId);

    const actualPaidAmount = paidAmount ?? scheduleItem.totalPayment;
    const actualPaidDate = paidDate ?? new Date();

    await scheduleItem.update((record: any) => {
      record.paidAmount = actualPaidAmount;
      record.paidDate = actualPaidDate.toISOString();

      // Определяем статус
      if (actualPaidAmount >= scheduleItem.totalPayment) {
        record.status = 'paid';
      } else if (actualPaidAmount > 0 && actualPaidAmount < scheduleItem.totalPayment) {
        record.status = 'partial';
      }
    });

    // Обновляем остаток долга в аккаунте
    await updateAccountBalance(scheduleItem.accountId);
  });
}

/**
 * Частичный платёж
 */
export async function makePartialPayment(params: PartialPaymentParams): Promise<void> {
  const { scheduleItemId, paidAmount, paidDate } = params;

  if (paidAmount <= 0) {
    throw new Error('Сумма платежа должна быть больше нуля');
  }

  await database.write(async () => {
    const scheduleItem = await database.get<CreditPaymentSchedule>('credit_payment_schedules').find(scheduleItemId);

    if (paidAmount > scheduleItem.totalPayment) {
      throw new Error('Сумма платежа не может превышать сумму по графику');
    }

    const currentPaidAmount = scheduleItem.paidAmount || 0;
    const newTotalPaid = currentPaidAmount + paidAmount;

    await scheduleItem.update((record: any) => {
      record.paidAmount = newTotalPaid;
      record.paidDate = (paidDate ?? new Date()).toISOString();

      if (newTotalPaid >= scheduleItem.totalPayment) {
        record.status = 'paid';
      } else {
        record.status = 'partial';
      }
    });

    // Обновляем остаток долга в аккаунте
    await updateAccountBalance(scheduleItem.accountId);
  });
}

/**
 * Досрочное погашение с пересчётом графика
 * Логика: внесённая сумма вычитается из остатка, график пересчитывается
 */
export async function makeEarlyRepayment(params: EarlyRepaymentParams): Promise<void> {
  const { accountId, amount, repaymentDate } = params;

  if (amount <= 0) {
    throw new Error('Сумма досрочного погашения должна быть больше нуля');
  }

  await database.write(async () => {
    const account = await database.get<Account>('accounts').find(accountId);

    if (account.type !== 'credit') {
      throw new Error('Счёт не является кредитным');
    }

    const actualDate = repaymentDate ?? new Date();

    // Получаем все платежи
    const scheduleCollection = database.get<CreditPaymentSchedule>('credit_payment_schedules');
    const allPayments = await scheduleCollection
      .query(Q.where('account_id', accountId), Q.sortBy('payment_number', Q.asc))
      .fetch();

    if (allPayments.length === 0) {
      throw new Error('График платежей не найден');
    }

    // Находим последний оплаченный платёж
    const paidPayments = allPayments.filter(p => p.status === 'paid');
    const lastPaidPaymentNumber = paidPayments.length > 0
      ? paidPayments[paidPayments.length - 1].paymentNumber
      : 0;

    // Номер месяца для досрочного погашения (следующий после последнего оплаченного)
    const earlyPaymentMonth = lastPaidPaymentNumber + 1;

    // Находим остаток на момент досрочного погашения
    const paymentBeforeEarly = allPayments.find(p => p.paymentNumber === earlyPaymentMonth - 1);
    const currentBalance = paymentBeforeEarly
      ? paymentBeforeEarly.remainingBalance
      : (account.creditInitialAmount || 0);

    if (amount > currentBalance) {
      throw new Error('Сумма досрочного погашения превышает остаток долга');
    }

    // Если досрочное погашение полностью покрывает остаток
    if (amount >= currentBalance) {
      // Удаляем все неоплаченные платежи
      const pendingPayments = allPayments.filter(p => p.status === 'pending');
      for (const payment of pendingPayments) {
        await payment.markAsDeleted();
      }

      // Обновляем остаток долга в аккаунте
      await updateAccountBalance(accountId);
      return;
    }

    // Готовим параметры для пересчёта
    const creditParams: CreditParams = {
      principal: account.creditInitialAmount || 0,
      interestRate: account.creditRate || 0,
      termMonths: account.creditTerm || 0,
      paymentType: (account.creditPaymentType as 'annuity' | 'differentiated') || 'annuity',
      startDate: new Date(account.creditStartDate || new Date()),
    };

    // Конвертируем текущий график в формат PaymentScheduleItem
    const originalSchedule: PaymentScheduleItem[] = allPayments.map(p => ({
      paymentNumber: p.paymentNumber,
      paymentDate: new Date(p.paymentDate),
      principalPayment: p.principalPayment,
      interestPayment: p.interestPayment,
      totalPayment: p.totalPayment,
      remainingBalance: p.remainingBalance,
    }));

    // Пересчитываем график
    const newSchedule = recalculateScheduleAfterEarlyPayment(
      originalSchedule,
      amount,
      earlyPaymentMonth,
      creditParams
    );

    // Удаляем все неоплаченные платежи из БД
    const pendingPayments = allPayments.filter(p => p.status === 'pending');
    for (const payment of pendingPayments) {
      await payment.markAsDeleted();
    }

    // Создаём новые платежи на основе пересчитанного графика
    for (const item of newSchedule) {
      await scheduleCollection.create((record: any) => {
        record.accountId = accountId;
        record.paymentNumber = item.paymentNumber;
        record.paymentDate = item.paymentDate.toISOString();
        record.principalPayment = item.principalPayment;
        record.interestPayment = item.interestPayment;
        record.totalPayment = item.totalPayment;
        record.remainingBalance = item.remainingBalance;
        record.paidAmount = 0;
        record.status = 'pending';
      });
    }

    // Обновляем остаток долга в аккаунте
    await updateAccountBalance(accountId);
  });
}

/**
 * Обновить остаток долга в аккаунте на основе графика платежей
 * ВАЖНО: Баланс кредита = остаток ОСНОВНОГО долга, а не всех платежей (без процентов)
 */
export async function updateAccountBalance(accountId: string): Promise<void> {
  const scheduleCollection = database.get<CreditPaymentSchedule>('credit_payment_schedules');
  const allPayments = await scheduleCollection
    .query(Q.where('account_id', accountId), Q.sortBy('payment_number', Q.asc))
    .fetch();

  if (allPayments.length === 0) {
    return;
  }

  // Находим последний ОПЛАЧЕННЫЙ платёж
  const paidPayments = allPayments.filter(p => p.status === 'paid');

  let remainingDebt: number;

  if (paidPayments.length === 0) {
    // Нет оплаченных платежей - берём начальную сумму кредита
    const account = await database.get<Account>('accounts').find(accountId);
    remainingDebt = account.creditInitialAmount || 0;
  } else {
    // Берём remainingBalance последнего оплаченного платежа
    const lastPaidPayment = paidPayments[paidPayments.length - 1];
    remainingDebt = lastPaidPayment.remainingBalance;
  }

  // Обновляем balance в Account
  // Для кредита balance хранится как отрицательное значение (долг)
  const account = await database.get<Account>('accounts').find(accountId);
  await account.update((record: any) => {
    record.balance = -remainingDebt;
  });
}

/**
 * Автоопределение просрочек
 * Отмечает платежи как "overdue" если дата прошла, а статус "pending"
 */
export async function updateOverduePayments(accountId: string): Promise<void> {
  const now = new Date();

  await database.write(async () => {
    const scheduleCollection = database.get<CreditPaymentSchedule>('credit_payment_schedules');
    const pendingPayments = await scheduleCollection
      .query(
        Q.where('account_id', accountId),
        Q.where('status', 'pending')
      )
      .fetch();

    for (const payment of pendingPayments) {
      const paymentDate = new Date(payment.paymentDate);

      if (paymentDate < now) {
        await payment.update((record: any) => {
          record.status = 'overdue';
        });
      }
    }
  });
}

/**
 * Получить статистику по кредиту
 */
export interface CreditStats {
  totalPayable: number;
  paidAmount: number;
  remainingBalance: number;
  nextPaymentDate: Date | null;
  nextPaymentAmount: number;
  overdueCount: number;
  completedCount: number;
}

export async function getCreditStats(accountId: string): Promise<CreditStats> {
  const scheduleCollection = database.get<CreditPaymentSchedule>('credit_payment_schedules');
  const allPayments = await scheduleCollection
    .query(Q.where('account_id', accountId), Q.sortBy('payment_number', Q.asc))
    .fetch();

  const totalPayable = allPayments.reduce((sum, p) => sum + p.totalPayment, 0);

  const paidPayments = allPayments.filter(p => p.status === 'paid');
  const paidAmount = paidPayments.reduce((sum, p) => sum + (p.paidAmount || p.totalPayment), 0);

  const partialPayments = allPayments.filter(p => p.status === 'partial');
  const partialPaid = partialPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

  const totalPaid = paidAmount + partialPaid;
  const remainingBalance = totalPayable - totalPaid;

  const nextPayment = allPayments.find(p => p.status === 'pending' || p.status === 'partial');
  const overdueCount = allPayments.filter(p => p.status === 'overdue').length;
  const completedCount = paidPayments.length;

  return {
    totalPayable,
    paidAmount: totalPaid,
    remainingBalance,
    nextPaymentDate: nextPayment ? new Date(nextPayment.paymentDate) : null,
    nextPaymentAmount: nextPayment ? nextPayment.totalPayment : 0,
    overdueCount,
    completedCount,
  };
}
