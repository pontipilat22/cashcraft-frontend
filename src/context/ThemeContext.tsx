import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    tabBar: string;
    tabBarActive: string;
    tabBarInactive: string;
    income: string;
    expense: string;
    statsBg: string;
  };
}

const lightTheme = {
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#000000',
  textSecondary: '#666666',
  primary: '#4287f5',
  border: '#e0e0e0',
  tabBar: '#ffffff',
  tabBarActive: '#4287f5',
  tabBarInactive: '#8e8e93',
  income: '#4CAF50',
  expense: '#f44336',
  statsBg: '#4287f5',
};

const darkTheme = {
  background: '#000000',
  card: '#1c1c1e',
  text: '#ffffff',
  textSecondary: '#8e8e93',
  primary: '#FF6800',
  border: '#38383a',
  tabBar: '#1c1c1e',
  tabBarActive: '#FF6800',
  tabBarInactive: '#8e8e93',
  income: '#4CAF50',
  expense: '#f44336',
  statsBg: 'rgba(255, 104, 0, 0.9)',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}; 