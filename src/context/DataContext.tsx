import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import { Account, Transaction, Category, Debt, Goal, GoalTransfer } from '../types/index';
import { LocalDatabaseService } from '../services/localDatabase';
import { ApiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExchangeRateService } from '../services/exchangeRate';
import { AuthService } from '../services/auth';
import { useLocalization } from './LocalizationContext';

interface DataContextType {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  goals: Goal[];
  goalTransfers: GoalTransfer[];
  totalBalance: number;
  isLoading: boolean;
  
  // Методы для работы со счетами
  createAccount: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Account>;
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
  
  // Методы для работы с целями
  createGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'currentAmount'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  
  // Методы для переводов в цели
  transferToGoal: (goalId: string, accountId: string, amount: number, description?: string) => Promise<void>;
  transferFromGoal: (goalId: string, accountId: string, amount: number, description?: string) => Promise<void>;
  
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
  
  // Вспомогательные методы
  getAccountReservedAmount: (accountId: string) => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode; userId?: string | null; defaultCurrency?: string }> = ({ children, userId, defaultCurrency = 'USD' }) => {
  const { t } = useLocalization();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalTransfers, setGoalTransfers] = useState<GoalTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refs для debouncing и отмены запросов
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  // Мемоизированное вычисление общего баланса
  const totalBalance = useMemo(() => {
    const total = accounts
      .filter(account => account.isIncludedInTotal !== false)
      .reduce((sum, account) => {
        let balance = account.balance;
        // Если валюта счета отличается от основной и есть курс обмена
        if (account.currency && account.currency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
          balance = account.balance * (account as any).exchangeRate;
        }
        return sum + balance;
      }, 0);
    return total;
  }, [accounts, defaultCurrency]);

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
      setGoals([]);
      setGoalTransfers([]);
      // totalBalance вычисляется автоматически через useMemo
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
        const defaultAccountName = t('accounts.types.cash') || 'Cash';
        await LocalDatabaseService.initDatabase(defaultCurrency, defaultAccountName);
        
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

  // Внутренняя функция для немедленного обновления данных
  const refreshDataImmediate = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log('📊 [DataContext] RefreshData уже выполняется, пропускаем...');
      return;
    }

    isRefreshingRef.current = true;
    try {
      console.log('📊 [DataContext] RefreshData called...');

      if (!LocalDatabaseService.isDatabaseReady()) {
        console.log('🗄️ [DataContext] Проверка готовности базы данных в refreshData:', false);
        return;
      }

      console.log('🗄️ [DataContext] Проверка готовности базы данных в refreshData:', true);

      const [accountsFromDb, transactionsFromDb, categoriesFromDb, debtsFromDb, goalsFromDb, goalTransfersFromDb] = await Promise.all([
        LocalDatabaseService.getAccounts(),
        LocalDatabaseService.getTransactions(),
        LocalDatabaseService.getCategories(),
        LocalDatabaseService.getDebts(),
        LocalDatabaseService.getGoals(),
        LocalDatabaseService.getGoalTransfers()
      ]);

      console.log('📊 [DataContext] Данные из базы:');
      console.log('  - Счета:', accountsFromDb.length);
      console.log('  - Транзакции:', transactionsFromDb.length);
      console.log('  - Категории:', categoriesFromDb.length);
      console.log('  - Долги:', debtsFromDb.length);
      console.log('  - Цели:', goalsFromDb.length);
      console.log('  - Переводы в цели:', goalTransfersFromDb.length);

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

      // Обновляем состояние (totalBalance будет автоматически пересчитан через useMemo)
      setAccounts(accountsWithRates);
      setTransactions(transactionsFromDb);
      setCategories(categoriesFromDb);
      setDebts(debtsFromDb);
      setGoals(goalsFromDb);
      setGoalTransfers(goalTransfersFromDb);

      console.log('✅ [DataContext] RefreshData завершен успешно');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка обновления данных:', error);
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  }, [defaultCurrency]);

  // Debounced версия refreshData с задержкой 300ms
  const refreshData = useCallback(async () => {
    // Отменяем предыдущий запланированный вызов
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Планируем новый вызов через 300ms
    return new Promise<void>((resolve) => {
      refreshTimeoutRef.current = setTimeout(async () => {
        await refreshDataImmediate();
        resolve();
      }, 300);
    });
  }, [refreshDataImmediate]);

  // Cleanup timeout при размонтировании
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('➕ [DataContext] Создаем новый счет:', account.name);

      // Сохраняем начальный баланс для транзакции
      const initialBalance = account.balance || 0;
      const includeBudget = (account as any).includeBudget;

      // Создаем счет с балансом 0 (баланс установится через транзакцию)
      const accountToCreate = {
        ...account,
        balance: 0
      };

      const createdAccount = await LocalDatabaseService.createAccount(accountToCreate);

      // Если у счета есть начальный баланс > 0, создаем транзакцию
      // НО только если НЕ включен учет в бюджете (иначе транзакция будет создана через processIncome)
      if (initialBalance > 0 && account.type !== 'savings' && account.type !== 'credit' && !includeBudget) {
        console.log('💰 [DataContext] Создаем транзакцию начального баланса:', initialBalance);

        // Находим категорию "Другое" или первую доходную категорию
        const allCategories = await LocalDatabaseService.getCategories();
        let initialBalanceCategory = allCategories.find(
          cat => cat.type === 'income' && cat.name.toLowerCase().includes(t('categories.other').toLowerCase())
        );

        if (!initialBalanceCategory) {
          initialBalanceCategory = allCategories.find(cat => cat.type === 'income');
        }

        if (initialBalanceCategory) {
          await LocalDatabaseService.createTransaction({
            amount: initialBalance,
            type: 'income',
            accountId: createdAccount.id,
            categoryId: initialBalanceCategory.id,
            description: t('accounts.initialBalance') || 'Начальный баланс',
            date: new Date().toISOString(),
          });
          console.log('✅ [DataContext] Транзакция начального баланса создана');
        } else {
          console.warn('⚠️ [DataContext] Не найдена категория дохода для начального баланса');
        }
      } else if (initialBalance > 0 && includeBudget) {
        console.log('💰 [DataContext] Начальный баланс будет обработан через систему бюджетирования');
      } else if (initialBalance !== 0) {
        // Для savings и credit устанавливаем баланс напрямую (без транзакции)
        await LocalDatabaseService.updateAccount(createdAccount.id, { balance: initialBalance });
        console.log('💰 [DataContext] Баланс установлен напрямую для счета типа', account.type);
      }

      await refreshData();

      console.log('✅ [DataContext] Счет успешно создан');
      return createdAccount;
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

      // Получаем все транзакции дохода этого счета для пересчета бюджета
      const accountTransactions = transactions.filter(t => t.accountId === id && t.type === 'income');
      const totalIncomeToSubtract = accountTransactions.reduce((sum, t) => sum + t.amount, 0);

      if (totalIncomeToSubtract > 0) {
        console.log('💰 [DataContext] Нужно вычесть из бюджета доходы удаленного счета:', totalIncomeToSubtract);
      }

      // Удаляем из локальной базы данных
      console.log('📱 [DataContext] Удаляем счёт из локальной базы данных...');
      await LocalDatabaseService.deleteAccount(id);
      console.log('✅ [DataContext] Счёт удалён из локальной базы данных');

      // Обновляем локальное состояние
      console.log('🔄 [DataContext] Обновляем локальное состояние...');
      await refreshData();
      console.log('✅ [DataContext] Локальное состояние обновлено');

      // Пересчитываем бюджет, вычитая доходы удаленного счета
      if (totalIncomeToSubtract > 0) {
        console.log('📊 [DataContext] Обновляем бюджет после удаления счета...');
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        const BUDGET_TRACKING_KEY = '@cashcraft_budget_tracking';
        const BUDGET_SETTINGS_KEY = '@cashcraft_budget_settings';

        const [trackingDataRaw, settingsDataRaw] = await Promise.all([
          AsyncStorage.default.getItem(BUDGET_TRACKING_KEY),
          AsyncStorage.default.getItem(BUDGET_SETTINGS_KEY)
        ]);

        if (trackingDataRaw && settingsDataRaw) {
          const trackingData = JSON.parse(trackingDataRaw);
          const settings = JSON.parse(settingsDataRaw);
          const newIncome = Math.max(0, trackingData.totalIncomeThisMonth - totalIncomeToSubtract);

          // Пересчитываем распределение бюджета
          const savingsReduction = (totalIncomeToSubtract * 20) / 100; // 20% от удаленного дохода

          // Пересчитываем дневной бюджет
          const essential = (newIncome * settings.essentialPercentage) / 100;
          const nonEssential = (newIncome * settings.nonEssentialPercentage) / 100;
          const remainingEssential = Math.max(0, essential - trackingData.essentialSpent);
          const remainingNonEssential = Math.max(0, nonEssential - trackingData.nonEssentialSpent);
          const totalRemaining = remainingEssential + remainingNonEssential;

          // Вычисляем дни до следующего периода
          const now = new Date();
          const periodStartDay = settings.periodStartDay || 1;
          const currentDay = now.getDate();
          const actualDayThisMonth = Math.min(periodStartDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());

          let daysRemaining;
          if (currentDay < actualDayThisMonth) {
            const nextPeriodStart = new Date(now.getFullYear(), now.getMonth(), actualDayThisMonth);
            daysRemaining = Math.ceil((nextPeriodStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            const actualDayNextMonth = Math.min(periodStartDay, new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate());
            const nextPeriodStart = new Date(now.getFullYear(), now.getMonth() + 1, actualDayNextMonth);
            daysRemaining = Math.ceil((nextPeriodStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }

          const newDailyBudget = daysRemaining > 0 ? totalRemaining / daysRemaining : 0;

          const updatedTracking = {
            ...trackingData,
            totalIncomeThisMonth: newIncome,
            savingsAmount: Math.max(0, trackingData.savingsAmount - savingsReduction),
            dailyBudget: newDailyBudget,
          };

          await AsyncStorage.default.setItem(BUDGET_TRACKING_KEY, JSON.stringify(updatedTracking));
          console.log('✅ [DataContext] Бюджет обновлен:', {
            oldIncome: trackingData.totalIncomeThisMonth,
            newIncome: updatedTracking.totalIncomeThisMonth,
            subtracted: totalIncomeToSubtract,
            oldDailyBudget: trackingData.dailyBudget,
            newDailyBudget: newDailyBudget,
            daysRemaining
          });
        }
      }

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

  // Методы для работы с целями
  const createGoal = async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'currentAmount'>) => {
    try {
      console.log('🎯 [DataContext] Создаем новую цель:', goal.name);
      
      await LocalDatabaseService.createGoal({ ...goal, currentAmount: 0 });
      await refreshData();
      
      console.log('✅ [DataContext] Цель успешно создана');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка создания цели:', error);
      throw error;
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    try {
      console.log('✏️ [DataContext] Обновляем цель:', id);
      
      await LocalDatabaseService.updateGoal(id, updates);
      await refreshData();
      
      console.log('✅ [DataContext] Цель успешно обновлена');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка обновления цели:', error);
      throw error;
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      console.log('🗑️ [DataContext] Удаляем цель:', id);
      
      await LocalDatabaseService.deleteGoal(id);
      await refreshData();
      
      console.log('✅ [DataContext] Цель успешно удалена');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка удаления цели:', error);
      throw error;
    }
  };

  const transferToGoal = async (goalId: string, accountId: string, amount: number, description?: string) => {
    try {
      console.log('💰 [DataContext] Перевод в цель:', goalId, 'со счета:', accountId, 'сумма:', amount);
      
      const account = accounts.find(acc => acc.id === accountId);
      const goal = goals.find(g => g.id === goalId);
      
      if (!account) throw new Error('Account not found');
      if (!goal) throw new Error('Goal not found');
      
      // Проверяем доступную сумму (баланс минус уже зарезервированное в целях)
      const reservedAmount = getAccountReservedAmount(accountId);
      const availableAmount = account.balance - reservedAmount;
      if (availableAmount < amount) throw new Error('Insufficient available funds');
      
      // Создаем перевод в цель (деньги остаются на счете, просто резервируются)
      await LocalDatabaseService.createGoalTransfer({
        goalId,
        accountId,
        amount,
        description: description || `Перевод в цель "${goal.name}"`,
        date: new Date().toISOString()
      });
      
      // Обновляем сумму цели (НЕ трогаем баланс счета!)
      await LocalDatabaseService.updateGoal(goalId, {
        currentAmount: goal.currentAmount + amount
      });
      
      await refreshData();
      
      console.log('✅ [DataContext] Перевод в цель успешно выполнен');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка перевода в цель:', error);
      throw error;
    }
  };

  const transferFromGoal = async (goalId: string, accountId: string, amount: number, description?: string) => {
    try {
      console.log('💸 [DataContext] Перевод из цели:', goalId, 'на счет:', accountId, 'сумма:', amount);
      
      const account = accounts.find(acc => acc.id === accountId);
      const goal = goals.find(g => g.id === goalId);
      
      if (!account) throw new Error('Account not found');
      if (!goal) throw new Error('Goal not found');
      if (goal.currentAmount < amount) throw new Error('Insufficient goal amount');
      
      // Создаем отрицательный перевод из цели
      await LocalDatabaseService.createGoalTransfer({
        goalId,
        accountId,
        amount: -amount,
        description: description || `Перевод из цели "${goal.name}"`,
        date: new Date().toISOString()
      });
      
      // Обновляем баланс счета
      await LocalDatabaseService.updateAccount(accountId, {
        balance: account.balance + amount
      });
      
      // Обновляем сумму цели
      await LocalDatabaseService.updateGoal(goalId, {
        currentAmount: goal.currentAmount - amount
      });
      
      await refreshData();
      
      console.log('✅ [DataContext] Перевод из цели успешно выполнен');
    } catch (error) {
      console.error('❌ [DataContext] Ошибка перевода из цели:', error);
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

        // Сбрасываем данные бюджета из AsyncStorage
        console.log('🗑️ [DataContext] Сброс данных бюджетирования...');
        await AsyncStorage.removeItem('@cashcraft_budget_settings');
        await AsyncStorage.removeItem('@cashcraft_budget_tracking');

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

  // Вспомогательный метод для расчета зарезервированной суммы по счету
  const getAccountReservedAmount = useCallback((accountId: string): number => {
    return goalTransfers
      .filter(transfer => transfer.accountId === accountId && transfer.amount > 0)
      .reduce((sum, transfer) => sum + transfer.amount, 0);
  }, [goalTransfers]);

  const value: DataContextType = {
    accounts,
    transactions,
    categories,
    debts,
    goals,
    goalTransfers,
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
    createGoal,
    updateGoal,
    deleteGoal,
    transferToGoal,
    transferFromGoal,
    refreshData,
    resetAllData,
    createDebt,
    updateDebt,
    deleteDebt,
    getStatistics,
    getAccountReservedAmount,
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