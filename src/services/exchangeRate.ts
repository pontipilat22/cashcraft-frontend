import { ApiService } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalDatabaseService } from './localDatabase';
import { Platform } from 'react-native';
import { DataService } from './data';

// Копируем логику получения URL из api.ts
const getApiBaseUrl = () => {
  if (__DEV__) {
    // Режим разработки - локальный backend
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api/v1';
    } else {
      return 'http://localhost:3000/api/v1';
    }
  } else {
    // Production - Railway backend
    return 'https://cashcraft-backend-production.up.railway.app/api/v1';
  }
};

const API_BASE_URL = getApiBaseUrl();

export interface ExchangeRateResponse {
  rate: number;
  from: string;
  to: string;
  updatedAt: string;
}

export interface CurrencyRatesResponse {
  base: string;
  rates: { [currency: string]: number };
  updatedAt: string;
}

export class ExchangeRateService {
  // Единый кеш для хранения курсов
  private static ratesCache: Map<string, { rate: number; timestamp: number }> = new Map();
  private static CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 часа

  /**
   * Получить курс конвертации между двумя валютами
   */
  static async getRate(from: string, to: string): Promise<number | null> {
    try {
      if (__DEV__) {
        console.log(`ExchangeRateService.getRate called: ${from} -> ${to}`);
        console.log(`Database ready: ${LocalDatabaseService.isDatabaseReady()}`);
      }
      
      if (from === to) return 1;
      
      // Сначала проверяем кэш в памяти
      const cacheKey = `${from}_${to}`;
      const cachedRate = this.ratesCache.get(cacheKey);
      
      if (cachedRate && (Date.now() - cachedRate.timestamp) < this.CACHE_DURATION) {
        if (__DEV__) {
          console.log(`Using cached rate for ${from}/${to}: ${cachedRate.rate}`);
        }
        return cachedRate.rate;
      }
      
      // Пробуем получить из локальной базы (если она готова)
      if (LocalDatabaseService.isDatabaseReady()) {
        try {
          const localRate = await LocalDatabaseService.getLocalExchangeRate(from, to);
          if (localRate) {
            if (__DEV__) {
              console.log('Using local rate:', localRate);
            }
            return localRate;
          }
        } catch (dbError) {
          if (__DEV__) {
            console.log('Error accessing local database:', dbError);
          }
        }
      }
      
      const token = await AsyncStorage.getItem('@cashcraft_access_token');
      if (__DEV__) {
        console.log('Has token:', !!token);
      }
      
      // Пробуем получить прямой курс с API
      let rate = null;
      
      // Если нет токена, используем только внешний API
      if (!token) {
        console.log('No token, using external API');
        rate = await this.getRateFromExternalAPI(from, to);
      } else {
        // Пытаемся получить с backend
        if (__DEV__) {
          console.log('Trying to get rate from backend with token');
        }
        try {
          const response = await ApiService.get<{ success: boolean; data: { rate: number; from: string; to: string } }>(
            `/exchange-rates/rate?from=${from}&to=${to}`
          );
          
          if (__DEV__) {
            console.log('Backend response full:', response);
          }
          
          // Backend возвращает { success: true, data: { rate, from, to } }
          if (response.success && response.data?.rate) {
            if (__DEV__) {
              console.log(`Got rate ${from}->${to}: ${response.data.rate}`);
            }
            
            rate = response.data.rate;
            
            // Сохраняем в кэш и пытаемся сохранить в БД
            await this.safeSaveRate(from, to, rate);
            
            return rate;
          } else if (__DEV__) {
            console.log('No rate in response, success:', response.success);
          }
        } catch (error: any) {
          // Если токен истек, используем внешний API
          if (error.message?.includes('Token expired') || error.message?.includes('401')) {
            if (__DEV__) {
              console.log('Token expired, falling back to external API');
            }
            rate = await this.getRateFromExternalAPI(from, to);
          } else if (__DEV__ && !error.message?.includes('timed out') && !error.message?.includes('Network request failed')) {
            console.log('Backend request failed:', error);
          }
        }
        
        // Если не удалось получить с backend и еще не пробовали внешний API
        if (!rate) {
          console.log('Backend failed, using external API');
          rate = await this.getRateFromExternalAPI(from, to);
        }
      }
      
      // Если прямого курса нет и валюты не USD, пробуем через USD
      if (!rate && from !== 'USD' && to !== 'USD') {
        console.log(`No direct rate ${from}->${to}, trying cross rate through USD`);
        
        // Получаем курсы через USD
        const fromToUsd = await this.getRate(from, 'USD');
        const usdToTarget = await this.getRate('USD', to);
        
        if (fromToUsd && usdToTarget) {
          rate = fromToUsd * usdToTarget;
          console.log(`Cross rate ${from}->${to} = ${rate} (${from}->USD: ${fromToUsd}, USD->${to}: ${usdToTarget})`);
          
          // Сохраняем кросс-курс
          await this.safeSaveRate(from, to, rate);
        }
      }
      
      return rate;
    } catch (error) {
      console.error('Error getting rate:', error);
      return null;
    }
  }

