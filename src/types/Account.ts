export type AccountType = 'cash' | 'card' | 'bank' | 'savings' | 'investment';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string; // Код валюты (USD, EUR, RUB и т.д.)
  color?: string;
  createdAt: Date;
  updatedAt: Date;
} 