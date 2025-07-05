import database from '../database';
import { Q } from '@nozbe/watermelondb';
import { v4 as uuidv4 } from 'uuid';
import Account from '../database/models/Account';
import Transaction from '../database/models/Transaction';
import Category from '../database/models/Category';
import Debt from '../database/models/Debt';
import ExchangeRate from '../database/models/ExchangeRate';
import Setting from '../database/models/Setting';
import SyncMetadata from '../database/models/SyncMetadata';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Константы для дефолтного счёта и флага инициализации
const DEFAULT_CASH_ACCOUNT_ID = 'DEFAULT_CASH_ACCOUNT'
const INIT_FLAG = '@hasInitDefaultAccount'

export class WatermelonDatabaseService {
  private static currentUserId: string | null = null;
  private static isInitialized: boolean = false;
  private static lastInitError: any = null;

  static setUserId(userId: string | null) {
    this.currentUserId = userId;
    this.isInitialized = false;
    this.lastInitError = null;
    console.log('[WatermelonDB] setUserId:', userId);
  }

  static isDatabaseReady(): boolean {
    if (this.lastInitError) {
      console.error('[WatermelonDB] Последняя ошибка инициализации:', this.lastInitError);
    }
    const ready = this.isInitialized && this.currentUserId !== null;
    console.log('[WatermelonDB] isDatabaseReady:', ready, 'isInitialized:', this.isInitialized, 'currentUserId:', this.currentUserId);
    
    // Дополнительная проверка: если база не готова, но есть userId, попробуем инициализировать
    if (!ready && this.currentUserId !== null && !this.isInitialized) {
      console.log('[WatermelonDB] База данных не готова, но есть userId - можно попробовать инициализировать');
    }
    
    return ready;
  }

  static async initDatabase(defaultCurrency: string): Promise<void> {
    if (this.isInitialized) {
      console.log('[WatermelonDB] Уже инициализировано');
      return;
    }
    try {
      console.log('[WatermelonDB] Инициализация базы данных...');
      
      // ─── Создаём дефолтный счёт "Наличные" только один раз ────────────────────────────
      // Считаем, сколько сейчас записей в таблице accounts
      const accountsCount = await database.get<Account>('accounts').query().fetchCount()

      // Проверяем, создавали ли мы уже дефолтный счёт
      const hasInitDefault = await AsyncStorage.getItem(INIT_FLAG)

      // Если таблица пуста и дефолт ещё не создавали — создаём
      if (accountsCount === 0 && !hasInitDefault) {
        console.log('[WatermelonDB] Создаем дефолтный счёт "Наличные"...');
        await database.write(async () => {
          await database.get<Account>('accounts').create(acc => {
            acc._raw.id            = DEFAULT_CASH_ACCOUNT_ID // фиксированный ID
            acc.name               = 'Наличные'
            acc.type               = 'cash'
            acc.balance            = 0
            acc.currency           = defaultCurrency
            acc.isDefault          = true
            acc.isIncludedInTotal  = true
            acc.savedAmount        = 0
            // остальные поля можно не трогать
          })
        })
        // Ставим флаг, чтобы не создавать счёт повторно
        await AsyncStorage.setItem(INIT_FLAG, 'true')
        console.log('[WatermelonDB] Дефолтный счёт создан и флаг установлен')
      } else {
        console.log('[WatermelonDB] Пропускаем создание дефолтного счёта (либо уже есть, либо флаг установлен)')
      }

      // ─── Создаем базовые категории только если база пуста ──────────────────────────────
      const categoriesCount = await database.get<Category>('categories').query().fetchCount();
      
      if (categoriesCount === 0) {
        console.log('[WatermelonDB] База категорий пуста, создаем базовые категории...');
        
        const categories = [
          { id: uuidv4(), name: 'salary',        type: 'income',  icon: 'cash-outline',            color: '#4CAF50' },
          { id: uuidv4(), name: 'business',      type: 'income',  icon: 'briefcase-outline',       color: '#2196F3' },
          { id: uuidv4(), name: 'investments',   type: 'income',  icon: 'trending-up-outline',     color: '#FF9800' },
          { id: uuidv4(), name: 'other_income',  type: 'income',  icon: 'add-circle-outline',      color: '#9C27B0', isDefault: true },
        
          { id: uuidv4(), name: 'food',          type: 'expense', icon: 'cart-outline',            color: '#F44336' },
          { id: uuidv4(), name: 'transport',     type: 'expense', icon: 'car-outline',             color: '#3F51B5' },
          { id: uuidv4(), name: 'housing',       type: 'expense', icon: 'home-outline',            color: '#009688' },
          { id: uuidv4(), name: 'entertainment', type: 'expense', icon: 'game-controller-outline', color: '#E91E63' },
          { id: uuidv4(), name: 'health',        type: 'expense', icon: 'fitness-outline',         color: '#4CAF50' },
          { id: uuidv4(), name: 'shopping',      type: 'expense', icon: 'bag-outline',             color: '#9C27B0' },
          { id: uuidv4(), name: 'other_expense', type: 'expense', icon: 'ellipsis-horizontal-outline', color: '#607D8B', isDefault: true },
        ];

        await database.write(async () => {
          await Promise.all(
            categories.map(cat =>
              database.get<Category>('categories').create(category => {
                category._raw.id = cat.id; // Используем фиксированный ID для системных категорий
                category.name  = cat.name;
                category.type  = cat.type;
                category.icon  = cat.icon;
                category.color = cat.color;
              })
            )
          );          
        });
        console.log('[WatermelonDB] Базовые категории созданы');
      } else {
        console.log('[WatermelonDB] Категории уже существуют, пропускаем создание базовых категорий');
      }

      // Инициализируем настройки
      const settingsCount = await database.get<Setting>('settings').query().fetchCount();
      console.log('[WatermelonDB] Количество настроек:', settingsCount);
      if (settingsCount === 0) {
        await database.write(async () => {
          await database.get<Setting>('settings').create(setting => {
            setting.key = 'exchangeRatesMode';
            setting.value = 'auto';
          });
        });
        console.log('[WatermelonDB] Настройки созданы');
      }
      
      // Очищаем дублированные категории (для пользователей с существующей проблемой)
      await this.removeDuplicateCategories();
      
      this.isInitialized = true;
      this.lastInitError = null;
      console.log('[WatermelonDB] Инициализация завершена успешно');
    } catch (error) {
      this.lastInitError = error;
      this.isInitialized = false;
      console.error('[WatermelonDB] Ошибка инициализации:', error);
      throw error;
    }
  }

