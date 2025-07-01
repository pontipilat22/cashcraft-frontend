import { ApiService } from './api';
import { ClientEncryption } from '../utils/encryption';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  display_name?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  isGuest: boolean;
  isPremium: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  // Регистрация нового пользователя
  static async register(data: RegisterData): Promise<AuthResponse> {
    const response = await ApiService.post<AuthResponse>('/auth/register', data);
    
    // Сохраняем токены
    await ApiService.setAccessToken(response.accessToken);
    await ApiService.setRefreshToken(response.refreshToken);
    
    return response;
  }

  // Вход в систему
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await ApiService.post<AuthResponse>('/auth/login', credentials);
    
    // Сохраняем токены
    await ApiService.setAccessToken(response.accessToken);
    await ApiService.setRefreshToken(response.refreshToken);
    
    return response;
  }

  // Вход как гость
  static async loginAsGuest(): Promise<AuthResponse> {
    const response = await ApiService.post<AuthResponse>('/auth/guest');
    
    // Сохраняем токены
    await ApiService.setAccessToken(response.accessToken);
    await ApiService.setRefreshToken(response.refreshToken);
    
    return response;
  }

  // Вход через Google
  static async loginWithGoogle(googleData: { idToken: string; email: string; name: string; googleId: string }): Promise<AuthResponse> {
    console.log('🔑 [AuthService] Начинаем вход через Google для:', googleData.email);
    
    const response = await ApiService.post<AuthResponse>('/auth/google', googleData);
    
    console.log('🔑 [AuthService] Получен ответ от сервера:');
    console.log('  - Access Token:', response.accessToken ? 'Есть (' + response.accessToken.substring(0, 20) + '...)' : 'Нет');
    console.log('  - Refresh Token:', response.refreshToken ? 'Есть (' + response.refreshToken.substring(0, 20) + '...)' : 'Нет');
    console.log('  - User ID:', response.user.id);
    
    // Проверяем, что refresh token действительно есть
    if (!response.refreshToken) {
      console.error('❌ [AuthService] КРИТИЧЕСКАЯ ОШИБКА: Refresh token отсутствует в ответе сервера!');
      console.error('❌ [AuthService] Полный ответ сервера:', JSON.stringify(response, null, 2));
    }
    
    // Сохраняем токены
    console.log('💾 [AuthService] Сохраняем токены...');
    await ApiService.setAccessToken(response.accessToken);
    await ApiService.setRefreshToken(response.refreshToken);
    
    // Проверяем, что токены сохранились
    const savedAccessToken = await ApiService.getAccessToken();
    const savedRefreshToken = await ApiService.getRefreshToken();
    
    console.log('✅ [AuthService] Проверка сохранения токенов:');
    console.log('  - Access Token сохранен:', savedAccessToken ? 'Да' : 'Нет');
    console.log('  - Refresh Token сохранен:', savedRefreshToken ? 'Да' : 'Нет');
    
    if (!savedRefreshToken) {
      console.error('❌ [AuthService] КРИТИЧЕСКАЯ ОШИБКА: Refresh token не сохранился!');
    }
    
    console.log('✅ [AuthService] Токены сохранены');
    
    return response;
  }

  // Обновление access токена
  static async refreshToken(token: string): Promise<{accessToken: string, refreshToken: string} | null> {
    try {
      console.log('🔄 [AuthService] Начинаем обновление токена...');
      const response = await ApiService.post<{ accessToken: string, refreshToken: string }>('/auth/refresh', {
        refreshToken: token
      });

      console.log('✅ [AuthService] Токен успешно обновлен');
      await ApiService.saveTokens(response.accessToken, response.refreshToken);
      return response;
    } catch (error) {
      console.log('⚠️ [AuthService] Не удалось обновить токен, но НЕ очищаем токены');
      console.log('⚠️ [AuthService] Пользователь остается в системе');
      // НЕ очищаем токены, пользователь остается в системе
      return null;
    }
  }

  // Выход из системы
  static async logout(): Promise<void> {
    try {
      const refreshToken = await ApiService.getRefreshToken();
      if (refreshToken) {
        await ApiService.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Игнорируем ошибки при выходе
      console.error('Logout error:', error);
    } finally {
      await ApiService.clearTokens();
      await ClientEncryption.clearEncryptionData(); // Очищаем данные шифрования
    }
  }

  // Получение текущего пользователя
  static async getCurrentUser(): Promise<User | null> {
    try {
      const token = await ApiService.getAccessToken();
      if (!token) return null;

      const response = await ApiService.get<{ user: User }>('/auth/me');
      return response.user;
    } catch (error) {
      return null;
    }
  }

  // Проверка аутентификации
  static async isAuthenticated(): Promise<boolean> {
    const token = await ApiService.getAccessToken();
    return !!token;
  }

  // Проверка силы пароля
  static checkPasswordStrength(password: string): {
    strength: 'weak' | 'medium' | 'strong';
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    
    if (password.length < 8) {
      suggestions.push('Пароль должен содержать минимум 8 символов');
    }
    
    if (!/[A-Z]/.test(password)) {
      suggestions.push('Добавьте заглавные буквы');
    }
    
    if (!/[a-z]/.test(password)) {
      suggestions.push('Добавьте строчные буквы');
    }
    
    if (!/[0-9]/.test(password)) {
      suggestions.push('Добавьте цифры');
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
      suggestions.push('Добавьте специальные символы');
    }
    
    const score = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[!@#$%^&*]/.test(password),
      password.length >= 12
    ].filter(Boolean).length;
    
    if (score >= 5) strength = 'strong';
    else if (score >= 3) strength = 'medium';
    
    return { strength, suggestions };
  }

  // Генерация безопасного пароля
  static async generateSecurePassword(): Promise<string> {
    return ClientEncryption.generateSecurePassword();
  }
} 