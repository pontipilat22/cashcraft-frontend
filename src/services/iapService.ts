import * as InAppPurchases from 'expo-iap';
import { Platform } from 'react-native';

// Типы для товаров и покупок
export interface SubscriptionProduct {
  productId: string;
  price: string;
  title: string;
  description: string;
  priceAmountMicros?: string;
  priceCurrencyCode?: string;
  subscriptionPeriod?: string;
  freeTrialPeriod?: string;
  introductoryPrice?: string;
  introductoryPriceAmountMicros?: string;
  introductoryPricePeriod?: string;
  introductoryPriceCycles?: string;
}

export interface PurchaseResult {
  purchaseId: string;
  productId: string;
  transactionId: string;
  transactionDate: number;
  transactionReceipt: string;
  orderId?: string;
  isAcknowledged?: boolean;
}

// ID товаров в Google Play Console и App Store Connect
export const SUBSCRIPTION_SKUS = {
  MONTHLY: 'cashcraft_premium_monthly',
  YEARLY: 'cashcraft_premium_yearly',
} as const;

export type SubscriptionSKU = typeof SUBSCRIPTION_SKUS[keyof typeof SUBSCRIPTION_SKUS];

class IAPService {
  private isInitialized = false;
  private isConnected = false;

  /**
   * Инициализация сервиса покупок
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 [IAPService] Initializing...');
      
      // Инициализируем подключение к store
      await InAppPurchases.connectAsync();
      this.isConnected = true;
      
      console.log('✅ [IAPService] Connected to store');
      
      // Получаем список доступных товаров
      const products = await this.getProducts();
      console.log('📦 [IAPService] Available products:', products.length);
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ [IAPService] Initialization failed:', error);
      this.isInitialized = false;
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Получение списка доступных товаров (подписок)
   */
  async getProducts(): Promise<SubscriptionProduct[]> {
    try {
      if (!this.isConnected) {
        throw new Error('IAPService не инициализирован');
      }

      const skus = Object.values(SUBSCRIPTION_SKUS);
      console.log('🔍 [IAPService] Getting products for SKUs:', skus);
      
      const products = await InAppPurchases.getProductsAsync(skus);
      console.log('📦 [IAPService] Retrieved products:', products);

      return products.map(product => ({
        productId: product.productId,
        price: product.price || '',
        title: product.title || '',
        description: product.description || '',
        priceAmountMicros: product.priceAmountMicros,
        priceCurrencyCode: product.priceCurrencyCode,
        subscriptionPeriod: product.subscriptionPeriod,
        freeTrialPeriod: product.freeTrialPeriod,
        introductoryPrice: product.introductoryPrice,
        introductoryPriceAmountMicros: product.introductoryPriceAmountMicros,
        introductoryPricePeriod: product.introductoryPricePeriod,
        introductoryPriceCycles: product.introductoryPriceCycles,
      }));
    } catch (error) {
      console.error('❌ [IAPService] Failed to get products:', error);
      throw error;
    }
  }

