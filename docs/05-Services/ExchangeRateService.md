# 💱 ExchangeRateService - Курсы валют

[[05-Services/Overview|← Назад к сервисам]]

---

## 📖 Что это?

**ExchangeRateService** - сервис для работы с курсами валют. Обеспечивает:
- 💱 Получение курсов обмена между любыми валютами
- 🔄 Конвертацию сумм
- 📊 Кеширование курсов (24 часа)
- 🌐 Работу с backend API и внешними источниками
- ♾️ Кросс-курсы через USD (если нет прямого курса)

**Файл:** `src/services/exchangeRate.ts`

---

## 🎯 Зачем нужен?

Приложение поддерживает **мультивалютность** - каждый счет может иметь свою валюту:
- 💳 Карта в USD
- 💵 Наличные в RUB
- 🏦 Сбережения в EUR

При переводах между счетами или просмотре общего баланса нужно **конвертировать** валюты.

---

## 🔄 Архитектура получения курсов

```
Запрос курса USD → EUR
        ↓
┌───────────────────────────────────────┐
│ 1. Проверка кеша в памяти (Map)       │
│    Срок жизни: 24 часа                │
└─────────────┬─────────────────────────┘
              │ Нет в кеше ↓
┌───────────────────────────────────────┐
│ 2. Проверка локальной БД (WatermelonDB)│
│    Таблица: exchange_rates            │
└─────────────┬─────────────────────────┘
              │ Нет в БД ↓
┌───────────────────────────────────────┐
│ 3. Запрос к backend API               │
│    GET /exchange-rates/rate?from=USD&to=EUR│
│    ├─ Если есть токен → backend       │
│    └─ Если нет токена → внешний API   │
└─────────────┬─────────────────────────┘
              │ Успех ↓
┌───────────────────────────────────────┐
│ 4. Сохранение в кеш и БД              │
└───────────────────────────────────────┘
              │ Нет прямого курса ↓
┌───────────────────────────────────────┐
│ 5. Кросс-курс через USD               │
│    EUR → RUB = (EUR → USD) × (USD → RUB)│
└───────────────────────────────────────┘
```

---

## 📦 Структура сервиса

```typescript
export class ExchangeRateService {
  // Кеш в памяти
  private static ratesCache: Map<string, { rate: number; timestamp: number }> = new Map();
  private static CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 часа

  // Основные методы
  static async getRate(from: string, to: string): Promise<number | null>
  static async convert(amount: number, from: string, to: string): Promise<number>
  static async forceUpdateRate(from: string, to: string): Promise<number | null>
  static async getRatesForCurrency(currency: string): Promise<{ [currency: string]: number }>
  static async initializeRatesFromBackend(): Promise<boolean>

  // Вспомогательные
  static async getRateFromExternalAPI(from: string, to: string): Promise<number | null>
  static clearCache(): void
  static clearAllRates(): Promise<void>
}
```

---

## 📚 Основные методы

### 1️⃣ Получение курса

```typescript
/**
 * Получить курс конвертации между двумя валютами
 * @param from - Исходная валюта (USD, EUR, RUB...)
 * @param to - Целевая валюта
 * @returns Курс или null если не найден
 */
static async getRate(from: string, to: string): Promise<number | null>
```

**Логика работы:**

1. **Одинаковые валюты** → возвращает `1`
```typescript
await ExchangeRateService.getRate('USD', 'USD');
// → 1
```

2. **Проверка кеша в памяти:**
```typescript
const cacheKey = `${from}_${to}`; // "USD_EUR"
const cached = this.ratesCache.get(cacheKey);

if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
  return cached.rate; // Возвращаем из кеша
}
```

3. **Проверка локальной БД:**
```typescript
if (LocalDatabaseService.isDatabaseReady()) {
  const localRate = await LocalDatabaseService.getLocalExchangeRate(from, to);
  if (localRate) return localRate;
}
```

4. **Запрос к backend API:**
```typescript
const response = await ApiService.get(`/exchange-rates/rate?from=${from}&to=${to}`);
return response.data.rate;
```

