# 📊 DataContext - Данные приложения

[[06-Context/Overview|← Обзор Context API]] | [[README|Содержание]]

---

## 📖 Что такое DataContext?

**DataContext** - главный контекст для управления **всеми данными приложения**. Это самый сложный и важный контекст в CashCraft.

**Отвечает за:**

- 💰 Счета (Accounts)
- 💸 Транзакции (Transactions)
- 🏷 Категории (Categories)
- 💳 Долги (Debts)
- 🎯 Цели (Goals)
- 🔄 Синхронизацию с backend
- 📈 Вычисление балансов
- 💱 Конвертацию валют

**Файл:** `src/context/DataContext.tsx`

---

## 🎯 Основные возможности

```typescript
const {
  // Счета
  accounts,
  createAccount,
  updateAccount,
  deleteAccount,

  // Транзакции
  transactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,

  // Категории
  categories,
  createCategory,
  updateCategory,
  deleteCategory,

  // Долги
  debts,
  createDebt,
  updateDebt,
  deleteDebt,

  // Цели
  goals,
  createGoal,
  updateGoal,
  deleteGoal,

  // Синхронизация
  sync,
  lastSyncTime,

  // Состояние
  loading,
  error,
} = useData();
```

---

## 🗂 Типы данных

### Account (Счет)

```typescript
interface Account {
  id: string;                   // UUID
  name: string;                 // Название счета
  type: AccountType;            // Тип счета
  currency: string;             // Валюта (USD, EUR, RUB...)
  balance: number;              // Текущий баланс
  icon: string;                 // Иконка
  color: string;                // Цвет
  initialBalance: number;       // Начальный баланс
  userId: string;               // ID пользователя
  createdAt: number;            // Дата создания
  updatedAt: number;            // Дата обновления
}

type AccountType = 'cash' | 'card' | 'bank' | 'savings' | 'investment' | 'other';
```

**Пример:**

```json
{
  "id": "acc-123",
  "name": "Моя карта",
  "type": "card",
  "currency": "USD",
  "balance": 1500.50,
  "icon": "credit-card",
  "color": "#4CAF50",
  "initialBalance": 1000,
  "userId": "user-123",
  "createdAt": 1704444000000,
  "updatedAt": 1704444000000
}
```

---

### Transaction (Транзакция)

```typescript
interface Transaction {
  id: string;                   // UUID
  type: TransactionType;        // Тип транзакции
  amount: number;               // Сумма
  currency: string;             // Валюта
  accountId: string;            // ID счета
  categoryId: string;           // ID категории
  description: string;          // Описание
  date: number;                 // Дата (timestamp)
  userId: string;               // ID пользователя

  // Для переводов
  targetAccountId?: string;     // ID счета-получателя
  targetAmount?: number;        // Сумма в валюте получателя
  exchangeRate?: number;        // Курс обмена

  createdAt: number;            // Дата создания
  updatedAt: number;            // Дата обновления
}

type TransactionType = 'income' | 'expense' | 'transfer';
```

**Пример дохода:**

```json
{
  "id": "tr-123",
  "type": "income",
  "amount": 5000,
  "currency": "USD",
  "accountId": "acc-123",
  "categoryId": "cat-salary",
  "description": "Зарплата",
  "date": 1704444000000,
  "userId": "user-123",
  "createdAt": 1704444000000,
  "updatedAt": 1704444000000
}
```

**Пример перевода между счетами (разные валюты):**

```json
{
  "id": "tr-456",
  "type": "transfer",
  "amount": 100,               // Списали 100 USD
  "currency": "USD",
  "accountId": "acc-usd",
  "categoryId": "cat-transfer",
  "description": "Перевод на EUR счет",
  "date": 1704444000000,
  "targetAccountId": "acc-eur",
  "targetAmount": 92,          // Зачислили 92 EUR
  "exchangeRate": 0.92,        // Курс USD -> EUR
  "userId": "user-123",
  "createdAt": 1704444000000,
  "updatedAt": 1704444000000
}
```

---

### Category (Категория)

```typescript
interface Category {
  id: string;                   // UUID
  name: string;                 // Название
  type: 'income' | 'expense';   // Тип
  icon: string;                 // Иконка
  color: string;                // Цвет
  isDefault: boolean;           // Системная категория
  userId: string;               // ID пользователя
  createdAt: number;
  updatedAt: number;
}
```

**Пример:**

