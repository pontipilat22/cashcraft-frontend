# 📁 Структура проекта CashCraft

[[README|← Назад к содержанию]]

---

## 🌳 Дерево файлов

```
cashcraft3/
├── 📱 android/                    # Android нативный код
│   └── app/
│       ├── build.gradle          # Конфигурация сборки Android
│       └── src/main/
│           └── AndroidManifest.xml  # Манифест приложения
│
├── 📚 docs/                       # Документация (Obsidian)
│   ├── README.md                 # Главная страница документации
│   ├── 01-Getting-Started/       # Начало работы
│   ├── 02-Architecture/          # Архитектура
│   ├── 03-Screens/               # Документация экранов
│   ├── 04-Components/            # Документация компонентов
│   ├── 05-Services/              # Документация сервисов
│   ├── 06-Context/               # Документация контекстов
│   ├── 07-Navigation/            # Документация навигации
│   ├── 08-Database/              # Документация БД
│   ├── 09-Configuration/         # Конфигурация
│   └── 10-API/                   # API документация
│
├── 💻 src/                        # Исходный код приложения
│   │
│   ├── 📱 screens/                # Экраны приложения
│   │   ├── AccountsScreen.tsx    # Экран счетов
│   │   ├── TransactionsScreen.tsx # Экран транзакций
│   │   ├── MoreScreen.tsx        # Экран настроек
│   │   ├── SubscriptionScreen.tsx # Экран подписки
│   │   ├── StatisticsScreen.tsx  # Экран статистики
│   │   ├── CategoriesScreen.tsx  # Экран категорий
│   │   ├── AIAssistantScreen.tsx # AI помощник
│   │   └── ...                   # Другие экраны
│   │
│   ├── 🧩 components/             # Переиспользуемые компоненты
│   │   ├── ads/                  # Рекламные компоненты
│   │   │   ├── BannerAd.tsx      # Баннерная реклама
│   │   │   └── ...
│   │   ├── AccountCard.tsx       # Карточка счета
│   │   ├── TransactionItem.tsx   # Элемент транзакции
│   │   ├── BalanceHeader.tsx     # Заголовок с балансом
│   │   ├── FABMenu.tsx           # Плавающее меню
│   │   ├── AddAccountModal.tsx   # Модалка добавления счета
│   │   ├── AddTransactionModal.tsx # Модалка транзакции
│   │   └── ...                   # Другие компоненты
│   │
│   ├── 🔌 services/               # Бизнес-логика и API
│   │   ├── api.ts                # Основной API сервис
│   │   ├── exchangeRate.ts       # Сервис курсов валют
│   │   ├── AdService.ts          # Сервис управления рекламой
│   │   ├── auth.ts               # Сервис аутентификации
│   │   ├── localDatabase.ts      # Сервис локальной БД
│   │   ├── cloudSync.ts          # Сервис синхронизации
│   │   └── i18n.ts               # Сервис локализации
│   │
│   ├── 🎯 context/                # React Context (состояние)
│   │   ├── AuthContext.tsx       # Контекст аутентификации
│   │   ├── DataContext.tsx       # Контекст данных приложения
│   │   ├── ThemeContext.tsx      # Контекст темы
│   │   ├── CurrencyContext.tsx   # Контекст валют
│   │   ├── LocalizationContext.tsx # Контекст локализации
│   │   ├── SubscriptionContext.tsx # Контекст подписки
│   │   ├── BudgetContext.tsx     # Контекст бюджетов
│   │   └── FABContext.tsx        # Контекст FAB меню
│   │
│   ├── 🧭 navigation/             # Навигация между экранами
│   │   ├── BottomTabNavigator.tsx # Нижняя навигация
│   │   ├── AccountsNavigator.tsx  # Stack навигация счетов
│   │   ├── PlansNavigator.tsx     # Stack навигация планов
│   │   ├── MoreNavigator.tsx      # Stack навигация настроек
│   │   └── BottomTabNavigatorWrapper.tsx # Обёртка с FAB
│   │
│   ├── 🗄 database/               # WatermelonDB
│   │   ├── index.ts              # Инициализация БД
│   │   ├── schema.ts             # Схема базы данных
│   │   └── models/               # Модели данных
│   │       ├── Account.ts        # Модель счета
│   │       ├── Transaction.ts    # Модель транзакции
│   │       ├── Category.ts       # Модель категории
│   │       ├── Debt.ts           # Модель долга
│   │       ├── Goal.ts           # Модель цели
│   │       ├── ExchangeRate.ts   # Модель курса валют
│   │       ├── User.ts           # Модель пользователя
│   │       └── index.ts          # Экспорт всех моделей
│   │
│   ├── 🪝 hooks/                  # Custom React Hooks
│   │   ├── useInterstitialAd.ts  # Хук для interstitial рекламы
│   │   ├── useBannerAd.ts        # Хук для banner рекламы
│   │   └── ...
│   │
│   ├── ⚙️ config/                 # Конфигурационные файлы
│   │   ├── admob.config.ts       # Конфигурация AdMob
│   │   ├── currencies.ts         # Список валют
│   │   └── subscription.config.ts # Конфигурация подписок
│   │
│   ├── 🎨 styles/                 # Глобальные стили
│   │   └── colors.ts             # Цветовая палитра
│   │
│   ├── 🛠 utils/                  # Вспомогательные функции
│   │   ├── encryption.ts         # Шифрование данных
│   │   ├── formatters.ts         # Форматирование (даты, числа)
│   │   └── ...
│   │
│   ├── 📝 types/                  # TypeScript типы
│   │   └── index.ts              # Общие типы проекта
│   │
│   └── App.tsx                   # Главный компонент приложения
│
├── 📦 assets/                     # Статичные ресурсы
│   ├── icon.png                  # Иконка приложения
│   ├── adaptive-icon.png         # Adaptive icon (Android)
│   ├── splash-icon1.png          # Splash screen
│   └── fonts/                    # Кастомные шрифты
│
├── ⚙️ Конфигурационные файлы (корень проекта)
│   ├── app.json                  # Конфигурация Expo
│   ├── eas.json                  # Конфигурация EAS Build
│   ├── package.json              # Зависимости проекта
│   ├── tsconfig.json             # Конфигурация TypeScript
│   ├── metro.config.js           # Конфигурация Metro Bundler
│   └── babel.config.js           # Конфигурация Babel
│
└── 🚀 backend/                    # Backend сервер (Node.js)
    ├── src/
    │   ├── controllers/          # Контроллеры API
    │   ├── models/               # Модели базы данных
    │   ├── routes/               # Маршруты API
    │   ├── services/             # Бизнес-логика
    │   └── index.ts              # Точка входа сервера
    ├── package.json
    └── Dockerfile                # Docker для деплоя
```

