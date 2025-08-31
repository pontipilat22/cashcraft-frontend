# Настройка для работы в Expo Go

Этот файл содержит инструкции по переключению между полной версией приложения (с WatermelonDB) и моковой версией для работы в Expo Go.

## Для работы в Expo Go (текущее состояние)

В `App.tsx` используются моковые импорты:
```typescript
import { DataProvider } from './src/context/DataContextMock';
import { AuthProvider, useAuth } from './src/context/AuthContextMock';
import { SubscriptionProvider } from './src/context/SubscriptionContextMock';
```

WatermelonDB импорты заглушены:
```typescript
// import { v4 as uuidv4 } from 'uuid';
// import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
// setGenerator(() => uuidv4());
```

## Для возврата к полной версии

В `App.tsx` замените импорты обратно:
```typescript
import { DataProvider } from './src/context/DataContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
```

И раскомментируйте WatermelonDB:
```typescript
import { v4 as uuidv4 } from 'uuid';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
setGenerator(() => uuidv4());
```

## Моковые данные

В `DataContextMock.tsx` есть тестовые данные:
- Наличные: 1,350₸
- Банковская карта: 50₸
- Накопления на отпуск: 500₸ (300₸ накоплено из 1,000₸)
- Кредит на авто: -15,000₸
- Долги (мне должны/я должен)

## Файлы для переключения

### Моковые версии (для Expo Go):
- `src/context/DataContextMock.tsx`
- `src/context/AuthContextMock.tsx`
- `src/context/SubscriptionContextMock.tsx`
- `src/services/localDatabaseMock.ts`
- `src/database/indexMock.ts`

### Оригинальные версии (для полной сборки):
- `src/context/DataContext.tsx`
- `src/context/AuthContext.tsx`
- `src/context/SubscriptionContext.tsx`
- `src/services/localDatabase.ts`
- `src/database/index.ts`
