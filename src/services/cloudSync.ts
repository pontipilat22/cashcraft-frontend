import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Transaction, Category, Debt } from '../types';
import { LocalDatabaseService } from './localDatabase';

// Интерфейс для облачного хранилища
interface CloudData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  lastSyncAt: string;
  userId: string;
}

export class CloudSyncService {
  // URL вашего backend API (замените на реальный)
  private static API_URL = 'https://api.cashcraft.app';
  
  // Для демо используем AsyncStorage как "облако"
  private static DEMO_MODE = true;

  static async authenticate(email: string, password: string): Promise<string | null> {
    if (this.DEMO_MODE) {
      // В демо режиме просто возвращаем email как токен
      return email;
    }
    
    // В реальном приложении:
    try {
      const response = await fetch(`${this.API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  static async syncData(userId: string, token: string): Promise<boolean> {
    try {
      // Получаем несинхронизированные данные
      const localData = await LocalDatabaseService.getUnsyncedData();
      
      if (this.DEMO_MODE) {
        // В демо режиме сохраняем в AsyncStorage
        const cloudKey = `cloudData_${userId}`;
        
        // Получаем существующие облачные данные
        const existingCloudData = await AsyncStorage.getItem(cloudKey);
        let cloudData: CloudData;
        
        if (existingCloudData) {
          cloudData = JSON.parse(existingCloudData);
          
          // Мержим данные
          cloudData = this.mergeData(cloudData, {
            accounts: localData.accounts,
            transactions: localData.transactions,
            categories: localData.categories,
            debts: localData.debts,
            lastSyncAt: new Date().toISOString(),
            userId,
          });
        } else {
          // Первая синхронизация
          cloudData = {
            accounts: localData.accounts,
            transactions: localData.transactions,
            categories: localData.categories,
            debts: localData.debts,
            lastSyncAt: new Date().toISOString(),
            userId,
          };
        }
        
        // Сохраняем в "облако"
        await AsyncStorage.setItem(cloudKey, JSON.stringify(cloudData));
        
        // Помечаем данные как синхронизированные
        await this.markDataAsSynced(localData);
        
        // Обновляем время синхронизации
        await LocalDatabaseService.updateSyncTime(cloudData.lastSyncAt);
        
        return true;
      } else {
        // В реальном приложении отправляем на сервер
        const response = await fetch(`${this.API_URL}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            data: localData,
            lastSyncAt: await LocalDatabaseService.getLastSyncTime(),
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Применяем изменения с сервера
          await this.applyCloudChanges(result.changes);
          
          // Помечаем данные как синхронизированные
          await this.markDataAsSynced(localData);
          
          // Обновляем время синхронизации
          await LocalDatabaseService.updateSyncTime(result.syncTime, result.syncToken);
          
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    }
  }

  static async downloadData(userId: string, token: string): Promise<boolean> {
    try {
      if (this.DEMO_MODE) {
        // В демо режиме получаем из AsyncStorage
        const cloudKey = `cloudData_${userId}`;
        const cloudDataString = await AsyncStorage.getItem(cloudKey);
        
        if (cloudDataString) {
          const cloudData: CloudData = JSON.parse(cloudDataString);
          
          // Очищаем локальную базу
          await LocalDatabaseService.resetAllData();
          
          // Загружаем данные из облака
          await this.importCloudData(cloudData);
          
          return true;
        }
        return false;
      } else {
        // В реальном приложении
        const response = await fetch(`${this.API_URL}/sync/download`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const cloudData = await response.json();
          
          // Очищаем локальную базу
          await LocalDatabaseService.resetAllData();
          
          // Загружаем данные из облака
          await this.importCloudData(cloudData);
          
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Download error:', error);
      return false;
    }
  }

  private static mergeData(existing: CloudData, newData: CloudData): CloudData {
    // Простая стратегия: последнее изменение выигрывает
    const merged: CloudData = {
      accounts: [],
      transactions: [],
      categories: [],
      debts: [],
      lastSyncAt: newData.lastSyncAt,
      userId: newData.userId,
    };

    // Мержим счета
    const accountsMap = new Map<string, Account>();
    [...existing.accounts, ...newData.accounts].forEach(account => {
      const existing = accountsMap.get(account.id);
      if (!existing || (account.updatedAt && existing.updatedAt && new Date(account.updatedAt) > new Date(existing.updatedAt))) {
        accountsMap.set(account.id, account);
      } else if (!existing) {
        accountsMap.set(account.id, account);
      }
    });
    merged.accounts = Array.from(accountsMap.values());

    // Мержим транзакции
    const transactionsMap = new Map<string, Transaction>();
    [...existing.transactions, ...newData.transactions].forEach(transaction => {
      const existing = transactionsMap.get(transaction.id);
      const transactionDate = transaction.updatedAt || transaction.date;
      const existingDate = existing?.updatedAt || existing?.date;
      
      if (!existing || (transactionDate && existingDate && new Date(transactionDate) > new Date(existingDate))) {
        transactionsMap.set(transaction.id, transaction);
      } else if (!existing) {
        transactionsMap.set(transaction.id, transaction);
      }
    });
    merged.transactions = Array.from(transactionsMap.values());

    // Мержим категории
    const categoriesMap = new Map<string, Category>();
    [...existing.categories, ...newData.categories].forEach(category => {
      categoriesMap.set(category.id, category);
    });
    merged.categories = Array.from(categoriesMap.values());

    // Мержим долги
    const debtsMap = new Map<string, Debt>();
    [...existing.debts, ...newData.debts].forEach(debt => {
      const existing = debtsMap.get(debt.id);
      if (!existing || (debt.updatedAt && existing.updatedAt && new Date(debt.updatedAt) > new Date(existing.updatedAt))) {
        debtsMap.set(debt.id, debt);
      } else if (!existing) {
        debtsMap.set(debt.id, debt);
      }
    });
    merged.debts = Array.from(debtsMap.values());

    return merged;
  }

  private static async markDataAsSynced(data: {
    accounts: Account[];
    transactions: Transaction[];
    categories: Category[];
    debts: Debt[];
  }): Promise<void> {
    await LocalDatabaseService.markAsSynced('accounts', data.accounts.map(a => a.id));
    await LocalDatabaseService.markAsSynced('transactions', data.transactions.map(t => t.id));
    await LocalDatabaseService.markAsSynced('categories', data.categories.map(c => c.id));
    await LocalDatabaseService.markAsSynced('debts', data.debts.map(d => d.id));
  }

  private static async applyCloudChanges(changes: any): Promise<void> {
    // В реальном приложении здесь будет логика применения изменений с сервера
    // Например, новые/измененные записи, удаленные записи и т.д.
  }

  private static async importCloudData(cloudData: CloudData): Promise<void> {
    // Импортируем категории
    for (const category of cloudData.categories) {
      try {
        await LocalDatabaseService.createCategory(category);
      } catch (error) {
        console.error('Error importing category:', error);
      }
    }

    // Импортируем счета
    for (const account of cloudData.accounts) {
      try {
        const { id, createdAt, updatedAt, ...accountData } = account;
        await LocalDatabaseService.createAccount(accountData);
      } catch (error) {
        console.error('Error importing account:', error);
      }
    }

    // Импортируем транзакции
    for (const transaction of cloudData.transactions) {
      try {
        const { id, ...transactionData } = transaction;
        await LocalDatabaseService.createTransaction(transactionData);
      } catch (error) {
        console.error('Error importing transaction:', error);
      }
    }

    // Импортируем долги
    for (const debt of cloudData.debts) {
      try {
        const { id, createdAt, updatedAt, ...debtData } = debt;
        await LocalDatabaseService.createDebt(debtData);
      } catch (error) {
        console.error('Error importing debt:', error);
      }
    }
  }

  // Автоматическая синхронизация
  static startAutoSync(userId: string, token: string, intervalMinutes: number = 5): void {
    // Синхронизация каждые N минут
    setInterval(async () => {
      const hasInternet = await this.checkInternetConnection();
      if (hasInternet) {
        await this.syncData(userId, token);
      }
    }, intervalMinutes * 60 * 1000);
  }

  static async checkInternetConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Удаление облачных данных пользователя
  static async deleteCloudData(userId: string, token: string): Promise<boolean> {
    try {
      if (this.DEMO_MODE) {
        const cloudKey = `cloudData_${userId}`;
        await AsyncStorage.removeItem(cloudKey);
        return true;
      } else {
        const response = await fetch(`${this.API_URL}/user/delete`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        return response.ok;
      }
    } catch (error) {
      console.error('Delete cloud data error:', error);
      return false;
    }
  }
} 