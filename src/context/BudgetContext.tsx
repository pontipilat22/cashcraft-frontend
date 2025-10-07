import React, { createContext, useContext, ReactNode } from 'react';
import { useBudget } from '../hooks/useBudget';

// Экспортируем типы из хука
export type { BudgetSettings, BudgetTrackingData } from '../hooks/useBudget';

interface BudgetContextType {
  budgetSettings: any;
  trackingData: any;
  saveBudgetSettings: (settings: any) => Promise<void>;
  updateTrackingData: (data: any) => Promise<void>;
  getBudgetAmounts: any;
  getRemainingAmounts: any;
  getDailyAllowance: () => number;
  getDailyBudget: () => number;
  getSpentToday: () => number;
  processIncome: (amount: number, includeBudget: boolean) => Promise<any>;
  recordExpense: (amount: number, categoryType: 'essential' | 'nonEssential') => Promise<void>;
  reloadData: () => Promise<void>;
  resetBudgetData: () => Promise<void>;
  isEnabled: boolean;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const budget = useBudget();

  return (
    <BudgetContext.Provider value={budget}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudgetContext = () => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudgetContext must be used within BudgetProvider');
  }
  return context;
};
