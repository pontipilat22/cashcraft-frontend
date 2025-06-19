import * as SQLite from 'expo-sqlite';
import { Account, Transaction, Category, Debt } from '../types';

let db: SQLite.SQLiteDatabase | null = null;
let currentUserId: string | null = null;

export class DatabaseService {
  static setUserId(userId: string | null) {
    currentUserId = userId;
    if (userId) {
      // Открываем базу данных для конкретного пользователя
      db = SQLite.openDatabaseSync(`cashcraft_${userId.replace(/[^a-zA-Z0-9]/g, '_')}.db`);
    }
  }

  private static getDb(): SQLite.SQLiteDatabase {
    if (!db) {
      throw new Error('Database not initialized. Call setUserId first.');
    }
    return db;
  }

  static async initDatabase() {
    if (!db || !currentUserId) {
      console.warn('Database not initialized. Call setUserId first.');
      return;
    }
    return new Promise<void>((resolve) => {
      try {
        const database = this.getDb();
        // Создаем таблицу счетов
        database.execSync(
          `CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            balance REAL DEFAULT 0,
            currency TEXT DEFAULT 'RUB',
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
          );`
        );
        
        // Добавляем новые колонки в существующую таблицу
        try {
          database.execSync('ALTER TABLE accounts ADD COLUMN isDefault INTEGER DEFAULT 0');
        } catch (e) {}
        try {
          database.execSync('ALTER TABLE accounts ADD COLUMN isIncludedInTotal INTEGER DEFAULT 1');
        } catch (e) {}
        try {
          database.execSync('ALTER TABLE accounts ADD COLUMN targetAmount REAL');
        } catch (e) {}

        // Создаем таблицу транзакций
        database.execSync(
          `CREATE TABLE IF NOT EXISTS transactions (
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
          );`
        );

        // Создаем таблицу категорий
        database.execSync(
          `CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            icon TEXT NOT NULL,
            color TEXT NOT NULL
          );`
        );

        // Создаем таблицу долгов
        database.execSync(`
          CREATE TABLE IF NOT EXISTS debts (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            isIncludedInTotal INTEGER DEFAULT 1,
            dueDate TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
          )
        `);
        
        // Проверяем, есть ли колонка dueDate в таблице debts (для миграции)
        try {
          const tableInfo = database.getAllSync("PRAGMA table_info(debts)");
          const hasDueDateColumn = tableInfo.some((col: any) => col.name === 'dueDate');
          
          if (!hasDueDateColumn) {
            // Добавляем колонку dueDate в существующую таблицу
            database.execSync('ALTER TABLE debts ADD COLUMN dueDate TEXT');
            console.log('Added dueDate column to debts table');
          }
        } catch (error) {
          console.error('Error checking/adding dueDate column:', error);
        }

        // Проверяем и добавляем колонки для кредитов
        try {
          const accountsTableInfo = database.getAllSync("PRAGMA table_info(accounts)");
          const columns = accountsTableInfo.map((col: any) => col.name);
          
          if (!columns.includes('creditStartDate')) {
            database.execSync('ALTER TABLE accounts ADD COLUMN creditStartDate TEXT');
          }
          if (!columns.includes('creditTerm')) {
            database.execSync('ALTER TABLE accounts ADD COLUMN creditTerm INTEGER');
          }
          if (!columns.includes('creditRate')) {
            database.execSync('ALTER TABLE accounts ADD COLUMN creditRate REAL');
          }
          if (!columns.includes('creditPaymentType')) {
            database.execSync('ALTER TABLE accounts ADD COLUMN creditPaymentType TEXT');
          }
          if (!columns.includes('creditInitialAmount')) {
            database.execSync('ALTER TABLE accounts ADD COLUMN creditInitialAmount REAL');
          }
          if (!columns.includes('targetAmount')) {
            database.execSync('ALTER TABLE accounts ADD COLUMN targetAmount REAL');
          }
        } catch (error) {
          console.error('Error adding credit columns:', error);
        }

        // Проверяем, есть ли счета в БД
        const accounts = database.getAllSync('SELECT COUNT(*) as count FROM accounts');
        const accountCount = (accounts[0] as any).count;
        
        // Если счетов нет, создаем счет "Наличные" по умолчанию
        if (accountCount === 0) {
          const now = new Date().toISOString();
          database.runSync(
            `INSERT INTO accounts (id, name, type, balance, currency, isDefault, isIncludedInTotal, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            '1',
            'Наличные',
            'cash',
            1000,
            'RUB',
            1,
            1,
            now,
            now
          );
          
          // Создаем пример транзакции "Зарплата"
          database.runSync(
            `INSERT INTO transactions (id, amount, type, accountId, categoryId, description, date, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            '1',
            1000,
            'income',
            '1',
            'salary',
            'Зарплата',
            now,
            now,
            now
          );
        }

        // Проверяем, есть ли категории в БД
        const categories = database.getAllSync('SELECT COUNT(*) as count FROM categories');
        const categoryCount = (categories[0] as any).count;
        
        // Если категорий нет, создаем базовые категории
        if (categoryCount === 0) {
          const baseCategories = [
            // Категории доходов
            { id: 'salary', name: 'salary', type: 'income', icon: 'cash-outline', color: '#4CAF50' },
            { id: 'business', name: 'business', type: 'income', icon: 'briefcase-outline', color: '#2196F3' },
            { id: 'investments', name: 'investments', type: 'income', icon: 'trending-up-outline', color: '#FF9800' },
            { id: 'other_income', name: 'other_income', type: 'income', icon: 'add-circle-outline', color: '#9C27B0' },
            
            // Категории расходов
            { id: 'food', name: 'food', type: 'expense', icon: 'cart-outline', color: '#F44336' },
            { id: 'transport', name: 'transport', type: 'expense', icon: 'car-outline', color: '#3F51B5' },
            { id: 'housing', name: 'housing', type: 'expense', icon: 'home-outline', color: '#009688' },
            { id: 'entertainment', name: 'entertainment', type: 'expense', icon: 'game-controller-outline', color: '#E91E63' },
            { id: 'health', name: 'health', type: 'expense', icon: 'fitness-outline', color: '#4CAF50' },
            { id: 'shopping', name: 'shopping', type: 'expense', icon: 'bag-outline', color: '#9C27B0' },
            { id: 'other_expense', name: 'other_expense', type: 'expense', icon: 'ellipsis-horizontal-outline', color: '#607D8B' },
          ];
          
          baseCategories.forEach(category => {
            database.runSync(
              `INSERT INTO categories (id, name, type, icon, color)
               VALUES (?, ?, ?, ?, ?)`,
              category.id,
              category.name,
              category.type,
              category.icon,
              category.color
            );
          });
        }

        resolve();
      } catch (error) {
        console.error('Error initializing database:', error);
        resolve();
      }
    });
  }

  // Счета
  static async getAccounts(): Promise<Account[]> {
    try {
      const database = this.getDb();
      const result = database.getAllSync('SELECT * FROM accounts ORDER BY createdAt DESC');
      return result as Account[];
    } catch (error) {
      console.error('Error getting accounts:', error);
      return [];
    }
  }

  static async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    const database = this.getDb();
    
    try {
      // Если это первый счет или isDefault = true, убираем флаг default у других счетов
      if (account.isDefault) {
        database.runSync('UPDATE accounts SET isDefault = 0');
      }
      
      // Проверяем есть ли уже счета
      const accountsCount = (database.getAllSync('SELECT COUNT(*) as count FROM accounts')[0] as any).count;
      const shouldBeDefault = accountsCount === 0 || account.isDefault;
      
      database.runSync(
        `INSERT INTO accounts (id, name, type, balance, cardNumber, icon, isDefault, isIncludedInTotal, createdAt, updatedAt, targetAmount, creditStartDate, creditTerm, creditRate, creditPaymentType, creditInitialAmount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        account.name,
        account.type,
        account.balance || 0,
        account.cardNumber || null,
        account.icon || null,
        shouldBeDefault ? 1 : 0,
        account.isIncludedInTotal !== false ? 1 : 0,
        now,
        now,
        account.targetAmount !== undefined ? account.targetAmount : null,
        account.creditStartDate || null,
        account.creditTerm || null,
        account.creditRate || null,
        account.creditPaymentType || null,
        account.creditInitialAmount || null
      );

      const newAccount: Account = {
        id,
        name: account.name,
        type: account.type,
        balance: account.balance || 0,
        cardNumber: account.cardNumber || undefined,
        icon: account.icon || undefined,
        isDefault: shouldBeDefault,
        isIncludedInTotal: account.isIncludedInTotal !== false,
        targetAmount: account.targetAmount || undefined,
        creditStartDate: account.creditStartDate || undefined,
        creditTerm: account.creditTerm || undefined,
        creditRate: account.creditRate !== undefined ? account.creditRate : undefined,
        creditPaymentType: account.creditPaymentType || undefined,
        creditInitialAmount: account.creditInitialAmount || undefined,
        createdAt: now,
        updatedAt: now,
      };
      
      return newAccount;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  static async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    const database = this.getDb();
    
    // Если устанавливаем этот счет как default, убираем флаг у других
    if (updates.isDefault === true) {
      database.runSync('UPDATE accounts SET isDefault = 0');
    }
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        if (key === 'isDefault' || key === 'isIncludedInTotal') {
          fields.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });
    
    values.push(now, id);
    
    try {
      database.runSync(
        `UPDATE accounts SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  static async deleteAccount(id: string): Promise<void> {
    const database = this.getDb();
    try {
      database.runSync('DELETE FROM accounts WHERE id = ?', id);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  // Транзакции
  static async getTransactions(accountId?: string): Promise<Transaction[]> {
    const database = this.getDb();
    try {
      const query = accountId
        ? 'SELECT * FROM transactions WHERE accountId = ? ORDER BY date DESC, createdAt DESC'
        : 'SELECT * FROM transactions ORDER BY date DESC, createdAt DESC';
      
      const result = accountId 
        ? database.getAllSync(query, accountId)
        : database.getAllSync(query);
      
      return result as Transaction[];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  static async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    const database = this.getDb();
    
    try {
      // Создаем транзакцию
      database.runSync(
        `INSERT INTO transactions (id, amount, type, accountId, categoryId, description, date, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        transaction.amount,
        transaction.type,
        transaction.accountId,
        transaction.categoryId || null,
        transaction.description || null,
        transaction.date,
        now,
        now
      );

      // Обновляем баланс счета
      const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
      database.runSync(
        'UPDATE accounts SET balance = balance + ?, updatedAt = ? WHERE id = ?',
        balanceChange,
        now,
        transaction.accountId
      );

      const newTransaction: Transaction = {
        ...transaction,
        id,
      };
      
      return newTransaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  static async updateTransaction(id: string, oldTransaction: Transaction, updates: Partial<Transaction>): Promise<void> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    const database = this.getDb();
    
    // Подготавливаем поля для обновления
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return;
    
    values.push(now, id);
    
    try {
      // Обновляем транзакцию
      database.runSync(
        `UPDATE transactions SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
      
      // Если изменилась сумма или тип, обновляем балансы счетов
      if (updates.amount !== undefined || updates.type !== undefined || updates.accountId !== undefined) {
        // Отменяем старую транзакцию
        const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
        database.runSync(
          'UPDATE accounts SET balance = balance + ?, updatedAt = ? WHERE id = ?',
          oldBalanceChange,
          now,
          oldTransaction.accountId
        );
        
        // Применяем новую транзакцию
        const newAmount = updates.amount ?? oldTransaction.amount;
        const newType = updates.type ?? oldTransaction.type;
        const newAccountId = updates.accountId ?? oldTransaction.accountId;
        const newBalanceChange = newType === 'income' ? newAmount : -newAmount;
        
        database.runSync(
          'UPDATE accounts SET balance = balance + ?, updatedAt = ? WHERE id = ?',
          newBalanceChange,
          now,
          newAccountId
        );
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  static async deleteTransaction(transaction: Transaction): Promise<void> {
    const now = new Date().toISOString();
    const database = this.getDb();
    
    try {
      // Удаляем транзакцию
      database.runSync('DELETE FROM transactions WHERE id = ?', transaction.id);
      
      // Отменяем изменение баланса
      const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      database.runSync(
        'UPDATE accounts SET balance = balance + ?, updatedAt = ? WHERE id = ?',
        balanceChange,
        now,
        transaction.accountId
      );
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Синхронизация (заглушка для будущей реализации)
  static async syncData(): Promise<void> {
    // TODO: Реализовать синхронизацию с облаком
    console.log('Syncing data...');
  }

  // Добавляем методы для работы с категориями
  static async getCategories(): Promise<Category[]> {
    const database = this.getDb();
    try {
      const result = database.getAllSync('SELECT * FROM categories ORDER BY name');
      return result as Category[];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }
  
  static async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const id = Date.now().toString();
    const database = this.getDb();
    
    try {
      database.runSync(
        `INSERT INTO categories (id, name, type, icon, color)
         VALUES (?, ?, ?, ?, ?)`,
        id,
        category.name,
        category.type,
        category.icon,
        category.color
      );
      
      return { ...category, id };
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }
  
  static async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    const database = this.getDb();
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return;
    
    values.push(id);
    
    try {
      database.runSync(
        `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
        ...values
      );
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }
  
  static async deleteCategory(id: string): Promise<void> {
    const database = this.getDb();
    try {
      // Получаем информацию о категории для определения типа
      const category = database.getFirstSync('SELECT type FROM categories WHERE id = ?', id) as Category;
      if (!category) return;
      
      // Определяем ID категории "Другое" в зависимости от типа
      const otherId = category.type === 'income' ? 'other_income' : 'other_expense';
      
      // Обновляем все транзакции с этой категорией на "Другое"
      database.runSync(
        'UPDATE transactions SET categoryId = ? WHERE categoryId = ?',
        otherId,
        id
      );
      
      // Удаляем категорию
      database.runSync('DELETE FROM categories WHERE id = ?', id);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
  
  // Сброс всех данных
  static async resetAllData(): Promise<void> {
    const database = this.getDb();
    try {
      // Удаляем все транзакции
      database.runSync('DELETE FROM transactions');
      
      // Удаляем все счета
      database.runSync('DELETE FROM accounts');
      
      // Удаляем все долги
      database.runSync('DELETE FROM debts');
      
      // Удаляем все пользовательские категории (оставляем только базовые)
      database.runSync(`DELETE FROM categories WHERE id NOT IN (
        'salary', 'business', 'investments', 'other_income',
        'food', 'transport', 'housing', 'entertainment', 
        'health', 'shopping', 'other_expense'
      )`);
      
      // Создаем счет "Наличные" по умолчанию
      const now = new Date().toISOString();
      database.runSync(
        `INSERT INTO accounts (id, name, type, balance, currency, isDefault, isIncludedInTotal, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        '1',
        'Наличные',
        'cash',
        0,
        'RUB',
        1,
        1,
        now,
        now
      );
    } catch (error) {
      console.error('Error resetting data:', error);
      throw error;
    }
  }

  // Долги
  static async getDebts(): Promise<any[]> {
    const database = this.getDb();
    try {
      const result = database.getAllSync('SELECT * FROM debts ORDER BY createdAt DESC');
      return result.map((debt: any) => ({
        ...debt,
        isIncludedInTotal: debt.isIncludedInTotal === 1
      }));
    } catch (error) {
      console.error('Error getting debts:', error);
      return [];
    }
  }

  static async createDebt(debt: { type: 'owe' | 'owed'; name: string; amount: number; isIncludedInTotal?: boolean; dueDate?: string }): Promise<void> {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    const database = this.getDb();
    
    try {
      database.runSync(
        `INSERT INTO debts (id, type, name, amount, isIncludedInTotal, dueDate, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        debt.type,
        debt.name,
        debt.amount,
        debt.isIncludedInTotal !== false ? 1 : 0,
        debt.dueDate || null,
        now,
        now
      );
    } catch (error) {
      console.error('Error creating debt:', error);
      throw error;
    }
  }

  static async updateDebt(id: string, updates: { name?: string; amount?: number; dueDate?: string; isIncludedInTotal?: boolean }): Promise<void> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    const database = this.getDb();
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.dueDate !== undefined) {
      fields.push('dueDate = ?');
      values.push(updates.dueDate);
    }
    if (updates.isIncludedInTotal !== undefined) {
      fields.push('isIncludedInTotal = ?');
      values.push(updates.isIncludedInTotal ? 1 : 0);
    }
    
    if (fields.length === 0) return;
    
    values.push(now, id);
    
    try {
      database.runSync(
        `UPDATE debts SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
    } catch (error) {
      console.error('Error updating debt:', error);
      throw error;
    }
  }

  static async deleteDebt(id: string): Promise<void> {
    const database = this.getDb();
    try {
      database.runSync('DELETE FROM debts WHERE id = ?', id);
    } catch (error) {
      console.error('Error deleting debt:', error);
      throw error;
    }
  }

  static async getAllExchangeRates(): Promise<{ [key: string]: { [key: string]: number } }> {
    const database = this.getDb();
    
    try {
      const rates = database.getAllSync<{ fromCurrency: string; toCurrency: string; rate: number }>(
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

  static async clearAllExchangeRates(): Promise<void> {
    const database = this.getDb();
    
    try {
      database.runSync('DELETE FROM exchange_rates');
      console.log('All exchange rates cleared from database');
    } catch (error) {
      console.error('Error clearing exchange rates:', error);
    }
  }
} 