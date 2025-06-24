# Попытки исправления SQLite в Expo SDK 53

## Проблема
`java.lang.NullPointerException` в `NativeDatabase.prepareSync` на Android при использовании SQLite в Expo SDK 51-53.

## Что мы попробовали

### 1. Retry логика (✅ Частично помогает)
Добавили повторные попытки при NullPointerException:
```javascript
while (retries > 0) {
  try {
    return this.db.getFirstSync(query, params);
  } catch (error) {
    if (error?.message?.includes('NullPointerException')) {
      retries--;
      // Задержка перед повтором
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 2. Очередь операций (🔄 В процессе)
Предотвращаем одновременные запросы к SQLite:
```javascript
private static operationQueue: QueueItem[] = [];
private static async enqueueOperation<T>(operation: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    this.operationQueue.push({ operation, resolve, reject });
    this.processQueue();
  });
}
```

### 3. Увеличенные задержки инициализации (✅ Помогает)
```javascript
// Для Android увеличили задержку до 2 секунд
if (Platform.OS === 'android') {
  await new Promise(resolve => setTimeout(resolve, 2000));
}
```

### 4. Безопасные обертки для всех операций (✅ Помогает)
- `safeGetFirstSync` - возвращает null при ошибке
- `safeGetAllSync` - возвращает пустой массив при ошибке
- `safeRunSync` - логирует ошибку и продолжает работу
- `safeExecSync` - логирует ошибку и продолжает работу

## Текущее решение

### 1. AsyncStorage как основное хранилище
```javascript
// Сохраняем данные в AsyncStorage
await AsyncStorage.setItem('fallback_accounts', JSON.stringify(accounts));
await AsyncStorage.setItem('fallback_transactions', JSON.stringify(transactions));
```

### 2. SQLite как опциональное хранилище
```javascript
// Пытаемся сохранить в SQLite, но не падаем если не получается
try {
  if (LocalDatabaseService.isDatabaseReady()) {
    await LocalDatabaseService.createAccount(account);
  }
} catch (error) {
  console.log('SQLite недоступен, данные сохранены в AsyncStorage');
}
```

### 3. Серверная синхронизация
- Все данные синхронизируются с сервером
- При входе загружаются данные с сервера
- Периодическая синхронизация каждые 5 минут

## Рекомендации

### Для разработчиков:
1. **Не полагайтесь только на SQLite в Expo SDK 51-53**
2. **Всегда имейте fallback на AsyncStorage**
3. **Используйте серверную синхронизацию**

### Альтернативы SQLite:
1. **AsyncStorage** - простое key-value хранилище (текущее решение)
2. **MMKV** - быстрая альтернатива AsyncStorage
3. **WatermelonDB** - требует рефакторинга, но более стабильна
4. **Realm** - мощная БД, но требует настройки

### Временные обходные пути для SQLite:
1. Добавить retry логику для всех операций
2. Использовать очередь операций
3. Увеличить задержки инициализации
4. Проверять готовность БД перед каждой операцией

## Ожидаемое исправление
Проблема отслеживается в [expo/expo#27619](https://github.com/expo/expo/issues/27619). 
Возможно будет исправлено в SDK 54 или 55. 