5. **Кросс-курс через USD** (если нет прямого):
```typescript
// Пример: EUR → RUB
const eurToUsd = await this.getRate('EUR', 'USD'); // 1.1
const usdToRub = await this.getRate('USD', 'RUB'); // 90
const eurToRub = eurToUsd * usdToRub; // 99
```

**Примеры использования:**

```typescript
// Пример 1: Получить курс USD → EUR
const rate = await ExchangeRateService.getRate('USD', 'EUR');
console.log(`1 USD = ${rate} EUR`);
// Вывод: 1 USD = 0.92 EUR

// Пример 2: Получить курс RUB → USD
const rate = await ExchangeRateService.getRate('RUB', 'USD');
console.log(`1 RUB = ${rate} USD`);
// Вывод: 1 RUB = 0.011 USD

// Пример 3: Обработка ошибки
const rate = await ExchangeRateService.getRate('USD', 'XYZ');
if (rate === null) {
  console.log('Курс не найден');
}
```

---

### 2️⃣ Конвертация суммы

```typescript
/**
 * Конвертировать сумму из одной валюты в другую
 * @param amount - Сумма для конвертации
 * @param from - Исходная валюта
 * @param to - Целевая валюта
 * @returns Сконвертированная сумма
 */
static async convert(amount: number, from: string, to: string): Promise<number>
```

**Как работает:**

```typescript
static async convert(amount: number, from: string, to: string): Promise<number> {
  // Одинаковые валюты - возвращаем исходную сумму
  if (from === to) return amount;

  // Получаем курс
  const rate = await this.getRate(from, to);

  // Если курс не найден - возвращаем исходную сумму
  if (rate === null) return amount;

  // Конвертируем
  return amount * rate;
}
```

**Примеры использования:**

```typescript
// Пример 1: Конвертация USD → EUR
const amount = await ExchangeRateService.convert(100, 'USD', 'EUR');
console.log(`100 USD = ${amount} EUR`);
// Вывод: 100 USD = 92 EUR

// Пример 2: Конвертация для перевода
const transferAmount = 500; // USD
const accountCurrency = 'RUB';
const convertedAmount = await ExchangeRateService.convert(
  transferAmount,
  'USD',
  accountCurrency
);
// 500 USD → 45000 RUB

// Пример 3: В компоненте Transfer
const handleTransfer = async () => {
  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const toAccount = accounts.find(a => a.id === toAccountId);

  let finalAmount = amount;

  // Если валюты разные - конвертируем
  if (fromAccount.currency !== toAccount.currency) {
    finalAmount = await ExchangeRateService.convert(
      amount,
      fromAccount.currency,
      toAccount.currency
    );
  }

  // Создаем перевод
  await createTransfer(fromAccountId, toAccountId, amount, finalAmount);
};
```

---

### 3️⃣ Принудительное обновление курса

```typescript
/**
 * Принудительно обновить курс для конкретной пары валют
 * Игнорирует кеш, загружает свежие данные
 * @param from - Исходная валюта
 * @param to - Целевая валюта
 * @returns Новый курс
 */
static async forceUpdateRate(from: string, to: string): Promise<number | null>
```

**Когда использовать:**
- Пользователь нажал кнопку "Обновить курс"
- Курс устарел (несколько дней)
- Нужны актуальные данные для важной операции

**Как работает:**

```typescript
static async forceUpdateRate(from: string, to: string): Promise<number | null> {
  console.log(`Force updating rate ${from} -> ${to}`);

  // 1. Очищаем кеш для этой пары
  this.ratesCache.delete(`${from}_${to}`);
  this.ratesCache.delete(`${to}_${from}`);

  // 2. Получаем свежий курс с API
  const rate = await this.getRateFromExternalAPI(from, to);

  return rate;
}
```

**Пример использования:**

```typescript
// В компоненте настроек курсов
const handleRefreshRate = async (from: string, to: string) => {
  setLoading(true);

  const newRate = await ExchangeRateService.forceUpdateRate(from, to);

  if (newRate) {
    Alert.alert('Успех', `Курс обновлен: 1 ${from} = ${newRate} ${to}`);
  } else {
    Alert.alert('Ошибка', 'Не удалось обновить курс');
  }

  setLoading(false);
};
```

---

### 4️⃣ Получение всех курсов для валюты

