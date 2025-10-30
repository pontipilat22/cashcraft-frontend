# 🔌 Обзор сервисов CashCraft

[[README|← Назад к содержанию]]

---

## 📖 Что такое сервисы?

**Сервисы** - это классы или модули, которые содержат **бизнес-логику** приложения. Они отвечают за:
- 📡 Работу с API
- 💱 Курсы валют
- 📢 Управление рекламой
- 🔐 Аутентификацию
- 🗄 Работу с локальной базой данных
- ☁️ Синхронизацию с облаком

**Правило:** Вся логика работы с данными должна быть в сервисах, **НЕ** в компонентах React!

---

## 📁 Структура папки `src/services/`

```
src/services/
├── api.ts                    # 📡 Основной API сервис (backend)
├── exchangeRate.ts           # 💱 Курсы валют
├── AdService.ts              # 📢 Управление рекламой
├── auth.ts                   # 🔐 Аутентификация
├── localDatabase.ts          # 🗄 Локальная база данных
├── cloudSync.ts              # ☁️ Синхронизация
├── i18n.ts                   # 🌍 Локализация (переводы)
└── data.ts                   # 📊 Работа с данными (CRUD)
```

---

## 🗺 Карта сервисов

```
┌─────────────────────────────────────────────────────────────┐
│                      Компоненты React                        │
│            (экраны, кнопки, формы и т.д.)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ используют ↓
┌─────────────────────────────────────────────────────────────┐
│                       СЕРВИСЫ                                │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  ApiService  │  │  AdService   │  │ AuthService  │       │
│  │              │  │              │  │              │       │
│  │ • get()      │  │ • showAd()   │  │ • login()    │       │
│  │ • post()     │  │ • trackAd()  │  │ • logout()   │       │
│  │ • put()      │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ ExchangeRate │  │  LocalDB     │  │  CloudSync   │       │
│  │  Service     │  │  Service     │  │   Service    │       │
│  │              │  │              │  │              │       │
│  │ • getRate()  │  │ • getAccounts│  │ • syncUp()   │       │
│  │ • convert()  │  │ • saveData() │  │ • syncDown() │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
└───────────────────────┬─────────────────────────────────────┘
                        │ обращаются к ↓
┌─────────────────────────────────────────────────────────────┐
│              Внешние системы и хранилища                    │
│                                                               │
│  • Backend API (Railway)                                     │
│  • WatermelonDB (SQLite)                                     │
│  • AsyncStorage                                              │
│  • Google AdMob                                              │
│  • Google OAuth                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Список сервисов

| Сервис | Файл | Описание | Основные методы |
|--------|------|----------|-----------------|
| **API Service** | `api.ts` | Работа с backend API | `get()`, `post()`, `put()`, `delete()` |
| **Exchange Rate Service** | `exchangeRate.ts` | Курсы валют и конвертация | `getRate()`, `convert()`, `forceUpdateRate()` |
| **Ad Service** | `AdService.ts` | Управление показом рекламы | `shouldShowInterstitial()`, `markInterstitialShown()` |
| **Auth Service** | `auth.ts` | Аутентификация пользователей | `login()`, `logout()`, `googleSignIn()` |
| **Local Database Service** | `localDatabase.ts` | Работа с WatermelonDB | `getAccounts()`, `createTransaction()` |
| **Cloud Sync Service** | `cloudSync.ts` | Синхронизация с облаком | `syncUp()`, `syncDown()`, `resolveConflicts()` |
| **i18n Service** | `i18n.ts` | Локализация интерфейса | `t()`, `getCurrentLanguage()`, `setLanguage()` |
| **Data Service** | `data.ts` | CRUD операции с данными | `createAccount()`, `updateTransaction()` |

---

## 🎯 Как работают сервисы?

### Пример 1: Создание транзакции

```typescript
// ❌ ПЛОХО - логика в компоненте
const AddTransactionScreen = () => {
  const handleSave = async () => {
    const db = database;
    const collection = db.collections.get('transactions');
    const transaction = await collection.create(transaction => {
      transaction.amount = 100;
      transaction.date = new Date();
      // ... много логики
    });
  };
};

// ✅ ХОРОШО - используем сервис
const AddTransactionScreen = () => {
  const { createTransaction } = useData(); // Контекст использует сервис

  const handleSave = async () => {
    await createTransaction({
      amount: 100,
      date: new Date(),
      // ...
    });
  };
};
```

### Пример 2: Получение курса валют

```typescript
// В компоненте
import { ExchangeRateService } from '../services/exchangeRate';

