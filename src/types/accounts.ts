export type AccountType = 'cash' | 'card' | 'bank' | 'savings' | 'investment' | 'debt' | 'credit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
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

  // Savings
  isTargetedSavings?: boolean;
  targetAmount?: number;
  savedAmount?: number;
  linkedAccountId?: string;

  // Credit
  creditStartDate?: string;
  creditTerm?: number;
  creditRate?: number;
  creditPaymentType?: 'annuity' | 'differentiated';
  creditInitialAmount?: number;
  creditPaidAmount?: number;

  // Bank
  interestRate?: number;
  openDate?: string;
  interestDay?: number;
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