  /**
   * Покупка подписки
   */
  async purchaseSubscription(productId: SubscriptionSKU): Promise<PurchaseResult | null> {
    try {
      if (!this.isConnected) {
        throw new Error('IAPService не инициализирован');
      }

      console.log('💳 [IAPService] Purchasing subscription:', productId);
      
      const result = await InAppPurchases.purchaseItemAsync(productId);
      console.log('✅ [IAPService] Purchase result:', result);

      if (result && result.transactionId) {
        const purchaseResult: PurchaseResult = {
          purchaseId: result.transactionId,
          productId: productId,
          transactionId: result.transactionId,
          transactionDate: Date.now(),
          transactionReceipt: result.transactionReceipt || '',
          orderId: result.orderId,
          isAcknowledged: result.isAcknowledged,
        };

        // Для Android нужно подтвердить покупку
        if (Platform.OS === 'android' && !result.isAcknowledged) {
          await this.acknowledgePurchase(result.transactionId);
        }

        return purchaseResult;
      }

      return null;
    } catch (error) {
      console.error('❌ [IAPService] Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Восстановление покупок
   */
  async restorePurchases(): Promise<PurchaseResult[]> {
    try {
      if (!this.isConnected) {
        throw new Error('IAPService не инициализирован');
      }

      console.log('🔄 [IAPService] Restoring purchases...');
      
      const purchases = await InAppPurchases.getPurchaseHistoryAsync();
      console.log('📜 [IAPService] Purchase history:', purchases);

      return purchases.map(purchase => ({
        purchaseId: purchase.transactionId || '',
        productId: purchase.productId,
        transactionId: purchase.transactionId || '',
        transactionDate: purchase.transactionDate || Date.now(),
        transactionReceipt: purchase.transactionReceipt || '',
        orderId: purchase.orderId,
        isAcknowledged: purchase.isAcknowledged,
      }));
    } catch (error) {
      console.error('❌ [IAPService] Failed to restore purchases:', error);
      throw error;
    }
  }

  /**
   * Получение текущих активных подписок
   */
  async getActiveSubscriptions(): Promise<PurchaseResult[]> {
    try {
      if (!this.isConnected) {
        throw new Error('IAPService не инициализирован');
      }

      console.log('🔍 [IAPService] Getting active subscriptions...');
      
      const subscriptions = await InAppPurchases.getUnconsumedPurchasesAsync();
      console.log('📋 [IAPService] Active subscriptions:', subscriptions);

      return subscriptions.map(subscription => ({
        purchaseId: subscription.transactionId || '',
        productId: subscription.productId,
        transactionId: subscription.transactionId || '',
        transactionDate: subscription.transactionDate || Date.now(),
        transactionReceipt: subscription.transactionReceipt || '',
        orderId: subscription.orderId,
        isAcknowledged: subscription.isAcknowledged,
      }));
    } catch (error) {
      console.error('❌ [IAPService] Failed to get active subscriptions:', error);
      throw error;
    }
  }

  /**
   * Подтверждение покупки для Android
   */
  private async acknowledgePurchase(transactionId: string): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        console.log('✅ [IAPService] Acknowledging purchase:', transactionId);
        await InAppPurchases.acknowledgeItemAsync(transactionId);
        console.log('✅ [IAPService] Purchase acknowledged');
      }
    } catch (error) {
      console.error('❌ [IAPService] Failed to acknowledge purchase:', error);
      throw error;
    }
  }

  /**
   * Проверка доступности покупок в приложении
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await InAppPurchases.isAvailableAsync();
    } catch (error) {
      console.error('❌ [IAPService] Failed to check availability:', error);
      return false;
    }
  }

  /**
   * Отключение от store
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await InAppPurchases.disconnectAsync();
        this.isConnected = false;
        this.isInitialized = false;
        console.log('✅ [IAPService] Disconnected from store');
      }
    } catch (error) {
      console.error('❌ [IAPService] Failed to disconnect:', error);
    }
  }

  /**
   * Получение статуса инициализации
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Получение статуса подключения
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

// Экспортируем singleton
export const iapService = new IAPService();

// Утилиты для работы с подписками
export const SubscriptionUtils = {
  /**
   * Получение периода подписки в днях
   */
  getSubscriptionDays(productId: SubscriptionSKU): number {
    switch (productId) {
      case SUBSCRIPTION_SKUS.MONTHLY:
        return 30;
      case SUBSCRIPTION_SKUS.YEARLY:
        return 365;
      default:
        return 30;
    }
  },

  /**
   * Получение отображаемого имени подписки
   */
  getSubscriptionName(productId: SubscriptionSKU): string {
    switch (productId) {
      case SUBSCRIPTION_SKUS.MONTHLY:
        return 'Месячная подписка';
      case SUBSCRIPTION_SKUS.YEARLY:
        return 'Годовая подписка';
      default:
        return 'Подписка';
    }
  },

  /**
   * Проверка валидности receipt для отправки на сервер
   */
  validateReceipt(receipt: string): boolean {
    return receipt && receipt.length > 0;
  },

  /**
   * Форматирование цены
   */
  formatPrice(price: string, currencyCode?: string): string {
    if (!price) return '';
    
    if (currencyCode) {
      return `${price} ${currencyCode}`;
    }
    
    return price;
  },
};
