import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Transaction, Category, Debt } from '../types';

interface UserData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
}

const DEFAULT_CATEGORIES: Category[] = [
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

export class UserDataService {
  private static currentUserId: string | null = null;

  static setUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  private static getUserDataKey(): string {
    if (!this.currentUserId) {
      throw new Error('User ID not set');
    }
    // Заменяем символы которые могут быть проблемными в ключах AsyncStorage
    const safeUserId = this.currentUserId.replace(/[^a-zA-Z0-9]/g, '_');
    return `userData_${safeUserId}`;
  }

  static async initializeUserData(): Promise<void> {
    try {
      const userDataKey = this.getUserDataKey();
      const existingData = await AsyncStorage.getItem(userDataKey);
      
      if (!existingData) {
        // Создаем начальные данные для нового пользователя
        const initialData: UserData = {
          accounts: [{
            id: '1',
            name: 'Наличные',
            type: 'cash',
            balance: 0,
            isDefault: true,
            isIncludedInTotal: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
          transactions: [],
          categories: DEFAULT_CATEGORIES,
          debts: [],
        };
        
        await AsyncStorage.setItem(userDataKey, JSON.stringify(initialData));
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
    }
  }

  static async getUserData(): Promise<UserData> {
    try {
      const userDataKey = this.getUserDataKey();
      const data = await AsyncStorage.getItem(userDataKey);
      
      if (data) {
        return JSON.parse(data);
      }
      
      // Если данных нет, инициализируем
      await this.initializeUserData();
      const newData = await AsyncStorage.getItem(userDataKey);
      return newData ? JSON.parse(newData) : { accounts: [], transactions: [], categories: [], debts: [] };
    } catch (error) {
      console.error('Error getting user data:', error);
      return { accounts: [], transactions: [], categories: [], debts: [] };
    }
  }

  static async saveUserData(data: UserData): Promise<void> {
    try {
      const userDataKey = this.getUserDataKey();
      await AsyncStorage.setItem(userDataKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  // Методы для работы со счетами
  static async getAccounts(): Promise<Account[]> {
    const userData = await this.getUserData();
    return userData.accounts;
  }

  static async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const userData = await this.getUserData();
    const newAccount: Account = {
      ...account,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Если это первый счет или isDefault = true, убираем флаг default у других
    if (account.isDefault || userData.accounts.length === 0) {
      userData.accounts = userData.accounts.map(acc => ({ ...acc, isDefault: false }));
      newAccount.isDefault = true;
    }
    
    userData.accounts.push(newAccount);
    await this.saveUserData(userData);
    return newAccount;
  }

  static async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    const userData = await this.getUserData();
    
    // Если устанавливаем isDefault, убираем у других
    if (updates.isDefault === true) {
      userData.accounts = userData.accounts.map(acc => ({ ...acc, isDefault: false }));
    }
    
    userData.accounts = userData.accounts.map(acc => 
      acc.id === id 
        ? { ...acc, ...updates, updatedAt: new Date().toISOString() }
        : acc
    );
    
    await this.saveUserData(userData);
  }

  static async deleteAccount(id: string): Promise<void> {
    const userData = await this.getUserData();
    userData.accounts = userData.accounts.filter(acc => acc.id !== id);
    userData.transactions = userData.transactions.filter(trans => trans.accountId !== id);
    await this.saveUserData(userData);
  }

  // Методы для работы с транзакциями
  static async getTransactions(): Promise<Transaction[]> {
    const userData = await this.getUserData();
    return userData.transactions;
  }

  static async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const userData = await this.getUserData();
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    
    // Обновляем баланс счета
    const accountIndex = userData.accounts.findIndex(acc => acc.id === transaction.accountId);
    if (accountIndex !== -1) {
      const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
      userData.accounts[accountIndex].balance += balanceChange;
      userData.accounts[accountIndex].updatedAt = new Date().toISOString();
    }
    
    userData.transactions.push(newTransaction);
    await this.saveUserData(userData);
    return newTransaction;
  }

  static async updateTransaction(id: string, oldTransaction: Transaction, updates: Partial<Transaction>): Promise<void> {
    const userData = await this.getUserData();
    
    // Находим транзакцию
    const transIndex = userData.transactions.findIndex(t => t.id === id);
    if (transIndex === -1) return;
    
    // Отменяем старое изменение баланса
    const oldAccountIndex = userData.accounts.findIndex(acc => acc.id === oldTransaction.accountId);
    if (oldAccountIndex !== -1) {
      const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
      userData.accounts[oldAccountIndex].balance += oldBalanceChange;
    }
    
    // Обновляем транзакцию
    const updatedTransaction = { ...oldTransaction, ...updates };
    userData.transactions[transIndex] = updatedTransaction;
    
    // Применяем новое изменение баланса
    const newAccountId = updates.accountId || oldTransaction.accountId;
    const newAmount = updates.amount || oldTransaction.amount;
    const newType = updates.type || oldTransaction.type;
    
    const newAccountIndex = userData.accounts.findIndex(acc => acc.id === newAccountId);
    if (newAccountIndex !== -1) {
      const newBalanceChange = newType === 'income' ? newAmount : -newAmount;
      userData.accounts[newAccountIndex].balance += newBalanceChange;
      userData.accounts[newAccountIndex].updatedAt = new Date().toISOString();
    }
    
    await this.saveUserData(userData);
  }

  static async deleteTransaction(transaction: Transaction): Promise<void> {
    const userData = await this.getUserData();
    
    // Удаляем транзакцию
    userData.transactions = userData.transactions.filter(t => t.id !== transaction.id);
    
    // Отменяем изменение баланса
    const accountIndex = userData.accounts.findIndex(acc => acc.id === transaction.accountId);
    if (accountIndex !== -1) {
      const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      userData.accounts[accountIndex].balance += balanceChange;
      userData.accounts[accountIndex].updatedAt = new Date().toISOString();
    }
    
    await this.saveUserData(userData);
  }

  // Методы для работы с категориями
  static async getCategories(): Promise<Category[]> {
    const userData = await this.getUserData();
    return userData.categories;
  }

  static async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const userData = await this.getUserData();
    const newCategory: Category = {
      ...category,
      id: Date.now().toString(),
    };
    userData.categories.push(newCategory);
    await this.saveUserData(userData);
    return newCategory;
  }

  static async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    const userData = await this.getUserData();
    userData.categories = userData.categories.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    );
    await this.saveUserData(userData);
  }

  static async deleteCategory(id: string): Promise<void> {
    const userData = await this.getUserData();
    const category = userData.categories.find(cat => cat.id === id);
    if (!category) return;
    
    // Перемещаем транзакции в категорию "Другое"
    const otherId = category.type === 'income' ? 'other_income' : 'other_expense';
    userData.transactions = userData.transactions.map(trans => 
      trans.categoryId === id ? { ...trans, categoryId: otherId } : trans
    );
    
    userData.categories = userData.categories.filter(cat => cat.id !== id);
    await this.saveUserData(userData);
  }

  // Методы для работы с долгами
  static async getDebts(): Promise<Debt[]> {
    const userData = await this.getUserData();
    return userData.debts || [];
  }

  static async createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const userData = await this.getUserData();
    if (!userData.debts) userData.debts = [];
    
    const newDebt: Debt = {
      ...debt,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    userData.debts.push(newDebt);
    await this.saveUserData(userData);
  }

  static async updateDebt(id: string, updates: Partial<Debt>): Promise<void> {
    const userData = await this.getUserData();
    if (!userData.debts) return;
    
    userData.debts = userData.debts.map(debt => 
      debt.id === id 
        ? { ...debt, ...updates, updatedAt: new Date().toISOString() }
        : debt
    );
    
    await this.saveUserData(userData);
  }

  static async deleteDebt(id: string): Promise<void> {
    const userData = await this.getUserData();
    if (!userData.debts) return;
    
    userData.debts = userData.debts.filter(debt => debt.id !== id);
    await this.saveUserData(userData);
  }

  // Сброс всех данных
  static async resetAllData(): Promise<void> {
    const userData = await this.getUserData();
    
    // Оставляем только базовые категории и счет "Наличные"
    userData.accounts = [{
      id: '1',
      name: 'Наличные',
      type: 'cash',
      balance: 0,
      isDefault: true,
      isIncludedInTotal: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];
    userData.transactions = [];
    userData.categories = DEFAULT_CATEGORIES;
    userData.debts = [];
    
    await this.saveUserData(userData);
  }

  // Синхронизация данных
  static async syncData(): Promise<void> {
    console.log('Syncing user data...');
    // Здесь можно добавить синхронизацию с облаком
  }
} 