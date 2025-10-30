# 🗄 Обзор базы данных

[[README|← Назад к содержанию]]

---

## 📖 Что такое WatermelonDB?

**WatermelonDB** - это **локальная база данных** для React Native приложений. Построена поверх SQLite и оптимизирована для работы с большими объемами данных.

**Файлы:**
- `src/database/index.ts` - инициализация БД
- `src/database/schema.ts` - схема таблиц
- `src/database/models/` - модели данных

---

## 🎯 Почему WatermelonDB?

### ✅ Преимущества:

1. **Offline-first подход**
   - Приложение работает без интернета
   - Данные хранятся локально
   - Синхронизация при появлении сети

2. **Высокая производительность**
   - Lazy loading (загрузка по требованию)
   - Оптимизированные запросы
   - Асинхронные операции

3. **Реактивность**
   - Автоматическое обновление UI при изменении данных
   - Подписка на изменения (`observe()`)
   - Интеграция с React Hooks

4. **Масштабируемость**
   - Работает с тысячами записей
   - Поддержка индексов
   - Эффективное использование памяти

### ⚠️ Особенности:

- Нужно определять схему заранее
- Миграции при изменении структуры
- Нельзя использовать произвольные SQL запросы (только API)

---

## 🗺 Схема базы данных

### Версия схемы: **4**

