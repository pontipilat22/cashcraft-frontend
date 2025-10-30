# 🎯 Обзор Context API

[[README|← Назад к содержанию]]

---

## 📖 Что такое Context API?

**Context API** - встроенный механизм React для **глобального управления состоянием**. Позволяет передавать данные через все дерево компонентов без prop drilling.

### Без Context (Prop Drilling):
```typescript
<App user={user}>
  <Header user={user}>
    <Navigation user={user}>
      <UserMenu user={user} /> // 😫 Прокидываем через 4 уровня!
    </Navigation>
  </Header>
</App>
```

### С Context:
```typescript
<AuthProvider> {/* Данные доступны везде */}
  <App>
    <Header>
      <Navigation>
        <UserMenu /> {/* 😊 Просто используем useAuth() */}
      </Navigation>
    </Header>
  </App>
</AuthProvider>
```

---

## 🗺 Карта контекстов CashCraft

```
App.tsx
  │
  └─ ThemeProvider (тема оформления)
      │
      └─ LocalizationProvider (язык интерфейса)
          │
          └─ CurrencyProvider (валюты и курсы)
              │
              └─ AuthProvider (авторизация)
                  │
                  ├─ Если НЕ авторизован:
                  │   └─ LoginScreen
                  │
                  └─ Если авторизован:
                      │
                      └─ SubscriptionProvider (Premium)
                          │
                          └─ DataProvider (счета, транзакции)
                              │
                              ├─ BudgetProvider (бюджеты)
                              │
                              └─ FABProvider (FAB меню)
                                  │
                                  └─ Остальные компоненты
```

**Иерархия важна!** Каждый контекст может использовать данные из контекстов выше.

---

## 📋 Список всех контекстов

| № | Контекст | Файл | За что отвечает | Зависит от |
|---|----------|------|----------------|-----------|
| 1 | **ThemeContext** | `ThemeContext.tsx` | Светлая/темная тема | - |
| 2 | **LocalizationContext** | `LocalizationContext.tsx` | Язык интерфейса (13 языков) | - |
| 3 | **CurrencyContext** | `CurrencyContext.tsx` | Валюта по умолчанию, курсы | - |
| 4 | **AuthContext** | `AuthContext.tsx` | Пользователь, авторизация | - |
| 5 | **SubscriptionContext** | `SubscriptionContext.tsx` | Premium подписка | AuthContext |
| 6 | **DataContext** | `DataContext.tsx` | Счета, транзакции, категории | AuthContext, CurrencyContext |
| 7 | **BudgetContext** | `BudgetContext.tsx` | Бюджеты и лимиты | DataContext |
| 8 | **FABContext** | `FABContext.tsx` | FAB меню (кнопка +) | - |

---

## 🎨 Структура типичного контекста

Каждый контекст следует одному шаблону:

```typescript
// 1. Импорты
import React, { createContext, useContext, useState, useEffect } from 'react';

// 2. Типы
interface MyContextType {
  data: any[];
  loading: boolean;
  error: string | null;
  loadData: () => Promise<void>;
  updateData: (data: any) => Promise<void>;
}

// 3. Создание контекста
const MyContext = createContext<MyContextType | undefined>(undefined);

// 4. Provider компонент
export const MyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Состояние
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Эффекты (загрузка данных при монтировании)
  useEffect(() => {
    loadData();
  }, []);

  // Методы
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await SomeService.getData();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateData = async (newData: any) => {
    // Обновление данных
    await SomeService.updateData(newData);
    await loadData(); // Перезагрузка
  };

  // Значение контекста
  const value = {
    data,
    loading,
    error,
    loadData,
    updateData,
  };

  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
};

// 5. Хук для использования
export const useMyContext = () => {
  const context = useContext(MyContext);
  if (context === undefined) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
};
```

---

## 🔄 Жизненный цикл контекста

