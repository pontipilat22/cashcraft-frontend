import { ApiService } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalDatabaseService } from './localDatabase';
import { Platform } from 'react-native';

// Копируем логику получения URL из api.ts
const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://192.168.2.101:3000/api/v1';
    } else {
      return 'http://192.168.2.101:3000/api/v1';
    }
  } else {
    return 'https://your-production-api.com/api/v1';
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
  private static ratesCache: Map<string, { rates: { [currency: string]: number }; timestamp: number }> = new Map();
  private static CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 часа

  /**
   * Получить курс конвертации между двумя валютами
   */
  static async getRate(from: string, to: string): Promise<number | null> {
    try {
      console.log(`ExchangeRateService.getRate called: ${from} -> ${to}`);
      
      if (from === to) return 1;
      
      const token = await AsyncStorage.getItem('@cashcraft_access_token');
      console.log('Has token:', !!token);
      
      // Сначала пытаемся получить из локальной базы
      const localRate = await LocalDatabaseService.getLocalExchangeRate(from, to);
      console.log('Local rate:', localRate);
      if (localRate) return localRate;
      
      // Пробуем получить прямой курс с API
      let rate = null;
      
      // Если нет токена, используем только внешний API
      if (!token) {
        console.log('No token, using external API');
        rate = await this.getRateFromExternalAPI(from, to);
      } else {
        // Пытаемся получить с backend
        console.log('Trying to get rate from backend with token');
        try {
          const response = await ApiService.get<{ success: boolean; data: { rate: number; from: string; to: string } }>(
            `/exchange-rates/rate?from=${from}&to=${to}`
          );
          
          console.log('Backend response full:', response);
          
          // Backend возвращает { success: true, data: { rate, from, to } }
          if (response.success && response.data?.rate) {
            console.log(`Saving rate ${from}->${to}: ${response.data.rate}`);
            // Сохраняем локально
            await LocalDatabaseService.saveExchangeRate(from, to, response.data.rate);
            await LocalDatabaseService.saveExchangeRate(to, from, 1 / response.data.rate);
            return response.data.rate;
          } else {
            console.log('No rate in response, success:', response.success);
          }
        } catch (error) {
          console.log('Backend request failed:', error);
        }
        
        // Если не удалось получить с backend, используем внешний API
        console.log('Backend failed, using external API');
        rate = await this.getRateFromExternalAPI(from, to);
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
          
          // Сохраняем кросс-курс локально
          await LocalDatabaseService.saveExchangeRate(from, to, rate);
          await LocalDatabaseService.saveExchangeRate(to, from, 1 / rate);
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
      return cached.rates;
    }

    // Иначе получаем свежие данные
    try {
      const rates = await this.getRatesForCurrency(currency);
      
      // Кешируем результат
      if (Object.keys(rates).length > 0) {
        this.ratesCache.set(currency, {
          rates,
          timestamp: now,
        });
      }

      return rates;
    } catch (error) {
      // Если не удалось получить данные, но есть устаревший кеш - используем его
      if (cached) {
        return cached.rates;
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
    
    // Очищаем локальный кеш
    await LocalDatabaseService.saveExchangeRate(from, to, 0); // Удаляем старый курс
    await LocalDatabaseService.saveExchangeRate(to, from, 0); // Удаляем обратный курс
    this.ratesCache.delete(from);
    this.ratesCache.delete(to);
    
    // Получаем свежий курс с API
    const rate = await this.getRateFromExternalAPI(from, to);
    
    if (rate) {
      // Сохраняем новый курс
      await LocalDatabaseService.saveExchangeRate(from, to, rate);
      await LocalDatabaseService.saveExchangeRate(to, from, 1 / rate);
    }
    
    return rate;
  }
  
  /**
   * Очистить все сохраненные курсы
   */
  static async clearAllRates(): Promise<void> {
    console.log('Clearing all saved exchange rates');
    this.clearCache();
    
    // Получаем все сохраненные курсы
    const allRates = await LocalDatabaseService.getAllExchangeRates();
    
    // Удаляем каждый курс
    for (const fromCurrency in allRates) {
      for (const toCurrency in allRates[fromCurrency]) {
        await LocalDatabaseService.saveExchangeRate(fromCurrency, toCurrency, 0);
      }
    }
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
        // Сохраняем курс локально
        await LocalDatabaseService.saveExchangeRate(from, to, response.data.rate);
        await LocalDatabaseService.saveExchangeRate(to, from, 1 / response.data.rate);
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
        // Сохраняем и локально
        await LocalDatabaseService.saveExchangeRate(fromCurrency, toCurrency, rate);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving user rate:', error);
      // Если ошибка сети, сохраняем только локально
      await LocalDatabaseService.saveExchangeRate(fromCurrency, toCurrency, rate);
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
        // Если нет токена, сохраняем только локально
        await LocalDatabaseService.setExchangeRatesMode(mode);
        return true;
      }

      const response = await ApiService.put('/exchange-rates/user/mode', { mode });

      if (response) {
        // Сохраняем и локально
        await LocalDatabaseService.setExchangeRatesMode(mode);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting rates mode:', error);
      // Если ошибка сети, сохраняем только локально
      await LocalDatabaseService.setExchangeRatesMode(mode);
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
      
      if (userRates.length > 0) {
        // Сохраняем их локально
        await LocalDatabaseService.saveExchangeRatesFromSync(userRates);
      }
    } catch (error) {
      console.error('Error syncing rates with backend:', error);
    }
  }
}
