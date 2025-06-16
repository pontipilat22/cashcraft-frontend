import { ApiService } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalDatabaseService } from './localDatabase';
import { Platform } from 'react-native';

// Копируем логику получения URL из api.ts
const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://192.168.1.246:3000/api/v1';
    } else {
      return 'http://192.168.1.246:3000/api/v1';
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
      const token = await AsyncStorage.getItem('token');
      
      // Сначала пытаемся получить из локальной базы
      const localRate = await LocalDatabaseService.getLocalExchangeRate(from, to);
      if (localRate) return localRate;
      
      // Если нет токена, используем только внешний API
      if (!token) {
        return await this.getRateFromExternalAPI(from, to);
      }
      
      // Пытаемся получить с backend
      const response = await fetch(`${API_BASE_URL}/exchange-rates/rate?from=${from}&to=${to}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data?.rate) {
          // Сохраняем локально
          await LocalDatabaseService.saveExchangeRate(from, to, data.data.rate);
          return data.data.rate;
        }
      }
      
      // Если не удалось получить с backend, используем внешний API
      return await this.getRateFromExternalAPI(from, to);
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

  // Получение курса из внешнего API (как было раньше)
  static async getRateFromExternalAPI(from: string, to: string): Promise<number | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/exchange-rates/rate?from=${from}&to=${to}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.data?.rate) {
          return data.data.rate;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting rate from external API:', error);
      return null;
    }
  }

  // Сохранение пользовательского курса на backend
  static async saveUserRate(fromCurrency: string, toCurrency: string, rate: number): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/exchange-rates/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate,
          mode: 'manual',
        }),
      });

      if (response.ok) {
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
      const token = await AsyncStorage.getItem('token');
      if (!token) return [];

      const response = await fetch(`${API_BASE_URL}/exchange-rates/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting user rates:', error);
      return [];
    }
  }

  // Установка режима курсов на backend
  static async setRatesMode(mode: 'auto' | 'manual'): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        // Если нет токена, сохраняем только локально
        await LocalDatabaseService.setExchangeRatesMode(mode);
        return true;
      }

      const response = await fetch(`${API_BASE_URL}/exchange-rates/user/mode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mode }),
      });

      if (response.ok) {
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
      const token = await AsyncStorage.getItem('token');
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