```json
{
  "id": "cat-food",
  "name": "Еда",
  "type": "expense",
  "icon": "food",
  "color": "#FF5722",
  "isDefault": true,
  "userId": "user-123",
  "createdAt": 1704444000000,
  "updatedAt": 1704444000000
}
```

---

### Debt (Долг)

```typescript
interface Debt {
  id: string;                   // UUID
  type: 'loan' | 'borrow';      // Тип (дал в долг / взял в долг)
  amount: number;               // Сумма
  currency: string;             // Валюта
  contactName: string;          // Имя контакта
  description: string;          // Описание
  dueDate?: number;             // Срок возврата
  isPaid: boolean;              // Погашен ли
  userId: string;               // ID пользователя
  createdAt: number;
  updatedAt: number;
}
```

**Пример:**

```json
{
  "id": "debt-123",
  "type": "borrow",
  "amount": 500,
  "currency": "USD",
  "contactName": "Иван",
  "description": "На ремонт машины",
  "dueDate": 1707350400000,
  "isPaid": false,
  "userId": "user-123",
  "createdAt": 1704444000000,
  "updatedAt": 1704444000000
}
```

---

### Goal (Цель)

```typescript
interface Goal {
  id: string;                   // UUID
  name: string;                 // Название цели
  targetAmount: number;         // Целевая сумма
  currentAmount: number;        // Текущая сумма
  currency: string;             // Валюта
  deadline?: number;            // Дедлайн
  icon: string;                 // Иконка
  color: string;                // Цвет
  isCompleted: boolean;         // Достигнута ли
  userId: string;               // ID пользователя
  createdAt: number;
  updatedAt: number;
}
```

**Пример:**

```json
{
  "id": "goal-123",
  "name": "Отпуск в Турции",
  "targetAmount": 2000,
  "currentAmount": 850,
  "currency": "USD",
  "deadline": 1719792000000,
  "icon": "airplane",
  "color": "#2196F3",
  "isCompleted": false,
  "userId": "user-123",
  "createdAt": 1704444000000,
  "updatedAt": 1704444000000
}
```

---

## 🔄 Жизненный цикл

```
1. App.tsx → AuthProvider → DataProvider монтируется
   ↓
2. useEffect() запускается
   ├─ Загружает данные из WatermelonDB:
   │  ├─ loadAccounts()
   │  ├─ loadTransactions()
   │  ├─ loadCategories()
   │  ├─ loadDebts()
   │  └─ loadGoals()
   │
   └─ Подписывается на изменения в БД:
      ├─ accounts.observe() → обновляет состояние
      ├─ transactions.observe() → обновляет состояние
      └─ ...
   ↓
3. Компоненты получают доступ через useData()
   ↓
4. Пользователь создает транзакцию
   ↓
5. createTransaction() вызывается
   ├─ Создает запись в WatermelonDB
   ├─ Обновляет баланс счета
   ├─ WatermelonDB триггерит observe()
   └─ Компоненты автоматически перерисовываются
   ↓
6. Автоматическая синхронизация (если авторизован)
   ├─ Отправляет изменения на backend
   └─ Получает изменения с других устройств
```

---

## 📝 Методы работы со счетами

### 1. `createAccount(data)`

Создание нового счета.

```typescript
const createAccount = async (data: {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
  icon?: string;
  color?: string;
}) => {
  try {
    setLoading(true);

    // 1. Создаем счет в локальной БД
    const account = await LocalDatabaseService.createAccount({
      ...data,
      userId: user.id,
      balance: data.initialBalance,
    });

    // 2. WatermelonDB автоматически обновит состояние через observe()

    // 3. Синхронизация с backend (если авторизован)
    if (!isGuest) {
      await CloudSyncService.syncAccounts();
    }

    return account;

  } catch (error) {
    console.error('[DataContext] Create account error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const AddAccountModal = () => {
  const { createAccount } = useData();
  const { defaultCurrency } = useCurrency();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('card');

  const handleSave = async () => {
    try {
      await createAccount({
        name,
        type,
        currency: defaultCurrency,
        initialBalance: 0,
        icon: 'credit-card',
        color: '#4CAF50',
      });

      Alert.alert('Успех', 'Счет создан');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать счет');
    }
  };

  return (
    <Modal>
      <TextInput value={name} onChangeText={setName} placeholder="Название счета" />
      <Picker selectedValue={type} onValueChange={setType}>
        <Picker.Item label="Карта" value="card" />
        <Picker.Item label="Наличные" value="cash" />
        <Picker.Item label="Банк" value="bank" />
      </Picker>
      <Button title="Создать" onPress={handleSave} />
    </Modal>
  );
};
```

