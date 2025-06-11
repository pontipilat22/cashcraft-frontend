import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeI18n, changeLanguage, getCurrentLanguage, t, LANGUAGES, SupportedLanguage } from '../services/i18n';

interface LocalizationContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  t: (key: string, options?: any) => string;
  languages: typeof LANGUAGES;
  isLoading: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(getCurrentLanguage());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initializeI18n();
      setCurrentLanguage(getCurrentLanguage());
      setIsLoading(false);
    };

    init();
  }, []);

  const setLanguage = async (language: SupportedLanguage) => {
    setIsLoading(true);
    await changeLanguage(language);
    setCurrentLanguage(language);
    setIsLoading(false);
  };

  const value: LocalizationContextType = {
    currentLanguage,
    setLanguage,
    t,
    languages: LANGUAGES,
    isLoading,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}; 