---

## 📂 Детальное описание папок

### 📱 `src/screens/` - Экраны

Каждый экран - это **отдельная страница** приложения, которую видит пользователь.

**Основные экраны:**

| Файл | Описание | Навигация |
|------|----------|-----------|
| `AccountsScreen.tsx` | Список счетов (карты, наличные, сбережения) | Tab: Счета |
| `TransactionsScreen.tsx` | Список всех транзакций | Tab: Транзакции |
| `StatisticsScreen.tsx` | Графики и статистика | Tab: Планы |
| `MoreScreen.tsx` | Настройки и доп. функции | Tab: Еще |
| `SubscriptionScreen.tsx` | Premium подписка | Modal |
| `CategoriesScreen.tsx` | Управление категориями | Modal |
| `AIAssistantScreen.tsx` | AI помощник (пока отключен) | Stack |

**Правило:** Один экран = один файл. Не смешивайте логику разных экранов.

---

### 🧩 `src/components/` - Компоненты

Переиспользуемые части UI, которые используются в разных экранах.

**Типы компонентов:**

#### **1. UI компоненты** (визуальные элементы)
- `AccountCard.tsx` - Карточка счета
- `TransactionItem.tsx` - Элемент транзакции в списке
- `BalanceHeader.tsx` - Заголовок с балансом
- `StatisticsCard.tsx` - Карточка статистики
- `CategoryIcon.tsx` - Иконка категории
- `FABMenu.tsx` - Плавающая кнопка меню

