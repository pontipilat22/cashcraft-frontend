# Решение: Функция clearAllData() для полной очистки WatermelonDB

## Проблема
После вызова `resetUserData()` данные удалялись на сервере, но на телефоне оставались старые данные (счета, категории, транзакции), и после повторного входа они снова отправлялись на сервер.

## Решение
Создана функция `clearAllData()` в `WatermelonDatabaseService`, которая полностью очищает локальную базу данных WatermelonDB.

## Реализация

### 1. Новая функция clearAllData() в WatermelonDatabaseService

```typescript
static async clearAllData(defaultCurrency: string = 'USD'): Promise<void> {
  console.log('🗑️ [WatermelonDatabase] Начинаем полную очистку локальной базы данных...');
  
  try {
    // 1. Очищаем все таблицы
    await database.write(async () => {
      const tables = [
        'accounts',
        'transactions', 
        'categories',
        'debts',
        'exchange_rates',
        'settings',
        'sync_metadata'
      ];
      
      for (const table of tables) {
        const records = await database.get(table).query().fetch();
        if (records.length > 0) {
          await Promise.all(records.map(record => record.destroyPermanently()));
        }
      }
    });
    
    // 2. Сбрасываем состояние инициализации
    this.isInitialized = false;
    this.lastInitError = null;
    
    // 3. Переинициализируем базу данных
    await this.initDatabase(defaultCurrency);
    
    // 4. Устанавливаем флаг сброса данных
    if (this.currentUserId) {
      await AsyncStorage.setItem(`dataReset_${this.currentUserId}`, 'true');
    }
    
  } catch (error) {
    throw new Error(`Failed to clear local database: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### 2. Интеграция в существующие сервисы

#### DataContext.tsx
```typescript
const resetAllData = async () => {
  // 1. Сбрасываем данные на сервере
  let serverResetSuccess = false;
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/reset-data`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      serverResetSuccess = true;
    }
  } catch (error) {
    // Обработка ошибки
  }
  
  // 2. Очищаем локальные данные
  if (serverResetSuccess) {
    // Если серверный сброс успешен, используем clearAllData
    await LocalDatabaseService.clearAllData(defaultCurrency);
  } else {
    // Если серверный сброс не удался, используем обычный resetAllData
    await LocalDatabaseService.resetAllData(defaultCurrency);
  }
  
  // 3. Устанавливаем флаг и обновляем состояние
  await AsyncStorage.setItem(`dataReset_${userId}`, 'true');
  await refreshData();
};
```

#### UserDataService.ts
```typescript
static async resetAllData(): Promise<void> {
  // 1. Сбрасываем данные на сервере
  let serverResetSuccess = false;
  // ... код сброса на сервере ...
  
  // 2. Сбрасываем локальные данные
  if (serverResetSuccess) {
    // Если серверный сброс успешен, используем clearAllData
    const { WatermelonDatabaseService } = await import('./watermelonDatabase');
    await WatermelonDatabaseService.clearAllData('USD');
  } else {
    // Если серверный сброс не удался, используем обычный сброс AsyncStorage
    // ... код сброса AsyncStorage ...
  }
  
  // 3. Устанавливаем флаг сброса данных
  await AsyncStorage.setItem(`dataReset_${this.currentUserId}`, 'true');
}
```

## Использование

### Прямое использование
```typescript
import { WatermelonDatabaseService } from './src/services/watermelonDatabase';

// После успешного сброса на сервере
await WatermelonDatabaseService.clearAllData('USD');
```

### Через DataContext (рекомендуется)
```typescript
const { resetAllData } = useData();

// Автоматически использует clearAllData при успешном серверном сбросе
await resetAllData();
```

## Преимущества решения

1. **Полная очистка**: Удаляет все данные из всех таблиц WatermelonDB
2. **Автоматическая переинициализация**: Создает базовые данные после очистки
3. **Флаг сброса**: Предотвращает восстановление старых данных при входе
4. **Безопасность**: Используется только после успешного сброса на сервере
5. **Обратная совместимость**: Не ломает существующий функционал
6. **Логирование**: Подробные логи для отладки

## Что очищается

- ✅ accounts (счета)
- ✅ transactions (транзакции)  
- ✅ categories (категории)
- ✅ debts (долги)
- ✅ exchange_rates (курсы валют)
- ✅ settings (настройки)
- ✅ sync_metadata (метаданные синхронизации)

## Что происходит после очистки

1. База данных переинициализируется
2. Создается счет "Наличные" с балансом 0
3. Создаются базовые категории (еда, транспорт, зарплата и т.д.)
4. Устанавливается флаг сброса данных
5. Приложение готово к работе с чистыми данными 