  // Методы для работы со счетами
  static async getAccounts(): Promise<any[]> {
    const accounts = await database.get<Account>('accounts').query().fetch();
    return accounts.map(acc => ({
      id: acc._raw.id,
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
      currency: acc.currency,
      exchangeRate: acc.exchangeRate,
      cardNumber: acc.cardNumber,
      color: acc.color,
      icon: acc.icon,
      isDefault: acc.isDefault,
      isIncludedInTotal: acc.isIncludedInTotal,
      targetAmount: acc.targetAmount,
      linkedAccountId: acc.linkedAccountId,
      savedAmount: acc.savedAmount,
      isTargetedSavings: acc.isTargetedSavings,
      creditStartDate: acc.creditStartDate,
      creditTerm: acc.creditTerm,
      creditRate: acc.creditRate,
      creditPaymentType: acc.creditPaymentType,
      creditInitialAmount: acc.creditInitialAmount,
      createdAt: acc.createdAt.toISOString(),
      updatedAt: acc.updatedAt.toISOString(),
    }));
  }

  static async createAccount(accountData: any): Promise<any> {
    const account = await database.write(async () => {
      return await database.get<Account>('accounts').create(account => {
        const id = accountData.id || uuidv4();
        account._raw.id = id;
        account.name = accountData.name;
        account.type = accountData.type;
        account.balance = accountData.balance || 0;
        account.currency = accountData.currency || 'USD';
        account.exchangeRate = accountData.exchangeRate || 1;
        account.cardNumber = accountData.cardNumber;
        account.icon = accountData.icon;
        account.isDefault = accountData.isDefault || false;
        account.isIncludedInTotal = accountData.isIncludedInTotal !== false;
        account.targetAmount = accountData.targetAmount;
        account.linkedAccountId = accountData.linkedAccountId;
        account.savedAmount = accountData.savedAmount || 0;
        account.isTargetedSavings = accountData.isTargetedSavings;
        account.creditStartDate = accountData.creditStartDate;
        account.creditTerm = accountData.creditTerm;
        account.creditRate = accountData.creditRate;
        account.creditPaymentType = accountData.creditPaymentType;
        account.creditInitialAmount = accountData.creditInitialAmount;
        account.syncedAt = undefined;
      });
    });

    if (accountData.isDefault) {
      await this.updateOtherAccountsDefaultStatus(account._raw.id);
    }

    return {
      ...accountData,
      id: account._raw.id,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  private static async updateOtherAccountsDefaultStatus(excludeId: string): Promise<void> {
    const otherAccounts = await database.get<Account>('accounts')
      .query(Q.where('id', Q.notEq(excludeId)))
      .fetch();

    await database.write(async () => {
      await Promise.all(otherAccounts.map(account => 
        account.update(acc => {
          acc.isDefault = false;
        })
      ));
    });
  }

  static async updateAccount(id: string, updates: any): Promise<void> {
    const account = await database.get<Account>('accounts').find(id);
    
    await database.write(async () => {
      await account.update(acc => {
        Object.entries(updates).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'createdAt') {
            (acc as any)[key] = value;
          }
        });
        acc.syncedAt = undefined;
      });
    });

