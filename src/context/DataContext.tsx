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
          
          // Дополнительная проверка после переинициализации
          if (!LocalDatabaseService.isDatabaseReady()) {
            console.error('❌ [DataContext] База данных все еще не готова после переинициализации');
            throw new Error('База данных не может быть инициализирована');
          }
        }
        
        console.log('✅ [DataContext] База данных успешно инициализирована и готова к работе');
        
        // Очищаем fallback данные, так как база данных работает
        try {
          await AsyncStorage.removeItem('fallback_cloud_data');
          console.log('🧹 [DataContext] Fallback данные очищены при инициализации');
        } catch (clearError) {
          console.log('⚠️ [DataContext] Не удалось очистить fallback данные при инициализации:', clearError);
        }
        
        console.log('📊 [DataContext] Обновляем данные из базы...');
        await refreshData();
        
        // Проверяем есть ли данные в облаке
        const isGuest = await AsyncStorage.getItem('isGuest');
        console.log('👤 [DataContext] isGuest:', isGuest);
        
        // Проверяем, был ли выполнен сброс данных
        const wasDataReset = await AsyncStorage.getItem(`dataReset_${userId}`);
        console.log('🔄 [DataContext] Флаг сброса данных:', wasDataReset);
        
        if (isGuest !== 'true' && !wasDataReset) {
          console.log('☁️ [DataContext] Пользователь не гость и данные не сбрасывались, пытаемся загрузить данные из облака...');
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
            console.log('☁️ [DataContext] Начинаем правильную синхронизацию...');
            
            // Проверяем, есть ли данные в локальной базе (кроме базовых)
            const [accountsFromDb, transactionsFromDb, categoriesFromDb, debtsFromDb] = await Promise.all([
              LocalDatabaseService.getAccounts(),
              LocalDatabaseService.getTransactions(),
              LocalDatabaseService.getCategories(),
              LocalDatabaseService.getDebts()
            ]);
            
            const hasLocalData = accountsFromDb.length > 1 || // Больше 1 (счет "Наличные" остается)
                                transactionsFromDb.length > 0 ||
                                categoriesFromDb.length > 11 || // Больше 11 (базовые категории)
                                debtsFromDb.length > 0;
            
            if (hasLocalData) {
              console.log('📊 [DataContext] Обнаружены локальные данные, используем стандартную синхронизацию');
              // ПРАВИЛЬНЫЙ ПОРЯДОК: сначала отправляем локальные изменения, потом загружаем с сервера
              console.log('📤 [DataContext] 1. Отправляем локальные изменения на сервер...');
              const syncSuccess = await CloudSyncService.syncData(userId, token);
              console.log('📤 [DataContext] Результат отправки:', syncSuccess ? 'Успешно' : 'Неудачно');
              
              console.log('📥 [DataContext] 2. Загружаем обновленные данные с сервера...');
              const hasCloudData = await CloudSyncService.downloadData(userId, token);
              console.log('📥 [DataContext] Результат загрузки:', hasCloudData ? 'Успешно' : 'Неудачно');
              
              if (hasCloudData) {
                console.log('📊 [DataContext] Данные загружены с сервера, обновляем локальные данные...');
                await refreshData();
              } else {
                console.log('⚠️ [DataContext] Не удалось загрузить данные с сервера');
              }
            } else {
              console.log('📊 [DataContext] Локальная база пустая (перезаход в аккаунт), сначала загружаем с сервера');
              // ПРИ ПЕРЕЗАХОДЕ: сначала загружаем с сервера, потом синхронизируем
              console.log('📥 [DataContext] 1. Загружаем данные с сервера...');
              const hasCloudData = await CloudSyncService.downloadData(userId, token);
              console.log('📥 [DataContext] Результат загрузки:', hasCloudData ? 'Успешно' : 'Неудачно');
              
              if (hasCloudData) {
                console.log('📊 [DataContext] Данные загружены с сервера, обновляем локальные данные...');
                await refreshData();
              } else {
                console.log('⚠️ [DataContext] Не удалось загрузить данные с сервера');
              }
              
              // После загрузки данных с сервера синхронизируем локальные изменения (если есть)
              console.log('📤 [DataContext] 2. Синхронизируем локальные изменения (если есть)...');
              const syncSuccess = await CloudSyncService.syncData(userId, token);
              console.log('📤 [DataContext] Результат синхронизации:', syncSuccess ? 'Успешно' : 'Неудачно');
            }
          } else {
            console.log('❌ [DataContext] Нет токена для синхронизации');
          }
        } else if (wasDataReset) {
          console.log('🔄 [DataContext] Данные были сброшены, проверяем локальную базу...');
          
          // Проверяем, есть ли старые данные в локальной базе
          const [accountsFromDb, transactionsFromDb, categoriesFromDb, debtsFromDb] = await Promise.all([
            LocalDatabaseService.getAccounts(),
            LocalDatabaseService.getTransactions(),
            LocalDatabaseService.getCategories(),
            LocalDatabaseService.getDebts()
          ]);
          
          const hasOldData = accountsFromDb.length > 1 || // Больше 1 (счет "Наличные" остается)
                            transactionsFromDb.length > 0 ||
                            categoriesFromDb.length > 11 || // Больше 11 (базовые категории)
                            debtsFromDb.length > 0;
          
          if (hasOldData) {
            console.log('🧹 [DataContext] Обнаружены старые данные в локальной базе, очищаем...');
            console.log('  - Счета:', accountsFromDb.length);
            console.log('  - Транзакции:', transactionsFromDb.length);
            console.log('  - Категории:', categoriesFromDb.length);
            console.log('  - Долги:', debtsFromDb.length);
            
            // Полностью очищаем локальную базу
            await LocalDatabaseService.clearAllData(defaultCurrency);
            console.log('✅ [DataContext] Локальная база полностью очищена');
            
            // Обновляем данные из очищенной базы
            await refreshData();
          } else {
            console.log('✅ [DataContext] Локальная база уже чистая');
          }
          
          // Очищаем флаг сброса данных только после полной очистки
          await AsyncStorage.removeItem(`dataReset_${userId}`);
          console.log('🧹 [DataContext] Флаг сброса данных очищен');
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
    
    // Проверяем, был ли выполнен сброс данных
    const wasDataReset = await AsyncStorage.getItem(`dataReset_${userId}`);
    if (wasDataReset) {
      console.log('🔄 [DataContext] Автосинхронизация отключена - данные были сброшены');
      return;
    }
    
    // Дополнительная проверка: если есть старые данные после сброса, не запускаем автосинхронизацию
    try {
      const [accountsFromDb, transactionsFromDb] = await Promise.all([
        LocalDatabaseService.getAccounts(),
        LocalDatabaseService.getTransactions()
      ]);
      
      const hasOldData = accountsFromDb.length > 1 || transactionsFromDb.length > 0;
      if (hasOldData && wasDataReset) {
        console.log('🔄 [DataContext] Автосинхронизация отключена - обнаружены старые данные после сброса');
        return;
      }
    } catch (error) {
      console.log('⚠️ [DataContext] Не удалось проверить локальные данные в startAutoSync:', error);
    }
    
    // ОТКЛЮЧАЕМ автоматическую синхронизацию каждые 5 минут
    // Теперь синхронизация происходит только мгновенно после каждого действия
    console.log('🔄 [DataContext] Автоматическая синхронизация отключена - используется мгновенная синхронизация');
    
    // const interval = setInterval(() => {
    //   syncData();
    // }, 5 * 60 * 1000);
    // setSyncInterval(interval);
  };

  const stopAutoSync = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      setSyncInterval(null);
    }
  };

  // Функция для мгновенной синхронизации с логированием
  const instantSync = async (action: string) => {
    try {
      console.log(`🔄 [DataContext] Мгновенная синхронизация после ${action}...`);
      console.log(`📊 [DataContext] Текущее состояние данных:`);
      console.log(`   - Счета: ${accounts.length}`);
      console.log(`   - Транзакции: ${transactions.length}`);
      console.log(`   - Категории: ${categories.length}`);
      console.log(`   - Долги: ${debts.length}`);
      
      await syncData();
      console.log(`✅ [DataContext] ${action} завершено и синхронизировано`);
    } catch (error) {
      console.error(`❌ [DataContext] Ошибка синхронизации после ${action}:`, error);
      console.log(`⚠️ [DataContext] Детали ошибки:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };

  const syncData = async () => {
    console.log('🔄 [DataContext] Начинаем синхронизацию данных...');
    console.log('👤 [DataContext] userId:', userId);
    console.log('🔄 [DataContext] isSyncing:', isSyncing);
    
    if (!userId || isSyncing) {
      console.log('⚠️ [DataContext] Синхронизация пропущена - нет userId или уже синхронизируемся');
      return;
    }
    
    const isGuest = await AsyncStorage.getItem('isGuest');
    console.log('👤 [DataContext] isGuest:', isGuest);
    if (isGuest === 'true') {
      console.log('⚠️ [DataContext] Синхронизация пропущена - пользователь гость');
      return;
    }
    
    // Проверяем, был ли выполнен сброс данных
    const wasDataReset = await AsyncStorage.getItem(`dataReset_${userId}`);
    console.log('🔄 [DataContext] Флаг сброса данных:', wasDataReset);
    if (wasDataReset) {
      console.log('🔄 [DataContext] Синхронизация пропущена - данные были сброшены');
      return;
    }
    
    // Дополнительная проверка: если есть старые данные после сброса, не синхронизируем
    console.log('🔍 [DataContext] Проверяем локальные данные...');
    try {
      const [accountsFromDb, transactionsFromDb] = await Promise.all([
        LocalDatabaseService.getAccounts(),
        LocalDatabaseService.getTransactions()
      ]);
      
      console.log('📊 [DataContext] Данные из локальной базы:');
      console.log('   - Счета:', accountsFromDb.length);
      console.log('   - Транзакции:', transactionsFromDb.length);
      
      // Проверяем также данные в состоянии React (fallback режим)
      console.log('📊 [DataContext] Данные в состоянии React:');
      console.log('   - Счета:', accounts.length);
      console.log('   - Транзакции:', transactions.length);
      
      const hasOldData = accountsFromDb.length > 1 || transactionsFromDb.length > 0;
      const hasFallbackData = accounts.length > 0 || transactions.length > 0;
      
      console.log('🔍 [DataContext] hasOldData:', hasOldData, 'hasFallbackData:', hasFallbackData);
      
      if (hasOldData && wasDataReset) {
        console.log('🔄 [DataContext] Синхронизация пропущена - обнаружены старые данные после сброса');
        return;
      }
      
      // Если есть данные в fallback режиме, сохраняем их перед синхронизацией
      if (hasFallbackData && !hasOldData) {
        console.log('💾 [DataContext] Сохраняем fallback данные перед синхронизацией...');
        try {
          const fallbackData = {
            accounts: accounts,
            transactions: transactions,
            categories: categories,
            debts: debts,
            exchangeRates: [],
            lastSyncAt: new Date().toISOString(),
            userId: userId || ''
          };
          await AsyncStorage.setItem('fallback_cloud_data', JSON.stringify(fallbackData));
          console.log('✅ [DataContext] Fallback данные сохранены');
        } catch (fallbackError) {
          console.error('❌ [DataContext] Ошибка сохранения fallback данных:', fallbackError);
        }
      }
    } catch (error) {
      console.log('⚠️ [DataContext] Не удалось проверить локальные данные:', error);
    }
    
    console.log('🔄 [DataContext] Устанавливаем флаг синхронизации...');
    setIsSyncing(true);
    
    try {
      console.log('🔑 [DataContext] Получаем токен доступа...');
      let token = await ApiService.getAccessToken();
      console.log('🔑 [DataContext] Токен получен:', token ? 'Есть' : 'Нет');
      
      // Если токена нет, пытаемся обновить
      if (!token) {
        console.log('🔄 [DataContext] Токен отсутствует, пытаемся обновить...');
        const refreshToken = await ApiService.getRefreshToken();
        console.log('🔄 [DataContext] Refresh token:', refreshToken ? 'Есть' : 'Нет');
        
        if (refreshToken) {
          console.log('🔄 [DataContext] Обновляем токен через AuthService...');
          const newTokens = await AuthService.refreshToken(refreshToken);
          if (newTokens) {
            console.log('✅ [DataContext] Токен обновлен после ошибки 401');
            // Повторяем синхронизацию с новым токеном
            console.log('🔄 [DataContext] Повторяем синхронизацию с новым токеном...');
            const success = await CloudSyncService.syncData(userId, newTokens.accessToken);
            console.log('📤 [DataContext] Результат повторной синхронизации:', success ? 'Успешно' : 'Неудачно');
            
                          if (success) {
                const syncTime = await LocalDatabaseService.getLastSyncTime();
                setLastSyncTime(syncTime);
                console.log('✅ [DataContext] Синхронизация завершена успешно');
                return; // Успешно обновили токен и синхронизировали
              } else {
                console.log('❌ [DataContext] Повторная синхронизация не удалась');
                
                // Восстанавливаем данные из fallback
                console.log('🔄 [DataContext] Восстанавливаем данные из fallback после неудачной повторной синхронизации...');
                const fallbackData = await CloudSyncService.getFallbackData();
                if (fallbackData) {
                  console.log('📊 [DataContext] Восстанавливаем данные из fallback хранилища...');
                  setAccounts(fallbackData.accounts || []);
                  setTransactions(fallbackData.transactions || []);
                  setCategories(fallbackData.categories || []);
                  setDebts(fallbackData.debts || []);
                  
                  // Вычисляем общий баланс
                  const total = (fallbackData.accounts || [])
                    .filter(account => account.isIncludedInTotal !== false)
                    .reduce((sum, account) => {
                      let balance = account.balance;
                      if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
                        balance = account.balance * (account as any).exchangeRate;
                      }
                      return sum + balance;
                    }, 0);
                  
                  setTotalBalance(total);
                  console.log('✅ [DataContext] Данные восстановлены из fallback');
                }
              }
          } else {
            console.log('❌ [DataContext] Не удалось обновить токен');
          }
        } else {
          console.log('❌ [DataContext] Refresh token не найден');
        }
      }
      
      if (token) {
        console.log('🔄 [DataContext] Начинаем основную синхронизацию через CloudSyncService...');
        const success = await CloudSyncService.syncData(userId, token);
        console.log('📤 [DataContext] Результат основной синхронизации:', success ? 'Успешно' : 'Неудачно');
        
        if (success) {
          const syncTime = await LocalDatabaseService.getLastSyncTime();
          setLastSyncTime(syncTime);
          console.log('✅ [DataContext] Время синхронизации обновлено:', syncTime);
        } else {
          console.log('❌ [DataContext] Синхронизация не удалась');
          
          // Если синхронизация не удалась, восстанавливаем данные из fallback
          console.log('🔄 [DataContext] Восстанавливаем данные из fallback после неудачной синхронизации...');
          const fallbackData = await CloudSyncService.getFallbackData();
          if (fallbackData) {
            console.log('📊 [DataContext] Восстанавливаем данные из fallback хранилища...');
            setAccounts(fallbackData.accounts || []);
            setTransactions(fallbackData.transactions || []);
            setCategories(fallbackData.categories || []);
            setDebts(fallbackData.debts || []);
            
            // Вычисляем общий баланс
            const total = (fallbackData.accounts || [])
              .filter(account => account.isIncludedInTotal !== false)
              .reduce((sum, account) => {
                let balance = account.balance;
                if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
                  balance = account.balance * (account as any).exchangeRate;
                }
                return sum + balance;
              }, 0);
            
            setTotalBalance(total);
            console.log('✅ [DataContext] Данные восстановлены из fallback');
          }
        }
      } else {
        console.log('❌ [DataContext] Нет токена для синхронизации');
      }
    } catch (error) {
      console.error('❌ [DataContext] Ошибка синхронизации:', error);
      console.log('⚠️ [DataContext] Детали ошибки:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Если ошибка 401, пытаемся обновить токен
      if (error instanceof Error && error.message.includes('401')) {
        console.log('🔄 [DataContext] Ошибка 401, пытаемся обновить токен...');
        try {
          const refreshToken = await ApiService.getRefreshToken();
          console.log('🔄 [DataContext] Refresh token для обновления:', refreshToken ? 'Есть' : 'Нет');
          
          if (refreshToken) {
            console.log('🔄 [DataContext] Обновляем токен через AuthService...');
            const newTokens = await AuthService.refreshToken(refreshToken);
            if (newTokens) {
              console.log('✅ [DataContext] Токен обновлен после ошибки 401');
              // Повторяем синхронизацию с новым токеном
              console.log('🔄 [DataContext] Повторяем синхронизацию с новым токеном...');
              const success = await CloudSyncService.syncData(userId, newTokens.accessToken);
              console.log('📤 [DataContext] Результат повторной синхронизации:', success ? 'Успешно' : 'Неудачно');
              
              if (success) {
                const syncTime = await LocalDatabaseService.getLastSyncTime();
                setLastSyncTime(syncTime);
                console.log('✅ [DataContext] Синхронизация завершена успешно после обновления токена');
                return; // Успешно обновили токен и синхронизировали
              } else {
                console.log('❌ [DataContext] Синхронизация не удалась после обновления токена');
                
                // Восстанавливаем данные из fallback
                console.log('🔄 [DataContext] Восстанавливаем данные из fallback после неудачной синхронизации с обновленным токеном...');
                const fallbackData = await CloudSyncService.getFallbackData();
                if (fallbackData) {
                  console.log('📊 [DataContext] Восстанавливаем данные из fallback хранилища...');
                  setAccounts(fallbackData.accounts || []);
                  setTransactions(fallbackData.transactions || []);
                  setCategories(fallbackData.categories || []);
                  setDebts(fallbackData.debts || []);
                  
                  // Вычисляем общий баланс
                  const total = (fallbackData.accounts || [])
                    .filter(account => account.isIncludedInTotal !== false)
                    .reduce((sum, account) => {
                      let balance = account.balance;
                      if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
                        balance = account.balance * (account as any).exchangeRate;
                      }
                      return sum + balance;
                    }, 0);
                  
                  setTotalBalance(total);
                  console.log('✅ [DataContext] Данные восстановлены из fallback');
                }
              }
            } else {
              console.log('❌ [DataContext] Не удалось обновить токен');
            }
          } else {
            console.log('❌ [DataContext] Refresh token не найден для обновления');
          }
        } catch (refreshError) {
          console.error('❌ [DataContext] Ошибка при обновлении токена:', refreshError);
        }
        // Если не удалось обновить токен, пробрасываем ошибку дальше
        console.log('❌ [DataContext] Пробрасываем ошибку 401 дальше');
        throw error;
      }
      // Для других ошибок тоже пробрасываем
      console.log('❌ [DataContext] Пробрасываем ошибку дальше');
      throw error;
    } finally {
      console.log('🔄 [DataContext] Сбрасываем флаг синхронизации');
      setIsSyncing(false);
    }
  };

  const refreshData = async () => {
    console.log('📊 [DataContext] RefreshData called...');
    
    try {
      // Проверяем готовность базы данных
      let isDatabaseReady = LocalDatabaseService.isDatabaseReady();
      console.log('🗄️ [DataContext] Проверка готовности базы данных в refreshData:', isDatabaseReady);
      
      if (!isDatabaseReady) {
        console.log('⚠️ [DataContext] База данных не готова, пытаемся инициализировать...');
        
        try {
          // Пытаемся инициализировать базу данных
          await LocalDatabaseService.initDatabase(defaultCurrency);
          console.log('✅ [DataContext] База данных успешно инициализирована');
          isDatabaseReady = true;
          
          // Очищаем fallback данные, так как база данных теперь работает
          try {
            await AsyncStorage.removeItem('fallback_cloud_data');
            console.log('🧹 [DataContext] Fallback данные очищены - база данных работает');
          } catch (clearError) {
            console.log('⚠️ [DataContext] Не удалось очистить fallback данные:', clearError);
          }
        } catch (initError) {
          console.error('❌ [DataContext] Не удалось инициализировать базу данных:', initError);
          console.log('⚠️ [DataContext] Работаем в fallback режиме...');
          
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
            
            // Проверяем, есть ли данные в текущем состоянии React
            if (accounts.length > 0 || transactions.length > 0) {
              console.log('📊 [DataContext] Обнаружены данные в состоянии React, сохраняем в fallback...');
              
              try {
                const currentData = {
                  accounts: accounts,
                  transactions: transactions,
                  categories: categories,
                  debts: debts,
                  exchangeRates: [],
                  lastSyncAt: new Date().toISOString(),
                  userId: userId || ''
                };
                await AsyncStorage.setItem('fallback_cloud_data', JSON.stringify(currentData));
                console.log('💾 [DataContext] Текущие данные сохранены в fallback хранилище');
              } catch (fallbackError) {
                console.error('❌ [DataContext] Ошибка сохранения в fallback:', fallbackError);
              }
            }
            
            console.log('📊 [DataContext] Текущие данные в состоянии:');
            console.log('  - Счета:', accounts.length);
            console.log('  - Транзакции:', transactions.length);
            console.log('  - Категории:', categories.length);
            console.log('  - Долги:', debts.length);
          }
          
          console.log('✅ [DataContext] RefreshData завершен в fallback режиме');
          return;
        }
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
        console.log('[DataContext] База данных не готова, пытаемся инициализировать...');
        
        try {
          // Пытаемся инициализировать базу данных
          await LocalDatabaseService.initDatabase(defaultCurrency);
          console.log('[DataContext] База данных успешно инициализирована');
        } catch (initError) {
          console.error('[DataContext] Не удалось инициализировать базу данных:', initError);
          console.log('[DataContext] Работаем в fallback режиме...');
          
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
          
          // Сохраняем данные в fallback хранилище
          try {
            const fallbackData = {
              accounts: [newAccount, ...accounts],
              transactions: transactions,
              categories: categories,
              debts: debts,
              exchangeRates: [],
              lastSyncAt: new Date().toISOString(),
              userId: userId || ''
            };
            await AsyncStorage.setItem('fallback_cloud_data', JSON.stringify(fallbackData));
            console.log('💾 [DataContext] Данные сохранены в fallback хранилище');
          } catch (fallbackError) {
            console.error('❌ [DataContext] Ошибка сохранения в fallback:', fallbackError);
          }
          
          // Мгновенная синхронизация с backend
          console.log('🔄 [DataContext] Мгновенная синхронизация после создания счета...');
          await instantSync('создания счета');
          console.log('✅ [DataContext] Счет создан и синхронизирован');
          
          return;
        }
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
      await instantSync('создания счета');
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
      await instantSync('обновления счета');
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      console.log('🗑️ [DataContext] Начинаем удаление счёта с ID:', id);
      
      const accountToDelete = accounts.find(acc => acc.id === id);
      if (!accountToDelete) {
        console.log('❌ [DataContext] Счёт с ID', id, 'не найден в локальном состоянии');
        return;
      }
      
      console.log('📋 [DataContext] Найден счёт для удаления:', {
        id: accountToDelete.id,
        name: accountToDelete.name,
        balance: accountToDelete.balance,
        type: accountToDelete.type
      });
      
      // Сначала удаляем с сервера
      console.log('🌐 [DataContext] Пытаемся удалить счёт с сервера...');
      try {
        const token = await ApiService.getAccessToken();
        if (token) {
          console.log('🔑 [DataContext] Токен получен, отправляем DELETE запрос на сервер...');
          await ApiService.delete(`/accounts/${id}`);
          console.log('✅ [DataContext] Счёт успешно удалён с сервера');
        } else {
          console.log('⚠️ [DataContext] Токен не найден, пропускаем удаление с сервера');
        }
      } catch (serverError) {
        console.error('❌ [DataContext] Ошибка удаления счёта с сервера:', serverError);
        console.log('⚠️ [DataContext] Продолжаем с локальным удалением даже если сервер недоступен');
      }
      
      // Затем удаляем локально
      console.log('📱 [DataContext] Удаляем счёт из локальной базы данных...');
      await LocalDatabaseService.deleteAccount(id);
      console.log('✅ [DataContext] Счёт удалён из локальной базы данных');
      
      // Обновляем состояние
      console.log('🔄 [DataContext] Обновляем локальное состояние...');
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      setTransactions(prev => prev.filter(trans => trans.accountId !== id));
      console.log('✅ [DataContext] Локальное состояние обновлено');
      
      // Обновляем общий баланс если счет был включен в него
      if (accountToDelete.isIncludedInTotal !== false) {
        console.log('💰 [DataContext] Обновляем общий баланс...');
        let balanceToRemove = accountToDelete.balance;
        // Конвертируем баланс если валюта отличается от основной
        if (accountToDelete.currency && accountToDelete.currency !== defaultCurrency && 'exchangeRate' in accountToDelete && (accountToDelete as any).exchangeRate) {
          balanceToRemove = accountToDelete.balance * (accountToDelete as any).exchangeRate;
          console.log('💱 [DataContext] Конвертированный баланс для удаления:', balanceToRemove);
        }
        setTotalBalance(prev => prev - balanceToRemove);
        console.log('✅ [DataContext] Общий баланс обновлён');
      }
      
      console.log('✅ [DataContext] Счёт успешно удалён локально и с сервера');
    } catch (error) {
      console.error('❌ [DataContext] Критическая ошибка при удалении счёта:', error);
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
      await instantSync('создания транзакции');
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
      await instantSync('обновления транзакции');
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      console.log('🗑️ [DataContext] Начинаем удаление транзакции с ID:', id);
      
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) {
        console.log('❌ [DataContext] Транзакция с ID', id, 'не найдена в локальном состоянии');
        return;
      }
      
      console.log('📋 [DataContext] Найдена транзакция для удаления:', {
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        accountId: transaction.accountId,
        description: transaction.description
      });
      
      // Сначала удаляем с сервера
      console.log('🌐 [DataContext] Пытаемся удалить транзакцию с сервера...');
      try {
        const token = await ApiService.getAccessToken();
        if (token) {
          console.log('🔑 [DataContext] Токен получен, отправляем DELETE запрос на сервер...');
          await ApiService.delete(`/transactions/${id}`);
          console.log('✅ [DataContext] Транзакция успешно удалена с сервера');
        } else {
          console.log('⚠️ [DataContext] Токен не найден, пропускаем удаление с сервера');
        }
      } catch (serverError) {
        console.error('❌ [DataContext] Ошибка удаления транзакции с сервера:', serverError);
        console.log('⚠️ [DataContext] Продолжаем с локальным удалением даже если сервер недоступен');
      }
      
      // Затем удаляем локально
      console.log('📱 [DataContext] Удаляем транзакцию из локальной базы данных...');
      await LocalDatabaseService.deleteTransaction(transaction);
      console.log('✅ [DataContext] Транзакция удалена из локальной базы данных');
      
      // Удаляем транзакцию из состояния
      console.log('🔄 [DataContext] Обновляем локальное состояние...');
      setTransactions(prev => prev.filter(trans => trans.id !== id));
      console.log('✅ [DataContext] Транзакция удалена из локального состояния');
      
      // Обновляем баланс счета
      const account = accounts.find(acc => acc.id === transaction.accountId);
      if (account) {
        console.log('💰 [DataContext] Обновляем баланс счёта:', account.name);
        const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
        console.log('📊 [DataContext] Изменение баланса:', balanceChange, '(тип транзакции:', transaction.type, ')');
        
        setAccounts(prev => prev.map(acc => 
          acc.id === transaction.accountId 
            ? { ...acc, balance: acc.balance + balanceChange }
            : acc
        ));
        console.log('✅ [DataContext] Баланс счёта обновлён');
        
        // Обновляем общий баланс если счет включен в него
        if (account.isIncludedInTotal !== false) {
          console.log('💰 [DataContext] Обновляем общий баланс...');
          let convertedBalanceChange = balanceChange;
          // Конвертируем изменение баланса если валюта счета отличается от основной
          if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
            convertedBalanceChange = balanceChange * (account as any).exchangeRate;
            console.log('💱 [DataContext] Конвертированное изменение баланса:', convertedBalanceChange);
          }
          setTotalBalance(prev => prev + convertedBalanceChange);
          console.log('✅ [DataContext] Общий баланс обновлён');
        }
      } else {
        console.log('⚠️ [DataContext] Счёт для транзакции не найден, пропускаем обновление баланса');
      }
      
      console.log('✅ [DataContext] Транзакция успешно удалена локально и с сервера');
    } catch (error) {
      console.error('❌ [DataContext] Критическая ошибка при удалении транзакции:', error);
      throw error;
    }
  };

  // Методы для работы с категориями
  const createCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const newCategory = await LocalDatabaseService.createCategory(category);
      setCategories(prev => [newCategory, ...prev]);
      
      // Мгновенная синхронизация с backend
      await instantSync('создания категории');
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
      await instantSync('обновления категории');
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      console.log('🗑️ [DataContext] Начинаем удаление категории с ID:', id);
      
      // Проверяем, что это не базовая категория "Другое"
      if (id === 'other_income' || id === 'other_expense') {
        console.log('❌ [DataContext] Попытка удалить базовую категорию:', id);
        throw new Error('Нельзя удалить базовую категорию');
      }
      
      const categoryToDelete = categories.find(cat => cat.id === id);
      if (!categoryToDelete) {
        console.log('❌ [DataContext] Категория с ID', id, 'не найдена в локальном состоянии');
        return;
      }
      
      console.log('📋 [DataContext] Найдена категория для удаления:', {
        id: categoryToDelete.id,
        name: categoryToDelete.name,
        type: categoryToDelete.type
      });
      
      // Сначала удаляем с сервера
      console.log('🌐 [DataContext] Пытаемся удалить категорию с сервера...');
      try {
        const token = await ApiService.getAccessToken();
        if (token) {
          console.log('🔑 [DataContext] Токен получен, отправляем DELETE запрос на сервер...');
          await ApiService.delete(`/categories/${id}`);
          console.log('✅ [DataContext] Категория успешно удалена с сервера');
        } else {
          console.log('⚠️ [DataContext] Токен не найден, пропускаем удаление с сервера');
        }
      } catch (serverError) {
        console.error('❌ [DataContext] Ошибка удаления категории с сервера:', serverError);
        console.log('⚠️ [DataContext] Продолжаем с локальным удалением даже если сервер недоступен');
      }
      
      // Затем удаляем локально
      console.log('📱 [DataContext] Удаляем категорию из локальной базы данных...');
      await LocalDatabaseService.deleteCategory(id);
      console.log('✅ [DataContext] Категория удалена из локальной базы данных');
      
      // Обновляем состояние
      console.log('🔄 [DataContext] Обновляем локальное состояние...');
      setCategories(prev => prev.filter(cat => cat.id !== id));
      console.log('✅ [DataContext] Категория удалена из локального состояния');
      
      // Обновляем транзакции в состоянии
      console.log('🔄 [DataContext] Обновляем транзакции с удалённой категорией...');
      const deletedCategory = categories.find(cat => cat.id === id);
      if (deletedCategory) {
        const fallbackCategory = categories.find(cat =>
          cat.type === deletedCategory.type && cat.name.toLowerCase() === 'другое'
        );
      
        if (!fallbackCategory) {
          console.log('❌ [DataContext] Резервная категория "Другое" не найдена');
          throw new Error('Резервная категория "Другое" не найдена');
        }
      
        console.log('🔄 [DataContext] Переназначаем транзакции на категорию "Другое":', fallbackCategory.name);
        setTransactions(prev => prev.map(trans =>
          trans.categoryId === id ? { ...trans, categoryId: fallbackCategory.id } : trans
        ));
        console.log('✅ [DataContext] Транзакции обновлены');
      } else {
        console.log('⚠️ [DataContext] Удалённая категория не найдена в состоянии, пропускаем обновление транзакций');
      }
      
      console.log('✅ [DataContext] Категория успешно удалена локально и с сервера');
    } catch (error) {
      console.error('❌ [DataContext] Критическая ошибка при удалении категории:', error);
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
      await instantSync('добавления накопления');
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
      await instantSync('снятия с накопления');
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
      
      console.log('🔄 [DataContext] Начинаем сброс всех данных...');
      
      // 1. Сбрасываем данные на сервере используя новый CloudSyncService
      let serverResetSuccess = false;
      try {
        const token = await AsyncStorage.getItem('@cashcraft_access_token');
        if (token) {
          console.log('🌐 [DataContext] Отправляем запрос на сброс данных через CloudSyncService...');
          serverResetSuccess = await CloudSyncService.wipeData(userId, token);
          
          if (serverResetSuccess) {
            console.log('✅ [DataContext] Данные на сервере успешно сброшены через CloudSyncService');
          } else {
            console.warn('⚠️ [DataContext] Не удалось сбросить данные на сервере через CloudSyncService');
          }
        }
      } catch (serverError) {
        console.warn('⚠️ [DataContext] Ошибка при сбросе данных на сервере:', serverError);
      }
      
      // 2. Очищаем локальные данные
      if (serverResetSuccess) {
        // Если серверный сброс успешен, используем clearAllData для полной очистки
        console.log('📱 [DataContext] Серверный сброс успешен, полностью очищаем локальную базу...');
        await LocalDatabaseService.clearAllData(defaultCurrency);
      } else {
        // Если серверный сброс не удался, используем обычный resetAllData
        console.log('📱 [DataContext] Серверный сброс не удался, используем обычный сброс...');
        await LocalDatabaseService.resetAllData(defaultCurrency);
      }
      
      // 3. Устанавливаем флаг сброса данных
      console.log('🏷️ [DataContext] Устанавливаем флаг сброса данных...');
      await AsyncStorage.setItem(`dataReset_${userId}`, 'true');
      
      // 4. Обновляем состояние приложения
      console.log('🔄 [DataContext] Обновляем состояние приложения...');
      await refreshData();
      
      console.log('✅ [DataContext] Сброс всех данных завершен успешно');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка при сбросе данных:', error);
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
      await instantSync('создания долга');
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
      await instantSync('обновления долга');
    } catch (error) {
      console.error('Error updating debt:', error);
      throw error;
    }
  };

  const deleteDebt = async (id: string) => {
    try {
      console.log('🗑️ [DataContext] Начинаем удаление долга с ID:', id);
      
      const debtToDelete = debts.find(debt => debt.id === id);
      if (!debtToDelete) {
        console.log('❌ [DataContext] Долг с ID', id, 'не найден в локальном состоянии');
        return;
      }
      
      console.log('📋 [DataContext] Найден долг для удаления:', {
        id: debtToDelete.id,
        name: debtToDelete.name,
        amount: debtToDelete.amount,
        type: debtToDelete.type
      });
      
      // Сначала удаляем с сервера
      console.log('🌐 [DataContext] Пытаемся удалить долг с сервера...');
      try {
        const token = await ApiService.getAccessToken();
        if (token) {
          console.log('🔑 [DataContext] Токен получен, отправляем DELETE запрос на сервер...');
          await ApiService.delete(`/debts/${id}`);
          console.log('✅ [DataContext] Долг успешно удален с сервера');
        } else {
          console.log('⚠️ [DataContext] Токен не найден, пропускаем удаление с сервера');
        }
      } catch (serverError) {
        console.error('❌ [DataContext] Ошибка удаления долга с сервера:', serverError);
        console.log('⚠️ [DataContext] Продолжаем с локальным удалением даже если сервер недоступен');
      }
      
      // Затем удаляем локально
      console.log('📱 [DataContext] Удаляем долг из локальной базы данных...');
      await LocalDatabaseService.deleteDebt(id);
      console.log('✅ [DataContext] Долг удален из локальной базы данных');
      
      // Обновляем состояние
      console.log('🔄 [DataContext] Обновляем локальное состояние...');
      setDebts(prev => prev.filter(debt => debt.id !== id));
      console.log('✅ [DataContext] Долг удален из локального состояния');
      
      console.log('✅ [DataContext] Долг успешно удален локально и с сервера');
    } catch (error) {
      console.error('❌ [DataContext] Критическая ошибка при удалении долга:', error);
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