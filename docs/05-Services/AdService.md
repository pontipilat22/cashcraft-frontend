# 📢 AdService - Управление рекламой

[[05-Services/Overview|← Назад к сервисам]]

---

## 📖 Что это?

**AdService** - сервис для управления показом рекламы в приложении. Контролирует:
- ⏱ Частоту показа interstitial рекламы
- 📊 Счетчики транзакций и счетов
- 🚫 Периоды без рекламы (после просмотра rewarded видео)
- ✅ Проверку Premium подписки

**Файл:** `src/services/AdService.ts`

---

## 🎯 Основные задачи

1. **Отслеживать действия пользователя:**
   - Создание транзакций (показ каждые 6 транзакций)
   - Создание счетов (показ каждый 3-й счет)
   - Переключение вкладок (показ раз в день)

2. **Контролировать интервалы:**
   - Минимум 2 минуты между показами
   - Не показывать слишком часто

3. **Учитывать Premium:**
   - Не показывать рекламу Premium пользователям

---

## 📦 Структура сервиса

```typescript
export class AdServiceClass {
  // Приватные свойства (состояние)
  private transactionCount: number = 0;        // Счетчик транзакций
  private accountCount: number = 0;            // Счетчик счетов
  private lastInterstitialTime: number = 0;    // Время последнего показа

  // Публичные методы
  async init(): Promise<void>
  async incrementTransactionCount(): Promise<void>
  async incrementAccountCount(): Promise<void>
  async canShowInterstitial(): Promise<boolean>
  async markInterstitialShown(): Promise<void>
  async shouldShowInterstitialForAccount(): Promise<boolean>
  async shouldShowInterstitialForTabSwitch(): Promise<boolean>
  async markTabSwitchAdShown(): Promise<void>
  // ...
}

export const AdService = new AdServiceClass();
```

---

## 🔑 Ключи хранилища (AsyncStorage)

```typescript
const STORAGE_KEYS = {
  LAST_INTERSTITIAL: 'last_interstitial_timestamp',     // Время последнего показа
  TRANSACTION_COUNT: 'ad_transaction_count',            // Счетчик транзакций
  ACCOUNT_COUNT: 'ad_account_count',                    // Счетчик счетов
  AD_FREE_UNTIL: 'ad_free_until_timestamp',             // Период без рекламы
  LAST_TAB_SWITCH_AD: 'last_tab_switch_ad_date',        // Дата показа за переключение (YYYY-MM-DD)
};
```

---

## 📚 Основные методы

### 1️⃣ Инициализация

```typescript
/**
 * Инициализация сервиса
 * Загружает сохраненные счетчики из AsyncStorage
 */
async init(): Promise<void>
```

**Когда вызывается:**
При запуске приложения (в `App.tsx`)

**Что делает:**
1. Загружает `transactionCount` из хранилища
2. Загружает `accountCount` из хранилища
3. Загружает `lastInterstitialTime` из хранилища

**Пример:**
```typescript
// В App.tsx
useEffect(() => {
  AdService.init();
}, []);
```

---

### 2️⃣ Отслеживание транзакций

```typescript
/**
 * Увеличить счетчик транзакций
 * Вызывается после создания каждой транзакции
 */
async incrementTransactionCount(): Promise<void>
```

**Когда вызывается:**
После создания транзакции

**Что делает:**
1. Увеличивает `transactionCount` на 1
2. Сохраняет в AsyncStorage

**Пример:**
```typescript
// В хуке useInterstitialAd
const trackTransaction = async () => {
  if (!isPremium) {
    await AdService.incrementTransactionCount();

    // Проверяем, пора ли показать рекламу (каждые 6 транзакций)
    const canShow = await AdService.canShowInterstitial();
    if (canShow && isLoaded) {
      await showAd();
    }
  }
};
```

---

```typescript
/**
 * Проверить, можно ли показать interstitial рекламу
 * @returns true если прошло 6 транзакций и минимальный интервал
 */
async canShowInterstitial(): Promise<boolean>
```

**Логика проверки:**
1. ✅ Прошел минимальный интервал (2 минуты)?
2. ✅ Счетчик транзакций >= 6?
3. ✅ Нет активного периода "без рекламы"?

**Пример:**
```typescript
const canShow = await AdService.canShowInterstitial();
if (canShow) {
  console.log('Можно показать рекламу!');
}
// Вывод:
// [AdService] Can show interstitial! Transactions: 6
```

---

### 3️⃣ Отслеживание счетов

```typescript
/**
 * Увеличить счетчик счетов
 * Вызывается после создания каждого счета
 */
async incrementAccountCount(): Promise<void>
```

**Когда вызывается:**
После создания счета

**Пример:**
```typescript
// В AccountsScreen
const handleSaveAccount = async (data) => {
  await createAccount(data);

  // Отслеживаем для рекламы
  await trackAccountCreation();
};
```

---

```typescript
/**
 * Проверить, нужно ли показать interstitial при создании счета
 * Показываем каждый 3-й счет: 3, 6, 9, 12...
 */
async shouldShowInterstitialForAccount(): Promise<boolean>
```

