import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  checkSubscription: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  reloadUser: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const FREE_FEATURES = [
  'basic_accounts', // До 3 счетов
  'basic_transactions', // До 100 транзакций в месяц
  'basic_categories', // Базовые категории
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

  // Используем useCallback чтобы избежать бесконечного цикла
  const checkSubscription = React.useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setIsPremium(false);
      return;
    }

    try {
      // Ключ подписки привязан к пользователю
      const subscriptionKey = `subscription_${userId}`;
      const stored = await AsyncStorage.getItem(subscriptionKey);
      
      if (stored) {
        const sub = JSON.parse(stored);
        const endDate = new Date(sub.endDate);
        const now = new Date();
        
        // Проверяем, активна ли подписка
        if (endDate > now) {
          setSubscription({ ...sub, isActive: true });
          setIsPremium(true);
        } else {
          // Подписка истекла
          setSubscription({ ...sub, isActive: false });
          setIsPremium(false);
          // Удаляем истекшую подписку
          await AsyncStorage.removeItem(subscriptionKey);
        }
      } else {
        setSubscription(null);
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [userId]);

  useEffect(() => {
    // Подписка доступна для всех пользователей (включая гостей) для тестирования
    if (userId) {
      checkSubscription();
      // Проверяем подписку каждые 5 минут
      const interval = setInterval(checkSubscription, 5 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      // Если пользователь не авторизован, сбрасываем подписку
      setSubscription(null);
      setIsPremium(false);
    }
  }, [userId, checkSubscription]);

  const hasFeature = (feature: string): boolean => {
    if (isPremium) {
      return PREMIUM_FEATURES.includes(feature);
    }
    return FREE_FEATURES.includes(feature);
  };

  const reloadUser = async () => {
    // При изменении userId компонент автоматически обновится через useEffect
    await checkSubscription();
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isPremium,
      checkSubscription,
      hasFeature,
      reloadUser,
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