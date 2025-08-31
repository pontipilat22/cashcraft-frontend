import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SubscriptionContextType {
  hasPremium: boolean;
  isPremium: boolean; // Алиас для hasPremium для совместимости
  isLoading: boolean;
  subscription: any; // Для совместимости
  checkIfPremium: () => Promise<boolean>;
  purchasePremium: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  activateSubscription: (planId: string, planName: string, price: string, days: number) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode; userId?: string; isGuest?: boolean }> = ({ children }) => {
  const [hasPremium, setHasPremium] = useState(true); // Для дизайна делаем Premium активным
  const [isLoading, setIsLoading] = useState(false);

  const checkIfPremium = async (): Promise<boolean> => {
    console.log('Mock: checkIfPremium');
    return hasPremium;
  };

  const purchasePremium = async (): Promise<boolean> => {
    console.log('Mock: purchasePremium');
    setHasPremium(true);
    return true;
  };

  const restorePurchases = async (): Promise<boolean> => {
    console.log('Mock: restorePurchases');
    return hasPremium;
  };

  const activateSubscription = async (planId: string, planName: string, price: string, days: number): Promise<boolean> => {
    console.log('Mock: activateSubscription', planId, planName, price, days);
    setHasPremium(true);
    return true;
  };

  const cancelSubscription = async (): Promise<boolean> => {
    console.log('Mock: cancelSubscription');
    setHasPremium(false);
    return true;
  };

  const value: SubscriptionContextType = {
    hasPremium,
    isPremium: hasPremium, // Алиас для совместимости
    isLoading,
    subscription: null, // Моковая подписка
    checkIfPremium,
    purchasePremium,
    restorePurchases,
    activateSubscription,
    cancelSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
