import { ApiService } from './api';
import { ClientEncryption } from '../utils/encryption';

// Интерфейсы для счетов
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'cash' | 'debit' | 'credit' | 'savings' | 'investment';
  balance: number;
  currency: string;
  cardNumber?: string;
  cardType?: string;
  creditLimit?: number;
  monthlyPayment?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountData {
  name: string;
  type: 'cash' | 'debit' | 'credit' | 'savings' | 'investment';
  balance: number;
  currency: string;
  cardNumber?: string;
  cardType?: string;
  creditLimit?: number;
  monthlyPayment?: number;
}

export interface UpdateAccountData extends Partial<CreateAccountData> {}

// Интерфейсы для транзакций
export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  date: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionData {
  accountId: string;
  categoryId: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {}

// Интерфейсы для категорий
export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

// Интерфейсы для долгов
export interface Debt {
  id: string;
  userId: string;
  creditorName: string;
  amount: number;
  description?: string;
  dueDate?: string;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDebtData {
  creditorName: string;
  amount: number;
  description?: string;
  dueDate?: string;
}

export interface UpdateDebtData extends Partial<CreateDebtData> {
  isPaid?: boolean;
}

// Интерфейсы для статистики
export interface AccountStatistics {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  accountsByType: Record<string, { count: number; totalBalance: number }>;
}

export interface TransactionStatistics {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionsByCategory: Record<string, { amount: number; count: number }>;
  transactionsByDate: Record<string, { income: number; expense: number }>;
}

export interface DebtStatistics {
  totalDebts: number;
  paidDebts: number;
  unpaidDebts: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export class DataService {
  // Счета (Accounts)
  static async getAccounts(): Promise<Account[]> {
    const accounts = await ApiService.get<Account[]>('/accounts');
    
    // Маскируем номера карт для отображения
    return accounts.map(account => ({
      ...account,
      cardNumber: account.cardNumber 
        ? ClientEncryption.maskCardNumber(account.cardNumber)
        : undefined
    }));
  }

  static async createAccount(data: CreateAccountData): Promise<Account> {
    // Валидируем номер карты перед отправкой
    if (data.cardNumber && !ClientEncryption.validateCardNumber(data.cardNumber)) {
      throw new Error('Некорректный номер карты');
    }
    
    const account = await ApiService.post<Account>('/accounts', data);
    
    // Маскируем номер карты в ответе
    return {
      ...account,
      cardNumber: account.cardNumber 
        ? ClientEncryption.maskCardNumber(account.cardNumber)
        : undefined
    };
  }

  static async updateAccount(id: string, data: UpdateAccountData): Promise<Account> {
    // Валидируем номер карты перед отправкой
    if (data.cardNumber && !ClientEncryption.validateCardNumber(data.cardNumber)) {
      throw new Error('Некорректный номер карты');
    }
    
    const account = await ApiService.put<Account>(`/accounts/${id}`, data);
    
    // Маскируем номер карты в ответе
    return {
      ...account,
      cardNumber: account.cardNumber 
        ? ClientEncryption.maskCardNumber(account.cardNumber)
        : undefined
    };
  }

  static async deleteAccount(id: string): Promise<void> {
    await ApiService.delete(`/accounts/${id}`);
  }

  static async getAccountStatistics(): Promise<AccountStatistics> {
    return ApiService.get<AccountStatistics>('/accounts/statistics');
  }

  // Транзакции (Transactions)
  static async getTransactions(filters?: {
    accountId?: string;
    categoryId?: string;
    type?: 'income' | 'expense';
    startDate?: string;
    endDate?: string;
  }): Promise<Transaction[]> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    const query = queryParams.toString();
    return ApiService.get<Transaction[]>(`/transactions${query ? `?${query}` : ''}`);
  }

  static async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    return ApiService.post<Transaction>('/transactions', data);
  }

  static async updateTransaction(id: string, data: UpdateTransactionData): Promise<Transaction> {
    return ApiService.put<Transaction>(`/transactions/${id}`, data);
  }

  static async deleteTransaction(id: string): Promise<void> {
    await ApiService.delete(`/transactions/${id}`);
  }

  static async getTransactionStatistics(period: 'week' | 'month' | 'year' | 'all'): Promise<TransactionStatistics> {
    return ApiService.get<TransactionStatistics>(`/transactions/statistics/${period}`);
  }

  // Категории (Categories)
  static async getCategories(): Promise<Category[]> {
    return ApiService.get<Category[]>('/categories');
  }

  static async createCategory(data: CreateCategoryData): Promise<Category> {
    return ApiService.post<Category>('/categories', data);
  }

  static async updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
    return ApiService.put<Category>(`/categories/${id}`, data);
  }

  static async deleteCategory(id: string): Promise<void> {
    await ApiService.delete(`/categories/${id}`);
  }

  static async resetCategoriesToDefaults(): Promise<Category[]> {
    return ApiService.post<Category[]>('/categories/reset');
  }

  // Долги (Debts)
  static async getDebts(): Promise<Debt[]> {
    return ApiService.get<Debt[]>('/debts');
  }

  static async createDebt(data: CreateDebtData): Promise<Debt> {
    return ApiService.post<Debt>('/debts', data);
  }

  static async updateDebt(id: string, data: UpdateDebtData): Promise<Debt> {
    return ApiService.put<Debt>(`/debts/${id}`, data);
  }

  static async deleteDebt(id: string): Promise<void> {
    await ApiService.delete(`/debts/${id}`);
  }

  static async payOffDebt(id: string): Promise<Debt> {
    return ApiService.post<Debt>(`/debts/${id}/pay`);
  }

  static async getDebtStatistics(): Promise<DebtStatistics> {
    return ApiService.get<DebtStatistics>('/debts/statistics');
  }
}
