export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'bank' | 'savings' | 'investment' | 'debt' | 'credit';
  balance: number;
  currency: string;
  exchangeRate?: number;
  cardNumber?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  isIncludedInTotal?: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  // Поля для накоплений
  isTargetedSavings?: boolean;
  targetAmount?: number;
  savedAmount?: number;
  linkedAccountId?: string;
  // Поля для кредитов
  creditStartDate?: string;
  creditTerm?: number;
  creditRate?: number;
  creditPaymentType?: 'annuity' | 'differentiated';
  creditInitialAmount?: number;
  creditPaidAmount?: number;
  // Поля для банковских счетов
  interestRate?: number;
  openDate?: string;
  interestDay?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  accountId: string;
  categoryId: string;
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  includeBudget?: boolean;
  budgetCategory?: 'essential' | 'nonEssential' | 'savings';
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  budgetCategory?: 'essential' | 'nonEssential';
}

export type AccountType = 'cash' | 'card' | 'bank' | 'savings' | 'investment' | 'debt' | 'credit';

// Новые интерфейсы для системы целей
export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  color?: string;
  icon?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface GoalTransfer {
  id: string;
  goalId: string;
  accountId: string;
  amount: number;
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

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

export const AccountTypeLabels: Record<AccountType, string> = {
  cash: 'Наличные',
  card: 'Карта',
  bank: 'Банковский счет',
  savings: 'Накопления',
  investment: 'Инвестиции',
  debt: 'Долг',
  credit: 'Кредит',
}; 