# 📱 Обзор экранов CashCraft

[[README|← Назад к содержанию]]

---

## 📖 Что такое экраны?

**Экраны (Screens)** - это полноэкранные страницы приложения, которые видит пользователь. Каждый экран отвечает за свою функциональность.

**Папка:** `src/screens/`

---

## 🗺 Карта навигации

```
Приложение
│
└─── BottomTabNavigator (4 вкладки внизу)
     │
     ├─── 📊 Вкладка "Счета"
     │    ├─ AccountsScreen (главный)
     │    ├─ AccountDetailsScreen
     │    └─ TransactionDetailsScreen
     │
     ├─── 💰 Вкладка "Транзакции"
     │    └─ TransactionsScreen
     │
     ├─── 📈 Вкладка "Планы"
     │    ├─ StatisticsScreen
     │    └─ GoalsScreen
     │
     └─── ⚙️ Вкладка "Еще"
          ├─ MoreScreen (главный)
          ├─ SettingsScreen
          ├─ HelpScreen
          ├─ ExportImportScreen
          └─ AIAssistantScreen (временно отключен)
```

---

## 📋 Список всех экранов

| Экран | Файл | Вкладка | Описание |
|-------|------|---------|----------|
| **AccountsScreen** | `AccountsScreen.tsx` | Счета | Список всех счетов (карты, наличные, сбережения, долги) |
| **TransactionsScreen** | `TransactionsScreen.tsx` | Транзакции | История всех транзакций с фильтрами |
| **StatisticsScreen** | `StatisticsScreen.tsx` | Планы | Графики доходов/расходов |
| **MoreScreen** | `MoreScreen.tsx` | Еще | Настройки, помощь, экспорт данных |
| **SubscriptionScreen** | `SubscriptionScreen.tsx` | Modal | Premium подписка |
| **CategoriesScreen** | `CategoriesScreen.tsx` | Modal | Управление категориями |

---

## 🎨 Структура типичного экрана

Каждый экран следует одному шаблону:

```typescript
// src/screens/MyScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

export const MyScreen: React.FC = () => {
  // 1. Контексты (состояние)
  const { colors } = useTheme();
  const { accounts, transactions } = useData();

  // 2. Локальное состояние
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);

  // 3. Эффекты (загрузка данных)
  useEffect(() => {
    loadData();
  }, []);

  // 4. Обработчики событий
  const loadData = async () => {
    setIsLoading(true);
    // Загрузка данных
    setIsLoading(false);
  };

  const handleItemPress = (item) => {
    // Обработка нажатия
  };

  // 5. Рендер UI
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        {/* Контент экрана */}
      </ScrollView>
    </View>
  );
};

// 6. Стили
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ... другие стили
});
```

---

## 🔍 Детали по каждому экрану

### 1️⃣ AccountsScreen

**Назначение:** Управление финансовыми счетами

**Что показывает:**
- 💳 Карты
- 💵 Наличные
- 💰 Сбережения
- 📉 Долги и кредиты
- 🎯 Финансовые цели

**Основные функции:**
- ➕ Добавление нового счета
- ✏️ Редактирование счета
- 🗑️ Удаление счета
- 📊 Просмотр статистики по счету
- 💱 Переводы между счетами

**Компоненты:**
- `AccountCard` - карточка счета
- `AddAccountModal` - модалка добавления
- `TransferModal` - модалка перевода
- `StatisticsCard` - карточка статистики

[[03-Screens/AccountsScreen|📚 Подробнее →]]

---

### 2️⃣ TransactionsScreen

**Назначение:** История всех финансовых операций

**Что показывает:**
- 📝 Список всех транзакций (доходы, расходы, переводы)
- 🔍 Поиск транзакций
- 📅 Фильтр по дате
- 🏷️ Фильтр по категории
- 💳 Фильтр по счету

**Основные функции:**
- ➕ Создание транзакции (доход/расход)
- ✏️ Редактирование транзакции
- 🗑️ Удаление транзакции
- 📊 Просмотр статистики

**Компоненты:**
- `TransactionItem` - элемент транзакции
- `AddTransactionModal` - модалка добавления
- `DateRangePicker` - выбор периода
- `BalanceHeader` - заголовок с балансом

[[03-Screens/TransactionsScreen|📚 Подробнее →]]

---

### 3️⃣ StatisticsScreen

