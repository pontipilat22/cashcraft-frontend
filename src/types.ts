export type AccountType = 'cash' | 'card' | 'bank' | 'savings' | 'debt' | 'credit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  cardNumber?: string;
  isDefault?: boolean;
  isIncludedInTotal?: boolean;
  icon?: string;
  targetAmount?: number;
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
  type: 'owe' | 'owed'; // 'owe' — я должен, 'owed' — мне должны
  name: string;
  amount: number;
  isIncludedInTotal?: boolean;
  dueDate?: string; // Дата возврата долга
  createdAt: string;
  updatedAt: string;
} 