```
1. App.tsx монтируется
   ↓
2. ThemeProvider монтируется
   └─ useEffect() → Загружает тему из AsyncStorage
   ↓
3. LocalizationProvider монтируется
   └─ useEffect() → Загружает язык из AsyncStorage
   ↓
4. AuthProvider монтируется
   └─ useEffect() → Проверяет JWT токен
   ↓
5. Если авторизован:
   ├─ SubscriptionProvider монтируется
   │  └─ useEffect() → Проверяет статус Premium
   │
   └─ DataProvider монтируется
      └─ useEffect() → Загружает данные из WatermelonDB
   ↓
6. Компоненты получают доступ к данным через хуки:
   - useTheme()
   - useLocalization()
   - useAuth()
   - useData()
   ↓
7. Пользователь взаимодействует с приложением
   ↓
8. При изменении данных:
   - Вызывается метод контекста (например, createTransaction())
   - Обновляется состояние
   - React автоматически перерисовывает компоненты
```

---

## 🎯 Принципы проектирования

### 1️⃣ **Один контекст = одна область ответственности**

✅ **Хорошо:**
- `AuthContext` - **только** авторизация
- `ThemeContext` - **только** тема
- `DataContext` - **только** данные приложения

❌ **Плохо:**
- `AppContext` - авторизация + тема + данные + настройки

### 2️⃣ **Минимизируйте ре-рендеры**

```typescript
// ❌ Плохо - все компоненты перерисуются при любом изменении
const value = {
  user,
  theme,
  data,
  settings,
  // ... много данных
};

// ✅ Хорошо - разделяем на отдельные контексты
<AuthProvider>  {/* user */}
  <ThemeProvider>  {/* theme */}
    <DataProvider>  {/* data */}
      <SettingsProvider>  {/* settings */}
```

### 3️⃣ **Используйте useMemo для значений**

```typescript
// ✅ Хорошо - мемоизация предотвращает ненужные ре-рендеры
const value = useMemo(
  () => ({
    user,
    login,
    logout,
  }),
  [user] // Пересоздаем только когда user изменился
);
```

### 4️⃣ **Выносите сложную логику в сервисы**

```typescript
// ❌ Плохо - вся логика в контексте
const createAccount = async (data) => {
  const db = database;
  const collection = db.collections.get('accounts');
  const account = await collection.create(account => {
    account.name = data.name;
    // ... много логики
  });
};

// ✅ Хорошо - логика в сервисе
const createAccount = async (data) => {
  await LocalDatabaseService.createAccount(data);
  await reloadAccounts();
};
```

---

## 📊 Сравнение контекстов

| Контекст | Размер данных | Частота обновлений | Сложность |
|----------|--------------|-------------------|-----------|
| **ThemeContext** | Маленький | Редко | 🟢 Простая |
| **LocalizationContext** | Средний | Редко | 🟢 Простая |
| **AuthContext** | Маленький | Редко | 🟡 Средняя |
| **DataContext** | Большой | Часто | 🔴 Сложная |
| **SubscriptionContext** | Маленький | Редко | 🟡 Средняя |
| **CurrencyContext** | Средний | Редко | 🟡 Средняя |
| **BudgetContext** | Средний | Средне | 🟡 Средняя |
| **FABContext** | Маленький | Средне | 🟢 Простая |

---

## 🔗 Связи между контекстами

```
ThemeContext
  └─ Не зависит ни от кого

LocalizationContext
  └─ Не зависит ни от кого

CurrencyContext
  └─ Не зависит ни от кого

AuthContext
  └─ Не зависит ни от кого

SubscriptionContext
  ├─ Использует AuthContext (user)
  └─ Проверяет статус только для авторизованных

DataContext
  ├─ Использует AuthContext (user)
  ├─ Использует CurrencyContext (defaultCurrency)
  └─ Пересоздается при смене валюты

BudgetContext
  └─ Использует DataContext (transactions)

FABContext
  └─ Не зависит ни от кого
```

---

## 🎨 Использование контекстов в компонентах

### Пример 1: Простое использование

