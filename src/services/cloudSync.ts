import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Transaction, Category, Debt } from '../types';
import { LocalDatabaseService } from './localDatabase';
import database from '../database';

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

  // Защита от множественных вызовов wipeData
  private static isWiping = false;

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
        console.log('[CloudSync] Отправляем данные на сервер:', `${this.API_URL}/api/v1/sync/upload`);
        
        const response = await fetch(`${this.API_URL}/api/v1/sync/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            data: localData,
          }),
        });
        
        console.log('[CloudSync] Ответ сервера:', response.status, response.statusText);
        
        if (response.ok) {
          const result = await response.json();
          console.log('[CloudSync] Синхронизация успешна:', result);
          
          // Помечаем данные как синхронизированные
          await this.markDataAsSynced(localData);
          
          // Обновляем время синхронизации
          await LocalDatabaseService.updateSyncTime(result.syncTime);
          
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
          const isDatabaseReady = LocalDatabaseService.isDatabaseReady();
          console.log('🗄️ [CloudSync] Проверка готовности базы данных:', isDatabaseReady);
          
          if (isDatabaseReady) {
            // Проверяем, есть ли новые данные в AsyncStorage
            const localLastSync = await LocalDatabaseService.getLastSyncTime();
            console.log('⏰ [CloudSync] Локальное время последней синхронизации:', localLastSync);
            console.log('⏰ [CloudSync] Время последней синхронизации в AsyncStorage:', cloudData.lastSyncAt);
            
            if (cloudData.lastSyncAt === localLastSync) {
              console.log('✅ [CloudSync] Данных в AsyncStorage нет новых - пропускаем импорт');
              return true;
            }
            
            console.log('🔄 [CloudSync] Обнаружены новые данные в AsyncStorage, очищаем и импортируем...');
            // Очищаем локальную базу - НЕ используем resetAllData чтобы избежать цикла!
            await database.write(async () => {
              const tables = ['accounts', 'transactions', 'categories', 'debts', 'exchange_rates', 'settings', 'sync_metadata'];
              for (const table of tables) {
                const records = await database.get(table).query().fetch();
                if (records.length > 0) {
                  await Promise.all(records.map((r: any) => r.destroyPermanently()));
                }
              }
            });
            
            
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
          console.log('📊 [CloudSync] Данные с сервера:', {
            accounts: cloudData.accounts?.length || 0,
            transactions: cloudData.transactions?.length || 0,
            categories: cloudData.categories?.length || 0,
            debts: cloudData.debts?.length || 0,
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
            // Проверяем, есть ли новые данные на сервере
            const localLastSync = await LocalDatabaseService.getLastSyncTime();
            console.log('⏰ [CloudSync] Локальное время последней синхронизации:', localLastSync);
            console.log('⏰ [CloudSync] Время последней синхронизации на сервере:', cloudData.lastSyncAt);
            
            if (cloudData.lastSyncAt === localLastSync) {
              console.log('✅ [CloudSync] Данных на сервере нет новых - пропускаем импорт');
              return true;
            }
            
            console.log('🔄 [CloudSync] Обнаружены новые данные на сервере, очищаем и импортируем...');
            // Очищаем локальную базу - НЕ используем resetAllData чтобы избежать цикла!
            await database.write(async () => {
              const tables = ['accounts', 'transactions', 'categories', 'debts', 'exchange_rates', 'settings', 'sync_metadata'];
              for (const table of tables) {
                const records = await database.get(table).query().fetch();
                if (records.length > 0) {
                  await Promise.all(records.map((r: any) => r.destroyPermanently()));
                }
              }
            });
            
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

  static async wipeData(userId: string, token: string): Promise<boolean> {
    // Защита от множественных вызовов
    if (this.isWiping) {
      console.log('⚠️ [CloudSync] Wipe уже выполняется, пропускаем...');
      return false;
    }
    
    this.isWiping = true;
    
    try {
      console.log('🗑️ [CloudSync] Начинаем полный сброс данных для пользователя:', userId);
      
      if (this.DEMO_MODE) {
        console.log('🎭 [CloudSync] Демо режим - очищаем AsyncStorage');
        // В демо режиме очищаем AsyncStorage
        const cloudKey = `cloudData_${userId}`;
        await AsyncStorage.removeItem(cloudKey);
        
        // Очищаем локальную базу
        if (LocalDatabaseService.isDatabaseReady()) {
          console.log('🗄️ [CloudSync] Очищаем локальную базу данных...');
          // Очищаем локальную базу напрямую, не используя resetAllData
          await database.write(async () => {
            const tables = ['accounts', 'transactions', 'categories', 'debts', 'exchange_rates', 'settings', 'sync_metadata'];
            for (const table of tables) {
              const records = await database.get(table).query().fetch();
              if (records.length > 0) {
                await Promise.all(records.map((r: any) => r.destroyPermanently()));
              }
            }
          });
          
          // Переинициализируем базу данных с базовыми данными
          console.log('🔄 [CloudSync] Переинициализируем базу данных с базовыми данными...');
          await LocalDatabaseService.forceReinitialize('USD');
          
          // Устанавливаем флаг сброса данных, чтобы предотвратить синхронизацию
          await AsyncStorage.setItem(`dataReset_${userId}`, 'true');
          console.log('🏷️ [CloudSync] Установлен флаг сброса данных');
        }
        
        console.log('✅ [CloudSync] Данные успешно очищены в демо режиме');
        return true;
      } else {
        console.log('🌐 [CloudSync] Реальный режим - отправляем запрос на сброс данных');
        // В реальном приложении отправляем запрос на сервер
        const response = await fetch(`${this.API_URL}/api/v1/sync/wipe`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        console.log('📡 [CloudSync] Ответ сервера на wipe:', response.status, response.statusText);
        
        if (response.ok) {
          console.log('✅ [CloudSync] Данные успешно очищены на сервере');
          
          // Очищаем локальную базу
          if (LocalDatabaseService.isDatabaseReady()) {
            console.log('🗄️ [CloudSync] Очищаем локальную базу данных...');
            // Очищаем локальную базу напрямую, не используя resetAllData
            await database.write(async () => {
              const tables = ['accounts', 'transactions', 'categories', 'debts', 'exchange_rates', 'settings', 'sync_metadata'];
              for (const table of tables) {
                const records = await database.get(table).query().fetch();
                if (records.length > 0) {
                  await Promise.all(records.map((r: any) => r.destroyPermanently()));
                }
              }
            });
            
            // Переинициализируем базу данных с базовыми данными
            console.log('🔄 [CloudSync] Переинициализируем базу данных с базовыми данными...');
            await LocalDatabaseService.forceReinitialize('USD');
            
            // Устанавливаем флаг сброса данных, чтобы предотвратить синхронизацию
            await AsyncStorage.setItem(`dataReset_${userId}`, 'true');
            console.log('🏷️ [CloudSync] Установлен флаг сброса данных');
          }
          
          return true;
        } else {
          const errorText = await response.text();
          console.error('❌ [CloudSync] Ошибка сброса данных:', response.status, errorText);
          
          // Если ошибка 401, пробрасываем её для обработки
          if (response.status === 401) {
            throw new Error('401 Token expired');
          }
          
          return false;
        }
      }
    } catch (error) {
      console.error('❌ [CloudSync] Wipe error:', error);
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.log('🌐 [CloudSync] Ошибка сети при сбросе данных - возможно нет интернета или сервер недоступен');
      }
      return false;
    } finally {
      // Снимаем флаг защиты
      this.isWiping = false;
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
        // Валидация обязательных полей категории
        if (!category.id) {
          console.warn('⚠️ [CloudSync] Пропускаем категорию без id:', category);
          continue;
        }
        
        if (!category.name) {
          console.warn('⚠️ [CloudSync] Пропускаем категорию без name:', category);
          continue;
        }
        
        console.log('📝 [CloudSync] Импортируем категорию:', { id: category.id, name: category.name });
        await LocalDatabaseService.upsertCategory(category);
      } catch (error) {
        console.error('❌ [CloudSync] Error importing category:', error);
        console.error('❌ [CloudSync] Category data:', category);
      }
    }

    // Импортируем счета
    console.log('🏦 [CloudSync] Импортируем счета:', safeData.accounts.length);
    for (const account of safeData.accounts) {
      try {
        // Валидация обязательных полей счета
        if (!account.id) {
          console.warn('⚠️ [CloudSync] Пропускаем счет без id:', account);
          continue;
        }
        
        if (!account.name) {
          console.warn('⚠️ [CloudSync] Пропускаем счет без name:', account);
          continue;
        }
        
        if (account.balance === undefined || account.balance === null) {
          console.warn('⚠️ [CloudSync] Пропускаем счет без balance:', account);
          continue;
        }
        
        const { id, createdAt, updatedAt, ...accountData } = account;
        
        console.log('📝 [CloudSync] Импортируем счет:', { 
          id: account.id, 
          name: account.name, 
          balance: account.balance,
          type: account.type 
        });
        
        await LocalDatabaseService.upsertAccount(accountData);
      } catch (error) {
        console.error('❌ [CloudSync] Error importing account:', error);
        console.error('❌ [CloudSync] Account data:', account);
      }
    }

    // Импортируем транзакции
    console.log('💳 [CloudSync] Импортируем транзакции:', safeData.transactions.length);
    for (const transaction of safeData.transactions) {
      try {
        // Валидация обязательных полей транзакции
        if (!transaction.account_id && !transaction.accountId) {
          console.warn('⚠️ [CloudSync] Пропускаем транзакцию без account_id:', transaction);
          continue;
        }
        
        if (!transaction.amount || transaction.amount <= 0) {
          console.warn('⚠️ [CloudSync] Пропускаем транзакцию с невалидной суммой:', transaction);
          continue;
        }
        
        if (!transaction.type || !['income', 'expense'].includes(transaction.type)) {
          console.warn('⚠️ [CloudSync] Пропускаем транзакцию с невалидным типом:', transaction);
          continue;
        }
        
        if (!transaction.date) {
          console.warn('⚠️ [CloudSync] Пропускаем транзакцию без даты:', transaction);
          continue;
        }
        
        // Подготавливаем данные для импорта
        const { id, ...transactionData } = transaction;
        
        // Нормализуем поля (поддержка разных форматов)
        const normalizedTransaction = {
          ...transactionData,
          accountId: transaction.account_id || transaction.accountId,
          categoryId: transaction.category_id || transaction.categoryId,
          amount: parseFloat(transaction.amount),
          type: transaction.type,
          date: transaction.date,
          description: transaction.description || ''
        };
        
        console.log('📝 [CloudSync] Импортируем транзакцию:', {
          accountId: normalizedTransaction.accountId,
          amount: normalizedTransaction.amount,
          type: normalizedTransaction.type,
          date: normalizedTransaction.date
        });
        
        await LocalDatabaseService.upsertTransaction(normalizedTransaction);
      } catch (error) {
        console.error('❌ [CloudSync] Error importing transaction:', error);
        console.error('❌ [CloudSync] Transaction data:', transaction);
      }
    }

    // Импортируем долги
    console.log('💸 [CloudSync] Импортируем долги:', safeData.debts.length);
    for (const debt of safeData.debts) {
      try {
        // Валидация обязательных полей долга
        if (!debt.id) {
          console.warn('⚠️ [CloudSync] Пропускаем долг без id:', debt);
          continue;
        }
        
        if (!debt.name) {
          console.warn('⚠️ [CloudSync] Пропускаем долг без name:', debt);
          continue;
        }
        
        if (debt.amount === undefined || debt.amount === null || debt.amount <= 0) {
          console.warn('⚠️ [CloudSync] Пропускаем долг с невалидной суммой:', debt);
          continue;
        }
        
        if (!debt.type || !['owed_to_me', 'owed_by_me'].includes(debt.type)) {
          console.warn('⚠️ [CloudSync] Пропускаем долг с невалидным типом:', debt);
          continue;
        }
        
        const { id, createdAt, updatedAt, ...debtData } = debt;
        
        console.log('📝 [CloudSync] Импортируем долг:', { 
          id: debt.id, 
          name: debt.name, 
          amount: debt.amount,
          type: debt.type 
        });
        
        await LocalDatabaseService.upsertDebt(debtData);
      } catch (error) {
        console.error('❌ [CloudSync] Error importing debt:', error);
        console.error('❌ [CloudSync] Debt data:', debt);
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
        const response = await fetch(`${this.API_URL}/api/v1/sync/wipe`, {
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