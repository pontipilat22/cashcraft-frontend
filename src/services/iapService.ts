import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
  type AndroidSubscriptionOfferInput,
} from 'react-native-iap';
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
  orderId?: string | null;
  isAcknowledged?: boolean | null;
}

/**
 * Сервис для работы с покупками в приложении через react-native-iap
 */
class IAPService {
  private isInitialized = false;
  private isConnected = false;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

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

        // Настраиваем слушатели событий покупок
        this.setupPurchaseListeners();

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
   * Настройка слушателей событий покупок
   */
  private setupPurchaseListeners(): void {
    // Слушатель успешных покупок
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log('✅ [IAPService] Purchase successful:', purchase);

        // Для Android подтверждаем покупку
        if (Platform.OS === 'android') {
          await this.acknowledgePurchase(purchase);
        }
      }
    );

    // Слушатель ошибок покупок
    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error('❌ [IAPService] Purchase error:', error);
      }
    );
  }

  /**
   * Получение списка доступных товаров (подписок)
   */
  async getProducts(): Promise<ProductSubscription[]> {
    try {
      if (!this.isConnected) {
        throw new Error('IAPService не инициализирован');
      }

      const skus = Object.values(SUBSCRIPTION_SKUS);
      console.log('🔍 [IAPService] Getting products for SKUs:', skus);

      const products = await fetchProducts({ skus, type: 'subs' });

      if (!products) {
        console.log('📦 [IAPService] No products found');
        return [];
      }

      console.log('📦 [IAPService] Retrieved products count:', products.length);

      // Детальное логирование каждого продукта
      products.forEach((product: Product | ProductSubscription, index: number) => {
        console.log(`📋 [IAPService] Product ${index + 1}:`, {
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
          displayPrice: product.displayPrice,
        });

        // Логируем детали предложений для Android
        if (Platform.OS === 'android') {
          const androidProduct = product as any;
          if (androidProduct.subscriptionOfferDetailsAndroid) {
            const offerDetails = androidProduct.subscriptionOfferDetailsAndroid;
            if (offerDetails && Array.isArray(offerDetails)) {
              offerDetails.forEach((offer: any, offerIndex: number) => {
                console.log(`  🎫 [IAPService] Offer ${offerIndex + 1}:`, {
                  offerToken: offer.offerToken,
                  basePlanId: offer.basePlanId,
                  offerId: offer.offerId,
                  pricingPhases: offer.pricingPhases?.pricingPhaseList?.length || 0,
                });
              });
            }
          }
        }
      });

      return products as ProductSubscription[];
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

      // Получаем информацию о продукте и offerToken для Android
      let subscriptionOffers: AndroidSubscriptionOfferInput[] | undefined;

      if (Platform.OS === 'android') {
        try {
          const products = await this.getProducts();
          const product = products.find(p => p.id === productId) as any;

          console.log('🔍 [IAPService] Found product:', product);

          if (product?.subscriptionOfferDetailsAndroid) {
            const subscriptionOfferDetails = product.subscriptionOfferDetailsAndroid;
            console.log('📋 [IAPService] SubscriptionOfferDetails:', subscriptionOfferDetails);

            if (subscriptionOfferDetails && subscriptionOfferDetails.length > 0) {
              const offerToken = subscriptionOfferDetails[0].offerToken;
              console.log('🔑 [IAPService] Found offerToken:', offerToken);

              subscriptionOffers = [{
                sku: productId,
                offerToken: offerToken,
              }];
            }
          }

          if (!subscriptionOffers) {
            console.warn('⚠️ [IAPService] No offerToken found for product:', productId);
            throw new Error('Подписка еще не активирована в Google Play Console. Убедитесь, что базовый план активен.');
          }
        } catch (error) {
          console.error('❌ [IAPService] Error getting offerToken:', error);
          throw error;
        }
      }

      // Запрашиваем покупку подписки
      const result = await requestPurchase({
        type: 'subs',
        request: Platform.OS === 'android'
          ? {
              android: {
                skus: [productId],
                subscriptionOffers: subscriptionOffers,
              }
            }
          : {
              ios: {
                sku: productId,
              }
            }
      });

      console.log('✅ [IAPService] Purchase result:', result);

      // result может быть Purchase, Purchase[] или null
      const purchase = Array.isArray(result) ? result[0] : result;

      if (purchase && purchase.transactionId) {
        const purchaseResult: PurchaseResult = {
          purchaseId: purchase.transactionId,
          productId: productId,
          transactionId: purchase.transactionId,
          transactionDate: purchase.transactionDate || Date.now(),
          transactionReceipt: purchase.purchaseToken || '',
          orderId: 'dataAndroid' in purchase ? purchase.dataAndroid : undefined,
          isAcknowledged: 'isAcknowledgedAndroid' in purchase ? purchase.isAcknowledgedAndroid : undefined,
        };

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

      if (!purchases) {
        return [];
      }

      return purchases.map(purchase => ({
        purchaseId: purchase.transactionId || purchase.id,
        productId: purchase.productId,
        transactionId: purchase.transactionId || purchase.id,
        transactionDate: purchase.transactionDate || Date.now(),
        transactionReceipt: purchase.purchaseToken || '',
        orderId: 'dataAndroid' in purchase ? purchase.dataAndroid : undefined,
        isAcknowledged: 'isAcknowledgedAndroid' in purchase ? purchase.isAcknowledgedAndroid : undefined,
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

      if (!subscriptions) {
        return [];
      }

      // Фильтруем только наши подписки
      const ourSubscriptions = subscriptions.filter(sub =>
        Object.values(SUBSCRIPTION_SKUS).includes(sub.productId as SubscriptionSKU)
      );

      return ourSubscriptions.map(subscription => ({
        purchaseId: subscription.transactionId || subscription.id,
        productId: subscription.productId,
        transactionId: subscription.transactionId || subscription.id,
        transactionDate: subscription.transactionDate || Date.now(),
        transactionReceipt: subscription.purchaseToken || '',
        orderId: 'dataAndroid' in subscription ? subscription.dataAndroid : undefined,
        isAcknowledged: 'isAcknowledgedAndroid' in subscription ? subscription.isAcknowledgedAndroid : undefined,
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
      // Отписываемся от слушателей
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }

      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

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
