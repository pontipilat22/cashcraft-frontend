

export type AccountType = 'cash' | 'card' | 'bank' | 'savings' | 'debt' | 'credit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency?: string;
  cardNumber?: string;
  icon?: string;
  isDefault?: boolean;
  isIncludedInTotal?: boolean;
  targetAmount?: number;
  linkedAccountId?: string; // ID счета, на котором физически находятся деньги накопления
  savedAmount?: number; // Сумма накопленная для цели (только для накоплений)
  // Поля для кредитов
  creditStartDate?: string; // Дата получения кредита
  creditTerm?: number; // Срок кредита в месяцах
  creditRate?: number; // Процентная ставка
  creditPaymentType?: 'annuity' | 'differentiated'; // Тип платежей
  creditInitialAmount?: number; // Начальная сумма кредита
  createdAt?: string;
  updatedAt?: string;
  
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  note?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export interface AccountTypeLabels {
  [key: string]: string;
}

export const AccountTypeLabels: AccountTypeLabels = {
  cash: 'Наличные',
  card: 'Банковская карта',
  bank: 'Банковский счет',
  savings: 'Накопления',
  debt: 'Долг',
  credit: 'Кредит',
};

export interface Debt {
  id: string;
  type: 'owed_to_me' | 'owed_by_me'; // 'owed_to_me' — мне должны, 'owed_by_me' — я должен
  name: string;
  amount: number;
  currency?: string; // Валюта долга
  exchangeRate?: number; // Курс обмена к основной валюте
  isIncludedInTotal?: boolean;
  dueDate?: string; // Дата возврата долга
  createdAt: string;
  updatedAt: string;
} 

export interface CreditPaymentSchedule {
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