```typescript
/**
 * Получить все курсы для базовой валюты
 * @param currency - Базовая валюта (USD, EUR...)
 * @returns Объект { EUR: 0.92, RUB: 90, ... }
 */
static async getRatesForCurrency(currency: string): Promise<{ [currency: string]: number }>
```

**Пример:**

```typescript
const rates = await ExchangeRateService.getRatesForCurrency('USD');
console.log(rates);
// Вывод:
// {
//   EUR: 0.92,
//   RUB: 90.5,
//   GBP: 0.79,
//   JPY: 149.8,
//   ...
// }

// Использование в компоненте
const CurrencyListScreen = () => {
  const [rates, setRates] = useState({});

  useEffect(() => {
    const loadRates = async () => {
      const usdRates = await ExchangeRateService.getRatesForCurrency('USD');
      setRates(usdRates);
    };
    loadRates();
  }, []);

  return (
    <FlatList
      data={Object.entries(rates)}
      renderItem={({ item: [currency, rate] }) => (
        <Text>1 USD = {rate} {currency}</Text>
      )}
    />
  );
};
```

---

### 5️⃣ Инициализация курсов при запуске

```typescript
/**
 * Безопасная инициализация курсов валют при запуске приложения
 * Загружает курсы для всех используемых валют
 * @returns true если успешно
 */
static async initializeRatesFromBackend(): Promise<boolean>
```

**Когда вызывается:**
При запуске приложения (в `App.tsx` или `CurrencyContext`)

**Как работает:**

```typescript
static async initializeRatesFromBackend(): Promise<boolean> {
  const currencies = new Set<string>();

  // 1. Добавляем валюту по умолчанию
  const defaultCurrency = await AsyncStorage.getItem('defaultCurrency') || 'USD';
  currencies.add(defaultCurrency);

  // 2. Получаем валюты из всех счетов
  if (LocalDatabaseService.isDatabaseReady()) {
    const accounts = await LocalDatabaseService.getAccounts();
    accounts.forEach(account => {
      if (account.currency) {
        currencies.add(account.currency);
      }
    });
  }

  // 3. Если только одна валюта - не нужно загружать курсы
  if (currencies.size <= 1) {
    return true;
  }

  // 4. Загружаем курсы для всех пар валют
  const currencyArray = Array.from(currencies);
  for (let i = 0; i < currencyArray.length; i++) {
    for (let j = i + 1; j < currencyArray.length; j++) {
      const from = currencyArray[i];
      const to = currencyArray[j];

      const rate = await this.getRateFromExternalAPI(from, to);
      if (rate) {
        await this.safeSaveRate(from, to, rate);
        await this.safeSaveRate(to, from, 1 / rate);
      }
    }
  }

  return true;
}
```

**Пример:**

```typescript
// В App.tsx или CurrencyContext
useEffect(() => {
  const initRates = async () => {
    console.log('Initializing exchange rates...');
    await ExchangeRateService.initializeRatesFromBackend();
    console.log('Exchange rates initialized');
  };

  initRates();
}, []);
```

---

## 💾 Кеширование

### Трехуровневое кеширование:

```
┌─────────────────────────────────────┐
│ Уровень 1: Кеш в памяти (Map)       │
│ Срок жизни: 24 часа                 │
│ Скорость: Мгновенно (<1ms)          │
└─────────────────────────────────────┘
              ↓ Если нет
┌─────────────────────────────────────┐
│ Уровень 2: Локальная БД (SQLite)   │
│ Срок жизни: Пока не удалят          │
│ Скорость: Быстро (~10ms)            │
└─────────────────────────────────────┘
              ↓ Если нет
┌─────────────────────────────────────┐
│ Уровень 3: Backend API / Внешний API│
│ Срок жизни: -                       │
│ Скорость: Медленно (~500-2000ms)    │
└─────────────────────────────────────┘
```

### Управление кешем:

```typescript
// Очистить кеш в памяти
ExchangeRateService.clearCache();

// Очистить все курсы (кеш + БД)
await ExchangeRateService.clearAllRates();
```

---

## 🌐 Работа с API

### Backend API

**Эндпоинт:** `GET /exchange-rates/rate?from={from}&to={to}`