```
┌─────────────────────────────────────────────────────────────┐
│                         ПОЛЬЗОВАТЕЛИ                         │
│  ┌──────────┐                                                │
│  │  users   │                                                │
│  │  (User)  │                                                │
│  └──────────┘                                                │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ userId (foreign key)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                      ФИНАНСОВЫЕ СЧЕТА                        │
│  ┌─────────────┐                                             │
│  │  accounts   │  Карты, наличные, сбережения, долги        │
│  │  (Account)  │  • name, balance, currency, type           │
│  └─────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
         │                    │
         │ accountId          │ accountId
         ↓                    ↓
┌──────────────────┐    ┌──────────────────┐
│  transactions    │    │      debts       │
│  (Transaction)   │    │      (Debt)      │
│  • amount        │    │  • amount        │
│  • date          │    │  • dueDate       │
│  • type          │    │  • description   │
│  • categoryId    │    └──────────────────┘
└──────────────────┘
         │
         │ categoryId
         ↓
┌──────────────────┐
│   categories     │
│   (Category)     │
│  • name, icon    │
│  • color, type   │
└──────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    ФИНАНСОВЫЕ ЦЕЛИ                            │
│  ┌──────────────┐        ┌────────────────────┐              │
│  │    goals     │        │  goal_transfers    │              │
│  │    (Goal)    │───────▶│  (GoalTransfer)    │              │
│  │ • targetAmount│        │  • amount          │              │
│  │ • currentAmount        │  • date            │              │
│  └──────────────┘        └────────────────────┘              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    КУРСЫ ВАЛЮТ                                │
│  ┌──────────────────┐                                         │
│  │ exchange_rates   │                                         │
│  │ (ExchangeRate)   │                                         │
│  │ • from_currency  │                                         │
│  │ • to_currency    │                                         │
│  │ • rate           │                                         │
│  │ • updated_at     │                                         │
│  └──────────────────┘                                         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    НАСТРОЙКИ И СИНХРОНИЗАЦИЯ                  │
│  ┌────────────────┐      ┌──────────────────┐                │
│  │   settings     │      │  sync_metadata   │                │
│  │   (Setting)    │      │  (SyncMetadata)  │                │
│  │  • key, value  │      │  • lastSyncAt    │                │
│  └────────────────┘      └──────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 Список всех таблиц и моделей

| # | Таблица | Модель | Описание | Связи |
|---|---------|--------|----------|-------|
| 1 | `users` | User | Пользователи | → accounts |
| 2 | `accounts` | Account | Счета (карты, наличные, сбережения) | ← user, → transactions, → debts |
| 3 | `transactions` | Transaction | Транзакции (доходы, расходы, переводы) | ← account, ← category |
| 4 | `categories` | Category | Категории транзакций | → transactions |
| 5 | `debts` | Debt | Долги и кредиты | ← account |
| 6 | `goals` | Goal | Финансовые цели | → goal_transfers |
| 7 | `goal_transfers` | GoalTransfer | Переводы на цели | ← goal |
| 8 | `exchange_rates` | ExchangeRate | Курсы валют | - |
| 9 | `settings` | Setting | Настройки приложения | - |
| 10 | `sync_metadata` | SyncMetadata | Метаданные синхронизации | - |

---

## 🔍 Детальное описание моделей

### 1️⃣ User (Пользователь)

```typescript
// src/database/models/User.ts
@tableSchema({
  name: 'users',
  columns: [
    { name: 'email', type: 'string' },
    { name: 'name', type: 'string', isOptional: true },
    { name: 'google_id', type: 'string', isOptional: true },
    { name: 'is_guest', type: 'boolean' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ]
})
```

**Поля:**
- `email` - Email пользователя
- `name` - Имя пользователя
- `google_id` - ID Google аккаунта (для OAuth)
- `is_guest` - Гостевой режим?
- `created_at` - Дата создания
- `updated_at` - Дата обновления

**Связи:**
- `accounts` - Has many (у пользователя много счетов)

---

### 2️⃣ Account (Счет)

```typescript
@tableSchema({
  name: 'accounts',
  columns: [
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'name', type: 'string' },
    { name: 'balance', type: 'number' },
    { name: 'currency', type: 'string' },
    { name: 'type', type: 'string' }, // 'card', 'cash', 'savings', 'debt', 'credit'
    { name: 'icon', type: 'string', isOptional: true },
    { name: 'color', type: 'string', isOptional: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ]
})
```

**Поля:**
- `user_id` - ID владельца счета
- `name` - Название счета ("Моя карта")
- `balance` - Текущий баланс
- `currency` - Валюта счета (USD, EUR, RUB...)
- `type` - Тип счета (card/cash/savings/debt/credit)
- `icon` - Иконка (Ionicons name)
- `color` - Цвет в UI

**Связи:**
- `user` - Belongs to (принадлежит пользователю)
- `transactions` - Has many (много транзакций)
- `debts` - Has many (много долгов)

---

### 3️⃣ Transaction (Транзакция)

```typescript
@tableSchema({
  name: 'transactions',
  columns: [
    { name: 'account_id', type: 'string', isIndexed: true },
    { name: 'category_id', type: 'string', isIndexed: true, isOptional: true },
    { name: 'amount', type: 'number' },
    { name: 'type', type: 'string' }, // 'income', 'expense', 'transfer'
    { name: 'date', type: 'number' },
    { name: 'description', type: 'string', isOptional: true },
    { name: 'to_account_id', type: 'string', isOptional: true }, // Для переводов
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ]
})
```

**Поля:**
- `account_id` - ID счета
- `category_id` - ID категории
- `amount` - Сумма транзакции
- `type` - Тип (income/expense/transfer)
- `date` - Дата транзакции
- `description` - Описание
- `to_account_id` - ID счета назначения (для переводов)

**Связи:**
- `account` - Belongs to (принадлежит счету)
- `category` - Belongs to (принадлежит категории)

---

### 4️⃣ Category (Категория)

```typescript
@tableSchema({
  name: 'categories',
  columns: [
    { name: 'name', type: 'string' },
    { name: 'icon', type: 'string' },
    { name: 'color', type: 'string' },
    { name: 'type', type: 'string' }, // 'income' или 'expense'
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ]
})
```

**Поля:**
- `name` - Название категории
- `icon` - Иконка (Ionicons name)
- `color` - Цвет категории
- `type` - Тип (income/expense)

**Связи:**
- `transactions` - Has many (много транзакций)

---

### 5️⃣ ExchangeRate (Курс валют)

```typescript
@tableSchema({
  name: 'exchange_rates',
  columns: [
    { name: 'from_currency', type: 'string', isIndexed: true },
    { name: 'to_currency', type: 'string', isIndexed: true },
    { name: 'rate', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ]
})
```

**Поля:**
- `from_currency` - Исходная валюта (USD)
- `to_currency` - Целевая валюта (EUR)
- `rate` - Курс (0.92)
- `updated_at` - Время обновления

---

## 🔄 Жизненный цикл данных

### Создание записи:

```
1. Пользователь заполняет форму
   ↓
2. Вызывается метод сервиса (например, createAccount())
   ↓
3. LocalDatabaseService обращается к WatermelonDB
   ↓
4. WatermelonDB создает запись в SQLite
   ↓
5. Observable уведомляет подписчиков
   ↓
6. React компоненты автоматически обновляются
```

### Чтение данных:

```
1. Компонент монтируется
   ↓
2. useEffect() вызывает метод загрузки данных
   ↓
3. LocalDatabaseService.getAccounts()
   ↓
4. WatermelonDB выполняет query к SQLite
   ↓
5. Возвращает массив моделей
   ↓
6. Сохраняется в state или Context
   ↓
7. Рендерится в UI
```

### Обновление данных:

```
1. Пользователь редактирует данные
   ↓
2. Вызывается метод обновления
   ↓
3. WatermelonDB.update() в транзакции
   ↓
4. SQLite обновляет строку
   ↓
5. Observable триггерит ре-рендер
```

---

## 📊 Примеры запросов

### Получение всех счетов:

```typescript
// В LocalDatabaseService
async getAccounts(): Promise<Account[]> {
  const accounts = await database.collections
    .get<Account>('accounts')
    .query()
    .fetch();

  return accounts;
}
```

### Получение транзакций счета:

```typescript
async getAccountTransactions(accountId: string): Promise<Transaction[]> {
  const transactions = await database.collections
    .get<Transaction>('transactions')
    .query(
      Q.where('account_id', accountId),
      Q.sortBy('date', Q.desc)
    )
    .fetch();

  return transactions;
}
```

### Фильтрация по дате:

```typescript
async getTransactionsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> {
  const transactions = await database.collections
    .get<Transaction>('transactions')
    .query(
      Q.where('date', Q.gte(startDate.getTime())),
      Q.where('date', Q.lte(endDate.getTime())),
      Q.sortBy('date', Q.desc)
    )
    .fetch();

  return transactions;
}
```

### Подсчет суммы:

```typescript
// Доходы за месяц
const transactions = await database.collections
  .get<Transaction>('transactions')
  .query(
    Q.where('type', 'income'),
    Q.where('date', Q.gte(startOfMonth)),
    Q.where('date', Q.lte(endOfMonth))
  )
  .fetch();

const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
```

---

## 🔧 Инициализация базы данных

**Файл:** `src/database/index.ts`

```typescript
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import { Account, Transaction, Category, Debt, Goal, ... } from './models';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // JSI для лучшей производительности
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Account,
    Transaction,
    Category,
    Debt,
    Goal,
    GoalTransfer,
    ExchangeRate,
    User,
    Setting,
    SyncMetadata,
  ],
});
```

---

## 🔄 Миграции

При изменении схемы БД нужно создать миграцию.

**Пример миграции:**

```typescript
// src/database/schema.ts
export const schema = appSchema({
  version: 4, // Увеличили версию с 3 до 4
  tables: [
    // ... таблицы
  ]
});

// Миграции
export const migrations = schemaMigrations({
  migrations: [
    // Миграция с версии 3 на 4
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'accounts',
          columns: [
            { name: 'color', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
```

---

## ⚡ Оптимизация производительности

### 1. Индексы:

```typescript
columns: [
  { name: 'account_id', type: 'string', isIndexed: true }, // Быстрый поиск
]
```

### 2. Lazy loading:

```typescript
// ❌ Плохо - загружает все сразу
const accounts = await database.collections.get('accounts').query().fetch();

// ✅ Хорошо - загружает по мере необходимости
const accounts$ = database.collections.get('accounts').query().observe();
```

### 3. Batch операции:

```typescript
await database.write(async () => {
  // Все операции в одной транзакции
  await account1.update(/* ... */);
  await account2.update(/* ... */);
  await transaction1.update(/* ... */);
});
```

---

## 📚 Подробная документация

- [[08-Database/WatermelonDB|WatermelonDB - Детали]]
- [[08-Database/Models|Модели данных]]
- [[08-Database/Migrations|Миграции схемы]]
- [[08-Database/Queries|Запросы и фильтры]]

---

[[08-Database/WatermelonDB|Следующая: WatermelonDB →]]

[[README|← Назад к содержанию]]
