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
    warning: string;
    danger: string;
    error: string;
    success: string;
    successLight: string;
    dangerLight: string;
    secondary: string;
    info: string;
    modalOverlay: string;
    modalBackground: string;
    tabBarBackground: string;
    tabBarActiveTint: string;
    tabBarInactiveTint: string;
    inputBackground: string;
  };
}

const lightTheme = {
  background: '#f0f0f0',
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
  warning: '#ff9800',
  danger: '#f44336',
  error: '#f44336',
  success: '#4CAF50',
  successLight: '#E8F5E9',
  dangerLight: '#FFEBEE',
  secondary: '#6c757d',
  info: '#17a2b8',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: '#ffffff',
  tabBarBackground: '#ffffff',
  tabBarActiveTint: '#4287f5',
  tabBarInactiveTint: '#8e8e93',
  inputBackground: '#f8f9fa',
};

const darkTheme = {
  background: '#1a1a1a',
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
  warning: '#ff9800',
  danger: '#f44336',
  error: '#f44336',
  success: '#4CAF50',
  successLight: '#1B5E20',
  dangerLight: '#B71C1C',
  secondary: '#6c757d',
  info: '#17a2b8',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: '#2c2c2c',
  tabBarBackground: '#1c1c1e',
  tabBarActiveTint: '#FF6800',
  tabBarInactiveTint: '#8e8e93',
  inputBackground: '#343a40',
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