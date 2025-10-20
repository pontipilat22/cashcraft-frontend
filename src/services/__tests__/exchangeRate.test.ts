import { ExchangeRateService } from '../exchangeRate';

describe('ExchangeRateService', () => {
  beforeEach(() => {
    // Очищаем кеш перед каждым тестом
    ExchangeRateService.clearCache();
    jest.clearAllMocks();
  });

  describe('convert', () => {
    it('should return same amount for same currencies', async () => {
      const result = await ExchangeRateService.convert(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should convert using rate', async () => {
      // Мокаем getRate
      jest.spyOn(ExchangeRateService, 'getRate').mockResolvedValue(0.85);

      const result = await ExchangeRateService.convert(100, 'USD', 'EUR');

      expect(result).toBe(85);
      expect(ExchangeRateService.getRate).toHaveBeenCalledWith('USD', 'EUR');
    });

    it('should return original amount if rate is null', async () => {
      jest.spyOn(ExchangeRateService, 'getRate').mockResolvedValue(null);

      const result = await ExchangeRateService.convert(100, 'USD', 'EUR');

      expect(result).toBe(100);
    });

    it('should handle large amounts', async () => {
      jest.spyOn(ExchangeRateService, 'getRate').mockResolvedValue(75.5);

      const result = await ExchangeRateService.convert(1000000, 'USD', 'RUB');

      expect(result).toBe(75500000);
    });

    it('should handle decimal rates', async () => {
      jest.spyOn(ExchangeRateService, 'getRate').mockResolvedValue(0.012345);

      const result = await ExchangeRateService.convert(100, 'RUB', 'USD');

      expect(result).toBeCloseTo(1.2345, 4);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached rates', () => {
      // Это простой тест, так как clearCache - это публичный метод
      expect(() => ExchangeRateService.clearCache()).not.toThrow();
    });
  });

  describe('getRate with caching', () => {
    it('should return 1 for same currency', async () => {
      const rate = await ExchangeRateService.getRate('USD', 'USD');
      expect(rate).toBe(1);
    });

    // Note: Полные тесты для getRate требуют моков для ApiService и LocalDatabaseService
    // Эти тесты можно расширить после создания полноценных моков
  });
});
