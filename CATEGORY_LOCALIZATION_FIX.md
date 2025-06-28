# Исправление локализации категорий

## Проблема
Категории отображались на английском языке ("Salary", "Business", "Investments", "Food", "Transport") вместо русского, несмотря на то, что в настройках приложения выбран русский язык.

## Причина
Категории создавались в базе данных с английскими названиями в поле `name`, а система локализации работала неправильно.

## Решение

### 1. Структура данных
- **ID**: UUID для уникальной идентификации записей в базе данных
- **Name**: Ключи локализации (salary, business, investments, food, transport, etc.)
- **Отображение**: Используется функция `getLocalizedCategory()` для перевода

### 2. Изменения в коде

#### WatermelonDatabaseService.ts
```typescript
// Категории создаются с ключами локализации в поле name
const categories = [
  { id: uuidv4(), name: 'salary',        type: 'income',  icon: 'cash-outline',            color: '#4CAF50' },
  { id: uuidv4(), name: 'business',      type: 'income',  icon: 'briefcase-outline',       color: '#2196F3' },
  { id: uuidv4(), name: 'investments',   type: 'income',  icon: 'trending-up-outline',     color: '#FF9800' },
  { id: uuidv4(), name: 'other_income',  type: 'income',  icon: 'add-circle-outline',      color: '#9C27B0' },
  
  { id: uuidv4(), name: 'food',          type: 'expense', icon: 'cart-outline',            color: '#F44336' },
  { id: uuidv4(), name: 'transport',     type: 'expense', icon: 'car-outline',             color: '#3F51B5' },
  { id: uuidv4(), name: 'housing',       type: 'expense', icon: 'home-outline',            color: '#009688' },
  { id: uuidv4(), name: 'entertainment', type: 'expense', icon: 'game-controller-outline', color: '#E91E63' },
  { id: uuidv4(), name: 'health',        type: 'expense', icon: 'fitness-outline',         color: '#4CAF50' },
  { id: uuidv4(), name: 'shopping',      type: 'expense', icon: 'bag-outline',             color: '#9C27B0' },
  { id: uuidv4(), name: 'other_expense', type: 'expense', icon: 'ellipsis-horizontal-outline', color: '#607D8B' },
];
```

#### categoryUtils.ts
```typescript
// Маппинг ключей локализации на переводы
export const CATEGORY_NAMES = {
  'salary': 'categories.salary',
  'business': 'categories.business', 
  'investments': 'categories.investments',
  'other_income': 'categories.otherIncome',
  'food': 'categories.food',
  'transport': 'categories.transport',
  'housing': 'categories.housing',
  'entertainment': 'categories.entertainment',
  'health': 'categories.health',
  'shopping': 'categories.shopping',
  'other_expense': 'categories.otherExpense',
} as const;

// Функция локализации категории
export const getLocalizedCategory = (category: Category, t: (key: string) => string): Category => {
  // Проверяем по полю name, является ли это системной категорией
  if (CATEGORY_NAMES[category.name as keyof typeof CATEGORY_NAMES]) {
    return {
      ...category,
      name: t(CATEGORY_NAMES[category.name as keyof typeof CATEGORY_NAMES])
    };
  }
  // Для пользовательских категорий возвращаем как есть
  return category;
};
```

### 3. Файлы локализации (ru.ts)
```typescript
export default {
  categories: {
    salary: 'Зарплата',
    business: 'Бизнес',
    investments: 'Инвестиции',
    otherIncome: 'Другие доходы',
    food: 'Продукты',
    transport: 'Транспорт',
    housing: 'Жилье',
    entertainment: 'Развлечения',
    health: 'Здоровье',
    shopping: 'Покупки',
    otherExpense: 'Другие расходы',
  },
  // ... остальные переводы
};
```

### 4. Использование в компонентах
```typescript
// В компонентах используется getLocalizedCategory для отображения
const localizedCategory = getLocalizedCategory(category, t);
<Text>{localizedCategory.name}</Text>
```

## Результат

### До исправления:
- ❌ "Salary" (английский)
- ❌ "Business" (английский)
- ❌ "Investments" (английский)
- ❌ "Food" (английский)
- ❌ "Transport" (английский)

### После исправления:
- ✅ "Зарплата" (русский)
- ✅ "Бизнес" (русский)
- ✅ "Инвестиции" (русский)
- ✅ "Продукты" (русский)
- ✅ "Транспорт" (русский)

## Преимущества решения

1. **UUID сохранены**: Уникальная идентификация записей в базе данных
2. **Локализация работает**: Категории отображаются на выбранном языке
3. **Обратная совместимость**: Существующие данные продолжают работать
4. **Гибкость**: Легко добавлять новые языки и категории
5. **Пользовательские категории**: Остаются как есть, не переводятся

## Тестирование

Для проверки работы локализации можно использовать:
```bash
cd cashcraft3
node test-category-localization.js
```

Этот тест проверит:
- Правильность перевода системных категорий
- Сохранение пользовательских категорий без изменений
- Работу маппинга ключей локализации 