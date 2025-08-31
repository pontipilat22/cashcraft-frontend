import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Account, Transaction, Category, Debt } from '../types';
// Заглушка для работы в Expo Go
// import { LocalDatabaseService } from '../services/localDatabase';

interface DataContextType {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  totalBalance: number;
  spendableToday: number;
  isLoading: boolean;
  
  // Методы для работы со счетами
  createAccount: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  // Методы для работы с транзакциями
  createTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Методы для работы с долгами
  createDebt: (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDebt: (id: string, updates: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  
  // Метод для пополнения накоплений
  addToSavings: (savingsId: string, amount: number) => Promise<void>;
  withdrawFromSavings: (savingsId: string, amount: number) => Promise<void>;
  
  // Методы для работы с категориями
  createCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Обновление данных
  refreshData: () => Promise<void>;
  
  // Сброс всех данных
  resetAllData: () => Promise<void>;
  
  // Статистика
  getStatistics: (startDate?: Date, endDate?: Date) => {
    income: number;
    expense: number;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Моковые данные для дизайна
const mockAccounts: Account[] = [
  {
    id: '1',
    name: 'Наличные',
    balance: 1350.00,
    type: 'cash',
    isDefault: true,
    isIncludedInTotal: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Банковская карта',
    balance: 50.00,
    type: 'card',
    cardNumber: '0000',
    isDefault: false,
    isIncludedInTotal: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Накопления на отпуск',
    balance: 500.00,
    type: 'savings',
    savedAmount: 300.00,
    targetAmount: 1000.00,
    isDefault: false,
    isIncludedInTotal: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Кредит на авто',
    balance: -15000.00,
    type: 'credit',
    creditRate: 12.5,
    creditTerm: 36,
    creditPaymentType: 'annuity',
    creditInitialAmount: 20000.00,
    isDefault: false,
    isIncludedInTotal: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockTransactions: Transaction[] = [
  {
    id: '1',
    amount: 50.00,
    type: 'expense',
    categoryId: '1',
    accountId: '1',
    description: 'Продукты',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    amount: 1450.00,
    type: 'income',
    categoryId: '2',
    accountId: '1',
    description: 'Зарплата',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Продукты',
    type: 'expense',
    icon: 'basket-outline',
    color: '#FF6B35',
  },
  {
    id: '2',
    name: 'Зарплата',
    type: 'income',
    icon: 'cash-outline',
    color: '#4CAF50',
  },
];

const mockDebts: Debt[] = [
  {
    id: '1',
    name: 'Долг другу',
    amount: 100.00,
    type: 'owed_by_me',
    description: 'За обед',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Коллега должен',
    amount: 50.00,
    type: 'owed_to_me',
    description: 'За такси',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DataProvider: React.FC<{ children: ReactNode; userId?: string | null; defaultCurrency?: string }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [debts, setDebts] = useState<Debt[]>(mockDebts);
  const [isLoading, setIsLoading] = useState(false);
  const [totalBalance] = useState(1400.00);
  // Мокаем показатель "Могу потратить сегодня" как на макете
  const [spendableToday] = useState(350.00);

  // Заглушки для методов
  const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('Mock: createAccount', account);
    const newAccount: Account = {
      ...account,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAccounts(prev => [...prev, newAccount]);
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    console.log('Mock: updateAccount', id, updates);
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...updates } : acc));
  };

  const deleteAccount = async (id: string) => {
    console.log('Mock: deleteAccount', id);
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  const createTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('Mock: createTransaction', transaction);
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    console.log('Mock: updateTransaction', id, updates);
  };

  const deleteTransaction = async (id: string) => {
    console.log('Mock: deleteTransaction', id);
  };

  const createCategory = async (category: Omit<Category, 'id'>) => {
    console.log('Mock: createCategory', category);
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    console.log('Mock: updateCategory', id, updates);
  };

  const deleteCategory = async (id: string) => {
    console.log('Mock: deleteCategory', id);
  };

  const addToSavings = async (savingsId: string, amount: number) => {
    console.log('Mock: addToSavings', savingsId, amount);
  };

  const withdrawFromSavings = async (savingsId: string, amount: number) => {
    console.log('Mock: withdrawFromSavings', savingsId, amount);
  };

  const refreshData = async () => {
    console.log('Mock: refreshData');
  };

  const resetAllData = async () => {
    console.log('Mock: resetAllData');
  };

  const createDebt = async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('Mock: createDebt', debt);
  };

  const updateDebt = async (id: string, updates: Partial<Debt>) => {
    console.log('Mock: updateDebt', id, updates);
  };

  const deleteDebt = async (id: string) => {
    console.log('Mock: deleteDebt', id);
  };

  const getStatistics = (startDate?: Date, endDate?: Date) => {
    return { income: 1450, expense: 50 };
  };

  const value: DataContextType = {
    accounts,
    transactions,
    categories,
    debts,
    totalBalance,
    spendableToday,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createCategory,
    updateCategory,
    deleteCategory,
    addToSavings,
    withdrawFromSavings,
    refreshData,
    resetAllData,
    createDebt,
    updateDebt,
    deleteDebt,
    getStatistics,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
