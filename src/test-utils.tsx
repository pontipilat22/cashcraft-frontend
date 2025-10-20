import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from './context/ThemeContext';
import { LocalizationProvider } from './context/LocalizationContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { DataProvider } from './context/DataContext';
import { BudgetProvider } from './context/BudgetContext';

// Провайдер с всеми контекстами для тестирования
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <LocalizationProvider>
        <CurrencyProvider>
          <DataProvider>
            <BudgetProvider>
              {children}
            </BudgetProvider>
          </DataProvider>
        </CurrencyProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

// Кастомная функция render с провайдерами
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react-native';

// Override render method
export { customRender as render };
