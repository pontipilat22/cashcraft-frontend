import * as SQLite from 'expo-sqlite';
import { Account, Transaction, Category } from '../types';

const db = SQLite.openDatabaseSync('cashcraft.db');

export class DatabaseService {
  static async initDatabase() {
    return new Promise<void>((resolve) => {
      try {
        // Создаем таблицу счетов
        db.execSync(
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
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            syncedAt TEXT
          );`
        );
        
        // Добавляем новые колонки в существующую таблицу
        try {
          db.execSync('ALTER TABLE accounts ADD COLUMN isDefault INTEGER DEFAULT 0');
        } catch (e) {}
        try {
          db.execSync('ALTER TABLE accounts ADD COLUMN isIncludedInTotal INTEGER DEFAULT 1');
        } catch (e) {}
        try {
          db.execSync('ALTER TABLE accounts ADD COLUMN targetAmount REAL');
        } catch (e) {}

        // Создаем таблицу транзакций
        db.execSync(
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
        db.execSync(
          `CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            icon TEXT NOT NULL,
            color TEXT NOT NULL
          );`
        );

        // Создаем таблицу долгов
        db.execSync(
          `CREATE TABLE IF NOT EXISTS debts (
            id TEXT PRIMARY KEY NOT NULL,
            type TEXT NOT NULL, -- 'owe' (я должен) или 'owed' (мне должны)
            name TEXT NOT NULL, -- имя человека
            amount REAL NOT NULL,
            isIncludedInTotal INTEGER DEFAULT 1,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
          );`
        );

        // Проверяем, есть ли счета в БД
        const accounts = db.getAllSync('SELECT COUNT(*) as count FROM accounts');
        const accountCount = (accounts[0] as any).count;
        
        // Если счетов нет, создаем счет "Наличные" по умолчанию
        if (accountCount === 0) {
          const now = new Date().toISOString();
          db.runSync(
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
          db.runSync(
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
        const categories = db.getAllSync('SELECT COUNT(*) as count FROM categories');
        const categoryCount = (categories[0] as any).count;
        
        // Если категорий нет, создаем базовые категории
        if (categoryCount === 0) {
          const baseCategories = [
            // Категории доходов
            { id: 'salary', name: 'Зарплата', type: 'income', icon: 'cash-outline', color: '#4CAF50' },
            { id: 'business', name: 'Бизнес', type: 'income', icon: 'briefcase-outline', color: '#2196F3' },
            { id: 'investments', name: 'Инвестиции', type: 'income', icon: 'trending-up-outline', color: '#FF9800' },
            { id: 'other_income', name: 'Другое', type: 'income', icon: 'add-circle-outline', color: '#9C27B0' },
            
            // Категории расходов
            { id: 'food', name: 'Продукты', type: 'expense', icon: 'cart-outline', color: '#F44336' },
            { id: 'transport', name: 'Транспорт', type: 'expense', icon: 'car-outline', color: '#3F51B5' },
            { id: 'housing', name: 'Жилье', type: 'expense', icon: 'home-outline', color: '#009688' },
            { id: 'entertainment', name: 'Развлечения', type: 'expense', icon: 'game-controller-outline', color: '#E91E63' },
            { id: 'health', name: 'Здоровье', type: 'expense', icon: 'fitness-outline', color: '#4CAF50' },
            { id: 'shopping', name: 'Покупки', type: 'expense', icon: 'bag-outline', color: '#9C27B0' },
            { id: 'other_expense', name: 'Другое', type: 'expense', icon: 'ellipsis-horizontal-outline', color: '#607D8B' },
          ];
          
          baseCategories.forEach(category => {
            db.runSync(
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
      const result = db.getAllSync('SELECT * FROM accounts ORDER BY createdAt DESC');
      return result as Account[];
    } catch (error) {
      console.error('Error getting accounts:', error);
      return [];
    }
  }

  static async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    try {
      // Если это первый счет или isDefault = true, убираем флаг default у других счетов
      if (account.isDefault) {
        db.runSync('UPDATE accounts SET isDefault = 0');
      }
      
      // Проверяем есть ли уже счета
      const accountsCount = (db.getAllSync('SELECT COUNT(*) as count FROM accounts')[0] as any).count;
      const shouldBeDefault = accountsCount === 0 || account.isDefault;
      
      db.runSync(
        `INSERT INTO accounts (id, name, type, balance, cardNumber, icon, isDefault, isIncludedInTotal, createdAt, updatedAt, targetAmount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        account.targetAmount !== undefined ? account.targetAmount : null
      );

      const newAccount: Account = {
        ...account,
        id,
        balance: account.balance || 0,
        isDefault: shouldBeDefault,
        isIncludedInTotal: account.isIncludedInTotal !== false,
        targetAmount: account.targetAmount !== undefined ? account.targetAmount : undefined,
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
    
    // Если устанавливаем этот счет как default, убираем флаг у других
    if (updates.isDefault === true) {
      db.runSync('UPDATE accounts SET isDefault = 0');
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
      db.runSync(
        `UPDATE accounts SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  static async deleteAccount(id: string): Promise<void> {
    try {
      db.runSync('DELETE FROM accounts WHERE id = ?', id);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  // Транзакции
  static async getTransactions(accountId?: string): Promise<Transaction[]> {
    try {
      const query = accountId
        ? 'SELECT * FROM transactions WHERE accountId = ? ORDER BY date DESC, createdAt DESC'
        : 'SELECT * FROM transactions ORDER BY date DESC, createdAt DESC';
      
      const result = accountId 
        ? db.getAllSync(query, accountId)
        : db.getAllSync(query);
      
      return result as Transaction[];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  static async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    try {
      // Создаем транзакцию
      db.runSync(
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
      db.runSync(
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
      db.runSync(
        `UPDATE transactions SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
      
      // Если изменилась сумма или тип, обновляем балансы счетов
      if (updates.amount !== undefined || updates.type !== undefined || updates.accountId !== undefined) {
        // Отменяем старую транзакцию
        const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
        db.runSync(
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
        
        db.runSync(
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
    
    try {
      // Удаляем транзакцию
      db.runSync('DELETE FROM transactions WHERE id = ?', transaction.id);
      
      // Отменяем изменение баланса
      const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      db.runSync(
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
    try {
      const result = db.getAllSync('SELECT * FROM categories ORDER BY name');
      return result as Category[];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }
  
  static async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const id = Date.now().toString();
    
    try {
      db.runSync(
        `INSERT INTO categories (id, name, type, icon, color)
         VALUES (?, ?, ?, ?, ?)`,
        id,
        category.name,
        category.type,
        category.icon,
        category.color
      );
      
      const newCategory: Category = {
        ...category,
        id
      };
      
      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
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
    
    if (fields.length === 0) return;
    
    values.push(id);
    
    try {
      db.runSync(
        `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
        ...values
      );
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }
  
  static async deleteCategory(id: string): Promise<void> {
    try {
      // Получаем информацию о категории для определения типа
      const category = db.getFirstSync('SELECT type FROM categories WHERE id = ?', id) as Category;
      if (!category) return;
      
      // Определяем ID категории "Другое" в зависимости от типа
      const otherId = category.type === 'income' ? 'other_income' : 'other_expense';
      
      // Обновляем все транзакции с этой категорией на "Другое"
      db.runSync(
        'UPDATE transactions SET categoryId = ? WHERE categoryId = ?',
        otherId,
        id
      );
      
      // Удаляем категорию
      db.runSync('DELETE FROM categories WHERE id = ?', id);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
  
  // Сброс всех данных
  static async resetAllData(): Promise<void> {
    try {
      // Удаляем все транзакции
      db.runSync('DELETE FROM transactions');
      
      // Удаляем все счета
      db.runSync('DELETE FROM accounts');
      
      // Удаляем все долги
      db.runSync('DELETE FROM debts');
      
      // Удаляем все пользовательские категории (оставляем только базовые)
      db.runSync(`DELETE FROM categories WHERE id NOT IN (
        'salary', 'business', 'investments', 'other_income',
        'food', 'transport', 'housing', 'entertainment', 
        'health', 'shopping', 'other_expense'
      )`);
      
      // Создаем счет "Наличные" по умолчанию
      const now = new Date().toISOString();
      db.runSync(
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
    try {
      const result = db.getAllSync('SELECT * FROM debts ORDER BY createdAt DESC');
      return result;
    } catch (error) {
      console.error('Error getting debts:', error);
      return [];
    }
  }

  static async createDebt(debt: { type: 'owe' | 'owed'; name: string; amount: number; isIncludedInTotal?: boolean }): Promise<void> {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    try {
      db.runSync(
        `INSERT INTO debts (id, type, name, amount, isIncludedInTotal, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)` ,
        id,
        debt.type,
        debt.name,
        debt.amount,
        debt.isIncludedInTotal !== false ? 1 : 0,
        now,
        now
      );
    } catch (error) {
      console.error('Error creating debt:', error);
      throw error;
    }
  }

  static async updateDebt(id: string, updates: { name?: string; amount?: number }): Promise<void> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });
    
    if (fields.length === 0) return;
    
    values.push(now, id);
    
    try {
      db.runSync(
        `UPDATE debts SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
        ...values
      );
    } catch (error) {
      console.error('Error updating debt:', error);
      throw error;
    }
  }

  static async deleteDebt(id: string): Promise<void> {
    try {
      db.runSync('DELETE FROM debts WHERE id = ?', id);
    } catch (error) {
      console.error('Error deleting debt:', error);
      throw error;
    }
  }
} 