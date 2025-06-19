import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account, Transaction, Category, Debt } from '../types';
import { LocalDatabaseService } from '../services/localDatabase';
import { CloudSyncService } from '../services/cloudSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExchangeRateService } from '../services/exchangeRate';

interface DataContextType {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  totalBalance: number;
  isLoading: boolean;
  lastSyncTime: string | null;
  isSyncing: boolean;
  
  // Методы для работы со счетами
  createAccount: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  // Методы для работы с транзакциями
  createTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
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
  
  // Синхронизация
  syncData: () => Promise<void>;
  
  // Статистика
  getStatistics: (startDate?: Date, endDate?: Date) => {
    income: number;
    expense: number;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode; userId?: string | null; defaultCurrency?: string }> = ({ children, userId, defaultCurrency = 'USD' }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);

  // Инициализация БД и загрузка данных
  useEffect(() => {
    if (userId) {
      initializeApp();
      
      // Запускаем автоматическую синхронизацию для зарегистрированных пользователей
      startAutoSync();
    } else {
      // Очищаем данные при выходе
      setAccounts([]);
      setTransactions([]);
      setCategories([]);
      setTotalBalance(0);
      stopAutoSync();
    }
    
    return () => {
      stopAutoSync();
    };
  }, [userId]);

  const initializeApp = async () => {
    try {
      // Устанавливаем userId для базы данных
      if (userId) {
        LocalDatabaseService.setUserId(userId);
        await LocalDatabaseService.initDatabase(defaultCurrency);
        await refreshData();
        
        // Проверяем есть ли данные в облаке
        const isGuest = await AsyncStorage.getItem('isGuest');
        if (isGuest !== 'true') {
          const token = await AsyncStorage.getItem(`authToken_${userId}`);
          if (token) {
            // Пытаемся загрузить данные из облака при первом входе
            const hasCloudData = await CloudSyncService.downloadData(userId, token);
            if (hasCloudData) {
              await refreshData();
            }
          }
        }
        
        // Получаем время последней синхронизации
        const syncTime = await LocalDatabaseService.getLastSyncTime();
        setLastSyncTime(syncTime);
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startAutoSync = async () => {
    const isGuest = await AsyncStorage.getItem('isGuest');
    if (isGuest === 'true' || !userId) return;
    
    // Синхронизация каждые 5 минут
    const interval = setInterval(() => {
      syncData();
    }, 5 * 60 * 1000);
    
    setSyncInterval(interval);
  };

  const stopAutoSync = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      setSyncInterval(null);
    }
  };

  const syncData = async () => {
    if (!userId || isSyncing) return;
    
    const isGuest = await AsyncStorage.getItem('isGuest');
    if (isGuest === 'true') return;
    
    setIsSyncing(true);
    
    try {
      const token = await AsyncStorage.getItem(`authToken_${userId}`);
      if (token) {
        const success = await CloudSyncService.syncData(userId, token);
        if (success) {
          const syncTime = await LocalDatabaseService.getLastSyncTime();
          setLastSyncTime(syncTime);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshData = async () => {
    const [accounts, transactions, categories] = await Promise.all([
      LocalDatabaseService.getAccounts(),
      LocalDatabaseService.getTransactions(),
      LocalDatabaseService.getCategories()
    ]);
    
    setAccounts(accounts);
    setTransactions(transactions);
    setCategories(categories);
    
    // Обновляем курсы валют для счетов с другой валютой
    const accountsWithRates = await Promise.all(
      accounts.map(async (account: Account) => {
        if (account.currency && account.currency !== defaultCurrency) {
          try {
            // Пробуем получить прямой курс
            let rate = await ExchangeRateService.getRate(account.currency, defaultCurrency);
            
            // Если прямого курса нет, пробуем через USD
            if (!rate && account.currency !== 'USD' && defaultCurrency !== 'USD') {
              console.log(`No direct rate ${account.currency}->${defaultCurrency}, trying through USD`);
              const toUsd = await ExchangeRateService.getRate(account.currency, 'USD');
              const fromUsd = await ExchangeRateService.getRate('USD', defaultCurrency);
              
              if (toUsd && fromUsd) {
                rate = toUsd * fromUsd;
                console.log(`Cross rate ${account.currency}->${defaultCurrency} = ${rate} (via USD)`);
              }
            }
            
            if (rate) {
              return { ...account, exchangeRate: rate };
            }
          } catch (error) {
            console.error(`Failed to get rate for ${account.currency}:`, error);
          }
        }
        return account;
      })
    );
    
    // Считаем общий баланс только по счетам с учетом курса обмена
    const accountsTotal = accountsWithRates
      .filter((acc: Account) => acc.isIncludedInTotal !== false)
      .reduce((sum: number, account: Account) => {
        // Если валюта счета отличается от основной и есть курс обмена
        if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
          // Конвертируем баланс в основную валюту
          return sum + (account.balance * (account as any).exchangeRate);
        }
        // Иначе используем баланс как есть
        return sum + account.balance;
      }, 0);
    
    setTotalBalance(accountsTotal);
  };

  // Методы для работы со счетами
  const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newAccount = await LocalDatabaseService.createAccount(account);
      setAccounts(prev => [newAccount, ...prev]);
      
      // Обновляем общий баланс
      if (newAccount.isIncludedInTotal !== false) {
        let balanceToAdd = newAccount.balance;
        // Если валюта счета отличается от основной и есть курс обмена
        if (newAccount.currency && newAccount.currency !== defaultCurrency && 'exchangeRate' in newAccount && (newAccount as any).exchangeRate) {
          balanceToAdd = newAccount.balance * (newAccount as any).exchangeRate;
        }
        setTotalBalance(prev => prev + balanceToAdd);
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
      
      await LocalDatabaseService.updateAccount(id, updates);
      setAccounts(prev => prev.map(acc => 
        acc.id === id ? { ...acc, ...updates } : acc
      ));
      
      // Обновляем общий баланс если изменился баланс или включение в общий баланс
      if (updates.balance !== undefined || updates.isIncludedInTotal !== undefined) {
        const newAccount = { ...oldAccount, ...updates };
        
        // Убираем старый баланс из общего
        let newTotalBalance = totalBalance;
        if (oldAccount.isIncludedInTotal !== false) {
          let oldConvertedBalance = oldAccount.balance;
          // Конвертируем старый баланс если нужно
          if (oldAccount.currency && oldAccount.currency !== defaultCurrency && 'exchangeRate' in oldAccount && (oldAccount as any).exchangeRate) {
            oldConvertedBalance = oldAccount.balance * (oldAccount as any).exchangeRate;
          }
          newTotalBalance -= oldConvertedBalance;
        }
        
        // Добавляем новый баланс к общему
        if (newAccount.isIncludedInTotal !== false) {
          let newConvertedBalance = newAccount.balance;
          // Конвертируем новый баланс если нужно
          if (newAccount.currency && newAccount.currency !== defaultCurrency && 'exchangeRate' in newAccount && (newAccount as any).exchangeRate) {
            newConvertedBalance = newAccount.balance * (newAccount as any).exchangeRate;
          }
          newTotalBalance += newConvertedBalance;
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
      
      await LocalDatabaseService.deleteAccount(id);
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      setTransactions(prev => prev.filter(trans => trans.accountId !== id));
      
      // Обновляем общий баланс если счет был включен в него
      if (accountToDelete.isIncludedInTotal !== false) {
        let balanceToRemove = accountToDelete.balance;
        // Конвертируем баланс если валюта отличается от основной
        if (accountToDelete.currency && accountToDelete.currency !== defaultCurrency && 'exchangeRate' in accountToDelete && (accountToDelete as any).exchangeRate) {
          balanceToRemove = accountToDelete.balance * (accountToDelete as any).exchangeRate;
        }
        setTotalBalance(prev => prev - balanceToRemove);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  // Методы для работы с транзакциями
  const createTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTransaction = await LocalDatabaseService.createTransaction(transaction);
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
          let convertedBalanceChange = balanceChange;
          // Конвертируем изменение баланса если валюта счета отличается от основной
          if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
            convertedBalanceChange = balanceChange * (account as any).exchangeRate;
          }
          setTotalBalance(prev => prev + convertedBalanceChange);
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
      
      await LocalDatabaseService.updateTransaction(id, oldTransaction, updates);
      
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
      
      await LocalDatabaseService.deleteTransaction(transaction);
      
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
          let convertedBalanceChange = balanceChange;
          // Конвертируем изменение баланса если валюта счета отличается от основной
          if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
            convertedBalanceChange = balanceChange * (account as any).exchangeRate;
          }
          setTotalBalance(prev => prev + convertedBalanceChange);
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
      const newCategory = await LocalDatabaseService.createCategory(category);
      setCategories(prev => [...prev, newCategory]);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      await LocalDatabaseService.updateCategory(id, updates);
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
      
      await LocalDatabaseService.deleteCategory(id);
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

  // Пополнение накоплений
  const addToSavings = async (savingsId: string, amount: number) => {
    try {
      const savings = accounts.find(acc => acc.id === savingsId && acc.type === 'savings');
      if (!savings || !savings.linkedAccountId) {
        throw new Error('Накопление не найдено или не связано со счетом');
      }
      
      const linkedAccount = accounts.find(acc => acc.id === savings.linkedAccountId);
      if (!linkedAccount) {
        throw new Error('Связанный счет не найден');
      }
      
      // Создаем транзакцию на связанном счете
      await createTransaction({
        accountId: savings.linkedAccountId,
        amount,
        type: 'expense',
        categoryId: 'other_expense',
        description: `Пополнение накопления: ${savings.name}`,
        date: new Date().toISOString(),
      });
      
      // Обновляем savedAmount у накопления
      const newSavedAmount = (savings.savedAmount || 0) + amount;
      await updateAccount(savingsId, { savedAmount: newSavedAmount });
    } catch (error) {
      console.error('Error adding to savings:', error);
      throw error;
    }
  };
  
  // Снятие с накоплений
  const withdrawFromSavings = async (savingsId: string, amount: number) => {
    try {
      const savings = accounts.find(acc => acc.id === savingsId && acc.type === 'savings');
      if (!savings || !savings.linkedAccountId) {
        throw new Error('Накопление не найдено или не связано со счетом');
      }
      
      const currentSaved = savings.savedAmount || 0;
      if (currentSaved < amount) {
        throw new Error('Недостаточно средств в накоплении');
      }
      
      // Создаем транзакцию на связанном счете
      await createTransaction({
        accountId: savings.linkedAccountId,
        amount,
        type: 'income',
        categoryId: 'other_income',
        description: `Снятие с накопления: ${savings.name}`,
        date: new Date().toISOString(),
      });
      
      // Обновляем savedAmount у накопления
      const newSavedAmount = currentSaved - amount;
      await updateAccount(savingsId, { savedAmount: newSavedAmount });
    } catch (error) {
      console.error('Error withdrawing from savings:', error);
      throw error;
    }
  };

  // Получение статистики
  const getStatistics = (startDate?: Date, endDate?: Date) => {
    let filteredTransactions = transactions;
    
    // Фильтруем по датам если указаны
    if (startDate || endDate) {
      filteredTransactions = transactions.filter(t => {
        const transDate = new Date(t.date);
        if (startDate && transDate < startDate) return false;
        if (endDate && transDate > endDate) return false;
        return true;
      });
    }
    
    // Исключаем транзакции связанные с накоплениями
    const income = filteredTransactions
      .filter(t => t.type === 'income' && !t.description?.includes('Снятие с накопления:'))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = filteredTransactions
      .filter(t => t.type === 'expense' && !t.description?.includes('Пополнение накопления:'))
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expense };
  };
  
  // Сброс всех данных
  const resetAllData = async () => {
    try {
      // Проверяем, что пользователь авторизован
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }
      
      await LocalDatabaseService.resetAllData(defaultCurrency);
      await refreshData();
    } catch (error) {
      console.error('Error resetting data:', error);
      // Если база данных не инициализирована, пробуем инициализировать заново
      if (error instanceof Error && error.message.includes('База данных не инициализирована')) {
        try {
          await initializeApp();
        } catch (initError) {
          console.error('Failed to reinitialize database:', initError);
        }
      }
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
        lastSyncTime,
        isSyncing,
        createAccount,
        updateAccount,
        deleteAccount,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        addToSavings,
        withdrawFromSavings,
        createCategory,
        updateCategory,
        deleteCategory,
        refreshData,
        resetAllData,
        syncData,
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