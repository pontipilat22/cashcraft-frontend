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
    return ready;
  }

  static async initDatabase(defaultCurrency: string): Promise<void> {
    if (this.isInitialized) {
      console.log('[WatermelonDB] Уже инициализировано');
      return;
    }
    try {
      console.log('[WatermelonDB] Инициализация базы данных...');
      // Проверяем, есть ли аккаунты
        // ─── Проверяем, существует ли уже счёт "Наличные" ─────────────────
    const cashAccount = await database
    .get<Account>('accounts')
    .query(
    Q.where('name', 'Наличные'),
    Q.where('type', 'cash')
    )
    .fetch();

    if (cashAccount.length === 0) {
    await database.write(async () => {
    await database.get<Account>('accounts').create(acc => {
        acc._raw.id         = uuidv4();
        acc.name            = 'Наличные';
        acc.type            = 'cash';
        acc.balance         = 0;
        acc.currency        = defaultCurrency;
        acc.isDefault       = true;
        acc.isIncludedInTotal = true;
        acc.savedAmount     = 0;
    });
    });
    console.log('[WatermelonDB] Создан счёт "Наличные"');
    } else {
    console.log('[WatermelonDB] Счёт "Наличные" уже существует — пропускаем создание');
    }

     // ─── Проверяем и добавляем базовые категории ──────────────────────────────
        const categoriesCount = await database.get<Category>('categories').query().fetchCount();
        console.log('[WatermelonDB] Количество категорий:', categoriesCount);

        if (categoriesCount === 0) {
        const categories = [
            { name: 'salary',        type: 'income',  icon: 'cash-outline',            color: '#4CAF50' },
            { name: 'business',      type: 'income',  icon: 'briefcase-outline',       color: '#2196F3' },
            { name: 'investments',   type: 'income',  icon: 'trending-up-outline',     color: '#FF9800' },
            { name: 'other_income',  type: 'income',  icon: 'add-circle-outline',      color: '#9C27B0' },
            { name: 'food',          type: 'expense', icon: 'cart-outline',            color: '#F44336' },
            { name: 'transport',     type: 'expense', icon: 'car-outline',             color: '#3F51B5' },
            { name: 'housing',       type: 'expense', icon: 'home-outline',            color: '#009688' },
            { name: 'entertainment', type: 'expense', icon: 'game-controller-outline', color: '#E91E63' },
            { name: 'health',        type: 'expense', icon: 'fitness-outline',         color: '#4CAF50' },
            { name: 'shopping',      type: 'expense', icon: 'bag-outline',             color: '#9C27B0' },
            { name: 'other_expense', type: 'expense', icon: 'ellipsis-horizontal-outline', color: '#607D8B' },
        ];

        await database.write(async () => {
            await Promise.all(
            categories.map(cat =>
                database.get<Category>('categories').create(category => {
                // id НЕ трогаем — WatermelonDB поставит uuid автоматически
                category.name  = cat.name;
                category.type  = cat.type;
                category.icon  = cat.icon;
                category.color = cat.color;
                })
            )
            );
        });
        console.log('[WatermelonDB] Базовые категории созданы');
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
        const id = uuidv4();
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
        account.creditStartDate = accountData.creditStartDate;
        account.creditTerm = accountData.creditTerm;
        account.creditRate = accountData.creditRate;
        account.creditPaymentType = accountData.creditPaymentType;
        account.creditInitialAmount = accountData.creditInitialAmount;
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
        const id = uuidv4();
        transaction._raw.id = id;
        transaction.amount = transactionData.amount;
        transaction.type = transactionData.type;
        transaction.accountId = transactionData.accountId;
        transaction.categoryId = transactionData.categoryId;
        transaction.description = transactionData.description;
        transaction.date = transactionData.date;
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
    await database.write(async () => {
      // Отменяем изменение баланса
      const account = await database.get<Account>('accounts').find(transaction.accountId);
      await account.update(acc => {
        const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
        acc.balance = acc.balance + balanceChange;
      });

      // Удаляем транзакцию
      const trans = await database.get<Transaction>('transactions').find(transaction.id);
      await trans.destroyPermanently();
    });
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
        const id = uuidv4();
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
    await database.write(async () => {
      const category = await database.get<Category>('categories').find(id);
      await category.update(cat => {
        Object.entries(updates).forEach(([key, value]) => {
          if (key !== 'id') {
            (cat as any)[key] = value;
          }
        });
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
        const id = uuidv4();
        debt._raw.id = id;
        debt.type = debtData.type;
        debt.name = debtData.name;
        debt.amount = debtData.amount;
        debt.isIncludedInTotal = debtData.isIncludedInTotal !== false;
        debt.dueDate = debtData.dueDate;
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
    await database.write(async () => {
      const debt = await database.get<Debt>('debts').find(id);
      await debt.update(d => {
        Object.entries(updates).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'createdAt') {
            (d as any)[key] = value;
          }
        });
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
      .query(Q.where('updated_at', Q.gt(lastSyncDate.getTime())))
      .fetch();
  
    /* 2.--- CATEGORIES  ---------------------------------------------------- */
    const categories = await database.get<Category>('categories').query().fetch();
  
    /* 3.--- TRANSACTIONS  ➜   добавляем   account_id  и  category_id  ------- */
    const transactions = await database
      .get<Transaction>('transactions')
      .query(Q.where('updated_at', Q.gt(lastSyncDate.getTime())))
      .fetch();
  
    const txPayload = transactions.map(t => ({
      id:           t._raw.id,
      account_id:   t.accountId,     // ←   важные поля
      category_id:  t.categoryId,    // ←   важные поля
      amount:       t.amount,
      type:         t.type,
      date:         t.date,
      description:  t.description,
      created_at:   t.createdAt.toISOString(),
      updated_at:   t.updatedAt.toISOString(),
    }));
  
    /* 4.--- DEBTS ---------------------------------------------------------- */
    const debts = await database
      .get<Debt>('debts')
      .query(Q.where('updated_at', Q.gt(lastSyncDate.getTime())))
      .fetch();
  
    /* 5.--- EXCHANGE RATES ------------------------------------------------- */
    const exchangeRates = await database.get<ExchangeRate>('exchange_rates').query().fetch();
  
    /* --- возвращаем всё сразу -------------------------------------------- */
    return {
      accounts: await this.modelsToObjects(accounts),
      categories: await this.modelsToObjects(categories),
      transactions: txPayload,                 // ←  теперь с полями-ссылками
      debts: await this.modelsToObjects(debts),
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
    return models.map(model => {
      const obj: any = { id: model._raw.id };
      const raw = model._raw;
      
      Object.keys(raw).forEach(key => {
        if (key !== 'id' && key !== '_status' && key !== '_changed') {
          if (key === 'created_at' || key === 'updated_at' || key === 'synced_at') {
            obj[this.snakeToCamel(key)] = raw[key] ? new Date(raw[key]).toISOString() : null;
          } else {
            obj[this.snakeToCamel(key)] = raw[key];
          }
        }
      });
      
      return obj;
    });
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
    await this.initDatabase(defaultCurrency);
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
}

// Экспортируем как LocalDatabaseService для обратной совместимости
export { WatermelonDatabaseService as LocalDatabaseService }; 