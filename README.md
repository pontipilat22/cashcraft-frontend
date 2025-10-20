# Cashcraft - Мобильное приложение для управления финансами

**React Native / Expo приложение для персонального учета финансов с поддержкой множества валют**

## Содержание

- [Обзор проекта](#обзор-проекта)
- [Основные возможности](#основные-возможности)
- [Технологический стек](#технологический-стек)
- [Установка и запуск](#установка-и-запуск)
- [Структура проекта](#структура-проекта)
- [Архитектура](#архитектура)
- [Тестирование](#тестирование)
- [Разработка](#разработка)

---

## Обзор проекта

Cashcraft - это современное мобильное приложение для управления личными финансами, разработанное на React Native с использованием Expo. Приложение предоставляет полный набор инструментов для учета доходов, расходов, управления счетами в разных валютах, отслеживания целей и долгов.

### Ключевые преимущества

- **Offline-first** - все данные хранятся локально, работа без интернета
- **Мультивалютность** - поддержка множества валют с автоматической конвертацией
- **Синхронизация** - облачная синхронизация данных между устройствами
- **Гостевой режим** - полный функционал без регистрации
- **13 языков** - поддержка английского, русского, немецкого и других языков
- **Темная тема** - переключение между светлой и темной темами

---

## Основные возможности

### Управление счетами
- Создание неограниченного количества счетов (наличные, карты, вклады)
- Каждый счет имеет свою валюту
- Автоматический расчет общего баланса с учетом курсов валют
- Переводы между счетами с автоматической конвертацией

### Учет транзакций
- Категоризация доходов и расходов
- Пользовательские категории с иконками
- Фильтрация по датам, категориям, счетам
- Массовые операции (удаление, перемещение)
- История всех операций

### Цели и накопления
- Создание целей накоплений
- Отслеживание прогресса
- Привязка к конкретным счетам
- Визуализация достижения целей

### Управление долгами
- Учет займов (выданных и полученных)
- Отслеживание сроков возврата
- История операций по долгам
- Напоминания о платежах

### Статистика и аналитика
- Графики доходов и расходов
- Аналитика по категориям
- Динамика изменения баланса
- Экспорт данных

### Безопасность
- Шифрование чувствительных данных
- Авторизация через Google
- Локальное хранение данных
- Защита PIN-кодом (в разработке)

---

## Технологический стек

### Frontend
- **React Native** (0.76.6) - кросс-платформенная разработка
- **Expo** (52.0.21) - инструменты разработки и сборки
- **TypeScript** - типизация кода
- **React Navigation** - навигация в приложении

### База данных
- **WatermelonDB** - локальная SQLite база данных
- **Schema Version**: 4
- **Модели**: Account, Transaction, Category, Debt, Goal, GoalTransfer, ExchangeRate, Setting, SyncMetadata

### State Management
- **React Context API** - глобальное состояние
- **AuthContext** - аутентификация
- **DataContext** - данные приложения
- **ThemeContext** - темы оформления
- **CurrencyContext** - валюты и курсы
- **LocalizationContext** - локализация
- **SubscriptionContext** - подписки и премиум

### UI/UX
- **Expo Vector Icons** - иконки
- **React Native Paper** - UI компоненты
- **React Native Gesture Handler** - жесты
- **React Native Reanimated** - анимации

### Сервисы
- **Google Sign-In** - авторизация через Google
- **Expo Secure Store** - безопасное хранение токенов
- **AsyncStorage** - локальное хранилище
- **Expo Crypto** - криптографические функции

### Тестирование
- **Jest** (29.7.0) - фреймворк тестирования
- **React Native Testing Library** (12.4.3) - тестирование компонентов
- **Покрытие**: 55% (47 из 86 тестов)

---

## Установка и запуск

### Требования
- Node.js 18+
- npm или yarn
- Expo CLI
- Android Studio (для Android) или Xcode (для iOS)

### Установка зависимостей

```bash
npm install
```

### Команды запуска

```bash
# Запуск Expo dev server
npm start

# Запуск с очисткой кэша
npm run start:clear

# Запуск с фиксом для Windows с кириллицей в пути
npm run start:fix

# Запуск на Android
npm run android

# Запуск на iOS
npm run ios

# Запуск веб-версии
npm run web
```

### Тестирование

```bash
# Запуск всех тестов
npm test

# Запуск тестов с отчетом о покрытии
npm run test:coverage

# Запуск в watch режиме
npm run test:watch

# CI режим
npm run test:ci
```

---

## Структура проекта

```
cashcraft3/
├── src/
│   ├── screens/              # Экраны приложения
│   │   ├── AuthScreen.tsx
│   │   ├── AccountsScreen.tsx
│   │   ├── TransactionsScreen.tsx
│   │   ├── CategoriesScreen.tsx
│   │   ├── DebtsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── ...
│   │
│   ├── components/           # UI компоненты
│   │   ├── AccountCard.tsx
│   │   ├── TransactionItem.tsx
│   │   ├── BalanceHeader.tsx
│   │   ├── StatisticsCard.tsx
│   │   ├── FABMenu.tsx
│   │   └── modals/
│   │       ├── AddTransactionModal.tsx
│   │       ├── EditTransactionModal.tsx
│   │       ├── TransferModal.tsx
│   │       └── ...
│   │
│   ├── navigation/           # Навигация
│   │   ├── BottomTabNavigator.tsx
│   │   └── PlansNavigator.tsx
│   │
│   ├── context/              # React Contexts
│   │   ├── AuthContext.tsx
│   │   ├── DataContext.tsx
│   │   ├── ThemeContext.tsx
│   │   ├── CurrencyContext.tsx
│   │   ├── LocalizationContext.tsx
│   │   ├── SubscriptionContext.tsx
│   │   └── BudgetContext.tsx
│   │
│   ├── database/             # База данных
│   │   ├── index.ts          # Инициализация БД
│   │   ├── schema.ts         # Схема БД
│   │   ├── migrations.ts     # Миграции
│   │   └── models/           # Модели данных
│   │       ├── Account.ts
│   │       ├── Transaction.ts
│   │       ├── Category.ts
│   │       ├── Debt.ts
│   │       ├── Goal.ts
│   │       └── ...
│   │
│   ├── services/             # Сервисы
│   │   ├── api.ts            # API клиент
│   │   ├── auth.ts           # Аутентификация
│   │   ├── watermelonDatabase.ts  # Сервис БД
│   │   ├── exchangeRate.ts   # Курсы валют
│   │   └── cloudSync.ts      # Синхронизация
│   │
│   ├── utils/                # Утилиты
│   │   ├── encryption.ts     # Шифрование
│   │   ├── categoryUtils.ts  # Работа с категориями
│   │   ├── formatters.ts     # Форматирование
│   │   └── ...
│   │
│   ├── locales/              # Переводы
│   │   ├── en.ts
│   │   ├── ru.ts
│   │   ├── de.ts
│   │   └── ...
│   │
│   ├── types/                # TypeScript типы
│   │   └── index.ts
│   │
│   ├── hooks/                # Custom React hooks
│   │   └── useDatePickerProtection.ts
│   │
│   └── test-utils.tsx        # Утилиты для тестов
│
├── android/                  # Android конфигурация
├── assets/                   # Ресурсы (иконки, изображения)
├── scripts/                  # Скрипты
├── App.tsx                   # Главный компонент
├── app.json                  # Expo конфигурация
├── package.json              # Зависимости
├── tsconfig.json             # TypeScript конфигурация
├── babel.config.js           # Babel конфигурация
├── metro.config.js           # Metro bundler конфигурация
├── jest.config.js            # Jest конфигурация
├── jest.setup.js             # Jest setup
└── eas.json                  # EAS Build конфигурация
```

---

## Архитектура

### Иерархия Context Providers

```
App.tsx
└── ThemeProvider
    └── LocalizationProvider
        └── CurrencyProvider
            └── AuthProvider
                └── AppContent (условный рендеринг)
                    └── SubscriptionProvider
                        └── DataProvider
                            └── BudgetProvider
                                └── Navigation
```

### Слои приложения

#### 1. Presentation Layer (Screens & Components)
- Экраны приложения (`src/screens/`)
- UI компоненты (`src/components/`)
- Модальные окна (`src/components/*Modal.tsx`)

#### 2. State Management Layer
- Context API для глобального состояния
- Custom hooks для локального состояния
- React Query для асинхронных данных (в планах)

#### 3. Business Logic Layer
- Сервисы (`src/services/`)
- Утилиты (`src/utils/`)
- Валидация и трансформация данных

#### 4. Data Layer
- WatermelonDB - локальная база данных
- API клиент для облачной синхронизации
- Secure Storage для чувствительных данных

### Модели базы данных

#### Account (Счет)
```typescript
{
  id: string
  name: string
  balance: number
  currency: string
  type: 'cash' | 'card' | 'savings' | 'investment'
  icon: string
  color: string
  isArchived: boolean
  created_at: number
  updated_at: number
}
```

#### Transaction (Транзакция)
```typescript
{
  id: string
  account_id: string
  category_id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  description: string
  date: number
  created_at: number
  updated_at: number
}
```

#### Category (Категория)
```typescript
{
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
  is_custom: boolean
  created_at: number
  updated_at: number
}
```

#### Debt (Долг)
```typescript
{
  id: string
  name: string
  amount: number
  type: 'give' | 'borrow'
  currency: string
  due_date: number
  is_paid: boolean
  created_at: number
  updated_at: number
}
```

#### Goal (Цель)
```typescript
{
  id: string
  name: string
  target_amount: number
  current_amount: number
  currency: string
  deadline: number
  account_id: string
  created_at: number
  updated_at: number
}
```

### Ключевые функции

#### 1. Мультивалютность

**Конвертация валют**
```typescript
// src/services/exchangeRate.ts
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number>
```

**Получение курса валюты**
```typescript
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null>
```

#### 2. Система переводов

**Перевод между счетами**
```typescript
// src/context/DataContext.tsx
const createTransfer = async (
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description?: string
) => {
  // 1. Создать транзакцию расхода на счете отправителя
  // 2. Создать транзакцию дохода на счете получателя
  // 3. Связать транзакции через transfer_id
  // 4. Выполнить конвертацию валют если нужно
}
```

#### 3. Синхронизация данных

**Облачная синхронизация**
```typescript
// src/services/cloudSync.ts
export async function syncData() {
  // 1. Получить изменения с сервера
  // 2. Применить изменения локально
  // 3. Отправить локальные изменения на сервер
  // 4. Разрешить конфликты
}
```

#### 4. Шифрование

**Инициализация шифрования**
```typescript
// src/utils/encryption.ts
export async function initialize() {
  // Генерация или получение ключа шифрования
}

export async function encrypt(text: string): Promise<string>
export async function decrypt(encrypted: string): Promise<string>
```

#### 5. Локализация

**Получение перевода**
```typescript
// src/context/LocalizationContext.tsx
const { t, locale, setLocale } = useLocalization()

t('accounts.totalBalance') // "Total Balance" или "Общий баланс"
```

**Поддерживаемые языки**
- Английский (en)
- Русский (ru)
- Немецкий (de)
- Французский (fr)
- Итальянский (it)
- Турецкий (tr)
- Польский (pl)
- Китайский (zh)
- Украинский (uk)
- Казахский (kk)
- Хинди (hi)
- Арабский (ar)
- Греческий (el)

---

## Тестирование

### Текущее покрытие

**Статистика**: 47 из 86 тестов (55%)

### Успешные тесты

#### Utils тесты
- `categoryUtils.test.ts` - 10/10 (100%)
- `encryption.test.ts` - 14/24 (58%)

#### Services тесты
- `exchangeRate.test.ts` - 6/7 (86%)

#### Components тесты
- `TransactionItem.test.tsx` - 9/13 (69%)
- `AccountCard.test.tsx` - 3/5 (60%)
- `BalanceHeader.test.tsx` - 4/10 (40%)
- `StatisticsCard.test.tsx` - 1/17 (6%)

### Конфигурация тестов

**jest.config.js**
```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|uuid)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
}
```

### Моки

В `jest.setup.js` настроены моки для:
- Expo модулей (expo-crypto, expo-secure-store, etc.)
- AsyncStorage
- React Native компонентов
- WatermelonDB
- Всех Context API

### Запуск тестов

```bash
# Все тесты
npm test

# Конкретный файл
npm test -- AccountCard.test.tsx

# С покрытием
npm run test:coverage

# В watch режиме
npm run test:watch
```

---

## Разработка

### Важные технические моменты

#### UUID Generation
WatermelonDB требует настройки генерации UUID. В `App.tsx` обязательно импортируется `react-native-get-random-values` перед всеми другими модулями.

```typescript
import 'react-native-get-random-values'
// Остальные импорты...
```

#### Проблема с кириллицей в путях (Windows)
Metro bundler настроен для работы с путями, содержащими кириллицу. Конфигурация в `metro.config.js` переопределяет обработку заголовков.

Используйте команду:
```bash
npm run start:fix
```

#### Миграции базы данных
При изменении схемы БД:
1. Увеличить версию в `src/database/schema.ts`
2. Добавить миграцию в `src/database/migrations.ts`
3. Тщательно протестировать (миграции могут привести к потере данных!)

```typescript
// Пример миграции
migrations: [
  {
    toVersion: 5,
    steps: [
      addColumns({
        table: 'accounts',
        columns: [
          { name: 'is_default', type: 'boolean', isOptional: true }
        ]
      })
    ]
  }
]
```

#### Context Dependencies
- `DataProvider` зависит от `CurrencyContext` и пересоздается при смене валюты
- `AuthContext` должен быть инициализирован до `DataContext`
- Все контексты используют cleanup в `useEffect`

#### Оптимизация производительности
- Списки транзакций используют оптимизированный рендеринг
- Транзакции-переводы группируются и отображаются особым образом
- Запросы к БД оптимизированы через индексы
- Обновления состояния батчатся для предотвращения лишних ре-рендеров

### Соглашения по коду

#### Naming Conventions
- **Components**: PascalCase (`AccountCard.tsx`)
- **Utilities**: camelCase (`formatAmount.ts`)
- **Screens**: PascalCase с суффиксом Screen (`AccountsScreen.tsx`)
- **Modals**: PascalCase с суффиксом Modal (`AddTransactionModal.tsx`)
- **Database Models**: PascalCase, совпадает с именем таблицы (`Account.ts`)

#### File Organization
- Модалы размещаются в `/components/` с суффиксом `Modal.tsx`
- Экраны размещаются в `/screens/` с суффиксом `Screen.tsx`
- Модели БД в `/database/models/` с именем класса как у таблицы

#### TypeScript
Все новые файлы должны использовать TypeScript с строгой типизацией.

### Workflow разработки

1. Локальная разработка использует только WatermelonDB
2. Аутентификация может работать в гостевом режиме
3. Тщательно тестируйте логику конвертации валют
4. Всегда тестируйте переводы между счетами с разными валютами
5. Проверяйте иерархию контекстов при добавлении нового глобального состояния

### Git Workflow

```bash
# Создание feature ветки
git checkout -b feature/new-feature

# Коммиты
git add .
git commit -m "feat: add new feature"

# Push
git push origin feature/new-feature
```

### Build и Deploy

#### EAS Build

```bash
# Установка EAS CLI
npm install -g eas-cli

# Login
eas login

# Build для Android
eas build --platform android

# Build для iOS
eas build --platform ios

# Submit в магазины
eas submit
```

#### Конфигурация EAS (eas.json)
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

---

## Roadmap

### В разработке
- [ ] Бюджетирование и планирование расходов
- [ ] Напоминания о платежах
- [ ] Экспорт данных в CSV/Excel
- [ ] Графики и визуализация данных
- [ ] PIN-код защита

### Запланировано
- [ ] Биометрическая аутентификация
- [ ] Сканирование чеков
- [ ] Интеграция с банками
- [ ] Семейные счета
- [ ] Web-версия приложения
- [ ] Push-уведомления
- [ ] Recurring транзакции

---

## Contributing

Приветствуются любые вклады в проект! Пожалуйста:

1. Fork проект
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

### Code Style
- Используйте TypeScript
- Следуйте существующим паттернам кода
- Добавляйте тесты для новой функциональности
- Обновляйте документацию

---

## License

Proprietary - Все права защищены

---

## Контакты

**Автор**: Pontipilat Team
**Email**: support@cashcraft.app
**Website**: https://cashcraft.app

---

## Acknowledgments

- React Native Team
- Expo Team
- WatermelonDB Contributors
- Все open-source библиотеки, используемые в проекте

---

**Последнее обновление документации**: 2025-10-20
