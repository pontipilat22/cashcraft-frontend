import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Account, Transaction, Category, Debt } from '../types';
import { LocalDatabaseService } from '../services/localDatabase';
import { ApiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExchangeRateService } from '../services/exchangeRate';
import { AuthService } from '../services/auth';

interface DataContextType {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
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

export const DataProvider: React.FC<{ children: ReactNode; userId?: string | null; defaultCurrency?: string }> = ({ children, userId, defaultCurrency = 'USD' }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);

  // Инициализация БД и загрузка данных
  useEffect(() => {
    if (userId) {
      initializeApp();
    } else {
      // Очищаем данные при выходе
      setAccounts([]);
      setTransactions([]);
      setCategories([]);
      setDebts([]);
      setTotalBalance(0);
    }
  }, [userId]);

  const initializeApp = async () => {
    try {
      console.log('🚀 [DataContext] Начинаем инициализацию приложения...');
      console.log('🚀 [DataContext] userId:', userId);
      console.log('🚀 [DataContext] defaultCurrency:', defaultCurrency);
      
      // Устанавливаем userId для базы данных
      if (userId) {
        console.log('🗄️ [DataContext] Устанавливаем userId для базы данных:', userId);
        LocalDatabaseService.setUserId(userId);
        
        console.log('🗄️ [DataContext] Инициализируем базу данных...');
        await LocalDatabaseService.initDatabase(defaultCurrency);
        
        // Проверяем, что база данных действительно готова
        if (!LocalDatabaseService.isDatabaseReady()) {
          console.log('⚠️ [DataContext] База данных не готова, пытаемся переинициализировать...');
          await LocalDatabaseService.forceReinitialize(defaultCurrency);
          
          // Дополнительная проверка после переинициализации
          if (!LocalDatabaseService.isDatabaseReady()) {
            console.error('❌ [DataContext] База данных все еще не готова после переинициализации');
            throw new Error('База данных не может быть инициализирована');
          }
        }
        
        console.log('✅ [DataContext] База данных успешно инициализирована и готова к работе');
        
        console.log('📊 [DataContext] Обновляем данные из базы...');
        await refreshData();
        
        // Инициализируем курсы валют
        console.log('💱 [DataContext] Инициализируем курсы валют...');
        await ExchangeRateService.initializeRatesFromBackend();
        
        console.log('✅ [DataContext] Инициализация приложения завершена');
      }
    } catch (error) {
      console.error('❌ [DataContext] Ошибка инициализации приложения:', error);
      setIsLoading(false);
    }
  };

  const refreshData = useCallback(async () => {
    try {
      console.log('📊 [DataContext] RefreshData called...');
      
      if (!LocalDatabaseService.isDatabaseReady()) {
        console.log('🗄️ [DataContext] Проверка готовности базы данных в refreshData:', false);
        return;
      }
      
      console.log('🗄️ [DataContext] Проверка готовности базы данных в refreshData:', true);
      
      const [accountsFromDb, transactionsFromDb, categoriesFromDb, debtsFromDb] = await Promise.all([
        LocalDatabaseService.getAccounts(),
        LocalDatabaseService.getTransactions(),
        LocalDatabaseService.getCategories(),
        LocalDatabaseService.getDebts()
      ]);

      console.log('📊 [DataContext] Данные из базы:');
      console.log('  - Счета:', accountsFromDb.length);
      console.log('  - Транзакции:', transactionsFromDb.length);
      console.log('  - Категории:', categoriesFromDb.length);
      console.log('  - Долги:', debtsFromDb.length);

      console.log('📊 [DataContext] Счета из базы:', accountsFromDb);

      // Обновляем курсы валют для счетов с другой валютой
      const accountsWithRates = await Promise.all(
        accountsFromDb.map(async (account: Account) => {
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

      console.log('📊 [DataContext] Счета с курсами валют:', accountsWithRates);

      // Обновляем состояние
      setAccounts(accountsWithRates);
      setTransactions(transactionsFromDb);
      setCategories(categoriesFromDb);
      setDebts(debtsFromDb);

      // Вычисляем общий баланс с конвертацией валют
      const total = accountsWithRates
        .filter(account => account.isIncludedInTotal !== false)
        .reduce((sum, account) => {
          let balance = account.balance;
          // Если валюта счета отличается от основной и есть курс обмена
          if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
            balance = account.balance * (account as any).exchangeRate;
          }
          return sum + balance;
        }, 0);

      console.log('💰 [DataContext] Общий баланс:', total);
      setTotalBalance(total);

      console.log('✅ [DataContext] RefreshData завершен успешно');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка обновления данных:', error);
    } finally {
      setIsLoading(false);
    }
  }, [defaultCurrency]);

  const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('➕ [DataContext] Создаем новый счет:', account.name);
      
      await LocalDatabaseService.createAccount(account);
      await refreshData();
      
      console.log('✅ [DataContext] Счет успешно создан');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка создания счета:', error);
      throw error;
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      console.log('✏️ [DataContext] Обновляем счет:', id);
      
      await LocalDatabaseService.updateAccount(id, updates);
      await refreshData();
      
      console.log('✅ [DataContext] Счет успешно обновлен');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка обновления счета:', error);
      throw error;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      console.log('🗑️ [DataContext] Начинаем удаление счёта с ID:', id);
      
      const accountToDelete = accounts.find(acc => acc.id === id);
      if (!accountToDelete) {
        console.log('❌ [DataContext] Счет не найден для удаления');
        return;
      }
      
      console.log('📋 [DataContext] Найден счёт для удаления:', {
        id: accountToDelete.id,
        name: accountToDelete.name,
        balance: accountToDelete.balance,
        type: accountToDelete.type
      });
      
      // Удаляем из локальной базы данных
      console.log('📱 [DataContext] Удаляем счёт из локальной базы данных...');
      await LocalDatabaseService.deleteAccount(id);
      console.log('✅ [DataContext] Счёт удалён из локальной базы данных');
      
      // Обновляем локальное состояние
      console.log('🔄 [DataContext] Обновляем локальное состояние...');
      await refreshData();
      console.log('✅ [DataContext] Локальное состояние обновлено');
      
      console.log('✅ [DataContext] Счёт успешно удалён локально');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка удаления счета:', error);
      throw error;
    }
  };