    if (updates.isDefault === true) {
      await this.updateOtherAccountsDefaultStatus(id);
    }
  }

  static async deleteAccount(id: string): Promise<void> {
    await database.write(async () => {
      // Удаляем транзакции аккаунта
      const transactions = await database.get<Transaction>('transactions')
        .query(Q.where('account_id', id))
        .fetch();
      
      await Promise.all(transactions.map(t => t.destroyPermanently()));

      // Удаляем аккаунт
      const account = await database.get<Account>('accounts').find(id);
      await account.destroyPermanently();
    });
  }

  // Методы для работы с транзакциями
  static async getTransactions(): Promise<any[]> {
    const transactions = await database.get<Transaction>('transactions')
      .query(Q.sortBy('date', Q.desc))
      .fetch();
    
    return transactions.map(t => ({
      id: t._raw.id,
      amount: t.amount,
      type: t.type,
      accountId: t.accountId,
      categoryId: t.categoryId,
      description: t.description,
      date: t.date,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  static async createTransaction(transactionData: any): Promise<any> {
    const transaction = await database.write(async () => {
      const trans = await database.get<Transaction>('transactions').create(transaction => {
        const id = transactionData.id || uuidv4();
        transaction._raw.id = id;
        transaction.amount = transactionData.amount;
        transaction.type = transactionData.type;
        transaction.accountId = transactionData.accountId;
        transaction.categoryId = transactionData.categoryId;
        transaction.description = transactionData.description;
        transaction.date = transactionData.date;
        transaction.syncedAt = undefined;
      });

      // Обновляем баланс счета
      const account = await database.get<Account>('accounts').find(transactionData.accountId);
      await account.update(acc => {
        const balanceChange = transactionData.type === 'income' ? transactionData.amount : -transactionData.amount;
        acc.balance = acc.balance + balanceChange;
      });

      return trans;
    });

    return {
      ...transactionData,
      id: transaction._raw.id,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }

  static async updateTransaction(id: string, oldTransaction: any, updates: any): Promise<void> {
    await database.write(async () => {
      // Отменяем старое изменение баланса
      const oldAccount = await database.get<Account>('accounts').find(oldTransaction.accountId);
      await oldAccount.update(acc => {
        const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
        acc.balance = acc.balance + oldBalanceChange;
      });

      // Обновляем транзакцию
      const transaction = await database.get<Transaction>('transactions').find(id);
      await transaction.update(trans => {
        Object.entries(updates).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'createdAt') {
            (trans as any)[key] = value;
          }
        });
        trans.syncedAt = undefined;
      });

      // Применяем новое изменение баланса
      const newTransaction = { ...oldTransaction, ...updates };
      const newAccount = await database.get<Account>('accounts').find(newTransaction.accountId);
      await newAccount.update(acc => {
        const newBalanceChange = newTransaction.type === 'income' ? newTransaction.amount : -newTransaction.amount;
        acc.balance = acc.balance + newBalanceChange;
      });
    });
  }

  static async deleteTransaction(transaction: any): Promise<void> {
    try {
      console.log('🗑️ [WatermelonDB] Начинаем удаление транзакции:', transaction.id);
      
      await database.write(async () => {
        // Отменяем изменение баланса
        const account = await database.get<Account>('accounts').find(transaction.accountId);
        if (account) {
          await account.update(acc => {
            const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
            acc.balance = acc.balance + balanceChange;
            console.log('💰 [WatermelonDB] Обновлен баланс счета:', transaction.accountId, 'на', balanceChange);
          });
        } else {
          console.warn('⚠️ [WatermelonDB] Счет не найден для транзакции:', transaction.accountId);
        }

        // Удаляем транзакцию
        const trans = await database.get<Transaction>('transactions').find(transaction.id);
        if (trans) {
          await trans.destroyPermanently();
          console.log('✅ [WatermelonDB] Транзакция успешно удалена из базы данных');
        } else {
          console.warn('⚠️ [WatermelonDB] Транзакция не найдена в базе данных:', transaction.id);
        }
      });
      
      console.log('✅ [WatermelonDB] Удаление транзакции завершено успешно');
    } catch (error) {
      console.error('❌ [WatermelonDB] Ошибка удаления транзакции:', error);
      throw error;
    }
  }

  // Методы для работы с категориями
  static async getCategories(): Promise<any[]> {
    const categories = await database.get<Category>('categories').query().fetch();
    return categories.map(cat => ({
      id: cat._raw.id,
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
    }));
  }

  static async createCategory(categoryData: any): Promise<any> {
    const category = await database.write(async () => {
      return await database.get<Category>('categories').create(category => {
        const id = categoryData.id || uuidv4();
        category._raw.id = id;
        category.name = categoryData.name;
        category.type = categoryData.type;
        category.icon = categoryData.icon;
        category.color = categoryData.color;
      });
    });

    return {
      ...categoryData,
      id: category._raw.id,
    };
  }

  static async updateCategory(id: string, updates: any): Promise<void> {
    const category = await database.get<Category>('categories').find(id);
    
    await database.write(async () => {
      await category.update(cat => {
        Object.entries(updates).forEach(([key, value]) => {
          if (key !== 'id') {
            (cat as any)[key] = value;
          }
        });
        cat.syncedAt = undefined;
      });
    });
  }

  static async deleteCategory(id: string): Promise<void> {
    await database.write(async () => {
      // Удаляем транзакции с этой категорией
      const transactions = await database.get<Transaction>('transactions')
        .query(Q.where('category_id', id))
        .fetch();
      
      await Promise.all(transactions.map(t => 
        t.update(trans => {
          trans.categoryId = undefined;
        })
      ));

      // Удаляем категорию
      const category = await database.get<Category>('categories').find(id);
      await category.destroyPermanently();
    });
  }

  // Методы для работы с долгами
  static async getDebts(): Promise<any[]> {
    const debts = await database.get<Debt>('debts').query().fetch();
    return debts.map(debt => ({
      id: debt._raw.id,
      type: debt.type,
      name: debt.name,
      amount: debt.amount,
      isIncludedInTotal: debt.isIncludedInTotal,
      dueDate: debt.dueDate,
      createdAt: debt.createdAt.toISOString(),
      updatedAt: debt.updatedAt.toISOString(),
    }));
  }

  static async createDebt(debtData: any): Promise<any> {
    const debt = await database.write(async () => {
      return await database.get<Debt>('debts').create(debt => {
        const id = debtData.id || uuidv4();
        debt._raw.id = id;
        debt.name = debtData.name;
        debt.amount = debtData.amount;
        debt.type = debtData.type;
        debt.currency = debtData.currency;
        debt.exchangeRate = debtData.exchangeRate;
        debt.isIncludedInTotal = debtData.isIncludedInTotal !== false;
        debt.dueDate = debtData.dueDate;
        debt.syncedAt = undefined;
      });
    });

    return {
      ...debtData,
      id: debt._raw.id,
      createdAt: debt.createdAt.toISOString(),
      updatedAt: debt.updatedAt.toISOString(),
    };
  }

  static async updateDebt(id: string, updates: any): Promise<void> {
    const debt = await database.get<Debt>('debts').find(id);
    
    await database.write(async () => {
      await debt.update(d => {
        Object.entries(updates).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'createdAt') {
            (d as any)[key] = value;
          }
        });
        d.syncedAt = undefined;
      });
    });
  }

  static async deleteDebt(id: string): Promise<void> {
    await database.write(async () => {
      const debt = await database.get<Debt>('debts').find(id);
      await debt.destroyPermanently();
    });
  }

  // Методы для работы с курсами валют
  static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    const rate = await database.get<ExchangeRate>('exchange_rates')
      .query(
        Q.where('from_currency', fromCurrency),
        Q.where('to_currency', toCurrency)
      )
      .fetch();
    
    return rate.length > 0 ? rate[0].rate : null;
  }

  static async getLocalExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    return this.getExchangeRate(fromCurrency, toCurrency);
  }

  static async saveExchangeRate(fromCurrency: string, toCurrency: string, rate: number): Promise<void> {
    await database.write(async () => {
      const existing = await database.get<ExchangeRate>('exchange_rates')
        .query(
          Q.where('from_currency', fromCurrency),
          Q.where('to_currency', toCurrency)
        )
        .fetch();

      if (existing.length > 0) {
        await existing[0].update(er => {
          er.rate = rate;
        });
      } else {
        await database.get<ExchangeRate>('exchange_rates').create(er => {
          er.fromCurrency = fromCurrency;
          er.toCurrency = toCurrency;
          er.rate = rate;
        });
      }
    });
  }

  static async getAllExchangeRates(): Promise<{ [key: string]: { [key: string]: number } }> {
    const rates = await database.get<ExchangeRate>('exchange_rates').query().fetch();
    const result: { [key: string]: { [key: string]: number } } = {};

    rates.forEach(rate => {
      if (!result[rate.fromCurrency]) {
        result[rate.fromCurrency] = {};
      }
      result[rate.fromCurrency][rate.toCurrency] = rate.rate;
    });

    return result;
  }

  static async clearAllExchangeRates(): Promise<void> {
    await database.write(async () => {
      const rates = await database.get<ExchangeRate>('exchange_rates').query().fetch();
      await Promise.all(rates.map(r => r.destroyPermanently()));
    });
  }

  // Методы для работы с настройками
  static async getExchangeRatesMode(): Promise<'auto' | 'manual'> {
    const setting = await database.get<Setting>('settings')
      .query(Q.where('key', 'exchangeRatesMode'))
      .fetch();
    
    return (setting.length > 0 ? setting[0].value : 'auto') as 'auto' | 'manual';
  }

  static async setExchangeRatesMode(mode: 'auto' | 'manual'): Promise<void> {
    await database.write(async () => {
      const existing = await database.get<Setting>('settings')
        .query(Q.where('key', 'exchangeRatesMode'))
        .fetch();

      if (existing.length > 0) {
        await existing[0].update(s => {
          s.value = mode;
        });
      } else {
        await database.get<Setting>('settings').create(s => {
          s.key = 'exchangeRatesMode';
          s.value = mode;
        });
      }
    });
  }

  // Методы для поиска существующих записей (для предотвращения дублирования)
  static async findAccountByName(name: string): Promise<any | null> {
    const accounts = await database.get<Account>('accounts')
      .query(Q.where('name', name))
      .fetch();
    
    return accounts.length > 0 ? accounts[0] : null;
  }

  static async findCategoryByName(name: string): Promise<any | null> {
    const categories = await database.get<Category>('categories')
      .query(Q.where('name', name))
      .fetch();
    
    return categories.length > 0 ? categories[0] : null;
  }

  static async findTransactionByUniqueFields(transactionData: any): Promise<any | null> {
    const transactions = await database.get<Transaction>('transactions')
      .query(
        Q.where('account_id', transactionData.accountId),
        Q.where('amount', transactionData.amount),
        Q.where('type', transactionData.type),
        Q.where('date', transactionData.date)
      )
      .fetch();
    
    return transactions.length > 0 ? transactions[0] : null;
  }

  static async findDebtByName(name: string): Promise<any | null> {
    const debts = await database.get<Debt>('debts')
      .query(Q.where('name', name))
      .fetch();
    
    return debts.length > 0 ? debts[0] : null;
  }

  // Методы для синхронизации
  static async getLastSyncTime(): Promise<string | null> {
    const metadata = await database.get<SyncMetadata>('sync_metadata').query().fetch();
    return metadata.length > 0 ? metadata[0].lastSyncAt || null : null;
  }

  static async updateSyncTime(syncTime: string, syncToken?: string): Promise<void> {
    await database.write(async () => {
      const metadata = await database.get<SyncMetadata>('sync_metadata').query().fetch();
      
      if (metadata.length > 0) {
        await metadata[0].update(m => {
          m.lastSyncAt = syncTime;
          if (syncToken) m.syncToken = syncToken;
        });
      } else {
        await database.get<SyncMetadata>('sync_metadata').create(m => {
          m.lastSyncAt = syncTime;
          m.syncToken = syncToken;
        });
      }
    });
  }

  static async getUnsyncedData(): Promise<any> {
    const lastSync = await this.getLastSyncTime();
    const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);
  
    /* 1.--- ACCOUNTS  ------------------------------------------------------ */
    const accounts = await database
      .get<Account>('accounts')
      .query(Q.or(
        Q.where('synced_at', Q.lte(lastSyncDate.getTime())),
        Q.where('synced_at', Q.eq(null))
      ))
      .fetch();
  
    /* 2.--- CATEGORIES  ---------------------------------------------------- */
    const categories = await database
      .get<Category>('categories')
      .query(Q.or(
        Q.where('synced_at', Q.lte(lastSyncDate.getTime())),
        Q.where('synced_at', Q.eq(null))
      ))
      .fetch();
  
    /* 3.--- TRANSACTIONS  ➜   добавляем   account_id  и  category_id  ------- */
    const transactions = await database
      .get<Transaction>('transactions')
      .query(Q.or(
        Q.where('synced_at', Q.lte(lastSyncDate.getTime())),
        Q.where('synced_at', Q.eq(null))
      ))
      .fetch();
  
    const txPayload = transactions.map(t => {
      // Проверяем, является ли categoryId валидным UUID
      const isValidUUID = (str: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };
      
      return {
        id:           t._raw.id,
        account_id:   t.accountId,     // ←   важные поля
        category_id:  t.categoryId && isValidUUID(t.categoryId) ? t.categoryId : undefined,    // ←   проверяем UUID
        amount:       t.amount,
        type:         t.type,
        date:         t.date,
        description:  t.description,
        // to_account_id отсутствует в локальной модели Transaction
        created_at:   t.createdAt.toISOString(),
        updated_at:   t.updatedAt.toISOString(),
        synced_at:    t.syncedAt ? t.syncedAt.toISOString() : undefined,
      };
    });
  
    /* 4.--- DEBTS ---------------------------------------------------------- */
    const debts = await database
      .get<Debt>('debts')
      .query(Q.or(
        Q.where('synced_at', Q.lte(lastSyncDate.getTime())),
        Q.where('synced_at', Q.eq(null))
      ))
      .fetch();
  
    /* 5.--- EXCHANGE RATES ------------------------------------------------- */
    const exchangeRates = await database.get<ExchangeRate>('exchange_rates').query().fetch();
  
    console.log('📊 [WatermelonDatabase] Несинхронизированные данные:', {
      accounts: accounts.length,
      categories: categories.length,
      transactions: transactions.length,
      debts: debts.length,
      lastSyncDate: lastSyncDate.toISOString()
    });
  
    /* --- возвращаем всё сразу -------------------------------------------- */
    return {
      accounts: await this.accountsToObjects(accounts),
      categories: await this.categoriesToObjects(categories),
      transactions: txPayload,                 // ←  теперь с полями-ссылками
      debts: await this.debtsToObjects(debts),
      exchangeRates: exchangeRates.map(er => ({
        id: `${er.fromCurrency}_${er.toCurrency}`,
        fromCurrency: er.fromCurrency,
        toCurrency: er.toCurrency,
        rate: er.rate,
        updatedAt: er.updatedAt.toISOString(),
      })),
    };
  }
  

  private static async modelsToObjects(models: any[]): Promise<any[]> {
    // Этот метод больше не используется, так как у нас есть отдельные методы для каждого типа
    console.warn('modelsToObjects is deprecated, use specific methods instead');
    return [];
  }

  private static async accountsToObjects(accounts: any[]): Promise<any[]> {
    return accounts.map(acc => ({
      id: acc._raw.id,
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
      currency: acc.currency,
      exchange_rate: acc.exchangeRate,
      card_number: acc.cardNumber,
      color: acc.color,
      icon: acc.icon,
      is_default: acc.isDefault,
      is_included_in_total: acc.isIncludedInTotal,
      target_amount: acc.targetAmount,
      // linked_account_id и saved_amount отсутствуют в серверной модели
      credit_start_date: acc.creditStartDate,
      credit_term: acc.creditTerm,
      credit_rate: acc.creditRate,
      credit_payment_type: acc.creditPaymentType,
      credit_initial_amount: acc.creditInitialAmount,
      created_at: acc.createdAt ? acc.createdAt.toISOString() : undefined,
      updated_at: acc.updatedAt ? acc.updatedAt.toISOString() : undefined,
      synced_at: acc.syncedAt ? acc.syncedAt.toISOString() : undefined,
    }));
  }

  private static async categoriesToObjects(categories: any[]): Promise<any[]> {
    return categories.map(cat => ({
      id: cat._raw.id,
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
      is_system: false, // Поле isSystem отсутствует в локальной модели Category
      created_at: cat.createdAt ? cat.createdAt.toISOString() : undefined,
      updated_at: cat.updatedAt ? cat.updatedAt.toISOString() : undefined,
      synced_at: cat.syncedAt ? cat.syncedAt.toISOString() : undefined,
    }));
  }

  private static async debtsToObjects(debts: any[]): Promise<any[]> {
    return debts.map(debt => ({
      id: debt._raw.id,
      type: debt.type,
      name: debt.name,
      amount: debt.amount,
      is_included_in_total: debt.isIncludedInTotal,
      due_date: debt.dueDate,
      created_at: debt.createdAt ? debt.createdAt.toISOString() : undefined,
      updated_at: debt.updatedAt ? debt.updatedAt.toISOString() : undefined,
      synced_at: debt.syncedAt ? debt.syncedAt.toISOString() : undefined,
    }));
  }

  private static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

  static async markAsSynced(table: string, ids: string[]): Promise<void> {
    const now = new Date();
    await database.write(async () => {
      const models = await database.get(table).query(Q.where('id', Q.oneOf(ids))).fetch();
      await Promise.all(models.map((model: any) => 
        model.update((m: any) => {
          if ('syncedAt' in m) {
            m.syncedAt = now;
          }
        })
      ));
    });
  }

  static async resetAllData(defaultCurrency: string = 'USD'): Promise<void> {
    console.log('🔄 [WatermelonDatabase] Начинаем сброс всех данных...');
    

    
    // 2. Сбрасываем локальные данные
    console.log('📱 [WatermelonDatabase] Сбрасываем локальные данные...');
    await database.write(async () => {
      // Удаляем все данные
      const tables = ['accounts', 'transactions', 'categories', 'debts', 'exchange_rates', 'settings', 'sync_metadata'];
      
      for (const table of tables) {
        const records = await database.get(table).query().fetch();
        await Promise.all(records.map(r => r.destroyPermanently()));
      }
    });

    // Переинициализируем базу данных
    this.isInitialized = false;
    // НЕ вызываем initDatabase - пользователь сам решит что создавать
    console.log('🔄 [WatermelonDatabase] База данных очищена, дефолтные данные не создаются');
    
    // 3. Устанавливаем флаг сброса данных
    if (this.currentUserId) {
      console.log('🏷️ [WatermelonDatabase] Устанавливаем флаг сброса данных...');
      await AsyncStorage.setItem(`dataReset_${this.currentUserId}`, 'true');
    }
    
    console.log('✅ [WatermelonDatabase] Сброс всех данных завершен успешно');
  }

  /**
   * Полностью очищает все данные в локальной базе WatermelonDB
   * Используется после успешного сброса данных на сервере
   * @param defaultCurrency - валюта по умолчанию для переинициализации
   */
  static async clearAllData(defaultCurrency: string = 'USD'): Promise<void> {
    console.log('🗑️ [WatermelonDatabase] Начинаем полную очистку локальной базы данных...');
    
    try {
      // 1. Очищаем все таблицы
      console.log('📊 [WatermelonDatabase] Очищаем все таблицы...');
      await database.write(async () => {
        const tables = [
          'accounts',
          'transactions', 
          'categories',
          'debts',
          'exchange_rates',
          'settings',
          'sync_metadata'
        ];
        
        for (const table of tables) {
          console.log(`   🗑️ Очищаем таблицу: ${table}`);
          const records = await database.get(table).query().fetch();
          const deletedCount = records.length;
          
          if (deletedCount > 0) {
            await Promise.all(records.map(record => record.destroyPermanently()));
            console.log(`   ✅ Удалено ${deletedCount} записей из ${table}`);
          } else {
            console.log(`   ℹ️ Таблица ${table} уже пуста`);
          }
        }
      });
      
      // 2. Сбрасываем состояние инициализации
      console.log('🔄 [WatermelonDatabase] Сбрасываем состояние инициализации...');
      this.isInitialized = false;
      this.lastInitError = null;
      
      // 3. ПЕРЕИНИЦИАЛИЗИРУЕМ базу данных после очистки
      console.log('🔄 [WatermelonDatabase] Переинициализируем базу данных после очистки...');
      await this.initDatabase(defaultCurrency);
      console.log('✅ [WatermelonDatabase] База данных переинициализирована');
      
      // 4. Очищаем флаг инициализации и устанавливаем флаг сброса данных
      console.log('🧹 [WatermelonDatabase] Очищаем флаг инициализации...');
      await AsyncStorage.removeItem(INIT_FLAG);
      
      if (this.currentUserId) {
        console.log('🏷️ [WatermelonDatabase] Устанавливаем флаг сброса данных...');
        await AsyncStorage.setItem(`dataReset_${this.currentUserId}`, 'true');
      }
      
      console.log('✅ [WatermelonDatabase] Полная очистка локальной базы данных завершена успешно');
      
    } catch (error) {
      console.error('❌ [WatermelonDatabase] Ошибка при очистке локальной базы данных:', error);
      throw new Error(`Failed to clear local database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async updateDefaultCurrency(newCurrency: string): Promise<void> {
    if (!this.isDatabaseReady()) return;

    const cashAccount = await database.get<Account>('accounts')
      .query(
        Q.where('name', 'Наличные'),
        Q.where('type', 'cash')
      )
      .fetch();

    if (cashAccount.length > 0 && cashAccount[0].currency !== newCurrency) {
      await database.write(async () => {
        await cashAccount[0].update(acc => {
          acc.currency = newCurrency;
        });
      });
    }
  }

  // Метод для отладки - получить последнюю дату обновления курсов
  static async getLastRatesUpdate(): Promise<Date | null> {
    const rates = await database.get<ExchangeRate>('exchange_rates')
      .query(Q.sortBy('updated_at', Q.desc), Q.take(1))
      .fetch();
    
    return rates.length > 0 ? rates[0].updatedAt : null;
  }

  static async setLastRatesUpdate(lastUpdate: Date | null): Promise<void> {
    // В WatermelonDB дата обновления устанавливается автоматически
    // Этот метод оставлен для совместимости
  }

  static async getAllExchangeRatesForSync(): Promise<any[]> {
    const rates = await database.get<ExchangeRate>('exchange_rates').query().fetch();
    return rates.map(er => ({
      id: `${er.fromCurrency}_${er.toCurrency}`,
      fromCurrency: er.fromCurrency,
      toCurrency: er.toCurrency,
      rate: er.rate,
      updatedAt: er.updatedAt.toISOString(),
    }));
  }

  static async saveExchangeRatesFromSync(rates: any[]): Promise<void> {
    await database.write(async () => {
      for (const rate of rates) {
        await this.saveExchangeRate(rate.fromCurrency, rate.toCurrency, rate.rate);
      }
    });
  }

  static async calculateCrossRate(fromCurrency: string, toCurrency: string, baseCurrency: string): Promise<number | null> {
    const fromToBase = await this.getExchangeRate(fromCurrency, baseCurrency);
    const baseToTo = await this.getExchangeRate(baseCurrency, toCurrency);

    if (fromToBase && baseToTo) {
      return fromToBase * baseToTo;
    }

    return null;
  }

  static async getStoredRates(currency: string): Promise<{ [key: string]: number }> {
    const rates = await database.get<ExchangeRate>('exchange_rates')
      .query(Q.where('from_currency', currency))
      .fetch();

    const result: { [key: string]: number } = {};
    rates.forEach(rate => {
      result[rate.toCurrency] = rate.rate;
    });

    return result;
  }

  static async updateRatesFromBackend(allCurrencies?: string[]): Promise<void> {
    // Этот метод должен быть реализован в сервисе exchangeRate
    // Оставляем заглушку для совместимости
  }

  static async forceReinitialize(defaultCurrency: string): Promise<void> {
    console.log('[WatermelonDatabase] Принудительная переинициализация базы данных...');
    this.isInitialized = false;
    await this.initDatabase(defaultCurrency);
    console.log('[WatermelonDatabase] Переинициализация завершена');
  }

  // Upsert методы для предотвращения дублирования
  static async upsertAccount(accountData: any): Promise<any> {
    // Ищем существующий счет по id
    let account = null;
    try {
      account = await database.get<Account>('accounts').find(accountData.id);
    } catch (e) {}
    if (account) {
      // Обновляем существующий
      await database.write(async () => {
        await account.update(acc => {
          acc.name = accountData.name;
          acc.type = accountData.type;
          acc.balance = accountData.balance || 0;
          acc.currency = accountData.currency || 'USD';
          acc.exchangeRate = accountData.exchangeRate || 1;
          acc.cardNumber = accountData.cardNumber;
          acc.icon = accountData.icon;
          acc.isDefault = accountData.isDefault || false;
          acc.isIncludedInTotal = accountData.isIncludedInTotal !== false;
          acc.targetAmount = accountData.targetAmount;
          acc.linkedAccountId = accountData.linkedAccountId;
          acc.savedAmount = accountData.savedAmount || 0;
          acc.isTargetedSavings = accountData.isTargetedSavings;
          acc.creditStartDate = accountData.creditStartDate;
          acc.creditTerm = accountData.creditTerm;
          acc.creditRate = accountData.creditRate;
          acc.creditPaymentType = accountData.creditPaymentType;
          acc.creditInitialAmount = accountData.creditInitialAmount;
        });
      });
      return account;
    } else {
      // Создаем новый
      return await this.createAccount(accountData);
    }
  }

  static async upsertCategory(categoryData: any): Promise<any> {
    // Ищем существующую категорию по имени
    const existingCategory = await this.findCategoryByName(categoryData.name);
    
    if (existingCategory) {
      console.log(`🔄 [WatermelonDB] Обновляем существующую категорию: ${categoryData.name}`);
      await this.updateCategory(existingCategory._raw.id, categoryData);
      return {
        ...categoryData,
        id: existingCategory._raw.id,
      };
    } else {
      console.log(`➕ [WatermelonDB] Создаем новую категорию: ${categoryData.name}`);
      return await this.createCategory(categoryData);
    }
  }

  static async upsertTransaction(transactionData: any): Promise<any> {
    // Ищем существующую транзакцию по уникальным полям
    const existingTransaction = await this.findTransactionByUniqueFields(transactionData);
    
    if (existingTransaction) {
      console.log(`🔄 [WatermelonDB] Обновляем существующую транзакцию: ${transactionData.amount} ${transactionData.type}`);
      await this.updateTransaction(existingTransaction._raw.id, existingTransaction, transactionData);
      return {
        ...transactionData,
        id: existingTransaction._raw.id,
        createdAt: existingTransaction.createdAt.toISOString(),
        updatedAt: existingTransaction.updatedAt.toISOString(),
      };
    } else {
      console.log(`➕ [WatermelonDB] Создаем новую транзакцию: ${transactionData.amount} ${transactionData.type}`);
      return await this.createTransaction(transactionData);
    }
  }

  static async upsertDebt(debtData: any): Promise<any> {
    const existingDebt = await this.findDebtByName(debtData.name);
    
    if (existingDebt) {
      await this.updateDebt(existingDebt.id, debtData);
      return { ...debtData, id: existingDebt.id };
    } else {
      return await this.createDebt(debtData);
    }
  }

  // Метод для удаления дублированных категорий
  static async removeDuplicateCategories(): Promise<void> {
    console.log('🔍 [WatermelonDB] Начинаем удаление дублированных категорий...');
    
    try {
      const allCategories = await database.get<Category>('categories').query().fetch();
      const categoriesByName: { [key: string]: any[] } = {};
      
      // Группируем категории по имени и типу
      allCategories.forEach(cat => {
        const key = `${cat.name}_${cat.type}`;
        if (!categoriesByName[key]) {
          categoriesByName[key] = [];
        }
        categoriesByName[key].push(cat);
      });
      
      // Находим и удаляем дубликаты
      let duplicatesCount = 0;
      await database.write(async () => {
        for (const key in categoriesByName) {
          const categories = categoriesByName[key];
          if (categories.length > 1) {
            console.log(`📋 [WatermelonDB] Найдены дубликаты для ${key}: ${categories.length} штук`);
            
            // Оставляем первую категорию, удаляем остальные
            for (let i = 1; i < categories.length; i++) {
              await categories[i].destroyPermanently();
              duplicatesCount++;
            }
          }
        }
      });
      
      console.log(`✅ [WatermelonDB] Удалено дубликатов категорий: ${duplicatesCount}`);
    } catch (error) {
      console.error('❌ [WatermelonDB] Ошибка при удалении дублированных категорий:', error);
      throw error;
    }
  }
}

// Экспортируем как LocalDatabaseService для обратной совместимости
export { WatermelonDatabaseService as LocalDatabaseService }; 