**Логика:**
1. ✅ `accountCount % 3 === 0` (каждый 3-й)?
2. ✅ Прошло минимум 2 минуты с последнего показа?

**Пример:**
```typescript
// Счет 1 - не показываем
await AdService.incrementAccountCount(); // count = 1
const shouldShow = await AdService.shouldShowInterstitialForAccount();
// shouldShow = false

// Счет 2 - не показываем
await AdService.incrementAccountCount(); // count = 2
const shouldShow = await AdService.shouldShowInterstitialForAccount();
// shouldShow = false

// Счет 3 - показываем!
await AdService.incrementAccountCount(); // count = 3
const shouldShow = await AdService.shouldShowInterstitialForAccount();
// shouldShow = true ✅
```

---

### 4️⃣ Отслеживание переключения вкладок

```typescript
/**
 * Проверить, нужно ли показать рекламу при переключении вкладок
 * Показываем один раз в день
 */
async shouldShowInterstitialForTabSwitch(): Promise<boolean>
```

**Логика:**
1. Получаем дату последнего показа (формат: `YYYY-MM-DD`)
2. Получаем сегодняшнюю дату
3. Если даты **разные** → показываем

**Пример:**
```typescript
// 2025-10-29, первое переключение
const shouldShow = await AdService.shouldShowInterstitialForTabSwitch();
// shouldShow = true ✅

await AdService.markTabSwitchAdShown();

// 2025-10-29, второе переключение (тот же день)
const shouldShow = await AdService.shouldShowInterstitialForTabSwitch();
// shouldShow = false ❌

// 2025-10-30, первое переключение (новый день)
const shouldShow = await AdService.shouldShowInterstitialForTabSwitch();
// shouldShow = true ✅
```

---

```typescript
/**
 * Отметить показ рекламы при переключении вкладок
 */
async markTabSwitchAdShown(): Promise<void>
```

**Что делает:**
Сохраняет текущую дату в формате `YYYY-MM-DD`:
```typescript
const today = new Date().toISOString().split('T')[0]; // "2025-10-29"
await AsyncStorage.setItem(STORAGE_KEYS.LAST_TAB_SWITCH_AD, today);
```

---

### 5️⃣ Отметить показ рекламы

```typescript
/**
 * Отметить показ interstitial рекламы
 * Сбрасывает счетчик транзакций и сохраняет время показа
 */
async markInterstitialShown(): Promise<void>
```

**Что делает:**
1. Сохраняет текущее время: `lastInterstitialTime = Date.now()`
2. Сбрасывает счетчик транзакций: `transactionCount = 0`

**Пример:**
```typescript
// После показа рекламы
await AdService.markInterstitialShown();

console.log('[AdService] Interstitial shown at:', new Date().toISOString());
// Вывод:
// [AdService] Interstitial shown at: 2025-10-29T15:30:45.000Z
```

---

### 6️⃣ Проверка показа баннеров

```typescript
/**
 * Проверить, нужно ли показывать баннеры
 * @param isPremium - есть ли у пользователя подписка Premium
 */
async shouldShowBanners(isPremium: boolean): Promise<boolean>
```

**Логика:**
1. Если Premium → `false`
2. Если AdSettings.showBanners = false → `false`
3. Если активен период "без рекламы" → `false`
4. Иначе → `true`

**Пример:**
```typescript
const { isPremium } = useSubscription();
const shouldShow = await AdService.shouldShowBanners(isPremium);

if (shouldShow) {
  return <BannerAd />;
}
return null;
```

---

### 7️⃣ Период "без рекламы" (Rewarded Ad)

```typescript
/**
 * Активировать период без рекламы (награда за просмотр)
 * @param hours - количество часов без рекламы
 */
async activateAdFree(hours: number = 24): Promise<void>
```

**Что делает:**
Сохраняет timestamp окончания периода:
```typescript
const until = Date.now() + hours * 60 * 60 * 1000;
await AsyncStorage.setItem(STORAGE_KEYS.AD_FREE_UNTIL, until.toString());
```

**Пример:**
```typescript
// После просмотра rewarded видео
await AdService.activateAdFree(24); // 24 часа без рекламы

// Проверка активности
const isActive = await AdService.isAdFreeActive();
// isActive = true

// Через 24 часа
const isActive = await AdService.isAdFreeActive();
// isActive = false
```

---

## 📊 Настройки рекламы

Настройки хранятся в `src/config/admob.config.ts`:

```typescript
export const AdSettings = {
  showBanners: true,                        // Показывать banner рекламу
  showInterstitials: true,                  // Показывать interstitial рекламу
  transactionsBeforeInterstitial: 6,        // Каждые 6 транзакций
  minInterstitialInterval: 1000 * 60 * 2,   // Минимум 2 минуты между показами
};
```

---

## 🔄 Жизненный цикл рекламы

### Сценарий 1: Транзакции

