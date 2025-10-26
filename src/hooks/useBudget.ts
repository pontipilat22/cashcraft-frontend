import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BUDGET_STORAGE_KEY = '@cashcraft_budget_settings';
const BUDGET_TRACKING_KEY = '@cashcraft_budget_tracking';

export interface BudgetSettings {
  enabled: boolean;
  essentialPercentage: number;
  nonEssentialPercentage: number;
  savingsPercentage: number;
}

export interface BudgetTrackingData {
  essentialSpent: number;
  nonEssentialSpent: number;
  savingsAmount: number;
  totalIncomeThisMonth: number;
  lastResetDate: string;
  dailyBudget: number;
  spentToday: number;
  lastDailyResetDate: string;
}

const DEFAULT_BUDGET: BudgetSettings = {
  enabled: false,
  essentialPercentage: 50,
  nonEssentialPercentage: 30,
  savingsPercentage: 20,
};

// Helper: validate that percentages sum to 100 (allow small float error)
const validatePercentages = (settings: BudgetSettings) => {
  const total = (settings.essentialPercentage || 0) + (settings.nonEssentialPercentage || 0) + (settings.savingsPercentage || 0);
  return Math.abs(total - 100) < 0.001;
};

const DEFAULT_TRACKING: BudgetTrackingData = {
  essentialSpent: 0,
  nonEssentialSpent: 0,
  savingsAmount: 0,
  totalIncomeThisMonth: 0,
  lastResetDate: new Date().toISOString(),
  dailyBudget: 0,
  spentToday: 0,
  lastDailyResetDate: new Date().toISOString(),
};