#### **2. Модальные окна** (всплывающие формы)
- `AddAccountModal.tsx` - Добавление счета
- `AddTransactionModal.tsx` - Добавление транзакции
- `EditAccountModal.tsx` - Редактирование счета
- `TransferModal.tsx` - Перевод между счетами
- `AddGoalModal.tsx` - Добавление цели

#### **3. Рекламные компоненты** (`ads/`)
- `BannerAd.tsx` - Баннерная реклама (AdMob)

**Правило:** Если элемент используется >1 раза - выносим в компонент.

---

### 🔌 `src/services/` - Сервисы

**Сервисы** - это классы/функции для работы с данными, API, внешними системами.

| Файл | Назначение | Основные методы |
|------|-----------|-----------------|
| `api.ts` | Работа с backend API | `get()`, `post()`, `put()`, `delete()` |
| `exchangeRate.ts` | Курсы валют | `getRate()`, `convert()`, `forceUpdateRate()` |
| `AdService.ts` | Управление рекламой | `shouldShowInterstitial()`, `markInterstitialShown()` |
| `auth.ts` | Аутентификация | `login()`, `logout()`, `googleSignIn()` |
| `localDatabase.ts` | Локальная БД | `getAccounts()`, `createTransaction()` |
| `cloudSync.ts` | Синхронизация | `syncUp()`, `syncDown()` |
| `i18n.ts` | Локализация | `t()`, `getCurrentLanguage()` |

**Правило:** Вся бизнес-логика - в сервисах, не в компонентах.

---

### 🎯 `src/context/` - Контексты (состояние)

**Context API** - это способ **передать данные всем компонентам** без prop drilling.

**Иерархия контекстов:**
```
ThemeProvider
  └─ LocalizationProvider
      └─ CurrencyProvider
          └─ AuthProvider
              └─ SubscriptionProvider
                  └─ DataProvider
                      └─ Остальные компоненты
```

| Контекст | За что отвечает | Данные |
|----------|----------------|--------|
| `AuthContext` | Авторизация | `user`, `isAuthenticated`, `login()`, `logout()` |
| `DataContext` | Данные приложения | `accounts`, `transactions`, `categories` |
| `ThemeContext` | Тема оформления | `colors`, `isDark`, `toggleTheme()` |
| `CurrencyContext` | Валюты | `defaultCurrency`, `exchangeRates` |
| `LocalizationContext` | Язык интерфейса | `t()`, `currentLanguage`, `setLanguage()` |
| `SubscriptionContext` | Premium подписка | `isPremium`, `subscribe()` |
| `BudgetContext` | Бюджеты | `isEnabled`, `dailyAllowance` |
| `FABContext` | FAB меню | `isFABMenuOpen`, `toggleFABMenu()` |

**Правило:** Используйте контекст для **глобального состояния**, локальное - в `useState`.

---

### 🧭 `src/navigation/` - Навигация

**Навигаторы** управляют переходами между экранами.

#### **Структура навигации:**

```
BottomTabNavigatorWrapper (обертка с FAB)
  └─ BottomTabNavigator (нижняя панель)
      ├─ Tab: Счета (AccountsNavigator)
      │   ├─ AccountsMain
      │   ├─ AccountDetails
      │   └─ TransactionDetails
      │
      ├─ Tab: Транзакции (TransactionsScreen)
      │
      ├─ Tab: Планы (PlansNavigator)
      │   ├─ StatisticsScreen
      │   └─ GoalsScreen
      │
      └─ Tab: Еще (MoreNavigator)
          ├─ MoreMain
          ├─ Settings
          ├─ Help
          └─ AIAssistant (пока отключен)
```