```
1. Пользователь создает транзакцию
   ↓
2. Вызывается trackTransaction()
   ↓
3. AdService.incrementTransactionCount()
   transactionCount: 0 → 1
   ↓
4. Проверка: canShowInterstitial()?
   Нет, нужно 6 транзакций
   ↓
... (создает еще 5 транзакций) ...
   ↓
5. transactionCount = 6
   ↓
6. canShowInterstitial() = true ✅
   ↓
7. Показывается реклама
   ↓
8. markInterstitialShown()
   transactionCount: 6 → 0
   lastInterstitialTime = сейчас
```

---

### Сценарий 2: Счета

```
1. Пользователь создает 1-й счет
   accountCount: 0 → 1
   shouldShowInterstitialForAccount() = false
   ↓
2. Создает 2-й счет
   accountCount: 1 → 2
   shouldShowInterstitialForAccount() = false
   ↓
3. Создает 3-й счет
   accountCount: 2 → 3
   shouldShowInterstitialForAccount() = true ✅
   ↓
4. Показывается реклама
   ↓
5. Создает 4-й счет
   accountCount: 3 → 4
   shouldShowInterstitialForAccount() = false
   ↓
... цикл повторяется каждые 3 счета ...
```

---

### Сценарий 3: Переключение вкладок

```
День 1, 09:00
   ↓
1. Пользователь переключает вкладку
   ↓
2. shouldShowInterstitialForTabSwitch()
   lastAdDate = null
   today = "2025-10-29"
   → return true ✅
   ↓
3. Показывается реклама
   ↓
4. markTabSwitchAdShown()
   lastAdDate = "2025-10-29"
   ↓
День 1, 15:00 (переключает еще раз)
   ↓
5. shouldShowInterstitialForTabSwitch()
   lastAdDate = "2025-10-29"
   today = "2025-10-29"
   → return false ❌
   ↓
День 2, 08:00 (новый день!)
   ↓
6. shouldShowInterstitialForTabSwitch()
   lastAdDate = "2025-10-29"
   today = "2025-10-30"
   → return true ✅
```

---

## 🎨 Использование в компонентах

### Пример 1: В хуке `useInterstitialAd`

```typescript
// src/hooks/useInterstitialAd.ts
export const useInterstitialAd = () => {
  const { isPremium } = useSubscription();

  const trackTransaction = async () => {
    if (!isPremium) {
      await AdService.incrementTransactionCount();

      const canShow = await AdService.canShowInterstitial();
      if (canShow && isLoaded) {
        await showAd();
      }
    }
  };

  const trackAccountCreation = async () => {
    if (!isPremium) {
      await AdService.incrementAccountCount();

      const shouldShow = await AdService.shouldShowInterstitialForAccount();
      if (shouldShow && isLoaded) {
        await showAdForAccount();
      }
    }
  };

  return {
    trackTransaction,
    trackAccountCreation,
  };
};
```

### Пример 2: В компоненте Banner Ad

```typescript
// src/components/ads/BannerAd.tsx
export const BannerAd = () => {
  const { isPremium } = useSubscription();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const checkIfShouldShow = async () => {
      const should = await AdService.shouldShowBanners(isPremium);
      setShouldShow(should);
    };

    checkIfShouldShow();
  }, [isPremium]);

  if (!shouldShow) return null;

  return <GoogleBannerAd ... />;
};
```

---

## 🐛 Отладка

### Включить подробные логи:

Сервис уже логирует важные события:

```typescript
console.log('[AdService] Transaction count:', this.transactionCount);
console.log('[AdService] Can show interstitial!');
console.log('[AdService] Interstitial shown at:', new Date(now).toISOString());
```

### Проверить состояние:

```typescript
// В консоли (React Native Debugger)
import { AdService } from './src/services/AdService';

// Инициализация
await AdService.init();

// Проверка счетчиков (в приватных свойствах, нужен доступ)
// Или проверить через AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const transactionCount = await AsyncStorage.getItem('ad_transaction_count');
const accountCount = await AsyncStorage.getItem('ad_account_count');
const lastInterstitial = await AsyncStorage.getItem('last_interstitial_timestamp');

console.log('Transaction count:', transactionCount);
console.log('Account count:', accountCount);
console.log('Last interstitial:', new Date(parseInt(lastInterstitial)).toISOString());
```

### Сбросить все данные (для тестирования):

```typescript
await AdService.reset();
// Сбросит все счетчики и даты
```

---

## ✅ Итоговая система рекламы

| Тип | Условие показа | Частота |
|-----|---------------|---------|
| **Interstitial** | Каждые 6 транзакций | После создания 6, 12, 18... транзакций |
| **Interstitial** | Каждый 3-й счет | После создания 3, 6, 9... счетов |
| **Interstitial** | Переключение вкладок | Раз в день |
| **Banner** | На экране "Еще" | Всегда (если не Premium) |
| **Минимальный интервал** | Между любыми interstitial | 2 минуты |

---

[[05-Services/ExchangeRateService|Следующая: ExchangeRateService →]]

[[05-Services/Overview|← Назад к сервисам]]
