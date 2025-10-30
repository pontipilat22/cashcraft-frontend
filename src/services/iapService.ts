import { 
  initConnection, 
  endConnection, 
  getSubscriptions, 
  requestPurchase,
  requestSubscription,
  getAvailablePurchases,
  finishTransaction,
  type SubscriptionProduct,
  type Purchase 
} from 'expo-iap';
import { Platform } from 'react-native';

// Константы для подписок
export const SUBSCRIPTION_SKUS = {
  MONTHLY: 'cashcraft_monthly',
  YEARLY: 'cashcraft_yearly',
} as const;

export type SubscriptionSKU = typeof SUBSCRIPTION_SKUS[keyof typeof SUBSCRIPTION_SKUS];

// Наш интерфейс для результата покупки
export interface PurchaseResult {
  purchaseId: string;
  productId: string;
  transactionId: string;
  transactionDate: number;
  transactionReceipt: string;
  orderId?: string;
  isAcknowledged?: boolean;
}

/**
 * Сервис для работы с покупками в приложении через expo-iap
 */
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
      const result = await initConnection();
      this.isConnected = result;
      
      if (this.isConnected) {
        console.log('✅ [IAPService] Connected to store');
        
        // Получаем список доступных товаров
        const products = await this.getProducts();
        console.log('📦 [IAPService] Available products:', products.length);
        
        this.isInitialized = true;
        return true;
      } else {
        console.log('❌ [IAPService] Failed to connect to store');
        return false;
      }
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

      const products = await getSubscriptions(skus);
      console.log('📦 [IAPService] Retrieved products count:', products.length);

      // Детальное логирование каждого продукта
      products.forEach((product, index) => {
        console.log(`📋 [IAPService] Product ${index + 1}:`, {
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
          displayPrice: product.displayPrice,
          hasOfferDetails: 'subscriptionOfferDetails' in product,
          offerDetailsCount: (product as any).subscriptionOfferDetails?.length || 0,
        });

        // Логируем детали предложений для Android
        if ('subscriptionOfferDetails' in product) {
          const offerDetails = (product as any).subscriptionOfferDetails;
          if (offerDetails && Array.isArray(offerDetails)) {
            offerDetails.forEach((offer: any, offerIndex: number) => {
              console.log(`  🎫 [IAPService] Offer ${offerIndex + 1}:`, {
                offerToken: offer.offerToken,
                basePlanId: offer.basePlanId,
                offerId: offer.offerId,
                pricingPhases: offer.pricingPhases?.length || 0,
              });
            });
          }
        }
      });

      return products;
    } catch (error) {
      console.error('❌ [IAPService] Failed to get products:', error);
      throw error;
    }
  }

  /**
   * Покупка подписки
   */
  async purchaseProduct(productId: SubscriptionSKU): Promise<PurchaseResult | null> {
    try {
      if (!this.isInitialized) {
        throw new Error('IAPService не инициализирован');
      }

      console.log('💳 [IAPService] Purchasing subscription:', productId);
      
      // Получаем реальный offerToken из продукта
      let offerToken = '';
      
      if (Platform.OS === 'android') {
        try {
          const products = await this.getProducts();
          const product = products.find(p => p.id === productId);
          
          console.log('🔍 [IAPService] Found product:', product);
          
          if (product && 'subscriptionOfferDetails' in product) {
            const subscriptionOfferDetails = (product as any).subscriptionOfferDetails;
            console.log('📋 [IAPService] SubscriptionOfferDetails:', subscriptionOfferDetails);
            
            if (subscriptionOfferDetails && subscriptionOfferDetails.length > 0) {
              offerToken = subscriptionOfferDetails[0].offerToken;
              console.log('🔑 [IAPService] Found offerToken:', offerToken);
            }
          }
          
          if (!offerToken) {
            console.warn('⚠️ [IAPService] No offerToken found for product:', productId);
            throw new Error('Подписка еще не активирована в Google Play Console. Попробуйте позже.');
          }
        } catch (error) {
          console.error('❌ [IAPService] Error getting offerToken:', error);
          throw error;
        }
      }

      // Используем deprecated метод requestSubscription с реальным offerToken
      const result = await requestSubscription({
        ios: { sku: productId },
        android: { 
          skus: [productId],
          subscriptionOffers: [{
            sku: productId,
            offerToken: offerToken || 'default' // Используем реальный токен или fallback
          }]
        }
      });
      
      console.log('✅ [IAPService] Purchase result:', result);

      // result может быть Purchase, Purchase[] или void
      const purchase = Array.isArray(result) ? result[0] : result;
      
      if (purchase && purchase.transactionId) {
        const purchaseResult: PurchaseResult = {
          purchaseId: purchase.transactionId,
          productId: productId,
          transactionId: purchase.transactionId,
          transactionDate: Date.now(),
          transactionReceipt: purchase.transactionReceipt || '',
          // orderId и isAcknowledged могут отсутствовать в новом API
        };

        // Для Android подтверждаем покупку
        if (Platform.OS === 'android') {
          await this.acknowledgePurchase(purchase);
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
      if (!this.isInitialized) {
        throw new Error('IAPService не инициализирован');
      }

      console.log('🔄 [IAPService] Restoring purchases...');
      
      const purchases = await getAvailablePurchases();
      console.log('📜 [IAPService] Available purchases:', purchases);

      return purchases.map(purchase => ({
        purchaseId: purchase.transactionId || '',
        productId: purchase.productId,
        transactionId: purchase.transactionId || '',
        transactionDate: purchase.transactionDate || Date.now(),
        transactionReceipt: purchase.transactionReceipt || '',
      }));
    } catch (error) {
      console.error('❌ [IAPService] Failed to restore purchases:', error);
      throw error;
    }
  }

  /**
   * Получение активных подписок
   */
  async getActiveSubscriptions(): Promise<PurchaseResult[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('IAPService не инициализирован');
      }

      console.log('🔍 [IAPService] Getting active subscriptions...');
      
      const subscriptions = await getAvailablePurchases();
      console.log('📋 [IAPService] Available subscriptions:', subscriptions);

      // Фильтруем только наши подписки
      const ourSubscriptions = subscriptions.filter(sub => 
        Object.values(SUBSCRIPTION_SKUS).includes(sub.productId as SubscriptionSKU)
      );

      return ourSubscriptions.map(subscription => ({
        purchaseId: subscription.transactionId || '',
        productId: subscription.productId,
        transactionId: subscription.transactionId || '',
        transactionDate: subscription.transactionDate || Date.now(),
        transactionReceipt: subscription.transactionReceipt || '',
      }));
    } catch (error) {
      console.error('❌ [IAPService] Failed to get active subscriptions:', error);
      throw error;
    }
  }

  /**
   * Подтверждение покупки (для Android)
   */
  private async acknowledgePurchase(purchase: Purchase): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        console.log('✅ [IAPService] Acknowledging purchase:', purchase.transactionId);
        
        await finishTransaction({ 
          purchase: purchase, 
          isConsumable: false 
        });
        
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
      // В новой версии expo-iap нет метода isAvailable
      // Возвращаем статус подключения
      return this.isConnected;
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
        await endConnection();
        this.isConnected = false;
        this.isInitialized = false;
        console.log('✅ [IAPService] Disconnected from store');
      }
    } catch (error) {
      console.error('❌ [IAPService] Failed to disconnect:', error);
      throw error;
    }
  }

  /**
   * Проверка состояния инициализации
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Проверка состояния подключения
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

// Создаем singleton instance
export const iapService = new IAPService();

// Вспомогательные функции
export const IAPHelpers = {
  /**
   * Получение названия подписки по ID
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
   * Получение длительности подписки в днях
   */
  getSubscriptionDuration(productId: SubscriptionSKU): number {
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
   * Проверка валидности receipt для отправки на сервер
   */
  validateReceipt(receipt: string): boolean {
    return !!(receipt && receipt.length > 0);
  },

  /**
   * Проверка активности подписки по времени
   */
  isSubscriptionActive(transactionDate: number, duration: number): boolean {
    const now = Date.now();
    const expireDate = transactionDate + (duration * 24 * 60 * 60 * 1000);
    return now < expireDate;
  }
};

export default iapService;