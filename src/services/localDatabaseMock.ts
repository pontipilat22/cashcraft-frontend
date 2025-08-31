// Заглушка для LocalDatabaseService для работы в Expo Go
import { Account, Transaction, Category, Debt } from '../types';

export class LocalDatabaseService {
  private static currentUserId: string | null = null;
  private static isInitialized: boolean = true; // Всегда готов в моке

  static setUserId(userId: string | null) {
    this.currentUserId = userId;
    console.log('Mock: LocalDatabaseService setUserId:', userId);
  }

  static isDatabaseReady(): boolean {
    return true; // Всегда готов в моке
  }

  static async initDatabase(defaultCurrency: string = 'USD'): Promise<void> {
    console.log('Mock: LocalDatabaseService initDatabase:', defaultCurrency);
    this.isInitialized = true;
  }

  static async forceReinitialize(defaultCurrency: string = 'USD'): Promise<void> {
    console.log('Mock: LocalDatabaseService forceReinitialize:', defaultCurrency);
    this.isInitialized = true;
  }

  static async updateDefaultCurrency(currency: string): Promise<void> {
    console.log('Mock: LocalDatabaseService updateDefaultCurrency:', currency);
  }

  static async getAccounts(): Promise<Account[]> {
    console.log('Mock: LocalDatabaseService getAccounts');
    return [];
  }

  static async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    console.log('Mock: LocalDatabaseService createAccount:', account);
  }

  static async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    console.log('Mock: LocalDatabaseService updateAccount:', id, updates);
  }

  static async deleteAccount(id: string): Promise<void> {
    console.log('Mock: LocalDatabaseService deleteAccount:', id);
  }

  static async getTransactions(): Promise<Transaction[]> {
    console.log('Mock: LocalDatabaseService getTransactions');
    return [];
  }

  static async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    console.log('Mock: LocalDatabaseService createTransaction:', transaction);
  }

  static async updateTransaction(id: string, oldTransaction: Transaction, updates: Partial<Transaction>): Promise<void> {
    console.log('Mock: LocalDatabaseService updateTransaction:', id, updates);
  }

  static async deleteTransaction(transaction: Transaction): Promise<void> {
    console.log('Mock: LocalDatabaseService deleteTransaction:', transaction);
  }

  static async getCategories(): Promise<Category[]> {
    console.log('Mock: LocalDatabaseService getCategories');
    return [];
  }

  static async createCategory(category: Omit<Category, 'id'>): Promise<void> {
    console.log('Mock: LocalDatabaseService createCategory:', category);
  }

  static async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    console.log('Mock: LocalDatabaseService updateCategory:', id, updates);
  }

  static async deleteCategory(id: string): Promise<void> {
    console.log('Mock: LocalDatabaseService deleteCategory:', id);
  }

  static async getDebts(): Promise<Debt[]> {
    console.log('Mock: LocalDatabaseService getDebts');
    return [];
  }

  static async createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    console.log('Mock: LocalDatabaseService createDebt:', debt);
  }

  static async updateDebt(id: string, updates: Partial<Debt>): Promise<void> {
    console.log('Mock: LocalDatabaseService updateDebt:', id, updates);
  }

  static async deleteDebt(id: string): Promise<void> {
    console.log('Mock: LocalDatabaseService deleteDebt:', id);
  }

  static async clearAllData(defaultCurrency: string = 'USD'): Promise<void> {
    console.log('Mock: LocalDatabaseService clearAllData:', defaultCurrency);
  }

  static async exportData(): Promise<any> {
    console.log('Mock: LocalDatabaseService exportData');
    return {};
  }

  static async importData(data: any): Promise<void> {
    console.log('Mock: LocalDatabaseService importData:', data);
  }

  // Методы для работы с курсами валют
  static async getExchangeRatesMode(): Promise<string> {
    console.log('Mock: LocalDatabaseService getExchangeRatesMode');
    return 'api'; // или 'manual'
  }

  static async getAllExchangeRates(): Promise<any[]> {
    console.log('Mock: LocalDatabaseService getAllExchangeRates');
    return [];
  }

  static async getExchangeRate(from: string, to: string): Promise<number | null> {
    console.log('Mock: LocalDatabaseService getExchangeRate:', from, to);
    return 1.0; // Моковый курс
  }

  static async getLocalExchangeRate(from: string, to: string): Promise<number | null> {
    console.log('Mock: LocalDatabaseService getLocalExchangeRate:', from, to);
    return 1.0; // Моковый курс
  }

  static async saveExchangeRate(from: string, to: string, rate: number): Promise<void> {
    console.log('Mock: LocalDatabaseService saveExchangeRate:', from, to, rate);
  }
}
