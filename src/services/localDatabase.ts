import * as SQLite from 'expo-sqlite';
import { Account, Transaction, Category, Debt } from '../types';

export class LocalDatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;
  private static currentUserId: string | null = null;

  static setUserId(userId: string | null) {
    this.currentUserId = userId;
    if (userId) {
      try {
        // Открываем базу данных для конкретного пользователя
        const safeUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
        this.db = SQLite.openDatabaseSync(`cashcraft_${safeUserId}.db`);
      } catch (error) {
        this.db = null;
        throw error;
      }
    } else {
      this.db = null;
    }
  }

  private static getDb(): SQLite.SQLiteDatabase {
    if (!this.db || !this.currentUserId) {
      throw new Error('Database not initialized. Call setUserId first.');
    }
    return this.db;
  }

  static async initDatabase(defaultCurrency: string = 'USD'): Promise<void> {
    if (!this.db || !this.currentUserId) {
      return;
    }

    const db = this.getDb();
    
    try {
      // Создаем таблицы
      db.execSync(`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          balance REAL DEFAULT 0,
          currency TEXT DEFAULT 'RUB',
          exchangeRate REAL DEFAULT 1,
          cardNumber TEXT,
          color TEXT,
          icon TEXT,
          isDefault INTEGER DEFAULT 0,
          isIncludedInTotal INTEGER DEFAULT 1,
          targetAmount REAL,
          linkedAccountId TEXT,
          savedAmount REAL DEFAULT 0,
          creditStartDate TEXT,
          creditTerm INTEGER,
          creditRate REAL,
          creditPaymentType TEXT,
          creditInitialAmount REAL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          syncedAt TEXT
        );
      `);

      // Миграция: добавляем колонку exchangeRate если её нет
      try {
        db.execSync(`ALTER TABLE accounts ADD COLUMN exchangeRate REAL DEFAULT 1`);
      } catch (error) {
        // Колонка уже существует, игнорируем ошибку
      }
      
      // Миграция: добавляем колонку linkedAccountId если её нет
      try {
        db.execSync(`ALTER TABLE accounts ADD COLUMN linkedAccountId TEXT`);
      } catch (error) {
        // Колонка уже существует, игнорируем ошибку
      }
      
      // Миграция: добавляем колонку savedAmount если её нет
      try {
        db.execSync(`ALTER TABLE accounts ADD COLUMN savedAmount REAL DEFAULT 0`);
      } catch (error) {
        // Колонка уже существует, игнорируем ошибку
      }

      db.execSync(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          accountId TEXT NOT NULL,
          categoryId TEXT,
          description TEXT,
          date TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          syncedAt TEXT,
          FOREIGN KEY (accountId) REFERENCES accounts (id)
        );
      `);

      db.execSync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          syncedAt TEXT
        );
      `);

      db.execSync(`
        CREATE TABLE IF NOT EXISTS debts (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          isIncludedInTotal INTEGER DEFAULT 1,
          dueDate TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          syncedAt TEXT
        );
      `);

      // Создаем таблицу для метаданных синхронизации
      db.execSync(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lastSyncAt TEXT,
          syncToken TEXT
        );
      `);

      // Создаем таблицу для курсов валют
      db.execSync(`
        CREATE TABLE IF NOT EXISTS exchange_rates (
          id TEXT PRIMARY KEY NOT NULL,
          fromCurrency TEXT NOT NULL,
          toCurrency TEXT NOT NULL,
          rate REAL NOT NULL,
          updatedAt TEXT NOT NULL,
          UNIQUE(fromCurrency, toCurrency)
        );
      `);

      // Создаем таблицу для настроек
      db.execSync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // Инициализируем настройки по умолчанию
      const existingRatesMode = db.getFirstSync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        'exchangeRatesMode'
      );
      
      if (!existingRatesMode) {
        db.runSync(
          'INSERT INTO settings (key, value) VALUES (?, ?)',
          'exchangeRatesMode', 'auto' // По умолчанию автоматический режим
        );
      }

      // Инициализируем базовые данные если это первый запуск
      const accountsCount = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM accounts'
      )?.count || 0;

      if (accountsCount === 0) {
        // Создаем счет "Наличные" по умолчанию с валютой пользователя
        const now = new Date().toISOString();
        db.runSync(
          `INSERT INTO accounts (id, name, type, balance, currency, isDefault, isIncludedInTotal, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          '1', 'Наличные', 'cash', 0, defaultCurrency, 1, 1, now, now
        );
      }

      // Проверяем и добавляем базовые категории если их нет
      const categoriesCount = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM categories'
      )?.count || 0;

      if (categoriesCount === 0) {
        // Добавляем базовые категории
        const categories = [
          // Доходы
          { id: 'salary', name: 'salary', type: 'income', icon: 'cash-outline', color: '#4CAF50' },
          { id: 'business', name: 'business', type: 'income', icon: 'briefcase-outline', color: '#2196F3' },
          { id: 'investments', name: 'investments', type: 'income', icon: 'trending-up-outline', color: '#FF9800' },
          { id: 'other_income', name: 'other_income', type: 'income', icon: 'add-circle-outline', color: '#9C27B0' },
          // Расходы
          { id: 'food', name: 'food', type: 'expense', icon: 'cart-outline', color: '#F44336' },
          { id: 'transport', name: 'transport', type: 'expense', icon: 'car-outline', color: '#3F51B5' },
          { id: 'housing', name: 'housing', type: 'expense', icon: 'home-outline', color: '#009688' },
          { id: 'entertainment', name: 'entertainment', type: 'expense', icon: 'game-controller-outline', color: '#E91E63' },
          { id: 'health', name: 'health', type: 'expense', icon: 'fitness-outline', color: '#4CAF50' },
          { id: 'shopping', name: 'shopping', type: 'expense', icon: 'bag-outline', color: '#9C27B0' },
          { id: 'other_expense', name: 'other_expense', type: 'expense', icon: 'ellipsis-horizontal-outline', color: '#607D8B' },
        ];

        categories.forEach(cat => {
          try {
            db.runSync(
              `INSERT OR IGNORE INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)`,
              cat.id, cat.name, cat.type, cat.icon, cat.color
            );
          } catch (error) {
            // Игнорируем ошибку, категория может уже существовать
          }
        });
      }
    } catch (error) {
      throw error;
    }
  }

  // Методы для работы со счетами
  static async getAccounts(): Promise<Account[]> {
    if (!this.db || !this.currentUserId) {
      return [];
    }
    const db = this.getDb();
    const accounts = db.getAllSync('SELECT * FROM accounts ORDER BY createdAt DESC');
    return accounts as Account[];
  }

  static async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const db = this.getDb();
    const id = Date.now().toString();
    const now = new Date().toISOString();

    if (account.isDefault) {
      db.runSync('UPDATE accounts SET isDefault = 0');
    }

    db.runSync(
      `INSERT INTO accounts (id, name, type, balance, currency, exchangeRate, cardNumber, icon, isDefault, isIncludedInTotal, 
       targetAmount, linkedAccountId, savedAmount, creditStartDate, creditTerm, creditRate, creditPaymentType, creditInitialAmount, 
       createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, account.name, account.type, account.balance || 0, account.currency || 'USD', 
      (account as any).exchangeRate || 1, account.cardNumber || null,
      account.icon || null, account.isDefault ? 1 : 0, account.isIncludedInTotal !== false ? 1 : 0,
      account.targetAmount || null, account.linkedAccountId || null, account.savedAmount || 0, account.creditStartDate || null, account.creditTerm || null,
      account.creditRate || null, account.creditPaymentType || null, account.creditInitialAmount || null,
      now, now
    );

    return { ...account, id, createdAt: now, updatedAt: now } as Account;
  }

  static async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    const db = this.getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.isDefault === true) {
      db.runSync('UPDATE accounts SET isDefault = 0');
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(new Date().toISOString(), id);
      db.runSync(
        `UPDATE accounts SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
    }
  }

  static async deleteAccount(id: string): Promise<void> {
    const db = this.getDb();
    db.runSync('DELETE FROM transactions WHERE accountId = ?', id);
    db.runSync('DELETE FROM accounts WHERE id = ?', id);
  }

  // Методы для работы с транзакциями
  static async getTransactions(): Promise<Transaction[]> {
    if (!this.db || !this.currentUserId) {
      return [];
    }
    const db = this.getDb();
    const transactions = db.getAllSync('SELECT * FROM transactions ORDER BY date DESC, createdAt DESC');
    return transactions as Transaction[];
  }

  static async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const db = this.getDb();
    const id = Date.now().toString();
    const now = new Date().toISOString();

    // Создаем транзакцию
    db.runSync(
      `INSERT INTO transactions (id, amount, type, accountId, categoryId, description, date, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, transaction.amount, transaction.type, transaction.accountId,
      transaction.categoryId || null, transaction.description || null,
      transaction.date, now, now
    );

    // Обновляем баланс счета
    const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
    db.runSync(
      'UPDATE accounts SET balance = balance + ?, updatedAt = ? WHERE id = ?',
      balanceChange, now, transaction.accountId
    );

    return { ...transaction, id } as Transaction;
  }

  static async updateTransaction(id: string, oldTransaction: Transaction, updates: Partial<Transaction>): Promise<void> {
    const db = this.getDb();
    const now = new Date().toISOString();

    // Отменяем старое изменение баланса
    const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
    db.runSync(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      oldBalanceChange, oldTransaction.accountId
    );

    // Обновляем транзакцию
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(now, id);
      db.runSync(
        `UPDATE transactions SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
    }

    // Применяем новое изменение баланса
    const newTransaction = { ...oldTransaction, ...updates };
    const newBalanceChange = newTransaction.type === 'income' ? newTransaction.amount : -newTransaction.amount;
    db.runSync(
      'UPDATE accounts SET balance = balance + ?, updatedAt = ? WHERE id = ?',
      newBalanceChange, now, newTransaction.accountId
    );
  }

  static async deleteTransaction(transaction: Transaction): Promise<void> {
    const db = this.getDb();
    const now = new Date().toISOString();

    // Удаляем транзакцию
    db.runSync('DELETE FROM transactions WHERE id = ?', transaction.id);

    // Отменяем изменение баланса
    const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
    db.runSync(
      'UPDATE accounts SET balance = balance + ?, updatedAt = ? WHERE id = ?',
      balanceChange, now, transaction.accountId
    );
  }

  // Методы для работы с категориями
  static async getCategories(): Promise<Category[]> {
    if (!this.db || !this.currentUserId) {
      return [];
    }
    const db = this.getDb();
    const categories = db.getAllSync('SELECT * FROM categories ORDER BY name');
    return categories as Category[];
  }

  static async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const db = this.getDb();
    const id = Date.now().toString();

    db.runSync(
      `INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)`,
      id, category.name, category.type, category.icon, category.color
    );

    return { ...category, id } as Category;
  }

  static async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    const db = this.getDb();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      db.runSync(
        `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
        ...values
      );
    }
  }

  static async deleteCategory(id: string): Promise<void> {
    const db = this.getDb();
    
    // Получаем тип категории
    const category = db.getFirstSync<Category>('SELECT * FROM categories WHERE id = ?', id);
    if (!category) return;

    // Перемещаем транзакции в категорию "Другое"
    const otherId = category.type === 'income' ? 'other_income' : 'other_expense';
    db.runSync('UPDATE transactions SET categoryId = ? WHERE categoryId = ?', otherId, id);
    
    // Удаляем категорию
    db.runSync('DELETE FROM categories WHERE id = ?', id);
  }

  // Методы для работы с долгами
  static async getDebts(): Promise<Debt[]> {
    if (!this.db || !this.currentUserId) {
      // Не логируем предупреждение, так как это нормальная ситуация при инициализации
      return [];
    }
    const db = this.getDb();
    const debts = db.getAllSync('SELECT * FROM debts ORDER BY createdAt DESC');
    return debts as Debt[];
  }

  static async createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const db = this.getDb();
    const id = Date.now().toString();
    const now = new Date().toISOString();

    db.runSync(
      `INSERT INTO debts (id, type, name, amount, isIncludedInTotal, dueDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id, debt.type, debt.name, debt.amount, debt.isIncludedInTotal !== false ? 1 : 0,
      debt.dueDate || null, now, now
    );
  }

  static async updateDebt(id: string, updates: Partial<Debt>): Promise<void> {
    const db = this.getDb();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(new Date().toISOString(), id);
      db.runSync(
        `UPDATE debts SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
    }
  }

  static async deleteDebt(id: string): Promise<void> {
    const db = this.getDb();
    db.runSync('DELETE FROM debts WHERE id = ?', id);
  }

  // Сброс всех данных
  static async resetAllData(defaultCurrency: string = 'USD'): Promise<void> {
          // Проверяем, что база данных инициализирована
      if (!this.db || !this.currentUserId) {
        throw new Error('База данных не инициализирована');
      }
    
    try {
      const db = this.getDb();
      
      // Удаляем все данные
      db.runSync('DELETE FROM transactions');
      db.runSync('DELETE FROM debts');
      db.runSync('DELETE FROM accounts');
      db.runSync('DELETE FROM categories');
      db.runSync('DELETE FROM sync_metadata');
      db.runSync('DELETE FROM exchange_rates');  // Очищаем курсы валют
      db.runSync('DELETE FROM settings');  // Очищаем настройки
      
      // Пересоздаем базовые данные
      await this.initDatabase(defaultCurrency);
    } catch (error) {
      throw error;
    }
  }

  // Методы для синхронизации
  static async getLastSyncTime(): Promise<string | null> {
    if (!this.db || !this.currentUserId) {
      return null;
    }
    const db = this.getDb();
    const result = db.getFirstSync<{ lastSyncAt: string }>(
      'SELECT lastSyncAt FROM sync_metadata ORDER BY id DESC LIMIT 1'
    );
    return result?.lastSyncAt || null;
  }

  static async updateSyncTime(syncTime: string, syncToken?: string): Promise<void> {
    const db = this.getDb();
    db.runSync(
      'INSERT INTO sync_metadata (lastSyncAt, syncToken) VALUES (?, ?)',
      syncTime, syncToken || null
    );
  }

  static async getUnsyncedData(): Promise<{
    accounts: Account[];
    transactions: Transaction[];
    categories: Category[];
    debts: Debt[];
    exchangeRates: any[];
  }> {
    const db = this.getDb();
    const lastSync = await this.getLastSyncTime();
    
    const syncCondition = lastSync 
      ? `WHERE syncedAt IS NULL OR updatedAt > '${lastSync}'`
      : '';

    // Получаем курсы валют для синхронизации
    const exchangeRates = await this.getAllExchangeRatesForSync();

    return {
      accounts: db.getAllSync(`SELECT * FROM accounts ${syncCondition}`) as Account[],
      transactions: db.getAllSync(`SELECT * FROM transactions ${syncCondition}`) as Transaction[],
      categories: db.getAllSync(`SELECT * FROM categories ${syncCondition}`) as Category[],
      debts: db.getAllSync(`SELECT * FROM debts ${syncCondition}`) as Debt[],
      exchangeRates,
    };
  }

  static async markAsSynced(table: string, ids: string[]): Promise<void> {
    const db = this.getDb();
    const syncTime = new Date().toISOString();
    
    ids.forEach(id => {
      db.runSync(
        `UPDATE ${table} SET syncedAt = ? WHERE id = ?`,
        syncTime, id
      );
    });
  }

  // Методы для работы с курсами валют
  static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (!this.db || !this.currentUserId) {
      return null;
    }
    const db = this.getDb();
    
    try {
      // Сначала проверяем локальную базу
      const result = db.getFirstSync<{ rate: number }>(
        'SELECT rate FROM exchange_rates WHERE fromCurrency = ? AND toCurrency = ?',
        fromCurrency, toCurrency
      );
      
      if (result?.rate) {
        return result.rate;
      }
      
      // Если курса нет и включен автоматический режим, пытаемся загрузить из backend
      const mode = await this.getExchangeRatesMode();
      if (mode === 'auto') {
        try {
          const { ExchangeRateService } = await import('./exchangeRate');
          console.log(`Auto-fetching rate for ${fromCurrency} -> ${toCurrency}`);
          const rate = await ExchangeRateService.getRate(fromCurrency, toCurrency);
          if (rate && rate !== 1) {
            // Сохраняем полученный курс
            await this.saveExchangeRate(fromCurrency, toCurrency, rate);
            // Сохраняем обратный курс
            await this.saveExchangeRate(toCurrency, fromCurrency, 1 / rate);
            return rate;
          }
        } catch (error) {
          console.error('Error fetching rate from backend:', error);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      return null;
    }
  }

  // Метод для получения курса только из локальной базы (без автозагрузки)
  static async getLocalExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (!this.db || !this.currentUserId) {
      return null;
    }
    const db = this.getDb();
    
    try {
      const result = db.getFirstSync<{ rate: number }>(
        'SELECT rate FROM exchange_rates WHERE fromCurrency = ? AND toCurrency = ?',
        fromCurrency, toCurrency
      );
      
      return result?.rate || null;
    } catch (error) {
      console.error('Error getting local exchange rate:', error);
      return null;
    }
  }

  static async saveExchangeRate(fromCurrency: string, toCurrency: string, rate: number): Promise<void> {
    if (!this.db || !this.currentUserId) {
      return;
    }
    const db = this.getDb();
    
    try {
      if (rate <= 0) {
        // Удаляем курс если rate <= 0
        db.runSync(
          'DELETE FROM exchange_rates WHERE fromCurrency = ? AND toCurrency = ?',
          fromCurrency, toCurrency
        );
      } else {
        const id = `${fromCurrency}_${toCurrency}`;
        const now = new Date().toISOString();
        
        db.runSync(
          `INSERT OR REPLACE INTO exchange_rates (id, fromCurrency, toCurrency, rate, updatedAt) 
           VALUES (?, ?, ?, ?, ?)`,
          id, fromCurrency, toCurrency, rate, now
        );
      }
    } catch (error) {
      console.error('Error saving exchange rate:', error);
    }
  }

  static async getStoredRates(currency: string): Promise<{ [key: string]: number }> {
    const db = this.getDb();
    const rates = db.getAllSync<{ fromCurrency: string; toCurrency: string; rate: number }>(
      'SELECT * FROM exchange_rates WHERE fromCurrency = ? OR toCurrency = ?',
      currency, currency
    );
    
    const ratesMap: { [key: string]: number } = {};
    rates.forEach(r => {
      if (r.fromCurrency === currency) {
        ratesMap[r.toCurrency] = r.rate;
      } else if (r.toCurrency === currency) {
        // Обратный курс
        ratesMap[r.fromCurrency] = 1 / r.rate;
      }
    });
    
    return ratesMap;
  }

  static async calculateCrossRate(fromCurrency: string, toCurrency: string, baseCurrency: string): Promise<number | null> {
    const db = this.getDb();
    
    // Пытаемся найти прямой курс
    let directRate = await this.getLocalExchangeRate(fromCurrency, toCurrency);
    if (directRate) return directRate;
    
    // Пытаемся найти обратный курс
    const reverseRate = await this.getLocalExchangeRate(toCurrency, fromCurrency);
    if (reverseRate) return 1 / reverseRate;
    
    // Пытаемся найти через базовую валюту
    const fromToBase = await this.getLocalExchangeRate(fromCurrency, baseCurrency);
    const baseToTo = await this.getLocalExchangeRate(baseCurrency, toCurrency);
    
    if (fromToBase && baseToTo) {
      return fromToBase * baseToTo;
    }
    
    // Пытаемся найти обратные курсы через базовую валюту
    const baseToFrom = await this.getLocalExchangeRate(baseCurrency, fromCurrency);
    const toToBase = await this.getLocalExchangeRate(toCurrency, baseCurrency);
    
    if (baseToFrom && toToBase) {
      return (1 / baseToFrom) * (1 / toToBase);
    }
    
    return null;
  }

  // Методы для управления источником курсов
  static async getExchangeRatesMode(): Promise<'auto' | 'manual'> {
    if (!this.db || !this.currentUserId) {
      return 'auto';
    }
    
    try {
      const result = this.db.getFirstSync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        'exchangeRatesMode'
      );
      return (result?.value as 'auto' | 'manual') || 'auto';
    } catch (error) {
      console.error('Error getting exchange rates mode:', error);
      return 'auto';
    }
  }

  static async setExchangeRatesMode(mode: 'auto' | 'manual'): Promise<void> {
    if (!this.db || !this.currentUserId) {
      return;
    }
    
    try {
      this.db.runSync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        'exchangeRatesMode', mode
      );
    } catch (error) {
      console.error('Error setting exchange rates mode:', error);
    }
  }

  // Метод для массового обновления курсов из backend
  static async updateRatesFromBackend(allCurrencies?: string[]): Promise<void> {
    try {
      const { ExchangeRateService } = await import('./exchangeRate');
      
      // Получаем список валют, которые реально используются
      const accounts = await this.getAccounts();
      const usedCurrencies = new Set<string>();
      
      // Добавляем валюты из счетов
      accounts.forEach(account => {
        if (account.currency) {
          usedCurrencies.add(account.currency);
        }
      });
      
      // Если нет счетов с валютами, выходим
      if (usedCurrencies.size === 0) {
        console.log('No currencies to update');
        return;
      }
      
      // Создаем уникальные пары валют
      const currencyPairs: Array<{ from: string; to: string }> = [];
      const usedCurrenciesArray = Array.from(usedCurrencies);
      
      for (let i = 0; i < usedCurrenciesArray.length; i++) {
        for (let j = i + 1; j < usedCurrenciesArray.length; j++) {
          currencyPairs.push({
            from: usedCurrenciesArray[i],
            to: usedCurrenciesArray[j]
          });
        }
      }
      
      console.log(`Updating rates for ${currencyPairs.length} currency pairs`);
      
      // Загружаем курсы только для нужных пар
      for (const pair of currencyPairs) {
        try {
          const rate = await ExchangeRateService.getRate(pair.from, pair.to);
          if (rate) {
            await this.saveExchangeRate(pair.from, pair.to, rate);
            // Сохраняем и обратный курс
            await this.saveExchangeRate(pair.to, pair.from, 1 / rate);
          }
        } catch (error) {
          console.error(`Error fetching rate for ${pair.from}-${pair.to}:`, error);
        }
      }
    } catch (error) {
      console.error('Error updating rates from backend:', error);
    }
  }

  // Получить время последнего обновления курсов
  static async getLastRatesUpdate(): Promise<Date | null> {
    try {
      const result = this.db?.getFirstSync(
        'SELECT MAX(updatedAt) as lastUpdate FROM exchange_rates'
      );
      
      if ((result as any)?.lastUpdate) {
        return new Date((result as any).lastUpdate);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting last rates update:', error);
      return null;
    }
  }

  // Получить все сохраненные курсы
  static async getAllExchangeRates(): Promise<{ [key: string]: { [key: string]: number } }> {
    if (!this.db || !this.currentUserId) {
      return {};
    }
    const db = this.getDb();
    
    try {
      const rates = db.getAllSync<{ fromCurrency: string; toCurrency: string; rate: number }>(
        'SELECT fromCurrency, toCurrency, rate FROM exchange_rates ORDER BY fromCurrency, toCurrency'
      );
      const ratesMap: { [key: string]: { [key: string]: number } } = {};
      rates.forEach(r => {
        if (!ratesMap[r.fromCurrency]) {
          ratesMap[r.fromCurrency] = {};
        }
        ratesMap[r.fromCurrency][r.toCurrency] = r.rate;
      });
      return ratesMap;
    } catch (error) {
      console.error('Error getting all exchange rates:', error);
      return {};
    }
  }

  // Получить все курсы валют для синхронизации
  static async getAllExchangeRatesForSync(): Promise<any[]> {
    if (!this.db || !this.currentUserId) {
      return [];
    }
    const db = this.getDb();
    
    try {
      const rates = db.getAllSync<{ 
        fromCurrency: string; 
        toCurrency: string; 
        rate: number;
        updatedAt: string;
      }>(
        'SELECT fromCurrency as from_currency, toCurrency as to_currency, rate, updatedAt as updated_at FROM exchange_rates'
      );
      
      // Получаем режим курсов
      const mode = await this.getExchangeRatesMode();
      
      // Добавляем режим ко всем курсам
      return rates.map(rate => ({ ...rate, mode })) || [];
    } catch (error) {
      console.error('Error getting exchange rates for sync:', error);
      return [];
    }
  }

  // Сохранить курсы валют из синхронизации
  static async saveExchangeRatesFromSync(rates: any[]): Promise<void> {
    if (!this.db || !this.currentUserId) {
      return;
    }
    const db = this.getDb();
    
    try {
      // Очищаем существующие курсы
      db.runSync('DELETE FROM exchange_rates');
      
      // Вставляем новые курсы
      rates.forEach(rate => {
        const id = `${rate.from_currency}_${rate.to_currency}`;
        db.runSync(
          `INSERT INTO exchange_rates (id, fromCurrency, toCurrency, rate, updatedAt) 
           VALUES (?, ?, ?, ?, ?)`,
          id, 
          rate.from_currency, 
          rate.to_currency, 
          rate.rate, 
          rate.updated_at || new Date().toISOString()
        );
      });
      
      // Обновляем режим если он есть
      if (rates.length > 0 && rates[0].mode) {
        await this.setExchangeRatesMode(rates[0].mode);
      }
    } catch (error) {
      console.error('Error saving exchange rates from sync:', error);
    }
  }

  static async clearAllExchangeRates(): Promise<void> {
    if (!this.db || !this.currentUserId) {
      return;
    }
    const db = this.getDb();
    
    try {
      // Очищаем все курсы из базы
      db.runSync('DELETE FROM exchange_rates');
      
      // Сбрасываем последнее время обновления
      await this.setLastRatesUpdate(null);
      
      console.log('All exchange rates cleared');
    } catch (error) {
      console.error('Error clearing exchange rates:', error);
      throw error;
    }
  }

  static async setLastRatesUpdate(lastUpdate: Date | null): Promise<void> {
    if (!this.db || !this.currentUserId) {
      return;
    }
    const db = this.getDb();
    const now = new Date().toISOString();
    
    if (lastUpdate) {
      db.runSync(
        'INSERT INTO settings (key, value) VALUES (?, ?)',
        'lastRatesUpdate', lastUpdate.toISOString()
      );
    } else {
      db.runSync('DELETE FROM settings WHERE key = ?', 'lastRatesUpdate');
    }
  }
} 