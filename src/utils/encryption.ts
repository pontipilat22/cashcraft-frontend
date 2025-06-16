import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ключи для хранения
const ENCRYPTION_KEY_STORAGE = '@cashcraft_encryption_key';
const DEVICE_ID_STORAGE = '@cashcraft_device_id';

/**
 * Утилита для шифрования данных на клиенте
 */
export class ClientEncryption {
  private static encryptionKey: string | null = null;

  /**
   * Инициализация ключа шифрования
   */
  static async initialize(): Promise<void> {
    try {
      // Пробуем получить существующий ключ
      let key = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE);
      
      if (!key) {
        // Генерируем новый ключ
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        key = btoa(String.fromCharCode(...new Uint8Array(randomBytes)));
        await AsyncStorage.setItem(ENCRYPTION_KEY_STORAGE, key);
      }
      
      this.encryptionKey = key;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
    }
  }

  /**
   * Получить или создать уникальный ID устройства
   */
  static async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE);
      
      if (!deviceId) {
        // Генерируем новый ID устройства
        deviceId = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Date.now()}-${Math.random()}`
        );
        await AsyncStorage.setItem(DEVICE_ID_STORAGE, deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Failed to get device ID:', error);
      return 'unknown';
    }
  }

  /**
   * Хеширует строку (одностороннее шифрование)
   */
  static async hash(text: string): Promise<string> {
    try {
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        text
      );
    } catch (error) {
      console.error('Hash error:', error);
      throw error;
    }
  }

  /**
   * Создает HMAC подпись для проверки целостности данных
   */
  static async createHmac(data: string, key?: string): Promise<string> {
    try {
      const hmacKey = key || this.encryptionKey || 'default-key';
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + hmacKey,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
    } catch (error) {
      console.error('HMAC error:', error);
      throw error;
    }
  }

  /**
   * Маскирует номер карты, оставляя только последние 4 цифры
   */
  static maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 8) return cardNumber;
    
    const cleaned = cardNumber.replace(/\s+/g, '');
    const lastFour = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 4) + lastFour;
    
    // Форматируем для отображения
    return masked.match(/.{1,4}/g)?.join(' ') || masked;
  }

  /**
   * Валидирует номер карты по алгоритму Луна
   */
  static validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s+/g, '');
    if (!/^\d+$/.test(cleaned)) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Генерирует случайный пароль
   */
  static async generateSecurePassword(length: number = 16): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const randomBytes = await Crypto.getRandomBytesAsync(length);
    const bytes = new Uint8Array(randomBytes);
    
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    
    return password;
  }

  /**
   * Очищает все ключи шифрования (при выходе пользователя)
   */
  static async clearEncryptionData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([ENCRYPTION_KEY_STORAGE, DEVICE_ID_STORAGE]);
      this.encryptionKey = null;
    } catch (error) {
      console.error('Failed to clear encryption data:', error);
    }
  }
} 
