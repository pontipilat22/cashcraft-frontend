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
  checkIfPremium: () => Promise<boolean>;
  activateSubscription: (planId: string, planName: string, price: string, days: number) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
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
      // Проверяем каждую минуту
      const interval = setInterval(checkIfPremium, 60 * 1000);
      return () => clearInterval(interval);
    } else {
      setSubscription(null);
      setIsPremium(false);
    }
  }, [userId, isGuest]);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isPremium,
      checkIfPremium,
      activateSubscription,
      cancelSubscription,
      hasFeature,
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