export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'bank' | 'savings' | 'debt' | 'credit';
  balance: number;
  currency: string;
  cardNumber?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  isIncludedInTotal?: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  accountId: string;
  categoryId?: string;
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export type AccountType = 'cash' | 'card' | 'bank' | 'savings' | 'debt' | 'credit';

export const AccountTypeLabels: Record<AccountType, string> = {
  cash: 'Наличные',
  card: 'Карта',
  bank: 'Банковский счет',
  savings: 'Накопления',
  debt: 'Долг',
  credit: 'Кредит',
}; 