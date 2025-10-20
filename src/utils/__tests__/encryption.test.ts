import { ClientEncryption } from '../encryption';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock expo-crypto
jest.mock('expo-crypto');
const mockCrypto = Crypto as jest.Mocked<typeof Crypto>;

describe('ClientEncryption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('initialize', () => {
    it('should generate new encryption key if not exists', async () => {
      const mockRandomBytes = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.getRandomBytesAsync = jest.fn().mockResolvedValue(mockRandomBytes);

      await ClientEncryption.initialize();

      expect(mockCrypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should use existing encryption key if available', async () => {
      await AsyncStorage.setItem('@cashcraft_encryption_key', 'existing-key');

      await ClientEncryption.initialize();

      expect(mockCrypto.getRandomBytesAsync).not.toHaveBeenCalled();
    });

    it('should handle initialization error gracefully', async () => {
      mockCrypto.getRandomBytesAsync = jest.fn().mockRejectedValue(new Error('Crypto error'));

      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      await ClientEncryption.initialize();

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('getDeviceId', () => {
    it('should return existing device ID if available', async () => {
      await AsyncStorage.setItem('@cashcraft_device_id', 'existing-device-id');

      const deviceId = await ClientEncryption.getDeviceId();

      expect(deviceId).toBe('existing-device-id');
    });

    it('should generate new device ID if not exists', async () => {
      mockCrypto.digestStringAsync = jest.fn().mockResolvedValue('new-device-id');

      const deviceId = await ClientEncryption.getDeviceId();

      expect(mockCrypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA256,
        expect.any(String)
      );
      expect(deviceId).toBe('new-device-id');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cashcraft_device_id', 'new-device-id');
    });

    it('should return "unknown" on error', async () => {
      mockCrypto.digestStringAsync = jest.fn().mockRejectedValue(new Error('Crypto error'));

      const deviceId = await ClientEncryption.getDeviceId();

      expect(deviceId).toBe('unknown');
    });
  });

  describe('hash', () => {
    it('should hash text correctly', async () => {
      mockCrypto.digestStringAsync = jest.fn().mockResolvedValue('hashed-value');

      const result = await ClientEncryption.hash('test-string');

      expect(mockCrypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA256,
        'test-string'
      );
      expect(result).toBe('hashed-value');
    });

    it('should throw error on hash failure', async () => {
      mockCrypto.digestStringAsync = jest.fn().mockRejectedValue(new Error('Hash error'));

      await expect(ClientEncryption.hash('test')).rejects.toThrow('Hash error');
    });
  });

  describe('createHmac', () => {
    beforeEach(async () => {
      await ClientEncryption.initialize();
    });

    it('should create HMAC with provided key', async () => {
      mockCrypto.digestStringAsync = jest.fn().mockResolvedValue('hmac-signature');

      const result = await ClientEncryption.createHmac('data', 'custom-key');

      expect(mockCrypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA256,
        'datacustom-key',
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      expect(result).toBe('hmac-signature');
    });

    it('should use encryption key if no key provided', async () => {
      mockCrypto.digestStringAsync = jest.fn().mockResolvedValue('hmac-signature');

      await ClientEncryption.createHmac('data');

      expect(mockCrypto.digestStringAsync).toHaveBeenCalled();
    });
  });

  describe('maskCardNumber', () => {
    it('should mask card number leaving last 4 digits', () => {
      const masked = ClientEncryption.maskCardNumber('1234567890123456');
      expect(masked).toBe('**** **** **** 3456');
    });

    it('should handle card number with spaces', () => {
      const masked = ClientEncryption.maskCardNumber('1234 5678 9012 3456');
      expect(masked).toBe('**** **** **** 3456');
    });

    it('should return original if less than 8 characters', () => {
      const masked = ClientEncryption.maskCardNumber('1234');
      expect(masked).toBe('1234');
    });

    it('should handle empty string', () => {
      const masked = ClientEncryption.maskCardNumber('');
      expect(masked).toBe('');
    });
  });

  describe('validateCardNumber', () => {
    it('should validate correct card number (Visa)', () => {
      // Valid Visa test card number
      const isValid = ClientEncryption.validateCardNumber('4532015112830366');
      expect(isValid).toBe(true);
    });

    it('should validate correct card number with spaces', () => {
      const isValid = ClientEncryption.validateCardNumber('4532 0151 1283 0366');
      expect(isValid).toBe(true);
    });

    it('should reject invalid card number', () => {
      const isValid = ClientEncryption.validateCardNumber('1234567890123456');
      expect(isValid).toBe(false);
    });

    it('should reject non-numeric input', () => {
      const isValid = ClientEncryption.validateCardNumber('abcd1234efgh5678');
      expect(isValid).toBe(false);
    });

    it('should reject empty string', () => {
      const isValid = ClientEncryption.validateCardNumber('');
      expect(isValid).toBe(false);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', async () => {
      const mockRandomBytes = new Uint8Array(16).fill(65); // 'A' character code
      mockCrypto.getRandomBytesAsync = jest.fn().mockResolvedValue(mockRandomBytes);

      const password = await ClientEncryption.generateSecurePassword(16);

      expect(password).toHaveLength(16);
      expect(typeof password).toBe('string');
    });

    it('should generate password of default length (16)', async () => {
      const mockRandomBytes = new Uint8Array(16).fill(65);
      mockCrypto.getRandomBytesAsync = jest.fn().mockResolvedValue(mockRandomBytes);

      const password = await ClientEncryption.generateSecurePassword();

      expect(password).toHaveLength(16);
    });

    it('should only contain allowed characters', async () => {
      const mockRandomBytes = new Uint8Array(20).fill(1);
      mockCrypto.getRandomBytesAsync = jest.fn().mockResolvedValue(mockRandomBytes);

      const password = await ClientEncryption.generateSecurePassword(20);

      const allowedChars = /^[A-Za-z0-9!@#$%^&*]+$/;
      expect(password).toMatch(allowedChars);
    });
  });

  describe('clearEncryptionData', () => {
    it('should clear encryption keys from storage', async () => {
      await AsyncStorage.setItem('@cashcraft_encryption_key', 'test-key');
      await AsyncStorage.setItem('@cashcraft_device_id', 'test-device');

      await ClientEncryption.clearEncryptionData();

      const encryptionKey = await AsyncStorage.getItem('@cashcraft_encryption_key');
      const deviceId = await AsyncStorage.getItem('@cashcraft_device_id');

      expect(encryptionKey).toBeNull();
      expect(deviceId).toBeNull();
    });

    it('should handle clear error gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.multiRemove as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await ClientEncryption.clearEncryptionData();

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