export const useBudget = () => {
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>(DEFAULT_BUDGET);
  const [trackingData, setTrackingData] = useState<BudgetTrackingData>(DEFAULT_TRACKING);

  useEffect(() => {
    loadBudgetData();
  }, []);

  // Helper function to calculate daily budget
  const calculateDailyBudget = (tracking: BudgetTrackingData, settings: BudgetSettings) => {
    const essential = (tracking.totalIncomeThisMonth * settings.essentialPercentage) / 100;
    const nonEssential = (tracking.totalIncomeThisMonth * settings.nonEssentialPercentage) / 100;

    const remainingEssential = Math.max(0, essential - tracking.essentialSpent);
    const remainingNonEssential = Math.max(0, nonEssential - tracking.nonEssentialSpent);
    const totalRemaining = remainingEssential + remainingNonEssential;

    // Get days remaining in current month
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = lastDayOfMonth - now.getDate() + 1;

    console.log('📊 [calculateDailyBudget] Calculation:', {
      totalIncome: tracking.totalIncomeThisMonth,
      essential,
      nonEssential,
      essentialSpent: tracking.essentialSpent,
      nonEssentialSpent: tracking.nonEssentialSpent,
      totalRemaining,
      daysRemaining,
      dailyBudget: daysRemaining > 0 ? totalRemaining / daysRemaining : 0
    });

    return daysRemaining > 0 ? totalRemaining / daysRemaining : 0;
  };

  const loadBudgetData = async () => {
    try {
      console.log('📥 [useBudget] Loading budget data from AsyncStorage...');

      const [settingsData, trackingDataRaw] = await Promise.all([
        AsyncStorage.getItem(BUDGET_STORAGE_KEY),
        AsyncStorage.getItem(BUDGET_TRACKING_KEY),
      ]);

      console.log('📥 [useBudget] Loaded:', {
        hasSettings: !!settingsData,
        hasTracking: !!trackingDataRaw
      });

      let settings = settingsData ? JSON.parse(settingsData) : DEFAULT_BUDGET;

      // Validate percentages from storage — if invalid, reset to defaults and persist
      if (!validatePercentages(settings)) {
        console.warn('⚠️ [useBudget] Invalid budget percentages in storage, resetting to defaults', settings);
        settings = DEFAULT_BUDGET;
        try {
          await AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(settings));
        } catch (err) {
          console.error('❌ [useBudget] Failed to persist default budget settings after invalid data:', err);
        }
      }

      setBudgetSettings(settings);

      if (trackingDataRaw) {
        const tracking = JSON.parse(trackingDataRaw);

        // Check if we need to reset monthly data
        const lastResetDate = new Date(tracking.lastResetDate);
        const currentDate = new Date();
        const needsMonthlyReset = lastResetDate.getMonth() !== currentDate.getMonth() ||
                                 lastResetDate.getFullYear() !== currentDate.getFullYear();

        // Check if we need to reset daily data
        const lastDailyResetDate = new Date(tracking.lastDailyResetDate || tracking.lastResetDate);
        const needsDailyReset = lastDailyResetDate.toDateString() !== currentDate.toDateString();

        if (needsMonthlyReset) {
          console.log('🔄 [useBudget] Resetting monthly budget data');
          const resetData = {
            ...DEFAULT_TRACKING,
            lastResetDate: currentDate.toISOString(),
            lastDailyResetDate: currentDate.toISOString(),
          };
          await AsyncStorage.setItem(BUDGET_TRACKING_KEY, JSON.stringify(resetData));
          setTrackingData(resetData);
        } else if (needsDailyReset) {
          console.log('🔄 [useBudget] Resetting daily budget data');
          const updatedData = {
            ...tracking,
            spentToday: 0,
            lastDailyResetDate: currentDate.toISOString(),
            // Recalculate daily budget based on remaining amounts
            dailyBudget: calculateDailyBudget(tracking, settings),
          };
          await AsyncStorage.setItem(BUDGET_TRACKING_KEY, JSON.stringify(updatedData));
          setTrackingData(updatedData);
        } else {
          console.log('📊 [useBudget] Using existing tracking data:', {
            totalIncome: tracking.totalIncomeThisMonth,
            dailyBudget: tracking.dailyBudget,
            spentToday: tracking.spentToday
          });
          setTrackingData(tracking);
        }
      } else {
        // Если нет данных, устанавливаем дефолтные
        console.log('🆕 [useBudget] No tracking data found, using defaults');
        setTrackingData(DEFAULT_TRACKING);
      }
    } catch (error) {
      console.error('❌ [useBudget] Error loading budget data:', error);
    }
  };

  const saveBudgetSettings = async (settings: BudgetSettings) => {
    try {
      // Validate percentages before saving
      if (!validatePercentages(settings)) {
        const msg = 'Budget percentages must sum to 100';
        console.warn('❌ [useBudget] Attempted to save invalid budget settings:', settings);
        throw new Error(msg);
      }

      await AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(settings));
      setBudgetSettings(settings);
    } catch (error) {
      console.error('Error saving budget settings:', error);
    }
  };

  const updateTrackingData = async (data: Partial<BudgetTrackingData>) => {
    try {
      // Получаем актуальные данные из AsyncStorage для избежания race conditions
      const currentDataRaw = await AsyncStorage.getItem(BUDGET_TRACKING_KEY);
      const currentData = currentDataRaw ? JSON.parse(currentDataRaw) : trackingData;

      const newData = { ...currentData, ...data };
      await AsyncStorage.setItem(BUDGET_TRACKING_KEY, JSON.stringify(newData));
      setTrackingData(newData);

      console.log('📝 [useBudget] Updated tracking data:', { oldData: currentData, newData });
    } catch (error) {
      console.error('Error updating tracking data:', error);
    }
  };

  // Calculate budget amounts based on actual income this month
  const getBudgetAmounts = useMemo(() => {
    const essential = (trackingData.totalIncomeThisMonth * budgetSettings.essentialPercentage) / 100;
    const nonEssential = (trackingData.totalIncomeThisMonth * budgetSettings.nonEssentialPercentage) / 100;
    const savings = (trackingData.totalIncomeThisMonth * budgetSettings.savingsPercentage) / 100;

    return { essential, nonEssential, savings };
  }, [trackingData.totalIncomeThisMonth, budgetSettings.essentialPercentage, budgetSettings.nonEssentialPercentage, budgetSettings.savingsPercentage]);

  // Calculate remaining amounts for this month
  const getRemainingAmounts = useMemo(() => {
    const { essential, nonEssential } = getBudgetAmounts;

    return {
      essential: Math.max(0, essential - trackingData.essentialSpent),
      nonEssential: Math.max(0, nonEssential - trackingData.nonEssentialSpent),
    };
  }, [getBudgetAmounts, trackingData.essentialSpent, trackingData.nonEssentialSpent]);

  // Get daily allowance remaining for today (fixed daily budget minus spent today)
  const getDailyAllowance = useCallback(() => {
    const remainingToday = Math.max(0, trackingData.dailyBudget - trackingData.spentToday);

    console.log('💰 [getDailyAllowance] Daily budget calculation:', {
      dailyBudget: trackingData.dailyBudget,
      spentToday: trackingData.spentToday,
      remainingToday,
      lastDailyResetDate: trackingData.lastDailyResetDate
    });

    return remainingToday;
  }, [trackingData.dailyBudget, trackingData.spentToday]);

  // Process income with budget distribution
  const processIncome = async (amount: number, includeBudget: boolean) => {
    if (!includeBudget || !budgetSettings.enabled) {
      return null;
    }

    console.log('💵 [useBudget] Processing income:', {
      amount,
      budgetSettings,
      currentIncome: trackingData.totalIncomeThisMonth
    });

    const distribution = {
      essential: (amount * budgetSettings.essentialPercentage) / 100,
      nonEssential: (amount * budgetSettings.nonEssentialPercentage) / 100,
      savings: (amount * budgetSettings.savingsPercentage) / 100,
    };

    // Получаем актуальные данные из AsyncStorage
    try {
      const currentDataRaw = await AsyncStorage.getItem(BUDGET_TRACKING_KEY);
      const currentData = currentDataRaw ? JSON.parse(currentDataRaw) : trackingData;

      const updatedData = {
        ...currentData,
        totalIncomeThisMonth: currentData.totalIncomeThisMonth + amount,
      };

      const newData = {
        ...updatedData,
        savingsAmount: currentData.savingsAmount + distribution.savings,
        // Recalculate daily budget based on new income
        dailyBudget: calculateDailyBudget(updatedData, budgetSettings),
        // If this is the first income and daily budget is 0, initialize daily tracking
        spentToday: currentData.dailyBudget === 0 ? 0 : currentData.spentToday,
        lastDailyResetDate: currentData.dailyBudget === 0 ? new Date().toISOString() : currentData.lastDailyResetDate,
      };

      console.log('💵 [useBudget] Updated income data:', {
        ...newData,
        distribution
      });

      await AsyncStorage.setItem(BUDGET_TRACKING_KEY, JSON.stringify(newData));
      setTrackingData(newData);
    } catch (error) {
      console.error('Error processing income:', error);
    }

    return distribution;
  };

  // Record expense in budget tracking
  const recordExpense = async (amount: number, categoryType: 'essential' | 'nonEssential') => {
    if (!budgetSettings.enabled) return;

    console.log('💰 [useBudget] Recording expense:', {
      amount,
      categoryType,
      currentEssentialSpent: trackingData.essentialSpent,
      currentNonEssentialSpent: trackingData.nonEssentialSpent,
      currentSpentToday: trackingData.spentToday
    });

    // Получаем актуальные данные из AsyncStorage
    try {
      const currentDataRaw = await AsyncStorage.getItem(BUDGET_TRACKING_KEY);
      const currentData = currentDataRaw ? JSON.parse(currentDataRaw) : trackingData;

      let newData;
      if (categoryType === 'essential') {
        newData = {
          ...currentData,
          essentialSpent: currentData.essentialSpent + amount,
          spentToday: currentData.spentToday + amount, // Добавляем к дневным тратам
        };
      } else {
        newData = {
          ...currentData,
          nonEssentialSpent: currentData.nonEssentialSpent + amount,
          spentToday: currentData.spentToday + amount, // Добавляем к дневным тратам
        };
      }

      console.log('💰 [useBudget] Updated expense data:', newData);

      await AsyncStorage.setItem(BUDGET_TRACKING_KEY, JSON.stringify(newData));
      setTrackingData(newData);
    } catch (error) {
      console.error('Error recording expense:', error);
    }
  };

  // Force reload data from storage
  const reloadData = useCallback(async () => {
    await loadBudgetData();
  }, []);

  // Reset all budget data
  const resetBudgetData = useCallback(async () => {
    try {
      console.log('🗑️ [useBudget] Resetting all budget data...');

      // Удаляем все данные из AsyncStorage
      await AsyncStorage.removeItem(BUDGET_STORAGE_KEY);
      await AsyncStorage.removeItem(BUDGET_TRACKING_KEY);

      // Сбрасываем состояние к дефолтным значениям
      setBudgetSettings(DEFAULT_BUDGET);
      setTrackingData(DEFAULT_TRACKING);


  // --- Daily/monthly reset scheduler ---------------------------------
  const dailyTimerRef = useRef<number | null>(null);

  const clearDailyTimer = () => {
    if (dailyTimerRef.current !== null) {
      clearTimeout(dailyTimerRef.current as unknown as number);
      dailyTimerRef.current = null;
    }
  };

  const performResetIfNeeded = async () => {
    try {
      const trackingRaw = await AsyncStorage.getItem(BUDGET_TRACKING_KEY);
      const currentDate = new Date();

      if (!trackingRaw) {
        // Nothing to reset
        return;
      }

      const tracking = JSON.parse(trackingRaw) as BudgetTrackingData;

      const lastResetDate = new Date(tracking.lastResetDate);
      const lastDailyResetDate = new Date(tracking.lastDailyResetDate || tracking.lastResetDate);

      const needsMonthlyReset = lastResetDate.getMonth() !== currentDate.getMonth() || lastResetDate.getFullYear() !== currentDate.getFullYear();
      const needsDailyReset = lastDailyResetDate.toDateString() !== currentDate.toDateString();

      if (needsMonthlyReset) {
        console.log('🔄 [useBudget.scheduler] Monthly reset triggered by scheduler');
        const resetData = {
          ...DEFAULT_TRACKING,
          lastResetDate: currentDate.toISOString(),
          lastDailyResetDate: currentDate.toISOString(),
        };
        await AsyncStorage.setItem(BUDGET_TRACKING_KEY, JSON.stringify(resetData));
        setTrackingData(resetData);
        return;
      }

      if (needsDailyReset) {
        console.log('🔄 [useBudget.scheduler] Daily reset triggered by scheduler');
        const updatedData = {
          ...tracking,
          spentToday: 0,
          lastDailyResetDate: currentDate.toISOString(),
          dailyBudget: calculateDailyBudget(tracking, budgetSettings),
        };
        await AsyncStorage.setItem(BUDGET_TRACKING_KEY, JSON.stringify(updatedData));
        setTrackingData(updatedData);
      }
    } catch (error) {
      console.error('❌ [useBudget.scheduler] Error during scheduled reset:', error);
    }
  };

  const scheduleNextDailyReset = () => {
    clearDailyTimer();
    const now = new Date();
    // Next midnight local time
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    // Safety: if ms is negative or zero, schedule in 1 minute
    const delay = msUntilMidnight > 0 ? msUntilMidnight : 60 * 1000;

    console.log('⏱️ [useBudget.scheduler] Scheduling next daily reset in ms:', delay);

    // @ts-ignore - setTimeout returns number in React Native
    dailyTimerRef.current = setTimeout(async () => {
      await performResetIfNeeded();
      // schedule again for the next day
      scheduleNextDailyReset();
    }, delay) as unknown as number;
  };

  // Schedule when trackingData or settings change (and on mount after load)
  useEffect(() => {
    // Start the scheduler
    scheduleNextDailyReset();

    return () => {
      clearDailyTimer();
    };
    // We intentionally depend on budgetSettings and trackingData reset timestamps
  }, [budgetSettings.essentialPercentage, budgetSettings.nonEssentialPercentage, budgetSettings.savingsPercentage, trackingData.lastDailyResetDate, trackingData.lastResetDate]);

      console.log('✅ [useBudget] Budget data reset complete');
    } catch (error) {
      console.error('❌ [useBudget] Error resetting budget data:', error);
      throw error;
    }
  }, []);

  // Debug logging (reduced to prevent infinite loops)
  useEffect(() => {
    console.log('🔍 [useBudget] State update:', {
      isEnabled: budgetSettings.enabled,
      totalIncome: trackingData.totalIncomeThisMonth,
      essentialSpent: trackingData.essentialSpent,
      nonEssentialSpent: trackingData.nonEssentialSpent
    });
  }, [budgetSettings.enabled, trackingData.totalIncomeThisMonth, trackingData.essentialSpent, trackingData.nonEssentialSpent]);

  return useMemo(() => ({
    budgetSettings,
    trackingData,
    saveBudgetSettings,
    updateTrackingData,
    getBudgetAmounts,
    getRemainingAmounts,
    getDailyAllowance,
    getDailyBudget: () => trackingData.dailyBudget,
    getSpentToday: () => trackingData.spentToday,
    processIncome,
    recordExpense,
    reloadData,
    resetBudgetData,
    isEnabled: budgetSettings.enabled,
  }), [
    budgetSettings,
    trackingData,
    getBudgetAmounts,
    getRemainingAmounts,
    getDailyAllowance,
    reloadData,
    resetBudgetData
  ]);
};