const TransferScreen = () => {
  const [rate, setRate] = useState(null);

  useEffect(() => {
    // Просто вызываем метод сервиса
    const loadRate = async () => {
      const usdToEur = await ExchangeRateService.getRate('USD', 'EUR');
      setRate(usdToEur);
    };
    loadRate();
  }, []);

  return <Text>Курс: {rate}</Text>;
};
```

---

## 🔄 Связь сервисов между собой

Сервисы могут использовать друг друга:

```typescript
// ExchangeRateService использует ApiService
export class ExchangeRateService {
  static async getRate(from: string, to: string) {
    // Запрос к backend через ApiService
    const response = await ApiService.get(`/exchange-rates/rate?from=${from}&to=${to}`);
    return response.data.rate;
  }
}
```

```typescript
// CloudSyncService использует LocalDatabaseService
export class CloudSyncService {
  static async syncUp() {
    // Получаем данные из локальной БД
    const accounts = await LocalDatabaseService.getAccounts();

    // Отправляем на backend через ApiService
    await ApiService.post('/sync/accounts', accounts);
  }
}
```

---

## 📦 Шаблон сервиса

Все сервисы следуют одному шаблону:

```typescript
// src/services/MyService.ts

/**
 * Сервис для работы с ...
 *
 * @example
 * import { MyService } from './services/MyService';
 *
 * const result = await MyService.doSomething();
 */
export class MyService {
  // Приватные свойства (состояние сервиса)
  private static cache: Map<string, any> = new Map();

  /**
   * Метод для ...
   *
   * @param param1 - Описание параметра
   * @returns Описание возвращаемого значения
   */
  static async doSomething(param1: string): Promise<any> {
    try {
      // Логика метода
      const result = await someAsyncOperation(param1);

      // Кеширование
      this.cache.set(param1, result);

      return result;
    } catch (error) {
      console.error('[MyService] Error:', error);
      throw error;
    }
  }

  /**
   * Очистить кеш
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
```

---

## 🎨 Принципы проектирования сервисов

### 1️⃣ **Единая ответственность**
Каждый сервис отвечает за **одну область**:
- `ApiService` - **только** HTTP запросы
- `AdService` - **только** реклама
- `AuthService` - **только** аутентификация

### 2️⃣ **Статические методы**
Сервисы используют **static методы**, не нужно создавать экземпляры:
```typescript
// ✅ Правильно
const rate = await ExchangeRateService.getRate('USD', 'EUR');

// ❌ Неправильно
const service = new ExchangeRateService();
const rate = await service.getRate('USD', 'EUR');
```

### 3️⃣ **Обработка ошибок**
Все методы должны правильно обрабатывать ошибки:
```typescript
static async getData() {
  try {
    const data = await api.get('/data');
    return data;
  } catch (error) {
    console.error('[MyService] Error:', error);
    // Можно вернуть fallback значение или пробросить ошибку
    return null;
  }
}
```

### 4️⃣ **Кеширование**
Часто используемые данные кешируются:
```typescript
export class ExchangeRateService {
  private static ratesCache: Map<string, { rate: number; timestamp: number }> = new Map();
  private static CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 часа

  static async getRate(from: string, to: string) {
    const cacheKey = `${from}_${to}`;
    const cached = this.ratesCache.get(cacheKey);

    // Проверяем актуальность кеша
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.rate;
    }

    // Загружаем свежие данные
    const rate = await this.fetchRateFromAPI(from, to);
    this.ratesCache.set(cacheKey, { rate, timestamp: Date.now() });

    return rate;
  }
}
```

### 5️⃣ **Логирование**
Важные действия логируются:
```typescript
static async login(email: string, password: string) {
  console.log('[AuthService] Login attempt for:', email);

  try {
    const response = await ApiService.post('/auth/login', { email, password });
    console.log('[AuthService] Login successful');
    return response.data;
  } catch (error) {
    console.error('[AuthService] Login failed:', error);
    throw error;
  }
}
```

---

## 🔗 Подробная документация по каждому сервису

Выберите сервис для детального изучения:

- [[05-Services/ApiService|ApiService - Работа с backend API]]
- [[05-Services/ExchangeRateService|ExchangeRateService - Курсы валют]]
- [[05-Services/AdService|AdService - Управление рекламой]]
- [[05-Services/AuthService|AuthService - Аутентификация]]
- [[05-Services/LocalDatabaseService|LocalDatabaseService - Локальная БД]]
- [[05-Services/CloudSyncService|CloudSyncService - Синхронизация]]

---

## 💡 Когда создавать новый сервис?

Создавайте новый сервис, если:

✅ Логика **не относится к UI** (визуальное отображение)
✅ Код будет **переиспользоваться** в разных местах
✅ Логика работает с **внешними системами** (API, БД, файлы)
✅ Код имеет **свою область ответственности**

**Примеры:**
- `NotificationService` - отправка push-уведомлений
- `AnalyticsService` - сбор аналитики
- `BackupService` - создание резервных копий
- `ReportService` - генерация отчетов

---

[[05-Services/ApiService|Следующая: ApiService →]]

[[README|← Назад к содержанию]]
