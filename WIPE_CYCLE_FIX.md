# Исправление бесконечного цикла wipeData

## Проблема
Приложение застревало в бесконечном цикле и постоянно отправляло запросы `DELETE /api/v1/sync/wipe` на сервер.

## Причина
Циклическая зависимость между методами:
1. `downloadData()` → `LocalDatabaseService.resetAllData()`
2. `resetAllData()` → `CloudSyncService.wipeData()`
3. `wipeData()` очищает данные на сервере
4. После этого снова вызывается `downloadData()`
5. Цикл повторяется бесконечно

## Решение

### 1. Убрали циклические вызовы
- В `CloudSyncService.downloadData()` заменили `LocalDatabaseService.resetAllData()` на прямую очистку базы данных
- В `CloudSyncService.wipeData()` заменили `LocalDatabaseService.resetAllData()` на прямую очистку базы данных

### 2. Добавили защиту от множественных вызовов
- Добавили флаг `isWiping` в `CloudSyncService`
- Предотвращаем одновременные вызовы `wipeData()`

### 3. Создали экстренный скрипт
- `scripts/stop-wipe-cycle.js` - для остановки цикла в экстренных случаях

## Измененные файлы

### `src/services/cloudSync.ts`
- Добавлен импорт `database`
- Заменены вызовы `LocalDatabaseService.resetAllData()` на прямую очистку
- Добавлена защита от множественных вызовов `wipeData()`

### `src/context/DataContext.tsx`
- Обновлен для использования `CloudSyncService.wipeData()`

### `src/services/userDataService.ts`
- Обновлен для использования `CloudSyncService.wipeData()`

### `src/services/watermelonDatabase.ts`
- Обновлен для использования `CloudSyncService.wipeData()`

## Как использовать экстренный скрипт

Если цикл снова начнется:

```bash
# В терминале в папке cashcraft3
node scripts/stop-wipe-cycle.js
```

Или в коде:
```javascript
import stopWipeCycle from './scripts/stop-wipe-cycle.js';
await stopWipeCycle();
```

## Результат
- ✅ Устранен бесконечный цикл
- ✅ Правильная работа функции "Очистить все данные"
- ✅ Защита от случайных множественных вызовов
- ✅ Экстренный способ остановки цикла

## Тестирование
1. Нажмите "Очистить все данные"
2. Должен быть только один запрос `DELETE /api/v1/sync/wipe`
3. Данные должны очиститься локально и на сервере
4. Цикл не должен повториться 