  const createTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('➕ [DataContext] Создаем новую транзакцию:', transaction.description);
      
      await LocalDatabaseService.createTransaction(transaction);
      await refreshData();
      
      console.log('✅ [DataContext] Транзакция успешно создана');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка создания транзакции:', error);
      throw error;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      console.log('✏️ [DataContext] Обновляем транзакцию:', id);
      
      const oldTransaction = transactions.find(t => t.id === id);
      if (!oldTransaction) {
        throw new Error('Transaction not found');
      }
      
      await LocalDatabaseService.updateTransaction(id, oldTransaction, updates);
      await refreshData();
      
      console.log('✅ [DataContext] Транзакция успешно обновлена');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка обновления транзакции:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      console.log('🗑️ [DataContext] Удаляем транзакцию:', id);
      
      // Находим транзакцию по id
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) {
        throw new Error(`Transaction with id ${id} not found`);
      }
      
      await LocalDatabaseService.deleteTransaction(transaction);
      await refreshData();
      
      console.log('✅ [DataContext] Транзакция успешно удалена');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка удаления транзакции:', error);
      throw error;
    }
  };

  const createCategory = async (category: Omit<Category, 'id'>) => {
    try {
      console.log('➕ [DataContext] Создаем новую категорию:', category.name);
      
      await LocalDatabaseService.createCategory(category);
      await refreshData();
      
      console.log('✅ [DataContext] Категория успешно создана');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка создания категории:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      console.log('✏️ [DataContext] Обновляем категорию:', id);
      
      await LocalDatabaseService.updateCategory(id, updates);
      await refreshData();
      
      console.log('✅ [DataContext] Категория успешно обновлена');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка обновления категории:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      console.log('🗑️ [DataContext] Удаляем категорию:', id);
      
      await LocalDatabaseService.deleteCategory(id);
      await refreshData();
      
      console.log('✅ [DataContext] Категория успешно удалена');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка удаления категории:', error);
      throw error;
    }
  };

  const addToSavings = async (savingsId: string, amount: number) => {
    try {
      console.log('💰 [DataContext] Пополняем накопления:', savingsId, 'на сумму:', amount);
      
      const savingsAccount = accounts.find(acc => acc.id === savingsId);
      if (!savingsAccount) throw new Error('Savings account not found');
      
      await LocalDatabaseService.updateAccount(savingsId, {
        savedAmount: (savingsAccount.savedAmount || 0) + amount
      });
      await refreshData();
      
      console.log('✅ [DataContext] Накопления успешно пополнены');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка пополнения накоплений:', error);
      throw error;
    }
  };

  const withdrawFromSavings = async (savingsId: string, amount: number) => {
    try {
      console.log('💸 [DataContext] Снимаем с накоплений:', savingsId, 'сумму:', amount);
      
      const savingsAccount = accounts.find(acc => acc.id === savingsId);
      if (!savingsAccount) throw new Error('Savings account not found');
      
      const currentSavedAmount = savingsAccount.savedAmount || 0;
      if (currentSavedAmount < amount) {
        throw new Error('Insufficient savings amount');
      }
      
      await LocalDatabaseService.updateAccount(savingsId, {
        savedAmount: currentSavedAmount - amount
      });
      await refreshData();
      
      console.log('✅ [DataContext] С накоплений успешно снято');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка снятия с накоплений:', error);
      throw error;
    }
  };

  const getStatistics = useCallback((startDate?: Date, endDate?: Date) => {
    const filteredTransactions = transactions.filter(transaction => {
      if (startDate && new Date(transaction.date) < startDate) return false;
      if (endDate && new Date(transaction.date) > endDate) return false;
      return true;
    });

    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expense };
  }, [transactions]);

  const resetAllData = async () => {
    try {
      console.log('🗑️ [DataContext] Начинаем полный сброс данных...');
      
      if (userId) {
        await LocalDatabaseService.clearAllData(defaultCurrency);
        await refreshData();
        
        console.log('✅ [DataContext] Все данные успешно сброшены');
      }
    } catch (error) {
      console.error('❌ [DataContext] Ошибка сброса данных:', error);
      throw error;
    }
  };

  const createDebt = async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('➕ [DataContext] Создаем новый долг:', debt.name);
      
      await LocalDatabaseService.createDebt(debt);
      await refreshData();
      
      console.log('✅ [DataContext] Долг успешно создан');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка создания долга:', error);
      throw error;
    }
  };

  const updateDebt = async (id: string, updates: Partial<Debt>) => {
    try {
      console.log('✏️ [DataContext] Обновляем долг:', id);
      
      await LocalDatabaseService.updateDebt(id, updates);
      await refreshData();
      
      console.log('✅ [DataContext] Долг успешно обновлен');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка обновления долга:', error);
      throw error;
    }
  };

  const deleteDebt = async (id: string) => {
    try {
      console.log('🗑️ [DataContext] Удаляем долг:', id);
      
      await LocalDatabaseService.deleteDebt(id);
      await refreshData();
      
      console.log('✅ [DataContext] Долг успешно удален');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка удаления долга:', error);
      throw error;
    }
  };

  const value: DataContextType = {
    accounts,
    transactions,
    categories,
    debts,
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