**Назначение:** Визуализация финансовых данных

**Что показывает:**
- 📊 Графики доходов и расходов
- 📈 Динамика по времени
- 🥧 Распределение по категориям
- 💹 Тренды

**Основные функции:**
- 📅 Выбор периода (день, неделя, месяц, год)
- 📱 Переключение типа графика
- 🎨 Интерактивные диаграммы

---

### 4️⃣ MoreScreen

**Назначение:** Настройки и дополнительные функции

**Что показывает:**
- 👤 Профиль пользователя
- 💎 Premium статус
- ⚙️ Настройки приложения
- 📤 Экспорт/импорт данных
- 🌍 Язык интерфейса
- 🌙 Тема оформления
- 📢 Баннерная реклама (внизу)

**Основные функции:**
- Управление аккаунтом
- Настройка приложения
- Экспорт/импорт данных
- Помощь и поддержка

[[03-Screens/MoreScreen|📚 Подробнее →]]

---

### 5️⃣ SubscriptionScreen

**Назначение:** Покупка Premium подписки

**Что показывает:**
- 💎 Преимущества Premium
- 💰 Тарифные планы (месяц/год)
- ✅ Текущий статус подписки

**Основные функции:**
- 💳 Покупка подписки
- 🔄 Восстановление покупок
- ℹ️ Условия использования

[[03-Screens/SubscriptionScreen|📚 Подробнее →]]

---

## 🔄 Жизненный цикл экрана

```
1. Пользователь нажимает на вкладку
   ↓
2. React Navigation рендерит экран
   ↓
3. Вызывается useEffect() → загрузка данных
   ↓
4. Данные загружаются из:
   - Context (DataContext, AuthContext)
   - LocalDatabaseService
   - API (если нужно)
   ↓
5. Отображается UI с данными
   ↓
6. Пользователь взаимодействует (нажатия, формы)
   ↓
7. Обновляются данные → UI перерисовывается
   ↓
8. Пользователь уходит с экрана
   ↓
9. useEffect cleanup → очистка ресурсов
```

---

## 🎯 Принципы проектирования экранов

### 1️⃣ **Один экран = одна ответственность**

✅ **Хорошо:**
- `AccountsScreen` - **только** список счетов
- `TransactionsScreen` - **только** транзакции

❌ **Плохо:**
- `DashboardScreen` - счета + транзакции + статистика + настройки

### 2️⃣ **Контекст для глобального состояния**

```typescript
// ✅ Используем контекст
const { accounts } = useData();

// ❌ Не загружаем данные в каждом экране
const [accounts, setAccounts] = useState([]);
useEffect(() => {
  const loadAccounts = async () => {
    const data = await LocalDatabaseService.getAccounts();
    setAccounts(data);
  };
  loadAccounts();
}, []);
```

### 3️⃣ **Выносить логику в компоненты и сервисы**

```typescript
// ❌ Плохо - вся логика в экране
const AccountsScreen = () => {
  const renderAccountCard = (account) => {
    return (
      <View>
        <Text>{account.name}</Text>
        <Text>{account.balance}</Text>
        {/* ... много JSX */}
      </View>
    );
  };
};

// ✅ Хорошо - компонент отдельно
const AccountsScreen = () => {
  return (
    <FlatList
      data={accounts}
      renderItem={({ item }) => <AccountCard account={item} />}
    />
  );
};
```

### 4️⃣ **Использовать React Navigation**

```typescript
// Переход на другой экран
navigation.navigate('AccountDetails', { accountId: '123' });

// Получение параметров
const { accountId } = route.params;
```

---

## 📊 Статистика экранов

| Метрика | Значение |
|---------|----------|
| Всего экранов | ~15 |
| Основных вкладок | 4 |
| Модальных экранов | ~5 |
| Средний размер файла | ~400-800 строк |
| Среднее время загрузки | <100ms |

---

## 🔗 Подробнее по экранам

- [[03-Screens/AccountsScreen|AccountsScreen - Экран счетов]]
- [[03-Screens/TransactionsScreen|TransactionsScreen - Экран транзакций]]
- [[03-Screens/MoreScreen|MoreScreen - Экран настроек]]
- [[03-Screens/SubscriptionScreen|SubscriptionScreen - Premium подписка]]

---

[[03-Screens/AccountsScreen|Следующая: AccountsScreen →]]

[[README|← Назад к содержанию]]