**Пример запроса:**
```
GET https://cashcraft-backend-production.up.railway.app/api/v1/exchange-rates/rate?from=USD&to=EUR
```

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "rate": 0.92,
    "from": "USD",
    "to": "EUR",
    "updatedAt": "2025-10-29T10:30:00.000Z"
  }
}
```

**Код:**
```typescript
const response = await ApiService.get<{ success: boolean; data: { rate: number } }>(
  `/exchange-rates/rate?from=${from}&to=${to}`
);

if (response.success && response.data?.rate) {
  return response.data.rate;
}
```

---

## ♾️ Кросс-курсы через USD

Если нет прямого курса между валютами, используется **кросс-курс через USD**:

**Пример:** EUR → RUB

```
1. Запрашиваем EUR → RUB
   ↓ Нет прямого курса

2. Запрашиваем EUR → USD
   Результат: 1 EUR = 1.1 USD

3. Запрашиваем USD → RUB
   Результат: 1 USD = 90 RUB

4. Вычисляем кросс-курс:
   EUR → RUB = (EUR → USD) × (USD → RUB)
   EUR → RUB = 1.1 × 90 = 99 RUB

5. Сохраняем кросс-курс в кеш и БД
```

**Код:**
```typescript
if (!rate && from !== 'USD' && to !== 'USD') {
  console.log(`No direct rate ${from}->${to}, trying cross rate through USD`);

  const fromToUsd = await this.getRate(from, 'USD');
  const usdToTarget = await this.getRate('USD', to);

  if (fromToUsd && usdToTarget) {
    rate = fromToUsd * usdToTarget;
    await this.safeSaveRate(from, to, rate);
  }
}
```

---

## 🎨 Использование в компонентах

### Пример 1: Отображение баланса в разных валютах

```typescript
const TotalBalanceCard = () => {
  const { accounts } = useData();
  const { defaultCurrency } = useCurrency();
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const calculateTotal = async () => {
      let total = 0;

      for (const account of accounts) {
        // Конвертируем каждый счет в валюту по умолчанию
        const converted = await ExchangeRateService.convert(
          account.balance,
          account.currency,
          defaultCurrency
        );
        total += converted;
      }

      setTotalBalance(total);
    };

    calculateTotal();
  }, [accounts, defaultCurrency]);

  return (
    <View>
      <Text>Общий баланс:</Text>
      <Text>{totalBalance.toFixed(2)} {defaultCurrency}</Text>
    </View>
  );
};
```

### Пример 2: Перевод с конвертацией

```typescript
const TransferModal = ({ fromAccount, toAccount }) => {
  const [amount, setAmount] = useState('');
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [rate, setRate] = useState(null);

  useEffect(() => {
    // Если валюты разные - показываем курс
    if (fromAccount.currency !== toAccount.currency) {
      const loadRate = async () => {
        const r = await ExchangeRateService.getRate(
          fromAccount.currency,
          toAccount.currency
        );
        setRate(r);
      };
      loadRate();
    }
  }, [fromAccount, toAccount]);

  useEffect(() => {
    // Автоматически конвертируем сумму при вводе
    if (amount && rate) {
      const converted = parseFloat(amount) * rate;
      setConvertedAmount(converted);
    }
  }, [amount, rate]);

  const handleTransfer = async () => {
    const finalAmount = fromAccount.currency === toAccount.currency
      ? parseFloat(amount)
      : convertedAmount;

    // Создаем транзакцию перевода
    await createTransfer(fromAccount.id, toAccount.id, parseFloat(amount), finalAmount);
  };

  return (
    <View>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder={`Сумма (${fromAccount.currency})`}
      />

      {rate && (
        <Text>
          Курс: 1 {fromAccount.currency} = {rate} {toAccount.currency}
        </Text>
      )}

      {convertedAmount > 0 && (
        <Text>
          Получатель получит: {convertedAmount.toFixed(2)} {toAccount.currency}
        </Text>
      )}

      <Button title="Перевести" onPress={handleTransfer} />
    </View>
  );
};
```

### Пример 3: Настройки курсов

```typescript
const ExchangeRateSettings = () => {
  const [currencies, setCurrencies] = useState(['USD', 'EUR', 'RUB']);
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(false);

  const loadRates = async () => {
    setLoading(true);
    const newRates = {};

    for (let i = 0; i < currencies.length; i++) {
      for (let j = i + 1; j < currencies.length; j++) {
        const from = currencies[i];
        const to = currencies[j];
        const key = `${from}_${to}`;

        const rate = await ExchangeRateService.getRate(from, to);
        newRates[key] = rate;
      }
    }

    setRates(newRates);
    setLoading(false);
  };

  const handleRefresh = async (from: string, to: string) => {
    const newRate = await ExchangeRateService.forceUpdateRate(from, to);
    const key = `${from}_${to}`;
    setRates({ ...rates, [key]: newRate });
  };

  useEffect(() => {
    loadRates();
  }, [currencies]);

  return (
    <ScrollView>
      {Object.entries(rates).map(([key, rate]) => {
        const [from, to] = key.split('_');
        return (
          <View key={key}>
            <Text>1 {from} = {rate} {to}</Text>
            <Button
              title="Обновить"
              onPress={() => handleRefresh(from, to)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
};
```

---

## 🐛 Отладка

### Логирование:

Сервис логирует важные события:

```typescript
console.log(`ExchangeRateService.getRate called: ${from} -> ${to}`);
console.log(`Using cached rate for ${from}/${to}: ${rate}`);
console.log(`Got rate ${from}->${to}: ${rate}`);
console.log(`No direct rate ${from}->${to}, trying cross rate through USD`);
console.log(`Cross rate ${from}->${to} = ${rate}`);
```

### Проверка кеша:

```typescript
// Посмотреть что в кеше
const cache = ExchangeRateService['ratesCache']; // private, только для отладки
console.log('Cache size:', cache.size);

for (const [key, value] of cache.entries()) {
  console.log(`${key}: ${value.rate} (${new Date(value.timestamp).toISOString()})`);
}
```

### Тестирование:

```typescript
// Тест 1: Получить курс
const rate = await ExchangeRateService.getRate('USD', 'EUR');
console.log('USD -> EUR:', rate);

// Тест 2: Конвертация
const amount = await ExchangeRateService.convert(100, 'USD', 'EUR');
console.log('100 USD =', amount, 'EUR');

// Тест 3: Кросс-курс
const rate2 = await ExchangeRateService.getRate('EUR', 'RUB');
console.log('EUR -> RUB (cross):', rate2);

// Тест 4: Принудительное обновление
await ExchangeRateService.forceUpdateRate('USD', 'EUR');

// Тест 5: Очистка кеша
ExchangeRateService.clearCache();
```

---

## ⚙️ Конфигурация

### URL backend API:

```typescript
// src/services/exchangeRate.ts
const getApiBaseUrl = () => {
  if (__DEV__) {
    return 'http://10.0.2.2:3000/api/v1'; // Dev
  } else {
    return 'https://cashcraft-backend-production.up.railway.app/api/v1'; // Prod
  }
};
```

### Срок жизни кеша:

```typescript
private static CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 часа

// Изменить на 1 час:
private static CACHE_DURATION = 1000 * 60 * 60 * 1;
```

---

## 📊 Производительность

| Операция | Среднее время | Источник |
|----------|--------------|----------|
| Получение из кеша памяти | <1ms | Map |
| Получение из локальной БД | ~10ms | SQLite |
| Получение с backend API | ~500-2000ms | Сеть |
| Конвертация (с кешем) | <5ms | Вычисление |
| Инициализация (3 валюты) | ~2-5 сек | API × 3 |

---

## ✅ Лучшие практики

### ✅ Делайте:
- Используйте `convert()` для конвертации сумм
- Проверяйте `rate !== null` перед использованием
- Инициализируйте курсы при запуске приложения
- Показывайте курс пользователю при переводах

### ❌ Не делайте:
- Не вызывайте `getRate()` в цикле без кеширования
- Не игнорируйте `null` результаты
- Не храните курсы в компонентах (используйте сервис)
- Не обновляйте курсы при каждом рендере

---

[[05-Services/ApiService|Следующая: ApiService →]]

[[05-Services/Overview|← Назад к сервисам]]
