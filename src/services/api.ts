import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClientEncryption } from '../utils/encryption';
import { Platform } from 'react-native';

// Базовый URL API - правильная конфигурация для разных платформ
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

// Логируем URL для отладки
console.log('API Base URL:', API_BASE_URL);
console.log('Platform:', Platform.OS);
console.log('Dev mode:', __DEV__);

// Ключи для хранения токенов
const ACCESS_TOKEN_KEY = '@cashcraft_access_token';
const REFRESH_TOKEN_KEY = '@cashcraft_refresh_token';

// Класс для работы с API
export class ApiService {
  // Инициализация (вызывается при запуске приложения)
  static async initialize(): Promise<void> {
    await ClientEncryption.initialize();
  }

  // Получение токена доступа
  static async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Получение refresh токена
  static async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  // Сохранение access токена
  static async setAccessToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving access token:', error);
    }
  }

  // Сохранение refresh токена
  static async setRefreshToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving refresh token:', error);
    }
  }

  // Сохранение токенов
  static async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [ACCESS_TOKEN_KEY, accessToken],
        [REFRESH_TOKEN_KEY, refreshToken],
      ]);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  // Удаление токенов
  static async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Базовый метод для выполнения запросов
  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    
    // Логируем запрос для отладки
    console.log('Making request to:', `${API_BASE_URL}${endpoint}`);
    console.log('Method:', options.method || 'GET');
    
    // Используем Record<string, string> для правильной типизации
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Добавляем Device ID для отслеживания устройств
    const deviceId = await ClientEncryption.getDeviceId();
    headers['X-Device-ID'] = deviceId;

    // Для POST/PUT запросов добавляем HMAC подпись
    if ((options.method === 'POST' || options.method === 'PUT') && options.body) {
      const hmac = await ClientEncryption.createHmac(options.body as string);
      headers['X-HMAC-Signature'] = hmac;
    }

    try {
      console.log('Fetching:', `${API_BASE_URL}${endpoint}`);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Если токен истек, пробуем обновить
      if (response.status === 401 && accessToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Повторяем запрос с новым токеном
          headers['Authorization'] = `Bearer ${refreshed}`;
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
          
          if (!retryResponse.ok) {
            throw new Error(await this.getErrorMessage(retryResponse));
          }
          
          return retryResponse.json();
        }
      }

      if (!response.ok) {
        throw new Error(await this.getErrorMessage(response));
      }

      return response.json();
    } catch (error: any) {
      console.error('Request error:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      
      if (error instanceof TypeError && error.message === 'Network request failed') {
        console.error('Network error details:');
        console.error('URL:', `${API_BASE_URL}${endpoint}`);
        console.error('Platform:', Platform.OS);
        throw new Error(`Нет соединения с сервером по адресу ${API_BASE_URL}. Проверьте, что backend запущен на порту 3000.`);
      }
      throw error;
    }
  }

  // Обновление токена доступа
  private static async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await this.clearTokens();
        return null;
      }

      const data = await response.json();
      await this.saveTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  // Получение сообщения об ошибке из ответа
  private static async getErrorMessage(response: Response): Promise<string> {
    try {
      const data = await response.json();
      return data.error || data.message || 'Произошла ошибка';
    } catch {
      return `Ошибка: ${response.status} ${response.statusText}`;
    }
  }

  // Методы для удобства
  static get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  static post<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static put<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
} 