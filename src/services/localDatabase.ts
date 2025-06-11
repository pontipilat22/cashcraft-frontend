import * as SQLite from 'expo-sqlite';
import { Account, Transaction, Category, Debt } from '../types';

export class LocalDatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;
  private static currentUserId: string | null = null;

  static setUserId(userId: string | null) {
    this.currentUserId = userId;
    if (userId) {
      // Открываем базу данных для конкретного пользователя
      const safeUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
      this.db = SQLite.openDatabaseSync(`cashcraft_${safeUserId}.db`);
    } else {
      this.db = null;
    }
  }

  private static getDb(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call setUserId first.');
    }
    return this.db;
  }

  static async initDatabase(defaultCurrency: string = 'USD'): Promise<void> {
    if (!this.db || !this.currentUserId) {
      console.warn('Database not initialized. Call setUserId first.');
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

        // Добавляем базовые категории
        const categories = [
          // Доходы
          { id: 'salary', name: 'Зарплата', type: 'income', icon: 'cash-outline', color: '#4CAF50' },
          { id: 'business', name: 'Бизнес', type: 'income', icon: 'briefcase-outline', color: '#2196F3' },
          { id: 'investments', name: 'Инвестиции', type: 'income', icon: 'trending-up-outline', color: '#FF9800' },
          { id: 'other_income', name: 'Другое', type: 'income', icon: 'add-circle-outline', color: '#9C27B0' },
          // Расходы
          { id: 'food', name: 'Продукты', type: 'expense', icon: 'cart-outline', color: '#F44336' },
          { id: 'transport', name: 'Транспорт', type: 'expense', icon: 'car-outline', color: '#3F51B5' },
          { id: 'housing', name: 'Жилье', type: 'expense', icon: 'home-outline', color: '#009688' },
          { id: 'entertainment', name: 'Развлечения', type: 'expense', icon: 'game-controller-outline', color: '#E91E63' },
          { id: 'health', name: 'Здоровье', type: 'expense', icon: 'fitness-outline', color: '#4CAF50' },
          { id: 'shopping', name: 'Покупки', type: 'expense', icon: 'bag-outline', color: '#9C27B0' },
          { id: 'other_expense', name: 'Другое', type: 'expense', icon: 'ellipsis-horizontal-outline', color: '#607D8B' },
        ];

        categories.forEach(cat => {
          db.runSync(
            `INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)`,
            cat.id, cat.name, cat.type, cat.icon, cat.color
          );
        });
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  // Методы для работы со счетами
  static async getAccounts(): Promise<Account[]> {
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
       targetAmount, creditStartDate, creditTerm, creditRate, creditPaymentType, creditInitialAmount, 
       createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, account.name, account.type, account.balance || 0, account.currency || 'USD', 
      (account as any).exchangeRate || 1, account.cardNumber || null,
      account.icon || null, account.isDefault ? 1 : 0, account.isIncludedInTotal !== false ? 1 : 0,
      account.targetAmount || null, account.creditStartDate || null, account.creditTerm || null,
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
    const db = this.getDb();
    
    // Удаляем все данные
    db.runSync('DELETE FROM transactions');
    db.runSync('DELETE FROM debts');
    db.runSync('DELETE FROM accounts');
    db.runSync('DELETE FROM categories');
    db.runSync('DELETE FROM sync_metadata');
    
    // Пересоздаем базовые данные
    await this.initDatabase(defaultCurrency);
  }

  // Методы для синхронизации
  static async getLastSyncTime(): Promise<string | null> {
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
  }> {
    const db = this.getDb();
    const lastSync = await this.getLastSyncTime();
    
    const syncCondition = lastSync 
      ? `WHERE syncedAt IS NULL OR updatedAt > '${lastSync}'`
      : '';

    return {
      accounts: db.getAllSync(`SELECT * FROM accounts ${syncCondition}`) as Account[],
      transactions: db.getAllSync(`SELECT * FROM transactions ${syncCondition}`) as Transaction[],
      categories: db.getAllSync(`SELECT * FROM categories ${syncCondition}`) as Category[],
      debts: db.getAllSync(`SELECT * FROM debts ${syncCondition}`) as Debt[],
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
} 