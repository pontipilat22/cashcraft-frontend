import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { iapService, PurchaseResult, SubscriptionSKU, SUBSCRIPTION_SKUS, IAPHelpers } from '../services/iapService';
import { type ProductSubscription } from 'react-native-iap';

interface Subscription {
  planId: string;
  planName: string;
  price: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  willRenew?: boolean;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  isPremium: boolean;
  isLoading: boolean;
  availableProducts: ProductSubscription[];
  checkIfPremium: () => Promise<boolean>;
  activateSubscription: (planId: string, planName: string, price: string, days: number) => Promise<void>;
  purchaseSubscription: (productId: SubscriptionSKU) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  initializeIAP: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const FREE_FEATURES = [
  'basic_accounts', // До 2 счетов
  'basic_transactions',
  'basic_categories',
];

const PREMIUM_FEATURES = [
  ...FREE_FEATURES,
  'unlimited_accounts',
  'unlimited_transactions',
  'export_data',
  'advanced_analytics',
  'sync_devices',
  'priority_support',
  'custom_categories',
  'custom_themes',
  'early_access',
];

interface SubscriptionProviderProps {
  children: ReactNode;
  userId: string | null;
  isGuest?: boolean;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ 
  children, 
  userId,
  isGuest = false
}) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<ProductSubscription[]>([]);

  // Простая функция проверки подписки
  const checkIfPremium = async (): Promise<boolean> => {
    console.log('🔍 [SubscriptionContext] checkIfPremium called');
    
    // Гости не могут иметь подписку
    if (isGuest || !userId) {
      console.log('❌ [SubscriptionContext] Guest or no user - no premium');
      setIsPremium(false);
      setSubscription(null);
      return false;
    }

    try {
      const subscriptionKey = `subscription_${userId}`;
      const stored = await AsyncStorage.getItem(subscriptionKey);
      
      if (!stored) {
        console.log('❌ [SubscriptionContext] No subscription found');
        setIsPremium(false);
        setSubscription(null);
        return false;
      }

      const sub = JSON.parse(stored);
      const endDate = new Date(sub.endDate);
      const now = new Date();
      
      const isActive = endDate > now;
      console.log('📋 [SubscriptionContext] Subscription check:', {
        endDate: endDate.toISOString(),
        now: now.toISOString(),
        isActive
      });

      setSubscription({ ...sub, isActive });
      setIsPremium(isActive);
      
      if (!isActive) {
        // Удаляем истекшую подписку
        await AsyncStorage.removeItem(subscriptionKey);
      }
      
      return isActive;
    } catch (error) {
      console.error('❌ [SubscriptionContext] Error checking subscription:', error);
      setIsPremium(false);
      setSubscription(null);
      return false;
    }
  };

  // Активация подписки
  const activateSubscription = async (planId: string, planName: string, price: string, days: number) => {
    if (!userId || isGuest) {
      throw new Error('Подписка доступна только авторизованным пользователям');
    }

    const subscription = {
      planId,
      planName,
      price,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      userId,
    };

    const subscriptionKey = `subscription_${userId}`;
    await AsyncStorage.setItem(subscriptionKey, JSON.stringify(subscription));
    
    setSubscription(subscription);
    setIsPremium(true);
    
    console.log('✅ [SubscriptionContext] Subscription activated:', subscription);
  };

  // Инициализация IAP
  const initializeIAP = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔄 [SubscriptionContext] Initializing IAP...');
      
      const initialized = await iapService.initialize();
      if (!initialized) {
        console.log('❌ [SubscriptionContext] Failed to initialize IAP');
        return false;
      }
      
      const isAvailable = await iapService.isAvailable();
      if (isAvailable) {
        const products = await iapService.getProducts();
        setAvailableProducts(products);
        console.log('✅ [SubscriptionContext] IAP initialized, products loaded:', products.length);
        
        // Проверяем активные подписки
        await checkActiveSubscriptions();
      }
      
      return initialized;
    } catch (error) {
      console.error('❌ [SubscriptionContext] IAP initialization failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Проверка активных подписок через IAP
  const checkActiveSubscriptions = async (): Promise<void> => {
    try {
      if (!iapService.connected) return;
      
      const activeSubscriptions = await iapService.getActiveSubscriptions();
      console.log('📋 [SubscriptionContext] Active IAP subscriptions:', activeSubscriptions);
      
      if (activeSubscriptions.length > 0) {
        const latestSubscription = activeSubscriptions[activeSubscriptions.length - 1];
        const productName = IAPHelpers.getSubscriptionName(latestSubscription.productId as SubscriptionSKU);
        const days = IAPHelpers.getSubscriptionDuration(latestSubscription.productId as SubscriptionSKU);
        
        // Активируем подписку
        await activateSubscription(
          latestSubscription.productId,
          productName,
          'N/A', // Цена будет получена из продукта
          days
        );
      }
    } catch (error) {
      console.error('❌ [SubscriptionContext] Failed to check active subscriptions:', error);
    }
  };

  // Покупка подписки через IAP
  const purchaseSubscription = async (productId: SubscriptionSKU): Promise<boolean> => {
    try {
      if (!userId || isGuest) {
        throw new Error('Подписка доступна только авторизованным пользователям');
      }

      setIsLoading(true);
      console.log('💳 [SubscriptionContext] Purchasing subscription:', productId);
      
      const purchaseResult = await iapService.purchaseProduct(productId);
      
      if (purchaseResult) {
        // Получаем информацию о продукте
        const product = availableProducts.find(p => p.id === productId);
        const productName = product?.title || IAPHelpers.getSubscriptionName(productId);
        const price = product?.displayPrice || String(product?.price || 'N/A');
        const days = IAPHelpers.getSubscriptionDuration(productId);
        
        // Активируем подписку локально
        await activateSubscription(productId, productName, price, days);
        
        console.log('✅ [SubscriptionContext] Subscription purchased successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [SubscriptionContext] Purchase failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Восстановление покупок
  const restorePurchases = async (): Promise<boolean> => {
    try {
      if (!userId || isGuest) {
        throw new Error('Восстановление покупок доступно только авторизованным пользователям');
      }

      setIsLoading(true);
      console.log('🔄 [SubscriptionContext] Restoring purchases...');
      
      const purchases = await iapService.restorePurchases();
      console.log('📜 [SubscriptionContext] Restored purchases:', purchases);
      
      if (purchases.length > 0) {
        // Находим последнюю активную подписку
        const subscriptionPurchases = purchases.filter(p => 
          Object.values(SUBSCRIPTION_SKUS).includes(p.productId as any)
        );
        
        if (subscriptionPurchases.length > 0) {
          const latestPurchase = subscriptionPurchases
            .sort((a, b) => b.transactionDate - a.transactionDate)[0];
          
          const product = availableProducts.find(p => p.id === latestPurchase.productId);
          const productName = product?.title || IAPHelpers.getSubscriptionName(latestPurchase.productId as SubscriptionSKU);
          const price = product?.displayPrice || String(product?.price || 'N/A');
          const days = IAPHelpers.getSubscriptionDuration(latestPurchase.productId as SubscriptionSKU);
          
          await activateSubscription(latestPurchase.productId, productName, price, days);
          console.log('✅ [SubscriptionContext] Purchases restored successfully');
          return true;
        }
      }
      
      console.log('ℹ️ [SubscriptionContext] No subscription purchases found to restore');
      return false;
    } catch (error) {
      console.error('❌ [SubscriptionContext] Failed to restore purchases:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Отмена подписки
  const cancelSubscription = async () => {
    if (!userId) return;
    
    const subscriptionKey = `subscription_${userId}`;
    await AsyncStorage.removeItem(subscriptionKey);
    
    setSubscription(null);
    setIsPremium(false);
    
    console.log('✅ [SubscriptionContext] Subscription cancelled');
  };

  // Проверка фичи
  const hasFeature = (feature: string): boolean => {
    if (isPremium) {
      return PREMIUM_FEATURES.includes(feature);
    }
    return FREE_FEATURES.includes(feature);
  };

  // Проверяем подписку при загрузке и изменении userId
  useEffect(() => {
    if (userId && !isGuest) {
      checkIfPremium();
      // Инициализируем IAP
      initializeIAP();
      // Проверяем каждую минуту
      const interval = setInterval(checkIfPremium, 60 * 1000);
      return () => clearInterval(interval);
    } else {
      setSubscription(null);
      setIsPremium(false);
    }
  }, [userId, isGuest]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      if (iapService.connected) {
        iapService.disconnect();
      }
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isPremium,
      isLoading,
      availableProducts,
      checkIfPremium,
      activateSubscription,
      purchaseSubscription,
      restorePurchases,
      cancelSubscription,
      hasFeature,
      initializeIAP,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}; 