import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Transaction, Category, Debt } from '../types';
import { LocalDatabaseService } from './localDatabase';

// Интерфейс для облачного хранилища
interface CloudData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  exchangeRates: any[]; // Добавляем курсы валют
  lastSyncAt: string;
  userId: string;
}

export class CloudSyncService {
  // URL вашего backend API (замените на реальный)
  private static API_URL = 'https://cashcraft-backend-production.up.railway.app';
  
  // Для демо используем AsyncStorage как "облако"
  private static DEMO_MODE = false;

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
      console.log('[CloudSync] Начинаем синхронизацию для пользователя:', userId);
      
      // Проверяем, что база данных готова
      if (!LocalDatabaseService.isDatabaseReady()) {
        console.log('[CloudSync] База данных не готова, пропускаем синхронизацию');
        return false;
      }
      
      // Получаем несинхронизированные данные
      const localData = await LocalDatabaseService.getUnsyncedData();
      
      console.log('[CloudSync] Получены локальные данные:', {
        accounts: localData.accounts.length,
        transactions: localData.transactions.length,
        categories: localData.categories.length,
        debts: localData.debts.length
      });
      
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
            exchangeRates: localData.exchangeRates,
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
            exchangeRates: localData.exchangeRates,
            lastSyncAt: new Date().toISOString(),
            userId,
          };
        }
        
        // Сохраняем в "облако"
        await AsyncStorage.setItem(cloudKey, JSON.stringify(cloudData));
        
        // Помечаем данные как синхронизированные
        await this.markDataAsSynced(localData);
        
        // Обновляем время синхронизации
        await LocalDatabaseService.updateSyncTime(new Date().toISOString());
        
        return true;
      } else {
        // В реальном приложении отправляем на сервер
        console.log('[CloudSync] Отправляем данные на сервер:', `${this.API_URL}/api/v1/sync`);
        
        const response = await fetch(`${this.API_URL}/api/v1/sync`, {
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
        
        console.log('[CloudSync] Ответ сервера:', response.status, response.statusText);
        
        if (response.ok) {
          const result = await response.json();
          console.log('[CloudSync] Синхронизация успешна:', result);
          
          // Применяем изменения с сервера
          await this.applyCloudChanges(result.changes);
          
          // Помечаем данные как синхронизированные
          await this.markDataAsSynced(localData);
          
          // Обновляем время синхронизации
          await LocalDatabaseService.updateSyncTime(result.syncTime, result.syncToken);
          
          return true;
        } else {
          const errorText = await response.text();
          console.error('[CloudSync] Ошибка синхронизации:', response.status, errorText);
          
          // Если ошибка 401, пробрасываем её для обработки в DataContext
          if (response.status === 401) {
            throw new Error('401 Token expired');
          }
          
          return false;
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.log('[CloudSync] Ошибка сети - возможно нет интернета или сервер недоступен');
      }
      return false;
    }
  }

  static async downloadData(userId: string, token: string): Promise<boolean> {
    try {
      console.log('☁️ [CloudSync] Начинаем загрузку данных для пользователя:', userId);
      
      if (this.DEMO_MODE) {
        console.log('🎭 [CloudSync] Демо режим - загружаем из AsyncStorage');
        // В демо режиме получаем из AsyncStorage
        const cloudKey = `cloudData_${userId}`;
        const cloudDataString = await AsyncStorage.getItem(cloudKey);
        
        if (cloudDataString) {
          const cloudData: CloudData = JSON.parse(cloudDataString);
          console.log('📊 [CloudSync] Данные из AsyncStorage:', {
            accounts: cloudData.accounts.length,
            transactions: cloudData.transactions.length,
            categories: cloudData.categories.length,
            debts: cloudData.debts.length
          });
          
          // Проверяем, что база данных готова перед очисткой
          if (LocalDatabaseService.isDatabaseReady()) {
            console.log('🗄️ [CloudSync] База данных готова, очищаем и импортируем...');
            // Очищаем локальную базу
            await LocalDatabaseService.resetAllData();
            
            // Загружаем данные из облака
            await this.importCloudData(cloudData);
            
            console.log('✅ [CloudSync] Данные успешно импортированы из AsyncStorage');
            return true;
          } else {
            console.log('⚠️ [CloudSync] База данных не готова, сохраняем данные для fallback режима');
            // Сохраняем данные в AsyncStorage для fallback режима
            await AsyncStorage.setItem('fallback_cloud_data', cloudDataString);
            return true;
          }
        }
        console.log('⚠️ [CloudSync] Нет данных в AsyncStorage');
        return false;
      } else {
        console.log('🌐 [CloudSync] Реальный режим - загружаем с сервера');
        // В реальном приложении
        const response = await fetch(`${this.API_URL}/api/v1/sync/download`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        console.log('📡 [CloudSync] Ответ сервера:', response.status, response.statusText);
        
        if (response.ok) {
          const cloudData = await response.json();
          console.log('📊 [CloudSync] Полный ответ сервера:', JSON.stringify(cloudData, null, 2));
          console.log('📊 [CloudSync] Данные с сервера:', {
            accounts: cloudData.accounts?.length || 0,
            transactions: cloudData.transactions?.length || 0,
            categories: cloudData.categories?.length || 0,
            debts: cloudData.debts?.length || 0
          });
          
          // Проверяем структуру данных
          if (!cloudData.accounts || !Array.isArray(cloudData.accounts)) {
            console.log('⚠️ [CloudSync] Неверная структура данных: accounts не является массивом');
            console.log('⚠️ [CloudSync] cloudData.accounts:', cloudData.accounts);
          }
          
          // Проверяем, что данные имеют правильную структуру
          const hasValidStructure = Array.isArray(cloudData.accounts) && 
                                   Array.isArray(cloudData.transactions) &&
                                   Array.isArray(cloudData.categories) &&
                                   Array.isArray(cloudData.debts);
          
          if (!hasValidStructure) {
            console.log('❌ [CloudSync] Неверная структура данных от сервера');
            return false;
          }
          
          // Даже если данные пустые, это валидное состояние
          const hasData = (cloudData.accounts?.length || 0) > 0 || 
                         (cloudData.transactions?.length || 0) > 0 ||
                         (cloudData.categories?.length || 0) > 0 ||
                         (cloudData.debts?.length || 0) > 0;
          
          if (!hasData) {
            console.log('ℹ️ [CloudSync] Сервер вернул пустые данные (новый пользователь)');
          }
          
          // Проверяем, что база данных готова перед очисткой
          const isDatabaseReady = LocalDatabaseService.isDatabaseReady();
          console.log('🗄️ [CloudSync] Проверка готовности базы данных:', isDatabaseReady);
          
          if (isDatabaseReady) {
            console.log('🗄️ [CloudSync] База данных готова, очищаем и импортируем...');
            // Очищаем локальную базу
            await LocalDatabaseService.resetAllData();
            
            // Загружаем данные из облака
            await this.importCloudData(cloudData);
            
            console.log('✅ [CloudSync] Данные успешно импортированы с сервера');
            return true;
          } else {
            console.log('⚠️ [CloudSync] База данных не готова, сохраняем данные для fallback режима');
            // Сохраняем данные в AsyncStorage для fallback режима
            await AsyncStorage.setItem('fallback_cloud_data', JSON.stringify(cloudData));
            console.log('💾 [CloudSync] Данные сохранены в fallback хранилище');
            return true;
          }
        } else {
          const errorText = await response.text();
          console.error('❌ [CloudSync] Ошибка загрузки данных:', response.status, errorText);
        }
        return false;
      }
    } catch (error) {
      console.error('❌ [CloudSync] Download error:', error);
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.log('🌐 [CloudSync] Ошибка сети при загрузке данных - возможно нет интернета или сервер недоступен');
      }
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
      exchangeRates: [],
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

    // Мержим курсы валют
    merged.exchangeRates = [...existing.exchangeRates, ...newData.exchangeRates];

    return merged;
  }

  private static async markDataAsSynced(data: {
    accounts: Account[];
    transactions: Transaction[];
    categories: Category[];
    debts: Debt[];
    exchangeRates: any[];
  }): Promise<void> {
    await LocalDatabaseService.markAsSynced('accounts', data.accounts.map(a => a.id));
    await LocalDatabaseService.markAsSynced('transactions', data.transactions.map(t => t.id));
    await LocalDatabaseService.markAsSynced('categories', data.categories.map(c => c.id));
    await LocalDatabaseService.markAsSynced('debts', data.debts.map(d => d.id));
    // Курсы валют не требуют пометки как синхронизированные
  }

  private static async applyCloudChanges(changes: any): Promise<void> {
    // В реальном приложении здесь будет логика применения изменений с сервера
    // Например, новые/измененные записи, удаленные записи и т.д.
  }

  private static async importCloudData(cloudData: any): Promise<void> {
    console.log('📥 [CloudSync] Начинаем импорт данных из облака...');
    
    // Проверяем и инициализируем структуру данных
    const safeData = {
      accounts: Array.isArray(cloudData.accounts) ? cloudData.accounts : [],
      transactions: Array.isArray(cloudData.transactions) ? cloudData.transactions : [],
      categories: Array.isArray(cloudData.categories) ? cloudData.categories : [],
      debts: Array.isArray(cloudData.debts) ? cloudData.debts : []
    };
    
    // Импортируем категории
    console.log('📂 [CloudSync] Импортируем категории:', safeData.categories.length);
    for (const category of safeData.categories) {
      try {
        await LocalDatabaseService.createCategory(category);
      } catch (error) {
        console.error('❌ [CloudSync] Error importing category:', error);
      }
    }

    // Импортируем счета
    console.log('🏦 [CloudSync] Импортируем счета:', safeData.accounts.length);
    for (const account of safeData.accounts) {
      try {
        const { id, createdAt, updatedAt, ...accountData } = account;
        await LocalDatabaseService.createAccount(accountData);
      } catch (error) {
        console.error('❌ [CloudSync] Error importing account:', error);
      }
    }

    // Импортируем транзакции
    console.log('💳 [CloudSync] Импортируем транзакции:', safeData.transactions.length);
    for (const transaction of safeData.transactions) {
      try {
        const { id, ...transactionData } = transaction;
        await LocalDatabaseService.createTransaction(transactionData);
      } catch (error) {
        console.error('❌ [CloudSync] Error importing transaction:', error);
      }
    }

    // Импортируем долги
    console.log('💸 [CloudSync] Импортируем долги:', safeData.debts.length);
    for (const debt of safeData.debts) {
      try {
        const { id, createdAt, updatedAt, ...debtData } = debt;
        await LocalDatabaseService.createDebt(debtData);
      } catch (error) {
        console.error('❌ [CloudSync] Error importing debt:', error);
      }
    }

    console.log('✅ [CloudSync] Импорт данных завершен');
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
      });
      return response.ok;
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

  // Метод для загрузки данных из fallback хранилища
  static async getFallbackData(): Promise<CloudData | null> {
    try {
      const fallbackDataString = await AsyncStorage.getItem('fallback_cloud_data');
      if (fallbackDataString) {
        const fallbackData = JSON.parse(fallbackDataString);
        
        // Обеспечиваем правильную структуру данных
        const safeData: CloudData = {
          accounts: Array.isArray(fallbackData.accounts) ? fallbackData.accounts : [],
          transactions: Array.isArray(fallbackData.transactions) ? fallbackData.transactions : [],
          categories: Array.isArray(fallbackData.categories) ? fallbackData.categories : [],
          debts: Array.isArray(fallbackData.debts) ? fallbackData.debts : [],
          exchangeRates: Array.isArray(fallbackData.exchangeRates) ? fallbackData.exchangeRates : [],
          lastSyncAt: fallbackData.lastSyncAt || new Date().toISOString(),
          userId: fallbackData.userId || ''
        };
        
        console.log('📊 [CloudSync] Данные из fallback хранилища:', {
          accounts: safeData.accounts.length,
          transactions: safeData.transactions.length,
          categories: safeData.categories.length,
          debts: safeData.debts.length
        });
        return safeData;
      }
      return null;
    } catch (error) {
      console.error('❌ [CloudSync] Ошибка загрузки fallback данных:', error);
      return null;
    }
  }

  // Метод для очистки fallback данных
  static async clearFallbackData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('fallback_cloud_data');
      console.log('🗑️ [CloudSync] Fallback данные очищены');
    } catch (error) {
      console.error('❌ [CloudSync] Ошибка очистки fallback данных:', error);
    }
  }
} 