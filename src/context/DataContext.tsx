import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account, Transaction, Category, Debt } from '../types';
import { LocalDatabaseService } from '../services/localDatabase';
import { CloudSyncService } from '../services/cloudSync';
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
  const [debts, setDebts] = useState<Debt[]>([]);
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
      setDebts([]);
      setTotalBalance(0);
      stopAutoSync();
    }
    
    return () => {
      stopAutoSync();
    };
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
        }
        
        console.log('📊 [DataContext] Обновляем данные из базы...');
        await refreshData();
        
        // Проверяем есть ли данные в облаке
        const isGuest = await AsyncStorage.getItem('isGuest');
        console.log('👤 [DataContext] isGuest:', isGuest);
        
        if (isGuest !== 'true') {
          console.log('☁️ [DataContext] Пользователь не гость, пытаемся загрузить данные из облака...');
          let token = await ApiService.getAccessToken();
          console.log('🔑 [DataContext] Access token при инициализации:', token ? 'Есть' : 'Нет');
          
          // Если токена нет, пытаемся обновить
          if (!token) {
            console.log('🔄 [DataContext] Токен отсутствует при инициализации, пытаемся обновить...');
            const refreshToken = await ApiService.getRefreshToken();
            console.log('🔄 [DataContext] Refresh token при инициализации:', refreshToken ? 'Есть' : 'Нет');
            
            if (refreshToken) {
              const newTokens = await AuthService.refreshToken(refreshToken);
              if (newTokens) {
                token = newTokens.accessToken;
                console.log('✅ [DataContext] Токен обновлен при инициализации');
              }
            }
          }
          
          if (token) {
            console.log('☁️ [DataContext] Пытаемся загрузить данные из облака...');
            // Пытаемся загрузить данные из облака при первом входе
            const hasCloudData = await CloudSyncService.downloadData(userId, token);
            console.log('☁️ [DataContext] Результат загрузки из облака:', hasCloudData ? 'Успешно' : 'Неудачно');
            
            if (hasCloudData) {
              console.log('📊 [DataContext] Данные загружены из облака, обновляем локальные данные...');
              await refreshData();
            } else {
              console.log('⚠️ [DataContext] Не удалось загрузить данные из облака');
            }
          } else {
            console.log('❌ [DataContext] Нет токена для загрузки данных из облака');
          }
        } else {
          console.log('👤 [DataContext] Гостевой режим, пропускаем загрузку из облака');
        }
        
        // Получаем время последней синхронизации
        const syncTime = await LocalDatabaseService.getLastSyncTime();
        console.log('⏰ [DataContext] Время последней синхронизации:', syncTime);
        setLastSyncTime(syncTime);
      } else {
        console.log('❌ [DataContext] userId отсутствует, инициализация пропущена');
      }
      
      console.log('✅ [DataContext] Инициализация приложения завершена');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка инициализации данных:', error);
      // Если база данных не инициализирована, пробуем инициализировать заново
      if (error instanceof Error && error.message.includes('База данных не инициализирована')) {
        try {
          console.log('🔄 [DataContext] Пытаемся переинициализировать базу данных...');
          await LocalDatabaseService.forceReinitialize(defaultCurrency);
          await refreshData();
        } catch (initError) {
          console.error('❌ [DataContext] Не удалось переинициализировать базу данных:', initError);
        }
      }
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
      let token = await ApiService.getAccessToken();
      
      // Если токена нет, пытаемся обновить
      if (!token) {
        console.log('[DataContext] Токен отсутствует, пытаемся обновить...');
        const refreshToken = await ApiService.getRefreshToken();
        if (refreshToken) {
          const newTokens = await AuthService.refreshToken(refreshToken);
          if (newTokens) {
            console.log('[DataContext] Токен обновлен после ошибки 401');
            // Повторяем синхронизацию с новым токеном
            const success = await CloudSyncService.syncData(userId, newTokens.accessToken);
            if (success) {
              const syncTime = await LocalDatabaseService.getLastSyncTime();
              setLastSyncTime(syncTime);
              return; // Успешно обновили токен и синхронизировали
            }
          }
        }
      }
      
      if (token) {
        const success = await CloudSyncService.syncData(userId, token);
        if (success) {
          const syncTime = await LocalDatabaseService.getLastSyncTime();
          setLastSyncTime(syncTime);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      // Если ошибка 401, пытаемся обновить токен
      if (error instanceof Error && error.message.includes('401')) {
        console.log('[DataContext] Ошибка 401, пытаемся обновить токен...');
        try {
          const refreshToken = await ApiService.getRefreshToken();
          if (refreshToken) {
            const newTokens = await AuthService.refreshToken(refreshToken);
            if (newTokens) {
              console.log('[DataContext] Токен обновлен после ошибки 401');
              // Повторяем синхронизацию с новым токеном
              const success = await CloudSyncService.syncData(userId, newTokens.accessToken);
              if (success) {
                const syncTime = await LocalDatabaseService.getLastSyncTime();
                setLastSyncTime(syncTime);
                return; // Успешно обновили токен и синхронизировали
              }
            }
          }
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
        }
        // Если не удалось обновить токен, пробрасываем ошибку дальше
        throw error;
      }
      // Для других ошибок тоже пробрасываем
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshData = async () => {
    console.log('📊 [DataContext] RefreshData called...');
    
    try {
      // Проверяем готовность базы данных
      const isDatabaseReady = LocalDatabaseService.isDatabaseReady();
      console.log('🗄️ [DataContext] Проверка готовности базы данных в refreshData:', isDatabaseReady);
      
      if (!isDatabaseReady) {
        console.log('⚠️ [DataContext] База данных не готова, работаем в fallback режиме...');
        
        // Пытаемся загрузить данные из fallback хранилища
        const fallbackData = await CloudSyncService.getFallbackData();
        if (fallbackData) {
          console.log('📊 [DataContext] Загружаем данные из fallback хранилища...');
          
          // Обновляем данные из fallback
          const fallbackAccounts = fallbackData.accounts || [];
          const fallbackTransactions = fallbackData.transactions || [];
          const fallbackCategories = fallbackData.categories || [];
          const fallbackDebts = fallbackData.debts || [];
          
          setAccounts(fallbackAccounts);
          setTransactions(fallbackTransactions);
          setCategories(fallbackCategories);
          setDebts(fallbackDebts);
          
          console.log('📊 [DataContext] Данные из fallback хранилища:');
          console.log('  - Счета:', fallbackAccounts.length);
          console.log('  - Транзакции:', fallbackTransactions.length);
          console.log('  - Категории:', fallbackCategories.length);
          console.log('  - Долги:', fallbackDebts.length);
          
          // Вычисляем общий баланс
          const total = fallbackAccounts
            .filter(account => account.isIncludedInTotal !== false)
            .reduce((sum, account) => {
              let balance = account.balance;
              // Если валюта счета отличается от основной и есть курс обмена
              if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
                balance = account.balance * (account as any).exchangeRate;
              }
              return sum + balance;
            }, 0);
          
          setTotalBalance(total);
          console.log('💰 [DataContext] Общий баланс из fallback:', total);
          console.log('✅ [DataContext] Данные загружены из fallback хранилища');
        } else {
          console.log('❌ [DataContext] Нет данных в fallback хранилище');
          console.log('📊 [DataContext] Текущие данные в состоянии:');
          console.log('  - Счета:', accounts.length);
          console.log('  - Транзакции:', transactions.length);
          console.log('  - Категории:', categories.length);
          console.log('  - Долги:', debts.length);
        }
        
        console.log('✅ [DataContext] RefreshData завершен в fallback режиме');
        return;
      }
      
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
      
      // Вычисляем общий баланс
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
      console.error('❌ [DataContext] Ошибка в refreshData:', error);
      console.log('⚠️ [DataContext] Переключаемся в fallback режим из-за ошибки...');
    }
  };

  // Методы для работы со счетами
  const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Проверяем готовность базы данных
      if (!LocalDatabaseService.isDatabaseReady()) {
        console.log('[DataContext] База данных не готова, работаем в fallback режиме...');
        
        // Создаем счет только в локальном состоянии
        const newAccount: Account = {
          ...account,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setAccounts(prev => [newAccount, ...prev]);
        
        // Обновляем общий баланс
        if (newAccount.isIncludedInTotal !== false) {
          let balanceToAdd = newAccount.balance;
          if (newAccount.currency && newAccount.currency !== defaultCurrency && 'exchangeRate' in newAccount && (newAccount as any).exchangeRate) {
            balanceToAdd = newAccount.balance * (newAccount as any).exchangeRate;
          }
          setTotalBalance(prev => prev + balanceToAdd);
        }
        
        console.log('[DataContext] Счет создан в fallback режиме:', newAccount);
        
        // Пытаемся сохранить в SQLite, если база данных стала доступна
        try {
          if (LocalDatabaseService.isDatabaseReady()) {
            console.log('[DataContext] База данных стала доступна, сохраняем счет в SQLite...');
            await LocalDatabaseService.createAccount(account);
            console.log('[DataContext] Счет сохранен в SQLite');
          }
        } catch (dbError) {
          console.log('[DataContext] Не удалось сохранить в SQLite:', dbError instanceof Error ? dbError.message : String(dbError));
        }
        
        return;
      }
      
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
      
      // Мгновенная синхронизация с backend
      await syncData();
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      const oldAccount = accounts.find(acc => acc.id === id);
      if (!oldAccount) return;
      
      console.log(`Updating account ${id} with:`, updates);
      
      await LocalDatabaseService.updateAccount(id, updates);
      setAccounts(prev => prev.map(acc => 
        acc.id === id ? { ...acc, ...updates } : acc
      ));
      
      // Обновляем общий баланс если изменился баланс, курс обмена или включение в общий баланс
      if (updates.balance !== undefined || updates.isIncludedInTotal !== undefined || 'exchangeRate' in updates) {
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
      
      // Мгновенная синхронизация с backend
      await syncData();
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
      
      // Мгновенная синхронизация с backend
      await syncData();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  // Методы для работы с транзакциями
  const createTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Проверяем готовность базы данных
      if (!LocalDatabaseService.isDatabaseReady()) {
        console.log('[DataContext] База данных не готова, создаем транзакцию в fallback режиме...');
        
        // Создаем транзакцию только в локальном состоянии
        const newTransaction: Transaction = {
          ...transaction,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
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
          
          // Обновляем общий баланс
          if (account.isIncludedInTotal !== false) {
            let balanceChangeConverted = balanceChange;
            if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
              balanceChangeConverted = balanceChange * (account as any).exchangeRate;
            }
            setTotalBalance(prev => prev + balanceChangeConverted);
          }
        }
        
        console.log('[DataContext] Транзакция создана в fallback режиме:', newTransaction);
        return;
      }
      
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
        
        // Обновляем общий баланс
        if (account.isIncludedInTotal !== false) {
          let balanceChangeConverted = balanceChange;
          if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
            balanceChangeConverted = balanceChange * (account as any).exchangeRate;
          }
          setTotalBalance(prev => prev + balanceChangeConverted);
        }
      }
      
      // Мгновенная синхронизация с backend
      await syncData();
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
      
      // Мгновенная синхронизация с backend
      await syncData();
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
      
      // Мгновенная синхронизация с backend
      await syncData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  // Методы для работы с категориями
  const createCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const newCategory = await LocalDatabaseService.createCategory(category);
      setCategories(prev => [newCategory, ...prev]);
      
      // Мгновенная синхронизация с backend
      await syncData();
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
      
      // Мгновенная синхронизация с backend
      await syncData();
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
        const fallbackCategory = categories.find(cat =>
          cat.type === deletedCategory.type && cat.name.toLowerCase() === 'другое'
        );
      
        if (!fallbackCategory) {
          throw new Error('Резервная категория "Другое" не найдена');
        }
      
        setTransactions(prev => prev.map(trans =>
          trans.categoryId === id ? { ...trans, categoryId: fallbackCategory.id } : trans
        ));
      }        
      
      // Мгновенная синхронизация с backend
      await syncData();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  // Пополнение накоплений
  const addToSavings = async (savingsId: string, amount: number) => {
    try {
      const savingsAccount = accounts.find(acc => acc.id === savingsId);
      if (!savingsAccount) throw new Error('Savings account not found');
      
      // Обновляем баланс накопительного счета
      await LocalDatabaseService.updateAccount(savingsId, {
        savedAmount: (savingsAccount.savedAmount || 0) + amount
      });
      
      // Обновляем локальное состояние
      setAccounts(prev => prev.map(acc => 
        acc.id === savingsId 
          ? { ...acc, savedAmount: (acc.savedAmount || 0) + amount }
          : acc
      ));
      
      // Мгновенная синхронизация с backend
      await syncData();
    } catch (error) {
      console.error('Error adding to savings:', error);
      throw error;
    }
  };
  
  // Снятие с накоплений
  const withdrawFromSavings = async (savingsId: string, amount: number) => {
    try {
      const savingsAccount = accounts.find(acc => acc.id === savingsId);
      if (!savingsAccount) throw new Error('Savings account not found');
      
      const currentSavedAmount = savingsAccount.savedAmount || 0;
      if (currentSavedAmount < amount) {
        throw new Error('Insufficient savings amount');
      }
      
      // Обновляем баланс накопительного счета
      await LocalDatabaseService.updateAccount(savingsId, {
        savedAmount: currentSavedAmount - amount
      });
      
      // Обновляем локальное состояние
      setAccounts(prev => prev.map(acc => 
        acc.id === savingsId 
          ? { ...acc, savedAmount: currentSavedAmount - amount }
          : acc
      ));
      
      // Мгновенная синхронизация с backend
      await syncData();
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

  const createDebt = async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newDebt = await LocalDatabaseService.createDebt(debt);
      setDebts(prev => [newDebt, ...prev]);
      
      // Мгновенная синхронизация с backend
      await syncData();
    } catch (error) {
      console.error('Error creating debt:', error);
      throw error;
    }
  };

  const updateDebt = async (id: string, updates: Partial<Debt>) => {
    try {
      await LocalDatabaseService.updateDebt(id, updates);
      setDebts(prev => prev.map(debt => 
        debt.id === id ? { ...debt, ...updates } : debt
      ));
      
      // Мгновенная синхронизация с backend
      await syncData();
    } catch (error) {
      console.error('Error updating debt:', error);
      throw error;
    }
  };

  const deleteDebt = async (id: string) => {
    try {
      await LocalDatabaseService.deleteDebt(id);
      setDebts(prev => prev.filter(debt => debt.id !== id));
      
      // Мгновенная синхронизация с backend
      await syncData();
    } catch (error) {
      console.error('Error deleting debt:', error);
      throw error;
    }
  };

  return (
    <DataContext.Provider
      value={{
        accounts,
        transactions,
        categories,
        debts,
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
        createDebt,
        updateDebt,
        deleteDebt,
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