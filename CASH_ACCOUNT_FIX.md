# Исправление проблемы с автоматическим созданием счета "Наличные"

## Проблема
После нажатия "Очистить все данные" и повторного входа в приложение автоматически появлялся счет "Наличные" (Cash), даже если пользователь его удалил.

## Причина
Проблема была в том, что и в backend, и в frontend существовала логика автоматического создания дефолтных данных:

### Backend (auth.controller.ts)
- Функция `initializeUserData()` создавала дефолтный счет "Наличные" для новых пользователей
- Эта функция вызывалась в `resetUserData()` после сброса данных
- Также вызывалась при создании нового пользователя через Google login

### Frontend (watermelonDatabase.ts)
- Метод `initDatabase()` создавал дефолтный счет "Наличные" если его не было
- Методы `resetAllData()` и `clearAllData()` вызывали `initDatabase()` после очистки данных

## Решение

### 1. Backend исправления

#### auth.controller.ts
```typescript
// Инициализация данных пользователя
const initializeUserData = async (userId: string): Promise<void> => {
  // Проверяем, есть ли у пользователя уже какие-либо данные
  const existingAccounts = await Account.count({ where: { user_id: userId } });
  const existingCategories = await Category.count({ where: { user_id: userId } });
  
  // Если у пользователя уже есть данные, не создаем дефолтные
  if (existingAccounts > 0 || existingCategories > 0) {
    console.log(`[initializeUserData] User ${userId} already has data, skipping default creation`);
    return;
  }

  // Создаем дефолтные данные только для новых пользователей
  // ...
};
```

#### Удален вызов initializeUserData из resetUserData
```typescript
// После сброса НЕ создаём дефолтные данные - пользователь сам решит что создавать
console.log(`[ResetData] Data reset completed for user: ${userId}. User can now create their own accounts and categories.`);
```

### 2. Frontend исправления

#### watermelonDatabase.ts
```typescript
static async initDatabase(defaultCurrency: string): Promise<void> {
  // Проверяем, есть ли уже какие-либо данные в базе
  const accountsCount = await database.get<Account>('accounts').query().fetchCount();
  const categoriesCount = await database.get<Category>('categories').query().fetchCount();
  
  // Если в базе уже есть данные, не создаем дефолтные
  if (accountsCount > 0 || categoriesCount > 0) {
    console.log(`[WatermelonDB] База данных уже содержит данные, пропускаем создание дефолтных`);
    return;
  }

  // Создаем дефолтные данные только для пустой базы
  // ...
}
```

#### Удалены вызовы initDatabase из resetAllData и clearAllData
```typescript
// НЕ вызываем initDatabase - пользователь сам решит что создавать
console.log('🔄 [WatermelonDatabase] База данных очищена, дефолтные данные не создаются');
```

## Результат
Теперь после нажатия "Очистить все данные":
1. Все данные удаляются с сервера и локально
2. Дефолтный счет "Наличные" НЕ создается автоматически
3. Пользователь может создать свои собственные счета
4. При повторном входе в приложение старые счета не появляются

## Тестирование
Запустите тест для проверки исправления:
```bash
node test-cash-account-fix.js
```

Тест проверяет:
1. Создание тестового счета
2. Сброс всех данных
3. Проверку что после сброса нет автоматически созданных счетов
4. Создание нового счета пользователем
5. Финальную проверку что есть только созданный пользователем счет

## Совместимость
- Новые пользователи по-прежнему получают дефолтные данные при первом входе
- Существующие пользователи могут продолжать использовать свои данные
- Функция сброса данных теперь работает корректно без автоматического восстановления 