---

### 2. `updateAccount(id, data)`

Обновление счета.

```typescript
const updateAccount = async (id: string, data: Partial<Account>) => {
  try {
    setLoading(true);

    await LocalDatabaseService.updateAccount(id, data);

    // Синхронизация
    if (!isGuest) {
      await CloudSyncService.syncAccounts();
    }

  } catch (error) {
    console.error('[DataContext] Update account error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const EditAccountModal = ({ accountId }: { accountId: string }) => {
  const { accounts, updateAccount } = useData();
  const account = accounts.find(a => a.id === accountId);

  const [name, setName] = useState(account?.name || '');

  const handleSave = async () => {
    await updateAccount(accountId, { name });
    navigation.goBack();
  };

  return (
    <Modal>
      <TextInput value={name} onChangeText={setName} />
      <Button title="Сохранить" onPress={handleSave} />
    </Modal>
  );
};
```

---

### 3. `deleteAccount(id)`

Удаление счета (с проверкой на наличие транзакций).

```typescript
const deleteAccount = async (id: string) => {
  try {
    setLoading(true);

    // 1. Проверяем есть ли транзакции
    const accountTransactions = transactions.filter(t => t.accountId === id);

    if (accountTransactions.length > 0) {
      throw new Error('Нельзя удалить счет с транзакциями');
    }

    // 2. Удаляем
    await LocalDatabaseService.deleteAccount(id);

    // 3. Синхронизация
    if (!isGuest) {
      await CloudSyncService.syncAccounts();
    }

  } catch (error) {
    console.error('[DataContext] Delete account error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const AccountCard = ({ account }: { account: Account }) => {
  const { deleteAccount, transactions } = useData();

  const handleDelete = () => {
    const hasTransactions = transactions.some(t => t.accountId === account.id);

    if (hasTransactions) {
      Alert.alert('Ошибка', 'Сначала удалите все транзакции этого счета');
      return;
    }

    Alert.alert(
      'Удаление',
      `Удалить счет "${account.name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(account.id);
            } catch (error) {
              Alert.alert('Ошибка', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View>
      <Text>{account.name}</Text>
      <Button title="Удалить" onPress={handleDelete} color="red" />
    </View>
  );
};
```

---

## 📝 Методы работы с транзакциями

### 1. `createTransaction(data)`

Создание транзакции (доход/расход).

```typescript
const createTransaction = async (data: {
  type: 'income' | 'expense';
  amount: number;
  accountId: string;
  categoryId: string;
  description: string;
  date: number;
}) => {
  try {
    setLoading(true);

    // 1. Получаем счет
    const account = accounts.find(a => a.id === data.accountId);
    if (!account) throw new Error('Account not found');

    // 2. Создаем транзакцию
    const transaction = await LocalDatabaseService.createTransaction({
      ...data,
      currency: account.currency,
      userId: user.id,
    });

    // 3. Обновляем баланс счета
    const newBalance = data.type === 'income'
      ? account.balance + data.amount
      : account.balance - data.amount;

    await LocalDatabaseService.updateAccount(data.accountId, {
      balance: newBalance,
    });

    // 4. Синхронизация
    if (!isGuest) {
      await CloudSyncService.syncTransactions();
    }

    // 5. Показываем рекламу (каждые 6 транзакций)
    await AdService.incrementTransactionCount();

    return transaction;

  } catch (error) {
    console.error('[DataContext] Create transaction error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const AddTransactionModal = () => {
  const { createTransaction, accounts, categories } = useData();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = async () => {
    try {
      await createTransaction({
        type,
        amount: parseFloat(amount),
        accountId,
        categoryId,
        description,
        date: Date.now(),
      });

      Alert.alert('Успех', 'Транзакция создана');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать транзакцию');
    }
  };

  return (
    <Modal>
      <SegmentedControl
        values={['Расход', 'Доход']}
        selectedIndex={type === 'expense' ? 0 : 1}
        onChange={(event) => {
          setType(event.nativeEvent.selectedSegmentIndex === 0 ? 'expense' : 'income');
        }}
      />

      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="Сумма"
      />

      <Picker selectedValue={accountId} onValueChange={setAccountId}>
        {accounts.map(acc => (
          <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
        ))}
      </Picker>

      <Picker selectedValue={categoryId} onValueChange={setCategoryId}>
        {categories.filter(c => c.type === type).map(cat => (
          <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
        ))}
      </Picker>

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Описание"
      />

      <Button title="Сохранить" onPress={handleSave} />
    </Modal>
  );
};
```

---

### 2. `createTransfer(data)`

Создание перевода между счетами (с конвертацией валют).

```typescript
const createTransfer = async (data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  date: number;
}) => {
  try {
    setLoading(true);

    // 1. Получаем счета
    const fromAccount = accounts.find(a => a.id === data.fromAccountId);
    const toAccount = accounts.find(a => a.id === data.toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('Account not found');
    }

    // 2. Проверяем баланс
    if (fromAccount.balance < data.amount) {
      throw new Error('Insufficient balance');
    }

    // 3. Получаем курс обмена
    let exchangeRate = 1;
    let targetAmount = data.amount;

    if (fromAccount.currency !== toAccount.currency) {
      exchangeRate = await ExchangeRateService.getRate(
        fromAccount.currency,
        toAccount.currency
      );
      targetAmount = data.amount * exchangeRate;
    }

    // 4. Создаем транзакцию перевода
    const transaction = await LocalDatabaseService.createTransaction({
      type: 'transfer',
      amount: data.amount,
      currency: fromAccount.currency,
      accountId: data.fromAccountId,
      targetAccountId: data.toAccountId,
      targetAmount,
      exchangeRate,
      categoryId: 'transfer', // Специальная категория
      description: data.description,
      date: data.date,
      userId: user.id,
    });

    // 5. Обновляем балансы
    await LocalDatabaseService.updateAccount(data.fromAccountId, {
      balance: fromAccount.balance - data.amount,
    });

    await LocalDatabaseService.updateAccount(data.toAccountId, {
      balance: toAccount.balance + targetAmount,
    });

    // 6. Синхронизация
    if (!isGuest) {
      await CloudSyncService.syncTransactions();
    }

    return transaction;

  } catch (error) {
    console.error('[DataContext] Create transfer error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const TransferModal = () => {
  const { createTransfer, accounts } = useData();
  const { getRate } = useCurrency();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  // Автоматически вычисляем сумму в валюте получателя
  useEffect(() => {
    const calculateTarget = async () => {
      const fromAccount = accounts.find(a => a.id === fromAccountId);
      const toAccount = accounts.find(a => a.id === toAccountId);

      if (!fromAccount || !toAccount || !amount) return;

      if (fromAccount.currency === toAccount.currency) {
        setTargetAmount(amount);
      } else {
        const rate = await getRate(fromAccount.currency, toAccount.currency);
        setTargetAmount((parseFloat(amount) * rate).toFixed(2));
      }
    };

    calculateTarget();
  }, [fromAccountId, toAccountId, amount]);

  const handleTransfer = async () => {
    try {
      await createTransfer({
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount),
        description: 'Перевод между счетами',
        date: Date.now(),
      });

      Alert.alert('Успех', 'Перевод выполнен');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    }
  };

  return (
    <Modal>
      <Text>Откуда:</Text>
      <Picker selectedValue={fromAccountId} onValueChange={setFromAccountId}>
        {accounts.map(acc => (
          <Picker.Item key={acc.id} label={`${acc.name} (${acc.currency})`} value={acc.id} />
        ))}
      </Picker>

      <Text>Куда:</Text>
      <Picker selectedValue={toAccountId} onValueChange={setToAccountId}>
        {accounts.filter(a => a.id !== fromAccountId).map(acc => (
          <Picker.Item key={acc.id} label={`${acc.name} (${acc.currency})`} value={acc.id} />
        ))}
      </Picker>

      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="Сумма"
      />

      {targetAmount && (
        <Text>Будет зачислено: {targetAmount}</Text>
      )}

      <Button title="Перевести" onPress={handleTransfer} />
    </Modal>
  );
};
```

---

## 📊 Вычисление статистики

### Общий баланс (в базовой валюте)

```typescript
const getTotalBalance = async (): Promise<number> => {
  const { accounts } = useData();
  const { defaultCurrency, getRate } = useCurrency();

  let total = 0;

  for (const account of accounts) {
    if (account.currency === defaultCurrency) {
      total += account.balance;
    } else {
      const rate = await getRate(account.currency, defaultCurrency);
      total += account.balance * rate;
    }
  }

  return total;
};
```

### Расходы за период

```typescript
const getExpensesForPeriod = (startDate: number, endDate: number): number => {
  const { transactions } = useData();

  return transactions
    .filter(t =>
      t.type === 'expense' &&
      t.date >= startDate &&
      t.date <= endDate
    )
    .reduce((sum, t) => sum + t.amount, 0);
};
```

### Топ категорий

```typescript
const getTopCategories = (type: 'income' | 'expense', limit: number = 5) => {
  const { transactions, categories } = useData();

  const categoryTotals = new Map<string, number>();

  transactions
    .filter(t => t.type === type)
    .forEach(t => {
      const current = categoryTotals.get(t.categoryId) || 0;
      categoryTotals.set(t.categoryId, current + t.amount);
    });

  return Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([categoryId, total]) => ({
      category: categories.find(c => c.id === categoryId),
      total,
    }));
};
```

---

## 🔄 Синхронизация с backend

### Процесс синхронизации:

```
1. Пользователь создает транзакцию локально
   ↓
2. WatermelonDB сохраняет в SQLite
   ↓
3. sync() вызывается автоматически или вручную
   ↓
4. CloudSyncService:
   ├─ Получает все изменения с lastSyncTime
   ├─ Отправляет локальные изменения на backend
   ├─ Получает изменения с backend
   └─ Обновляет локальную БД
   ↓
5. WatermelonDB триггерит observe()
   ↓
6. Компоненты автоматически обновляются
```

### Метод sync():

```typescript
const sync = async () => {
  try {
    if (isGuest) {
      throw new Error('Sync not available in guest mode');
    }

    setSyncing(true);

    await CloudSyncService.sync();

    setLastSyncTime(Date.now());
    await AsyncStorage.setItem('lastSyncTime', Date.now().toString());

  } catch (error) {
    console.error('[DataContext] Sync error:', error);
    throw error;
  } finally {
    setSyncing(false);
  }
};
```

---

## ⚡ Оптимизация производительности

### 1. WatermelonDB observe() вместо polling

```typescript
// ✅ Хорошо - автоматическое обновление
useEffect(() => {
  const subscription = database.collections
    .get('accounts')
    .query()
    .observe()
    .subscribe(setAccounts);

  return () => subscription.unsubscribe();
}, []);

// ❌ Плохо - постоянный перезапрос
setInterval(() => {
  loadAccounts();
}, 1000);
```

### 2. Мемоизация вычислений

```typescript
const totalBalance = useMemo(() => {
  return accounts.reduce((sum, acc) => sum + acc.balance, 0);
}, [accounts]);
```

### 3. Виртуализация списков

```typescript
// Используем FlatList для больших списков транзакций
<FlatList
  data={transactions}
  renderItem={({ item }) => <TransactionCard transaction={item} />}
  keyExtractor={item => item.id}
  initialNumToRender={20}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

---

## 🐛 Отладка

### Логирование изменений данных:

```typescript
useEffect(() => {
  console.log('[DataContext] Accounts changed:', accounts.length);
}, [accounts]);

useEffect(() => {
  console.log('[DataContext] Transactions changed:', transactions.length);
}, [transactions]);
```

### Проверка состояния:

```typescript
const DebugScreen = () => {
  const data = useData();

  return (
    <ScrollView>
      <Text>Accounts: {data.accounts.length}</Text>
      <Text>Transactions: {data.transactions.length}</Text>
      <Text>Categories: {data.categories.length}</Text>
      <Text>Loading: {data.loading.toString()}</Text>
      <Text>Last sync: {new Date(data.lastSyncTime).toLocaleString()}</Text>
    </ScrollView>
  );
};
```

---

## 🔗 Связанные компоненты

- [[06-Context/AuthContext|AuthContext]] - предоставляет `user.id` для фильтрации данных
- [[06-Context/CurrencyContext|CurrencyContext]] - используется для конвертации валют
- [[05-Services/LocalDatabaseService|LocalDatabaseService]] - интерфейс к WatermelonDB
- [[05-Services/CloudSyncService|CloudSyncService]] - синхронизация с backend
- [[08-Database/Overview|Database Overview]] - структура базы данных

---

[[06-Context/ThemeContext|Следующая: ThemeContext →]]

[[README|← Назад к содержанию]]