```typescript
// В компоненте
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const MyComponent = () => {
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>
        Привет, {user?.name}!
      </Text>
      <Button title="Выйти" onPress={logout} />
      <Button title="Сменить тему" onPress={toggleTheme} />
    </View>
  );
};
```

### Пример 2: Множественные контексты

```typescript
const AccountsScreen = () => {
  const { accounts, createAccount, deleteAccount } = useData();
  const { isPremium } = useSubscription();
  const { defaultCurrency } = useCurrency();
  const { t } = useLocalization();

  const handleCreateAccount = async () => {
    if (!isPremium && accounts.length >= 3) {
      Alert.alert(t('premium.required'), t('premium.upgradeMessage'));
      return;
    }

    await createAccount({
      name: 'Новый счет',
      currency: defaultCurrency,
      balance: 0,
    });
  };

  return (
    <View>
      <Text>{t('accounts.title')}</Text>
      <FlatList
        data={accounts}
        renderItem={({ item }) => <AccountCard account={item} />}
      />
      <Button title={t('accounts.add')} onPress={handleCreateAccount} />
    </View>
  );
};
```

### Пример 3: Условный рендер на основе контекста

```typescript
const MainApp = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (user?.isGuest) {
    return <GuestModeScreen />;
  }

  return <BottomTabNavigator />;
};
```

---

## 🐛 Отладка контекстов

### Использование React DevTools:

1. Установите React DevTools
2. Откройте Components tab
3. Найдите Provider компоненты
4. Просмотрите их props и state

### Логирование в контекстах:

```typescript
export const MyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState([]);

  // Логируем изменения данных
  useEffect(() => {
    console.log('[MyContext] Data changed:', data);
  }, [data]);

  const updateData = async (newData) => {
    console.log('[MyContext] Updating data:', newData);
    setData(newData);
  };

  // ...
};
```

### Проверка ре-рендеров:

```typescript
// Добавьте в каждый контекст
useEffect(() => {
  console.log('[MyContext] Provider re-rendered');
});
```

---

## ⚡ Оптимизация производительности

### 1. Мемоизация значений:

```typescript
const value = useMemo(
  () => ({
    data,
    loading,
    updateData,
  }),
  [data, loading] // Только эти зависимости
);
```

### 2. Разделение контекстов:

```typescript
// ❌ Плохо - один большой контекст
<AppContext.Provider value={{ user, theme, settings, data }}>

// ✅ Хорошо - несколько маленьких
<AuthProvider>
  <ThemeProvider>
    <SettingsProvider>
      <DataProvider>
```

### 3. useCallback для функций:

```typescript
const updateData = useCallback(async (newData) => {
  await SomeService.update(newData);
  await reload();
}, [reload]); // Зависимости
```

---

## 📚 Детальная документация по контекстам

- [[06-Context/AuthContext|AuthContext - Авторизация]]
- [[06-Context/DataContext|DataContext - Данные приложения]]
- [[06-Context/ThemeContext|ThemeContext - Темы оформления]]
- [[06-Context/CurrencyContext|CurrencyContext - Валюты]]
- [[06-Context/SubscriptionContext|SubscriptionContext - Premium подписка]]
- [[06-Context/LocalizationContext|LocalizationContext - Локализация]]

---

## 💡 Когда создавать новый контекст?

Создавайте новый контекст, если:

✅ Данные нужны **во многих компонентах** на разных уровнях
✅ Данные **меняются редко** (или есть способ оптимизации)
✅ Данные **логически изолированы** (одна область ответственности)
✅ Prop drilling становится **неудобным** (>2-3 уровней)

**НЕ создавайте** контекст, если:

❌ Данные нужны только **в одном месте**
❌ Данные **меняются очень часто** (каждую секунду)
❌ Данные можно передать через **props** без проблем
❌ Логика **слишком простая** для отдельного контекста

---

[[06-Context/AuthContext|Следующая: AuthContext →]]

[[README|← Назад к содержанию]]
