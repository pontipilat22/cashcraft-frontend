import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { CURRENCIES, Currency, formatCurrency, getCurrencyByCountry } from '../config/currencies';

interface CurrencyContextType {
  defaultCurrency: string;
  setDefaultCurrency: (currency: string) => Promise<void>;
  currencies: typeof CURRENCIES;
  formatAmount: (amount: number, currencyCode?: string) => string;
  getCurrencyInfo: (currencyCode: string) => Currency;
}

const CURRENCY_KEY = '@cashcraft_default_currency';

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [defaultCurrency, setDefaultCurrencyState] = useState<string>('USD');

  useEffect(() => {
    const init = async () => {
      try {
        // Пытаемся получить сохраненную валюту
        const savedCurrency = await AsyncStorage.getItem(CURRENCY_KEY);
        
        if (savedCurrency && CURRENCIES[savedCurrency]) {
          setDefaultCurrencyState(savedCurrency);
        } else {
          // Определяем валюту по региону устройства
          const region = Localization.region || 'US';
          const detectedCurrency = getCurrencyByCountry(region);
          
          setDefaultCurrencyState(detectedCurrency);
          await AsyncStorage.setItem(CURRENCY_KEY, detectedCurrency);
        }
      } catch (error) {
        console.error('Error initializing currency:', error);
      }
    };

    init();
  }, []);

  const setDefaultCurrency = async (currency: string) => {
    try {
      await AsyncStorage.setItem(CURRENCY_KEY, currency);
      setDefaultCurrencyState(currency);
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  };

  const formatAmount = (amount: number, currencyCode?: string) => {
    return formatCurrency(amount, currencyCode || defaultCurrency);
  };

  const getCurrencyInfo = (currencyCode: string): Currency => {
    return CURRENCIES[currencyCode] || CURRENCIES.USD;
  };

  const value: CurrencyContextType = {
    defaultCurrency,
    setDefaultCurrency,
    currencies: CURRENCIES,
    formatAmount,
    getCurrencyInfo,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}; 