import { Category } from '../types';

// Маппинг ID категорий на ключи локализации
export const CATEGORY_NAMES = {
  // Income categories
  'salary': 'categories.salary',
  'business': 'categories.business', 
  'investments': 'categories.investments',
  'other_income': 'categories.otherIncome',
  
  // Expense categories
  'food': 'categories.food',
  'transport': 'categories.transport',
  'housing': 'categories.housing',
  'entertainment': 'categories.entertainment',
  'health': 'categories.health',
  'shopping': 'categories.shopping',
  'other_expense': 'categories.otherExpense',
} as const;

// Получить локализованное название категории
export const getLocalizedCategoryName = (categoryId: string, t: (key: string) => string): string => {
  const localeKey = CATEGORY_NAMES[categoryId as keyof typeof CATEGORY_NAMES];
  if (localeKey) {
    return t(localeKey);
  }
  // Для пользовательских категорий возвращаем их имя как есть
  return categoryId;
};

// Получить категорию с локализованным названием
export const getLocalizedCategory = (category: Category, t: (key: string) => string): Category => {
  // Если это системная категория (проверяем по name), используем локализованное название
  if (CATEGORY_NAMES[category.name as keyof typeof CATEGORY_NAMES]) {
    return {
      ...category,
      name: t(CATEGORY_NAMES[category.name as keyof typeof CATEGORY_NAMES])
    };
  }
  // Для пользовательских категорий возвращаем как есть
  return category;
}; 