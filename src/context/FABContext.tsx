import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FABContextType {
  isFABMenuOpen: boolean;
  openFABMenu: () => void;
  closeFABMenu: () => void;
  toggleFABMenu: () => void;
  targetTab: string | null;
  setTargetTab: (tab: string | null) => void;
}

const FABContext = createContext<FABContextType | undefined>(undefined);

export const FABProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isFABMenuOpen, setIsFABMenuOpen] = useState(false);
  const [targetTab, setTargetTab] = useState<string | null>(null);

  const openFABMenu = () => setIsFABMenuOpen(true);
  const closeFABMenu = () => setIsFABMenuOpen(false);
  const toggleFABMenu = () => setIsFABMenuOpen(prev => !prev);

  return (
    <FABContext.Provider
      value={{
        isFABMenuOpen,
        openFABMenu,
        closeFABMenu,
        toggleFABMenu,
        targetTab,
        setTargetTab,
      }}
    >
      {children}
    </FABContext.Provider>
  );
};

export const useFAB = () => {
  const context = useContext(FABContext);
  if (!context) {
    throw new Error('useFAB must be used within FABProvider');
  }
  return context;
};