**Типы навигаторов:**
- **Bottom Tab** - нижние вкладки (4 шт)
- **Stack** - стек экранов внутри каждой вкладки

---

### 🗄 `src/database/` - База данных

**WatermelonDB** - локальная БД на основе SQLite.

#### **Модели данных:**

| Модель | Таблица | Поля | Связи |
|--------|---------|------|-------|
| `Account` | `accounts` | id, name, balance, currency | → transactions |
| `Transaction` | `transactions` | id, amount, date, type | ← account, ← category |
| `Category` | `categories` | id, name, icon, color | → transactions |
| `Debt` | `debts` | id, amount, dueDate | ← account |
| `Goal` | `goals` | id, targetAmount, currentAmount | - |
| `ExchangeRate` | `exchange_rates` | from, to, rate, updatedAt | - |
| `User` | `users` | id, email, name | - |
| `Setting` | `settings` | key, value | - |

**Схема (версия 4):**
```typescript
// src/database/schema.ts
export const schema = appSchema({
  version: 4,
  tables: [
    tableSchema({
      name: 'accounts',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'balance', type: 'number' },
        { name: 'currency', type: 'string' },
        // ...
      ]
    }),
    // ...
  ]
})
```

---

### ⚙️ `src/config/` - Конфигурация

**Конфиги** содержат настройки, константы, API ключи.

| Файл | Содержимое |
|------|-----------|
| `admob.config.ts` | AdMob ID для banner, interstitial |
| `currencies.ts` | Список валют (USD, EUR, RUB...) |
| `subscription.config.ts` | SKU подписок, цены |

**Пример:**
```typescript
// admob.config.ts
export const AdMobConfig = {
  banner: 'ca-app-pub-8853061795959758/9297826581',
  interstitial: 'ca-app-pub-8853061795959758/5043365733',
}
```

---

### 🪝 `src/hooks/` - Custom Hooks

**Хуки** - переиспользуемая логика для компонентов.

| Хук | Назначение |
|-----|-----------|
| `useInterstitialAd.ts` | Показ interstitial рекламы |
| `useBannerAd.ts` | Показ banner рекламы |

**Правило:** Если логика повторяется - создаём хук.

---

## 🗂 Конфигурационные файлы (корень)

### `app.json` - Конфигурация Expo
```json
{
  "expo": {
    "name": "Cashcraft",
    "version": "1.0.1",
    "android": {
      "package": "com.pontipilat.cashcraft",
      "versionCode": 4
    }
  }
}
```

### `package.json` - Зависимости
```json
{
  "dependencies": {
    "react-native": "0.76.5",
    "expo": "~52.0.0",
    "@nozbe/watermelondb": "^0.27.1"
  }
}
```

### `tsconfig.json` - TypeScript
```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true
  }
}
```

---

## 📊 Диаграмма зависимостей

```
App.tsx
  ├─ Providers (Context)
  │   ├─ ThemeProvider
  │   ├─ AuthProvider
  │   └─ DataProvider
  │       └─ Services
  │           ├─ LocalDatabaseService
  │           ├─ ApiService
  │           └─ ExchangeRateService
  │               └─ Database
  │                   └─ WatermelonDB
  │
  └─ Navigation
      └─ BottomTabNavigator
          ├─ Screens
          │   └─ Components
          │
          └─ Hooks
```

---

## 🎯 Правила организации кода

### ✅ Хорошо:
- Один компонент = один файл
- Названия файлов = названию компонента (`AccountCard.tsx`)
- Группировка по функциональности (screens, components, services)

### ❌ Плохо:
- Миксить логику и UI в одном файле
- Дублировать код
- Хранить бизнес-логику в компонентах

---

[[02-Architecture/Overview|Следующая: Обзор архитектуры →]]

[[README|← Назад к содержанию]]
