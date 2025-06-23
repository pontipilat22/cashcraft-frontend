import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClientEncryption } from '../utils/encryption';
import { Platform } from 'react-native';

// 🔥 Указываем IP напрямую (без __DEV__), чтобы работало даже в релизе
const API_BASE_URL = 'https://cashcraft-backend-production.up.railway.app/api/v1';


const ACCESS_TOKEN_KEY = '@cashcraft_access_token';
const REFRESH_TOKEN_KEY = '@cashcraft_refresh_token';

console.log('🔌 API URL:', API_BASE_URL);
console.log('📱 Platform:', Platform.OS);

export class ApiService {
  static async initialize(): Promise<void> {
    await ClientEncryption.initialize();
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  static async setAccessToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving access token:', error);
    }
  }

  static async setRefreshToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving refresh token:', error);
    }
  }

  static async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    try {
      const [accessToken, refreshToken] = await AsyncStorage.multiGet([
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
      ]);
      return {
        accessToken: accessToken[1],
        refreshToken: refreshToken[1],
      };
    } catch (error) {
      console.error('Error getting tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  }

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

  static async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = await this.getAccessToken();

    console.log('📡 Request →', `${API_BASE_URL}${endpoint}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const deviceId = await ClientEncryption.getDeviceId();
    headers['X-Device-ID'] = deviceId;

    if ((options.method === 'POST' || options.method === 'PUT') && options.body) {
      const hmac = await ClientEncryption.createHmac(options.body as string);
      headers['X-HMAC-Signature'] = hmac;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 401 && accessToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
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
      console.error('❌ API Request Error:', error?.message || error);

      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        throw new Error('Запрос превысил лимит времени.');
      }

      if (error instanceof TypeError && error.message === 'Network request failed') {
        throw new Error('Ошибка сети: проверьте подключение к серверу.');
      }

      throw error;
    }
  }

  private static async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.error('Ошибка обновления токена:', error);
      return null;
    }
  }

  private static async getErrorMessage(response: Response): Promise<string> {
    try {
      const data = await response.json();
      return data.error || data.message || 'Произошла ошибка';
    } catch {
      return `Ошибка: ${response.status} ${response.statusText}`;
    }
  }

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
