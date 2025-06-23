import * as SQLite from 'expo-sqlite';
import { Account, Transaction, Category, Debt } from '../types';
import { Platform } from 'react-native';

export class LocalDatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;
  private static currentUserId: string | null = null;
  private static isInitialized: boolean = false;
  private static initializationPromise: Promise<void> | null = null;

  static setUserId(userId: string | null) {
    this.currentUserId = userId;
    this.isInitialized = false;
    this.initializationPromise = null;
    if (userId) {
      try {
        // Открываем базу данных для конкретного пользователя
        const safeUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
        this.db = SQLite.openDatabaseSync(`cashcraft_${safeUserId}.db`);
        if (__DEV__) {
          console.log(`Database opened in setUserId: cashcraft_${safeUserId}.db`);
        }
      } catch (error) {
        this.db = null;
        throw error;
      }
    } else {
      this.db = null;
    }
  }

  private static getDb(): SQLite.SQLiteDatabase {
    if (!this.db || !this.currentUserId || !this.isInitialized) {
      throw new Error('Database not initialized. Call setUserId and initDatabase first.');
    }
    return this.db;
  }

  static isDatabaseReady(): boolean {
    const ready = this.db !== null && this.currentUserId !== null && this.isInitialized;
    if (__DEV__) {
      console.log(`Database ready check: db=${!!this.db}, userId=${!!this.currentUserId}, initialized=${this.isInitialized}, ready=${ready}`);
    }
    return ready;
  }

  static async initDatabase(defaultCurrency: string): Promise<void> {
    // Если уже идет инициализация, ждем ее завершения
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this._initDatabaseInternal(defaultCurrency);
    
    try {
      await this.initializationPromise;
    } catch (error) {
      // Сбрасываем состояние при ошибке
      this.isInitialized = false;
      throw error;
    }
  }

  private static async _initDatabaseInternal(defaultCurrency: string): Promise<void> {
    // Открываем базу данных если она еще не открыта
    if (!this.db && this.currentUserId) {
      try {
        const safeUserId = this.currentUserId.replace(/[^a-zA-Z0-9]/g, '_');
        const dbName = `cashcraft_${safeUserId}.db`;
        this.db = SQLite.openDatabaseSync(dbName);
        if (__DEV__) {
          console.log(`Database opened in _initDatabaseInternal: ${dbName}`);
        }
      } catch (error) {
        console.error('Failed to open database:', error);
        throw new Error('Failed to open database');
      }
    }
    
    const db = this.db;
    
    if (!db) {
      throw new Error('Database not opened');
    }
    
    try {
      // Добавляем задержку для Android, чтобы дать базе данных время инициализироваться
      if (__DEV__) {
        console.log('Waiting for database to fully initialize...');
      }
      
      // Увеличиваем задержку до 2 секунд для Android
      if (Platform.OS === 'android') {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Проверяем, что база данных действительно готова
      try {
        // Пытаемся выполнить простой запрос
        const testResult = db.getFirstSync('SELECT 1 as test');
        if (__DEV__) {
          console.log('Database test query result:', testResult);
        }
      } catch (testError) {
        if (__DEV__) {
          console.error('Database not ready yet, waiting more...', testError);
        }
        // Дополнительная задержка если база не готова
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Создаем таблицы используя безопасные операции
      this.safeExecSync(`
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
        this.safeExecSync(`ALTER TABLE accounts ADD COLUMN exchangeRate REAL DEFAULT 1`);
      } catch (error) {
        // Колонка уже существует, игнорируем ошибку
      }
      
      // Миграция: добавляем колонку linkedAccountId если её нет
      try {
        this.safeExecSync(`ALTER TABLE accounts ADD COLUMN linkedAccountId TEXT`);
      } catch (error) {
        // Колонка уже существует, игнорируем ошибку
      }
      
      // Миграция: добавляем колонку savedAmount если её нет
      try {
        this.safeExecSync(`ALTER TABLE accounts ADD COLUMN savedAmount REAL DEFAULT 0`);
      } catch (error) {
        // Колонка уже существует, игнорируем ошибку
      }

      this.safeExecSync(`
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
          syncedAt TEXT
        );
      `);

      this.safeExecSync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          syncedAt TEXT
        );
      `);

      this.safeExecSync(`
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
      this.safeExecSync(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lastSyncAt TEXT,
          syncToken TEXT
        );
      `);

      // Создаем таблицу для курсов валют
      this.safeExecSync(`
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
      this.safeExecSync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // Инициализируем настройки по умолчанию
      const existingRatesMode = this.safeGetFirstSync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        'exchangeRatesMode'
      );
      
      if (!existingRatesMode) {
        this.safeRunSync(
          'INSERT INTO settings (key, value) VALUES (?, ?)',
          'exchangeRatesMode', 'auto' // По умолчанию автоматический режим
        );
      }

      // Инициализируем базовые данные если это первый запуск
      const accountsCount = this.safeGetFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM accounts'
      )?.count || 0;

      if (accountsCount === 0) {
        // Создаем счет "Наличные" по умолчанию с валютой пользователя
        const now = new Date().toISOString();
        this.safeRunSync(
          `INSERT INTO accounts (id, name, type, balance, currency, isDefault, isIncludedInTotal, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          '1', 'Наличные', 'cash', 0, defaultCurrency, 1, 1, now, now
        );
      }

      // Проверяем и добавляем базовые категории если их нет
      const categoriesCount = this.safeGetFirstSync<{ count: number }>(
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
            this.safeRunSync(
              `INSERT OR IGNORE INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)`,
              cat.id, cat.name, cat.type, cat.icon, cat.color
            );
          } catch (error) {
            // Игнорируем ошибку, категория может уже существовать
          }
        });
      }
      
      this.isInitialized = true;
      if (__DEV__) {
        console.log('Database initialization completed successfully');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Database initialization failed:', error);
      }
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  // Метод для обновления валюты по умолчанию после инициализации
  static async updateDefaultCurrency(newCurrency: string): Promise<void> {
    if (!this.isDatabaseReady()) {
      return;
    }
    
    try {
      // Обновляем валюту в счете "Наличные" если он существует
      const cashAccount = this.safeGetFirstSync<{ id: string; currency: string }>(
        'SELECT id, currency FROM accounts WHERE name = ? AND type = ?',
        'Наличные', 'cash'
      );
      
      if (cashAccount && cashAccount.currency !== newCurrency) {
        this.safeRunSync(
          'UPDATE accounts SET currency = ? WHERE id = ?',
          newCurrency, cashAccount.id
        );
        console.log(`Updated default currency from ${cashAccount.currency} to ${newCurrency}`);
      }
    } catch (error) {
      console.error('Error updating default currency:', error);
    }
  }

  // Методы для работы со счетами
  static async getAccounts(): Promise<Account[]> {
    if (!this.db || !this.currentUserId) {
      return [];
    }
    const accounts = this.safeGetAllSync('SELECT * FROM accounts ORDER BY name') as Account[];
    return accounts;
  }

  static async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const id = Date.now().toString();
    const now = new Date().toISOString();

    if (account.isDefault) {
      this.safeRunSync('UPDATE accounts SET isDefault = 0');
    }

    this.safeRunSync(
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
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.isDefault === true) {
      this.safeRunSync('UPDATE accounts SET isDefault = 0');
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(new Date().toISOString(), id);
      this.safeRunSync(
        `UPDATE accounts SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
    }
  }

  static async deleteAccount(id: string): Promise<void> {
    this.safeRunSync('DELETE FROM transactions WHERE accountId = ?', id);
    this.safeRunSync('DELETE FROM accounts WHERE id = ?', id);
  }

  // Методы для работы с транзакциями
  static async getTransactions(): Promise<Transaction[]> {
    if (!this.db || !this.currentUserId) {
      return [];
    }
    return this.safeGetAllSync('SELECT * FROM transactions ORDER BY date DESC, createdAt DESC') as Transaction[];
  }

  static async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const id = Date.now().toString();
    const now = new Date().toISOString();

    // Создаем транзакцию
    this.safeRunSync(
      `INSERT INTO transactions (id, amount, type, accountId, categoryId, description, date, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, transaction.amount, transaction.type, transaction.accountId,
      transaction.categoryId || null, transaction.description || null,
      transaction.date, now, now
    );

    // Обновляем баланс счета
    const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
    this.safeRunSync(
      'UPDATE accounts SET balance = balance + ?, updatedAt = ? WHERE id = ?',
      balanceChange, now, transaction.accountId
    );

    return { ...transaction, id } as Transaction;
  }

  static async updateTransaction(id: string, oldTransaction: Transaction, updates: Partial<Transaction>): Promise<void> {
    const now = new Date().toISOString();

    // Отменяем старое изменение баланса
    const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
    this.safeRunSync(
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
      this.safeRunSync(
        `UPDATE transactions SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
    }

    // Применяем новое изменение баланса
    const newTransaction = { ...oldTransaction, ...updates };
    const newBalanceChange = newTransaction.type === 'income' ? newTransaction.amount : -newTransaction.amount;
    this.safeRunSync(
      'UPDATE accounts SET balance = balance + ?, updatedAt = ? WHERE id = ?',
      newBalanceChange, now, newTransaction.accountId
    );
  }

  static async deleteTransaction(transaction: Transaction): Promise<void> {
    const now = new Date().toISOString();

    // Удаляем транзакцию
    this.safeRunSync('DELETE FROM transactions WHERE id = ?', transaction.id);

    // Отменяем изменение баланса
    const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
    this.safeRunSync(
      'UPDATE accounts SET balance = balance + ?, updatedAt = ? WHERE id = ?',
      balanceChange, now, transaction.accountId
    );
  }

  // Методы для работы с категориями
  static async getCategories(): Promise<Category[]> {
    if (!this.db || !this.currentUserId) {
      return [];
    }
    return this.safeGetAllSync('SELECT * FROM categories ORDER BY name') as Category[];
  }

  static async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const id = Date.now().toString();

    this.safeRunSync(
      `INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)`,
      id, category.name, category.type, category.icon, category.color
    );

    return { ...category, id } as Category;
  }

  static async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
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
      this.safeRunSync(
        `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
        ...values
      );
    }
  }

  static async deleteCategory(id: string): Promise<void> {
    // Получаем тип категории
    const category = this.safeGetFirstSync<Category>('SELECT * FROM categories WHERE id = ?', id);
    if (!category) return;

    // Перемещаем транзакции в категорию "Другое"
    const otherId = category.type === 'income' ? 'other_income' : 'other_expense';
    this.safeRunSync('UPDATE transactions SET categoryId = ? WHERE categoryId = ?', otherId, id);
    
    // Удаляем категорию
    this.safeRunSync('DELETE FROM categories WHERE id = ?', id);
  }

  // Методы для работы с долгами
  static async getDebts(): Promise<Debt[]> {
    if (!this.db || !this.currentUserId) {
      // Не логируем предупреждение, так как это нормальная ситуация при инициализации
      return [];
    }
    return this.safeGetAllSync('SELECT * FROM debts ORDER BY createdAt DESC') as Debt[];
  }

  static async createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const id = Date.now().toString();
    const now = new Date().toISOString();

    this.safeRunSync(
      `INSERT INTO debts (id, type, name, amount, isIncludedInTotal, dueDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id, debt.type, debt.name, debt.amount, debt.isIncludedInTotal !== false ? 1 : 0,
      debt.dueDate || null, now, now
    );
  }

  static async updateDebt(id: string, updates: Partial<Debt>): Promise<void> {
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
      this.safeRunSync(
        `UPDATE debts SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
    }
  }

  static async deleteDebt(id: string): Promise<void> {
    this.safeRunSync('DELETE FROM debts WHERE id = ?', id);
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
    if (!this.isDatabaseReady()) {
      return null;
    }
    
    try {
      // Сначала проверяем локальную базу используя безопасный метод
      const result = this.safeGetFirstSync<{ rate: number }>(
        'SELECT rate FROM exchange_rates WHERE fromCurrency = ? AND toCurrency = ?',
        fromCurrency, toCurrency
      );
      
      if (result?.rate) {
        return result.rate;
      }
      
      // ВРЕМЕННО ОТКЛЮЧАЕМ АВТОЗАГРУЗКУ ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
      // TODO: Включить обратно после исправления проблем с базой данных
      /*
      // Если курса нет и включен автоматический режим, пытаемся загрузить из backend
      const mode = await this.getExchangeRatesMode();
      if (mode === 'auto') {
        try {
          const { ExchangeRateService } = await import('./exchangeRate');
          if (__DEV__) {
            console.log(`Auto-fetching rate for ${fromCurrency} -> ${toCurrency}`);
          }
          const rate = await ExchangeRateService.getRate(fromCurrency, toCurrency);
          if (rate && rate !== 1) {
            // Сохраняем полученный курс
            await this.saveExchangeRate(fromCurrency, toCurrency, rate);
            // Сохраняем обратный курс
            await this.saveExchangeRate(toCurrency, fromCurrency, 1 / rate);
            return rate;
          }
        } catch (error: any) {
          // Не показываем ошибку если это проблема с сетью
          if (__DEV__ && !error.message?.includes('timed out') && !error.message?.includes('Network request failed')) {
            console.error('Error fetching rate from backend:', error);
          }
        }
      }
      */
      
      return null;
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      return null;
    }
  }

  // Метод для получения курса только из локальной базы (без автозагрузки)
  static async getLocalExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (!this.isDatabaseReady()) {
      if (__DEV__) {
        console.log('getLocalExchangeRate: Database not ready');
      }
      return null;
    }
    
    const result = this.safeGetFirstSync<{ rate: number }>(
      'SELECT rate FROM exchange_rates WHERE fromCurrency = ? AND toCurrency = ?',
      fromCurrency, toCurrency
    );
    
    return result?.rate || null;
  }

  static async saveExchangeRate(fromCurrency: string, toCurrency: string, rate: number): Promise<void> {
    if (!this.isDatabaseReady()) {
      if (__DEV__) {
        console.log('saveExchangeRate: Database not ready');
      }
      return;
    }
    
    if (rate <= 0) {
      // Удаляем курс если rate <= 0
      this.safeRunSync(
        'DELETE FROM exchange_rates WHERE fromCurrency = ? AND toCurrency = ?',
        fromCurrency, toCurrency
      );
    } else {
      const id = `${fromCurrency}_${toCurrency}`;
      const now = new Date().toISOString();
      
      this.safeRunSync(
        `INSERT OR REPLACE INTO exchange_rates (id, fromCurrency, toCurrency, rate, updatedAt) 
         VALUES (?, ?, ?, ?, ?)`,
        id, fromCurrency, toCurrency, rate, now
      );
    }
  }

  static async getStoredRates(currency: string): Promise<{ [key: string]: number }> {
    if (!this.isDatabaseReady()) {
      return {};
    }
    
    const rates = this.safeGetAllSync<{ fromCurrency: string; toCurrency: string; rate: number }>(
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
    if (!this.isDatabaseReady()) {
      return null;
    }
    
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
    if (!this.isDatabaseReady()) {
      return 'auto';
    }
    
    const result = this.safeGetFirstSync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      'exchangeRatesMode'
    );
    return (result?.value as 'auto' | 'manual') || 'auto';
  }

  static async setExchangeRatesMode(mode: 'auto' | 'manual'): Promise<void> {
    if (!this.isDatabaseReady()) {
      return;
    }
    
    this.safeRunSync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      'exchangeRatesMode', mode
    );
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
      
      if (__DEV__) {
        console.log(`Updating rates for ${currencyPairs.length} currency pairs`);
      }
      
      // Загружаем курсы только для нужных пар
      for (const pair of currencyPairs) {
        try {
          const rate = await ExchangeRateService.getRate(pair.from, pair.to);
          if (rate) {
            await this.saveExchangeRate(pair.from, pair.to, rate);
            // Сохраняем и обратный курс
            await this.saveExchangeRate(pair.to, pair.from, 1 / rate);
          }
        } catch (error: any) {
          // Не показываем ошибки сети пользователю
          if (__DEV__ && !error.message?.includes('timed out') && !error.message?.includes('Network')) {
            console.error(`Error fetching rate for ${pair.from}-${pair.to}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error updating rates from backend:', error);
    }
  }

  // Получить время последнего обновления курсов
  static async getLastRatesUpdate(): Promise<Date | null> {
    if (!this.isDatabaseReady()) {
      return null;
    }
    
    const result = this.safeGetFirstSync(
      'SELECT MAX(updatedAt) as lastUpdate FROM exchange_rates'
    );
    
    if ((result as any)?.lastUpdate) {
      return new Date((result as any).lastUpdate);
    }
    
    return null;
  }

  // Получить все сохраненные курсы
  static async getAllExchangeRates(): Promise<{ [key: string]: { [key: string]: number } }> {
    if (!this.isDatabaseReady()) {
      return {};
    }
    
    const rates = this.safeGetAllSync<{ fromCurrency: string; toCurrency: string; rate: number }>(
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
  }

  // Получить все курсы валют для синхронизации
  static async getAllExchangeRatesForSync(): Promise<any[]> {
    if (!this.isDatabaseReady()) {
      return [];
    }
    
    const rates = this.safeGetAllSync<{ 
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
  }

  // Сохранить курсы валют из синхронизации
  static async saveExchangeRatesFromSync(rates: any[]): Promise<void> {
    if (!this.isDatabaseReady()) {
      return;
    }
    
    // Очищаем существующие курсы
    this.safeRunSync('DELETE FROM exchange_rates');
    
    // Вставляем новые курсы
    rates.forEach(rate => {
      const id = `${rate.from_currency}_${rate.to_currency}`;
      this.safeRunSync(
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
  }

  static async clearAllExchangeRates(): Promise<void> {
    if (!this.isDatabaseReady()) {
      return;
    }
    
    // Очищаем все курсы из базы
    this.safeRunSync('DELETE FROM exchange_rates');
    
    // Сбрасываем последнее время обновления
    await this.setLastRatesUpdate(null);
    
    console.log('All exchange rates cleared');
  }

  static async setLastRatesUpdate(lastUpdate: Date | null): Promise<void> {
    if (!this.isDatabaseReady()) {
      return;
    }
    
    if (lastUpdate) {
      this.safeRunSync(
        'INSERT INTO settings (key, value) VALUES (?, ?)',
        'lastRatesUpdate', lastUpdate.toISOString()
      );
    } else {
      this.safeRunSync('DELETE FROM settings WHERE key = ?', 'lastRatesUpdate');
    }
  }

  // Безопасные методы для работы с базой данных
  private static safeGetFirstSync<T>(query: string, ...params: any[]): T | null {
    try {
      if (!this.db) return null;
      return this.db.getFirstSync<T>(query, ...params);
    } catch (error) {
      if (__DEV__) {
        console.log('Safe database operation failed (getFirstSync):', error);
      }
      return null;
    }
  }

  private static safeGetAllSync<T>(query: string, ...params: any[]): T[] {
    try {
      if (!this.db) return [];
      return this.db.getAllSync<T>(query, ...params);
    } catch (error) {
      if (__DEV__) {
        console.log('Safe database operation failed (getAllSync):', error);
      }
      return [];
    }
  }

  private static safeRunSync(query: string, ...params: any[]): void {
    try {
      if (!this.db) return;
      this.db.runSync(query, ...params);
    } catch (error) {
      if (__DEV__) {
        console.log('Safe database operation failed (runSync):', error);
      }
    }
  }

  private static safeExecSync(sql: string): void {
    try {
      if (!this.db) return;
      this.db.execSync(sql);
    } catch (error) {
      if (__DEV__) {
        console.log('Safe database operation failed (execSync):', error);
      }
    }
  }
} 