  /**
   * Получить все курсы для базовой валюты
   */
  static async getRatesForCurrency(currency: string): Promise<{ [currency: string]: number }> {
    try {
      const response = await ApiService.get<{ data: CurrencyRatesResponse }>(
        `/exchange-rates/rates/${currency}`
      );
      return response.data.rates;
    } catch (error) {
      console.error('Failed to get rates for currency:', error);
      return {};
    }
  }

  /**
   * Конвертировать сумму из одной валюты в другую
   */
  static async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    
    const rate = await this.getRate(from, to);
    if (rate === null) return amount; // Если не удалось получить курс, возвращаем исходную сумму
    return amount * rate;
  }

  /**
   * Получить информацию о последнем обновлении курсов
   */
  static async getLastUpdate(): Promise<{ updatedAt: string | null; needsUpdate: boolean }> {
    try {
      const response = await ApiService.get<{ data: { updatedAt: string; needsUpdate: boolean } }>(
        '/exchange-rates/last-update'
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get last update info:', error);
      return { updatedAt: null, needsUpdate: true };
    }
  }

  static async getCachedRatesForCurrency(currency: string): Promise<{ [currency: string]: number }> {
    const cached = this.ratesCache.get(currency);
    const now = Date.now();

    // Если есть кеш и он не устарел, возвращаем его
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return { [currency]: cached.rate };
    }

    // Иначе получаем свежие данные
    try {
      const rates = await this.getRatesForCurrency(currency);
      
      // Кешируем результат
      if (Object.keys(rates).length > 0) {
        this.ratesCache.set(currency, {
          rate: rates[currency],
          timestamp: now,
        });
      }

      return rates;
    } catch (error) {
      // Если не удалось получить данные, но есть устаревший кеш - используем его
      if (cached) {
        return { [currency]: cached.rate };
      }
      
      return {};
    }
  }

  /**
   * Очистить кеш курсов
   */
  static clearCache(): void {
    this.ratesCache.clear();
  }
  
  /**
   * Принудительно обновить курс для конкретной пары валют
   */
  static async forceUpdateRate(from: string, to: string): Promise<number | null> {
    console.log(`Force updating rate ${from} -> ${to}`);
    
    // ВРЕМЕННО ОТКЛЮЧАЕМ ЛОКАЛЬНОЕ КЕШИРОВАНИЕ ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
    /*
    // Очищаем локальный кеш только если база данных готова
    if (LocalDatabaseService.isDatabaseReady()) {
      await LocalDatabaseService.saveExchangeRate(from, to, 0); // Удаляем старый курс
      await LocalDatabaseService.saveExchangeRate(to, from, 0); // Удаляем обратный курс
    }
    */
    this.ratesCache.delete(`${from}_${to}`);
    this.ratesCache.delete(`${to}_${from}`);
    
    // Получаем свежий курс с API
    const rate = await this.getRateFromExternalAPI(from, to);
    
    // ВРЕМЕННО НЕ СОХРАНЯЕМ ЛОКАЛЬНО ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
    /*
    if (rate && LocalDatabaseService.isDatabaseReady()) {
      // Сохраняем новый курс только если база данных готова
      await LocalDatabaseService.saveExchangeRate(from, to, rate);
      await LocalDatabaseService.saveExchangeRate(to, from, 1 / rate);
    }
    */
    
    return rate;
  }
  
  /**
   * Очистить все сохраненные курсы
   */
  static async clearAllRates(): Promise<void> {
    console.log('Clearing all saved exchange rates');
    this.clearCache();
    
    // ВРЕМЕННО ОТКЛЮЧАЕМ ЛОКАЛЬНОЕ КЕШИРОВАНИЕ ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
    /*
    // Получаем все сохраненные курсы только если база данных готова
    if (LocalDatabaseService.isDatabaseReady()) {
      const allRates = await LocalDatabaseService.getAllExchangeRates();
      
      // Удаляем каждый курс
      for (const fromCurrency in allRates) {
        for (const toCurrency in allRates[fromCurrency]) {
          await LocalDatabaseService.saveExchangeRate(fromCurrency, toCurrency, 0);
        }
      }
    }
    */
  }

  // Получение курса из внешнего API (как было раньше)
  static async getRateFromExternalAPI(from: string, to: string): Promise<number | null> {
    try {
      console.log(`Fetching rate from external API: ${from} -> ${to}`);
      
      // Используем ApiService для единообразия
      const response = await ApiService.get<{ success: boolean; data: { rate: number; from: string; to: string } }>(
        `/exchange-rates/rate?from=${from}&to=${to}`
      );
      
      console.log('External API full response:', JSON.stringify(response));
      
      // Проверяем структуру ответа
      if (response.success && response.data?.rate) {
        console.log(`External API: Got rate ${from}->${to}: ${response.data.rate}`);
        // ВРЕМЕННО НЕ СОХРАНЯЕМ ЛОКАЛЬНО ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
        /*
        // Сохраняем курс локально
        await LocalDatabaseService.saveExchangeRate(from, to, response.data.rate);
        await LocalDatabaseService.saveExchangeRate(to, from, 1 / response.data.rate);
        */
        return response.data.rate;
      }
      
      console.log('External API: No rate in response, success:', response.success);
      return null;
    } catch (error) {
      console.error('Error getting rate from external API:', error);
      return null;
    }
  }

  // Сохранение пользовательского курса на backend
  static async saveUserRate(fromCurrency: string, toCurrency: string, rate: number): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('@cashcraft_access_token');
      if (!token) return false;

      const response = await ApiService.post('/exchange-rates/user', {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
        mode: 'manual',
      });

      if (response) {
        // ВРЕМЕННО НЕ СОХРАНЯЕМ ЛОКАЛЬНО ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
        /*
        // Сохраняем и локально только если база данных готова
        if (LocalDatabaseService.isDatabaseReady()) {
          await LocalDatabaseService.saveExchangeRate(fromCurrency, toCurrency, rate);
        }
        */
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving user rate:', error);
      // ВРЕМЕННО НЕ СОХРАНЯЕМ ЛОКАЛЬНО ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
      /*
      // Если ошибка сети, сохраняем только локально
      if (LocalDatabaseService.isDatabaseReady()) {
        await LocalDatabaseService.saveExchangeRate(fromCurrency, toCurrency, rate);
      }
      */
      return true;
    }
  }

  // Получение пользовательских курсов с backend
  static async getUserRates(): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('@cashcraft_access_token');
      if (!token) return [];

      const response = await ApiService.get<{ data: any[] }>('/exchange-rates/user');
      return response.data || [];
    } catch (error) {
      console.error('Error getting user rates:', error);
      return [];
    }
  }

  // Установка режима курсов на backend
  static async setRatesMode(mode: 'auto' | 'manual'): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('@cashcraft_access_token');
      if (!token) {
        // ВРЕМЕННО НЕ СОХРАНЯЕМ ЛОКАЛЬНО ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
        /*
        // Если нет токена, сохраняем только локально
        if (LocalDatabaseService.isDatabaseReady()) {
          await LocalDatabaseService.setExchangeRatesMode(mode);
        }
        */
        return true;
      }

      const response = await ApiService.put('/exchange-rates/user/mode', { mode });

      if (response) {
        // ВРЕМЕННО НЕ СОХРАНЯЕМ ЛОКАЛЬНО ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
        /*
        // Сохраняем и локально только если база данных готова
        if (LocalDatabaseService.isDatabaseReady()) {
          await LocalDatabaseService.setExchangeRatesMode(mode);
        }
        */
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting rates mode:', error);
      // ВРЕМЕННО НЕ СОХРАНЯЕМ ЛОКАЛЬНО ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
      /*
      // Если ошибка сети, сохраняем только локально
      if (LocalDatabaseService.isDatabaseReady()) {
        await LocalDatabaseService.setExchangeRatesMode(mode);
      }
      */
      return true;
    }
  }

  // Синхронизация курсов с backend
  static async syncRatesWithBackend(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('@cashcraft_access_token');
      if (!token) return;

      // Получаем пользовательские курсы с backend
      const userRates = await this.getUserRates();
      
      // ВРЕМЕННО НЕ СОХРАНЯЕМ ЛОКАЛЬНО ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
      /*
      if (userRates.length > 0 && LocalDatabaseService.isDatabaseReady()) {
        // Сохраняем их локально только если база данных готова
        await LocalDatabaseService.saveExchangeRatesFromSync(userRates);
      }
      */
    } catch (error) {
      console.error('Error syncing rates with backend:', error);
    }
  }

  // Безопасная инициализация курсов валют при запуске приложения
  static async initializeRatesFromBackend(): Promise<boolean> {
    try {
      console.log('Initializing exchange rates from backend...');

      // Проверяем подключение к интернету
      // const netInfo = await NetInfo.fetch();
      // if (!netInfo.isConnected) {
      //   console.log('No internet connection, skipping rate initialization');
      //   return false;
      // }

      const currencies = new Set<string>();

      // Добавляем валюту по умолчанию
      const defaultCurrency = await AsyncStorage.getItem('defaultCurrency') || 'USD';
      currencies.add(defaultCurrency);

      // Получаем список всех используемых валют из локальной базы данных
      // ТОЛЬКО если база данных уже инициализирована
      if (LocalDatabaseService.isDatabaseReady()) {
        const accounts = await LocalDatabaseService.getAccounts();
        // Добавляем валюты из счетов
        accounts.forEach(account => {
          if (account.currency) {
            currencies.add(account.currency);
          }
        });
      } else {
        console.log('Database not ready yet, initializing only default currency rates');
      }

      // Если есть только одна валюта, не нужно загружать курсы
      if (currencies.size <= 1) {
        console.log('Only one currency in use, no rates needed');
        return true;
      }
      
      const currencyArray = Array.from(currencies);
      console.log('Loading rates for currencies:', currencyArray);
      
      // Загружаем курсы для всех пар валют
      let successCount = 0;
      let totalPairs = 0;
      
      for (let i = 0; i < currencyArray.length; i++) {
        for (let j = i + 1; j < currencyArray.length; j++) {
          totalPairs++;
          try {
            const fromCurrency = currencyArray[i];
            const toCurrency = currencyArray[j];
            
            // Загружаем курс с backend (без авторизации, используя внешний API)
            const rate = await this.getRateFromExternalAPI(fromCurrency, toCurrency);
            
            if (rate && rate > 0) {
              // Безопасно сохраняем в локальную базу
              await this.safeSaveRate(fromCurrency, toCurrency, rate);
              await this.safeSaveRate(toCurrency, fromCurrency, 1 / rate);
              successCount++;
              
              console.log(`Loaded rate: ${fromCurrency}/${toCurrency} = ${rate}`);
            }
          } catch (error) {
            console.error(`Failed to load rate for pair:`, error);
          }
        }
      }
      
      console.log(`Successfully loaded ${successCount}/${totalPairs} currency pairs`);
      return successCount > 0;
      
    } catch (error) {
      console.error('Error initializing exchange rates:', error);
      return false;
    }
  }
  
  // Безопасное сохранение курса в локальную базу
  private static async safeSaveRate(fromCurrency: string, toCurrency: string, rate: number): Promise<void> {
    try {
      // ВРЕМЕННО ОТКЛЮЧАЕМ СОХРАНЕНИЕ В БД ИЗ-ЗА ПРОБЛЕМ С EXPO-SQLITE
      // Сохраняем только в кэш памяти
      const key = `${fromCurrency}_${toCurrency}`;
      this.ratesCache.set(key, {
        rate,
        timestamp: Date.now()
      });
      
      if (__DEV__) {
        console.log(`Rate ${fromCurrency}/${toCurrency} = ${rate} saved to memory cache`);
      }
      
      // TODO: Включить обратно после исправления проблем с expo-sqlite
      /*
      // Проверяем готовность базы данных
      if (!LocalDatabaseService.isDatabaseReady()) {
        console.log('Database not ready, caching rate in memory');
        // Сохраняем в кэш памяти
        const key = `${fromCurrency}_${toCurrency}`;
        this.ratesCache.set(key, {
          rate,
          timestamp: Date.now()
        });
        return;
      }
      
      // Пытаемся сохранить в базу данных
      await LocalDatabaseService.saveExchangeRate(fromCurrency, toCurrency, rate);
      */
      
    } catch (error) {
      console.error(`Error saving rate ${fromCurrency}/${toCurrency}:`, error);
      // Даже если произошла ошибка, сохраняем в кэш
      const key = `${fromCurrency}_${toCurrency}`;
      this.ratesCache.set(key, {
        rate,
        timestamp: Date.now()
      });
    }
  }
  
  // Метод для переноса курсов из кэша в базу данных
  static async transferCacheToDatabase(): Promise<void> {
    if (!LocalDatabaseService.isDatabaseReady()) {
      return;
    }
    
    const cacheEntries = Array.from(this.ratesCache.entries());
    if (cacheEntries.length === 0) {
      return;
    }
    
    console.log(`Transferring ${cacheEntries.length} cached rates to database...`);
    
    for (const [key, value] of cacheEntries) {
      try {
        const [fromCurrency, toCurrency] = key.split('_');
        await LocalDatabaseService.saveExchangeRate(fromCurrency, toCurrency, value.rate);
        // Удаляем из кэша после успешного сохранения
        this.ratesCache.delete(key);
      } catch (error) {
        console.error(`Error transferring cached rate ${key}:`, error);
      }
    }
  }
}
