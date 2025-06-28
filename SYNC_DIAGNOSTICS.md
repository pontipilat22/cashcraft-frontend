# Диагностика проблем синхронизации

## Правильный порядок синхронизации

Приложение теперь использует правильный порядок синхронизации:

1. **`sync.upload`** - отправка локальных изменений на сервер
2. **`sync.download`** - загрузка обновленных данных с сервера  
3. **`importCloudData`** - применение полученных данных локально

### Оптимизация downloadData

Метод `downloadData` теперь проверяет `lastSyncAt` перед очисткой локальной базы:
- Если `cloudData.lastSyncAt === localLastSync` - пропускает импорт
- Если есть новые данные - очищает и импортирует

## Проблема
`CloudSyncService.syncData` не отправляет данные на сервер или отправляет пустой список.

## Диагностика

### 1. Проверьте, вызывается ли syncData
```javascript
// В DataContext.tsx есть вызовы:
await CloudSyncService.syncData(userId, token);
```

### 2. Проверьте токен
```javascript
const token = await AsyncStorage.getItem('@cashcraft_access_token');
console.log('Токен:', token ? 'Есть' : 'Нет');
```

### 3. Проверьте несинхронизированные данные
```javascript
const { WatermelonDatabaseService } = await import('./watermelonDatabase');
const unsyncedData = await WatermelonDatabaseService.getUnsyncedData();
console.log('Несинхронизированные данные:', unsyncedData);
```

### 4. Проверьте флаг синхронизации
Новые записи должны иметь `syncedAt = undefined` (не `null`).

## Исправления

### 1. Исправлен метод getUnsyncedData()
- Теперь правильно проверяет `synced_at` вместо `updated_at`
- Использует `Q.or` для обработки `null` значений
- Добавлено логирование для отладки

### 2. Исправлено создание записей
При создании новых записей поле `syncedAt` теперь явно устанавливается в `undefined`:
```javascript
// В методах createAccount, createTransaction, createCategory, createDebt
account.syncedAt = undefined; // Явно помечаем как несинхронизированную
```

### 3. Исправлено обновление записей
При обновлении записей `syncedAt` сбрасывается в `undefined`:
```javascript
// В методах updateAccount, updateTransaction, updateCategory, updateDebt
acc.syncedAt = undefined; // Сбрасываем флаг синхронизации при изменении
```

### 4. Исправлен порядок синхронизации
В `DataContext.initializeApp` теперь правильный порядок:
```javascript
// 1. Сначала отправляем локальные изменения
const syncSuccess = await CloudSyncService.syncData(userId, token);
// 2. Потом загружаем с сервера
const hasCloudData = await CloudSyncService.downloadData(userId, token);
```

### 5. Оптимизирован downloadData
Добавлена проверка `lastSyncAt` для предотвращения ненужной очистки:
```javascript
if (cloudData.lastSyncAt === await LocalDatabaseService.getLastSyncTime()) {
  console.log('Данных на сервере нет новых - пропускаем импорт');
  return true;
}
```

### 6. Исправлена проблема с перезаходом в аккаунт
При перезаходе в аккаунт теперь правильная логика:
```javascript
// Проверяем, есть ли локальные данные
const hasLocalData = accountsFromDb.length > 1 || transactionsFromDb.length > 0 || 
                     categoriesFromDb.length > 11 || debtsFromDb.length > 0;

if (hasLocalData) {
  // Стандартная синхронизация: upload → download
  await CloudSyncService.syncData(userId, token);
  await CloudSyncService.downloadData(userId, token);
} else {
  // При перезаходе: download → upload (чтобы не потерять данные)
  await CloudSyncService.downloadData(userId, token);
  await CloudSyncService.syncData(userId, token);
}
```

### 7. Исправлен wipeData
После сброса данных теперь правильная последовательность:
```javascript
// 1. Сбрасываем данные на сервере
await fetch('/api/v1/sync/wipe', { method: 'DELETE' });

// 2. Очищаем локальную базу
await database.write(async () => {
  // Удаляем все записи
});

// 3. Переинициализируем с базовыми данными
await LocalDatabaseService.forceReinitialize('USD');

// 4. Устанавливаем флаг сброса
await AsyncStorage.setItem(`dataReset_${userId}`, 'true');
```

Это предотвращает отправку базовых данных на сервер после сброса.

## Тестирование

### Запустите тестовый скрипт:
```bash
node scripts/test-sync.js
```

### Проверьте логи:
1. Создайте новую запись (счет/транзакцию)
2. Нажмите "Синхронизировать" в приложении
3. Проверьте логи на наличие:
   - `📤 [DataContext] 1. Отправляем локальные изменения на сервер...`
   - `📥 [DataContext] 2. Загружаем обновленные данные с сервера...`
   - `📊 [WatermelonDatabase] Несинхронизированные данные:`
   - `🌐 [CloudSync] Отправляем данные на сервер:`
   - `POST /api/v1/sync/upload`

## Возможные проблемы

### 1. Токен отсутствует или истек
- Проверьте авторизацию
- Обновите токен

### 2. База данных не готова
- Проверьте `WatermelonDatabaseService.isDatabaseReady()`

### 3. Все записи уже синхронизированы
- Проверьте `getUnsyncedData()` - должен вернуть новые записи
- Убедитесь, что новые записи имеют `syncedAt = undefined`

### 4. Проблема с сетью
- Проверьте подключение к интернету
- Проверьте доступность сервера

### 5. Неправильный порядок синхронизации
- Убедитесь, что сначала идет `sync.upload`, потом `sync.download`

## Команды для отладки

```bash
# Остановить цикл wipeData (если есть)
node scripts/stop-wipe-cycle.js

# Проверить состояние синхронизации
node scripts/test-sync.js

# Очистить все данные (если нужно)
# В приложении: Настройки → Очистить все данные
``` 