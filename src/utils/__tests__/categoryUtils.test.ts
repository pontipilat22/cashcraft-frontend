import {
  getLocalizedCategoryName,
  getLocalizedCategory,
  CATEGORY_NAMES,
} from '../categoryUtils';
import { Category } from '../../types';

describe('categoryUtils', () => {
  describe('CATEGORY_NAMES', () => {
    it('should contain income categories', () => {
      expect(CATEGORY_NAMES.salary).toBe('categories.salary');
      expect(CATEGORY_NAMES.business).toBe('categories.business');
      expect(CATEGORY_NAMES.investments).toBe('categories.investments');
      expect(CATEGORY_NAMES.other_income).toBe('categories.otherIncome');
    });

    it('should contain expense categories', () => {
      expect(CATEGORY_NAMES.food).toBe('categories.food');
      expect(CATEGORY_NAMES.transport).toBe('categories.transport');
      expect(CATEGORY_NAMES.housing).toBe('categories.housing');
      expect(CATEGORY_NAMES.entertainment).toBe('categories.entertainment');
      expect(CATEGORY_NAMES.health).toBe('categories.health');
      expect(CATEGORY_NAMES.shopping).toBe('categories.shopping');
      expect(CATEGORY_NAMES.other_expense).toBe('categories.otherExpense');
    });
  });

  describe('getLocalizedCategoryName', () => {
    const mockTranslate = jest.fn((key: string) => {
      const translations: Record<string, string> = {
        'categories.salary': 'Зарплата',
        'categories.food': 'Еда',
        'categories.transport': 'Транспорт',
      };
      return translations[key] || key;
    });

    beforeEach(() => {
      mockTranslate.mockClear();
    });

    it('should return localized name for system category', () => {
      const result = getLocalizedCategoryName('salary', mockTranslate);
      expect(result).toBe('Зарплата');
      expect(mockTranslate).toHaveBeenCalledWith('categories.salary');
    });

    it('should return category id for custom category', () => {
      const result = getLocalizedCategoryName('custom_category', mockTranslate);
      expect(result).toBe('custom_category');
    });

    it('should handle expense categories', () => {
      const result = getLocalizedCategoryName('food', mockTranslate);
      expect(result).toBe('Еда');
      expect(mockTranslate).toHaveBeenCalledWith('categories.food');
    });

    it('should return original id for unknown category', () => {
      const result = getLocalizedCategoryName('unknown', mockTranslate);
      expect(result).toBe('unknown');
    });
  });

  describe('getLocalizedCategory', () => {
    const mockTranslate = jest.fn((key: string) => {
      const translations: Record<string, string> = {
        'categories.salary': 'Зарплата',
        'categories.food': 'Еда',
      };
      return translations[key] || key;
    });

    const createMockCategory = (overrides?: Partial<Category>): Category => ({
      id: '1',
      name: 'salary',
      type: 'income',
      icon: 'briefcase',
      color: '#4CAF50',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    });

    beforeEach(() => {
      mockTranslate.mockClear();
    });

    it('should return category with localized name for system category', () => {
      const category = createMockCategory({ name: 'salary' });
      const result = getLocalizedCategory(category, mockTranslate);

      expect(result.name).toBe('Зарплата');
      expect(result.id).toBe(category.id);
      expect(result.type).toBe(category.type);
      expect(mockTranslate).toHaveBeenCalledWith('categories.salary');
    });

    it('should return category unchanged for custom category', () => {
      const category = createMockCategory({ name: 'custom_category' });
      const result = getLocalizedCategory(category, mockTranslate);

      expect(result).toEqual(category);
      expect(result.name).toBe('custom_category');
    });

    it('should preserve all category properties', () => {
      const category = createMockCategory({
        name: 'food',
        icon: 'restaurant',
        color: '#FF5722',
      });
      const result = getLocalizedCategory(category, mockTranslate);

      expect(result.name).toBe('Еда');
      expect(result.icon).toBe('restaurant');
      expect(result.color).toBe('#FF5722');
      expect(result.type).toBe('income');
    });

    it('should not modify original category object', () => {
      const category = createMockCategory({ name: 'salary' });
      const originalName = category.name;

      getLocalizedCategory(category, mockTranslate);

      expect(category.name).toBe(originalName);
    });
  });
});
