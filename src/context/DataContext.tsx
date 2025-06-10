import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account, Transaction, Category, Debt } from '../types';
import { UserDataService } from '../services/userDataService';
import { SyncService } from '../services/sync';

interface DataContextType {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  totalBalance: number;
  isLoading: boolean;
  
  // Методы для работы со счетами
  createAccount: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  // Методы для работы с транзакциями
  createTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Методы для работы с категориями
  createCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Обновление данных
  refreshData: () => Promise<void>;
  
  // Сброс всех данных
  resetAllData: () => Promise<void>;
  
  // Статистика
  getStatistics: () => {
    income: number;
    expense: number;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode; userId?: string | null }> = ({ children, userId }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);

  // Инициализация БД и загрузка данных
  useEffect(() => {
    if (userId) {
      initializeApp();
      
      // Запускаем автоматическую синхронизацию
      SyncService.startAutoSync();
    }
  }, [userId]);

  const initializeApp = async () => {
    try {
      // Устанавливаем userId для базы данных
      if (userId) {
        UserDataService.setUserId(userId);
        await UserDataService.initializeUserData();
        await refreshData();
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    const [accounts, transactions, categories] = await Promise.all([
      UserDataService.getAccounts(),
      UserDataService.getTransactions(),
      UserDataService.getCategories()
    ]);
    
    setAccounts(accounts);
    setTransactions(transactions);
    setCategories(categories);
    
    // Считаем общий баланс только по счетам
    const accountsTotal = accounts
      .filter(acc => acc.isIncludedInTotal !== false)
      .reduce((sum, account) => sum + account.balance, 0);
    
    setTotalBalance(accountsTotal);
  };

  // Методы для работы со счетами
  const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newAccount = await UserDataService.createAccount(account);
      setAccounts(prev => [newAccount, ...prev]);
      
      // Обновляем общий баланс
      if (newAccount.isIncludedInTotal !== false) {
        setTotalBalance(prev => prev + newAccount.balance);
      }
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      const oldAccount = accounts.find(acc => acc.id === id);
      if (!oldAccount) return;
      
      await UserDataService.updateAccount(id, updates);
      setAccounts(prev => prev.map(acc => 
        acc.id === id ? { ...acc, ...updates } : acc
      ));
      
      // Обновляем общий баланс если изменился баланс или включение в общий баланс
      if (updates.balance !== undefined || updates.isIncludedInTotal !== undefined) {
        const newAccount = { ...oldAccount, ...updates };
        
        // Убираем старый баланс из общего
        let newTotalBalance = totalBalance;
        if (oldAccount.isIncludedInTotal !== false) {
          newTotalBalance -= oldAccount.balance;
        }
        
        // Добавляем новый баланс к общему
        if (newAccount.isIncludedInTotal !== false) {
          newTotalBalance += newAccount.balance;
        }
        
        setTotalBalance(newTotalBalance);
      }
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const accountToDelete = accounts.find(acc => acc.id === id);
      if (!accountToDelete) return;
      
      await UserDataService.deleteAccount(id);
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      setTransactions(prev => prev.filter(trans => trans.accountId !== id));
      
      // Обновляем общий баланс если счет был включен в него
      if (accountToDelete.isIncludedInTotal !== false) {
        setTotalBalance(prev => prev - accountToDelete.balance);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  // Методы для работы с транзакциями
  const createTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTransaction = await UserDataService.createTransaction(transaction);
      setTransactions(prev => [newTransaction, ...prev]);
      
      // Обновляем баланс счета
      const account = accounts.find(acc => acc.id === transaction.accountId);
      if (account) {
        const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        setAccounts(prev => prev.map(acc => 
          acc.id === transaction.accountId 
            ? { ...acc, balance: acc.balance + balanceChange }
            : acc
        ));
        
        // Обновляем общий баланс если счет включен в него
        if (account.isIncludedInTotal !== false) {
          setTotalBalance(prev => prev + balanceChange);
        }
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const oldTransaction = transactions.find(t => t.id === id);
      if (!oldTransaction) return;
      
      await UserDataService.updateTransaction(id, oldTransaction, updates);
      
      // Обновляем транзакцию в состоянии
      setTransactions(prev => prev.map(trans => 
        trans.id === id ? { ...trans, ...updates } : trans
      ));
      
      // Обновляем балансы счетов если нужно
      if (updates.amount !== undefined || updates.type !== undefined || updates.accountId !== undefined) {
        await refreshData(); // Проще перезагрузить все данные для правильных балансов
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return;
      
      await UserDataService.deleteTransaction(transaction);
      
      // Удаляем транзакцию из состояния
      setTransactions(prev => prev.filter(trans => trans.id !== id));
      
      // Обновляем баланс счета
      const account = accounts.find(acc => acc.id === transaction.accountId);
      if (account) {
        const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
        setAccounts(prev => prev.map(acc => 
          acc.id === transaction.accountId 
            ? { ...acc, balance: acc.balance + balanceChange }
            : acc
        ));
        
        // Обновляем общий баланс если счет включен в него
        if (account.isIncludedInTotal !== false) {
          setTotalBalance(prev => prev + balanceChange);
        }
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  // Методы для работы с категориями
  const createCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const newCategory = await UserDataService.createCategory(category);
      setCategories(prev => [...prev, newCategory]);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      await UserDataService.updateCategory(id, updates);
      setCategories(prev => prev.map(cat => 
        cat.id === id ? { ...cat, ...updates } : cat
      ));
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      // Проверяем, что это не базовая категория "Другое"
      if (id === 'other_income' || id === 'other_expense') {
        throw new Error('Нельзя удалить базовую категорию');
      }
      
      await UserDataService.deleteCategory(id);
      setCategories(prev => prev.filter(cat => cat.id !== id));
      
      // Обновляем транзакции в состоянии
      const deletedCategory = categories.find(cat => cat.id === id);
      if (deletedCategory) {
        const otherId = deletedCategory.type === 'income' ? 'other_income' : 'other_expense';
        setTransactions(prev => prev.map(trans => 
          trans.categoryId === id ? { ...trans, categoryId: otherId } : trans
        ));
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

    // Получение статистики
  const getStatistics = () => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expense };
  };
  
  // Сброс всех данных
  const resetAllData = async () => {
    try {
      await UserDataService.resetAllData();
      await refreshData();
    } catch (error) {
      console.error('Error resetting data:', error);
      throw error;
    }
  };

  return (
    <DataContext.Provider
      value={{
        accounts,
        transactions,
        categories,
        totalBalance,
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
        refreshData,
        resetAllData,
        getStatistics,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}; 