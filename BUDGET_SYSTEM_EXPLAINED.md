# 📚 СИСТЕМА БЮДЖЕТИРОВАНИЯ - ОБЪЯСНЕНИЕ ДЛЯ НОВИЧКА

## 🎯 ЧТО ЭТО ТАКОЕ?

Система бюджетирования помогает пользователю управлять деньгами по правилу 50/30/20:
- **50%** дохода → Обязательные расходы (еда, транспорт, коммунальные)
- **30%** дохода → Необязательные расходы (развлечения, кафе, покупки)
- **20%** дохода → Сбережения (накопления на будущее)

**Пример:**
- Получил зарплату 100,000₸
- Автоматически делится: 50,000₸ (обязательное) + 30,000₸ (необязательное) + 20,000₸ (сбережения)
- Система показывает сколько можно тратить каждый день

---

## 📁 СТРУКТУРА ФАЙЛОВ

### 1️⃣ ОСНОВНОЙ ФАЙЛ: `src/hooks/useBudget.ts`
**Что делает:** Это "мозг" системы бюджетирования. Содержит всю логику расчетов.

**Основные переменные:**
```typescript
budgetSettings = {
  enabled: true,              // Включена ли система
  essentialPercentage: 50,    // % на обязательное
  nonEssentialPercentage: 30, // % на необязательное
  savingsPercentage: 20       // % на сбережения
}

trackingData = {
  totalIncomeThisMonth: 0,    // Сколько заработал в этом месяце
  essentialSpent: 0,          // Сколько потратил на обязательное
  nonEssentialSpent: 0,       // Сколько потратил на необязательное
  savingsAllocated: 0,        // Сколько отложил в сбережения
  spentToday: 0,              // Сколько потратил сегодня
  dailyBudget: 0,             // Дневной лимит
  lastResetDate: "...",       // Когда последний раз сбрасывали месяц
  lastDailyResetDate: "..."   // Когда последний раз сбрасывали день
}
```

**Основные функции:**

#### `processIncome(amount, includeBudget)`
**Что делает:** Обрабатывает новый доход

**Пример:**
```javascript
// Пользователь добавил доход 100,000₸
processIncome(100000, true)

// Система делает:
// 1. totalIncomeThisMonth = 100,000
// 2. Считает дневной бюджет:
//    - Осталось дней в месяце = 10
//    - Можно тратить = (50,000 + 30,000) / 10 = 8,000₸ в день
// 3. Сохраняет в AsyncStorage
```

#### `recordExpense(amount, categoryType)`
**Что делает:** Записывает расход

**Пример:**
```javascript
// Пользователь купил продукты на 5,000₸
recordExpense(5000, 'essential')

// Система делает:
// 1. essentialSpent = 5,000
// 2. spentToday = 5,000
// 3. Пересчитывает дневной лимит
// 4. Сохраняет
```

#### `getDailyAllowance()`
**Что делает:** Показывает сколько МОЖНО еще потратить СЕГОДНЯ

**Формула:**
```javascript
// dailyBudget - это сколько можно тратить в день
// spentToday - это сколько уже потратил сегодня
// Результат - сколько осталось на сегодня

const dailyAllowance = dailyBudget - spentToday
// Если 8,000 - 5,000 = 3,000₸ осталось
```

#### `getDailyBudget()`
**Что делает:** Рассчитывает дневной бюджет

**Формула:**
```javascript
// Шаг 1: Считаем сколько денег выделено на расходы
const essential = totalIncome * 50 / 100       // 100,000 * 50% = 50,000
const nonEssential = totalIncome * 30 / 100    // 100,000 * 30% = 30,000

// Шаг 2: Вычитаем что уже потратили
const remainingEssential = essential - essentialSpent
const remainingNonEssential = nonEssential - nonEssentialSpent

// Шаг 3: Считаем общий остаток
const totalRemaining = remainingEssential + remainingNonEssential

// Шаг 4: Делим на оставшиеся дни месяца
const daysRemaining = (последний день месяца - сегодня) + 1
const dailyBudget = totalRemaining / daysRemaining
```

**Пример расчета:**
```
Доход: 100,000₸
Обязательное: 50,000₸, потрачено: 10,000₸ → осталось 40,000₸
Необязательное: 30,000₸, потрачено: 5,000₸ → осталось 25,000₸
Общий остаток: 40,000 + 25,000 = 65,000₸
Осталось дней: 10
Дневной бюджет: 65,000 / 10 = 6,500₸ в день
```

#### Автоматические сбросы:

**Сброс дня (каждую полночь):**
```javascript
// Обнуляется spentToday
// Пересчитывается dailyBudget
```

**Сброс месяца (1 число):**
```javascript
// Все обнуляется:
// totalIncomeThisMonth = 0
// essentialSpent = 0
// nonEssentialSpent = 0
// savingsAllocated = 0
// spentToday = 0
```

---

### 2️⃣ КОНТЕКСТ: `src/context/BudgetContext.tsx`
**Что делает:** Делает данные из `useBudget.ts` доступными во всем приложении

**Простое объяснение:**
```javascript
// Без контекста:
// Каждый экран должен вызывать useBudget() отдельно
// Данные не синхронизированы между экранами

// С контекстом:
// Вызываем useBudget() ОДИН раз в BudgetProvider
// Все экраны получают одни и те же данные
// Изменения видны везде сразу
```

**Как используется:**
```javascript
// В любом компоненте:
const { budgetSettings, getDailyAllowance } = useBudgetContext()

// Получаем доступ ко всем функциям и данным
```

---

### 3️⃣ ЭКРАН НАСТРОЕК: `src/screens/BudgetSystemSettings.tsx`
**Что делает:** Позволяет пользователю настроить систему

**Компоненты:**

1. **Переключатель вкл/выкл:**
```javascript
<Switch
  value={isEnabled}
  onValueChange={handleToggleBudgetSystem}
/>

// Когда пользователь включает:
handleToggleBudgetSystem() {
  saveBudgetSettings({ enabled: true })
}
```

2. **Поля ввода процентов:**
```javascript
// 3 поля:
// - Обязательные расходы: ___%
// - Необязательные расходы: ___%
// - Сбережения: ___%

// Валидация:
const total = essential + nonEssential + savings
if (total !== 100) {
  Alert.alert("Сумма должна быть 100%!")
}
```

3. **Кнопка "Сохранить":**
```javascript
saveSettings() {
  // Проверяем валидацию
  // Сохраняем в useBudget
  // Закрываем экран
}
```

---

### 4️⃣ ЭКРАН ОБЗОРА: `src/screens/PlansScreen.tsx`
**Что делает:** Показывает текущее состояние бюджета

**Отображаемая информация:**

1. **Сводка месяца:**
```javascript
// Доход за месяц: 100,000₸
// Дневной бюджет: 6,500₸
// Потрачено сегодня: 5,000₸
// Можно потратить сегодня: 1,500₸ (зеленым если >= 0, красным если < 0)
```

2. **Карточки категорий:**

Для каждой категории (Обязательное, Необязательное, Сбережения):
```javascript
renderBudgetCard(type) {
  // 1. Считаем выделенную сумму
  const allocated = totalIncome * percentage / 100

  // 2. Берем потраченную сумму
  const spent = trackingData.essentialSpent (или nonEssentialSpent)

  // 3. Считаем остаток
  const remaining = allocated - spent

  // 4. Считаем прогресс
  const progress = (spent / allocated) * 100

  // 5. Отображаем:
  // - Выделено: 50,000₸
  // - Потрачено: 10,000₸
  // - Осталось: 40,000₸
  // - Прогресс-бар: 20% (зеленый)

  // Если spent > allocated - прогресс-бар красный (перерасход)
}
```

---

### 5️⃣ УПРАВЛЕНИЕ КАТЕГОРИЯМИ: `src/screens/CategorySettingsScreen.tsx`
**Что делает:** Позволяет назначить тип бюджета каждой категории

**Логика:**
```javascript
// У каждой категории есть поле budgetCategory
category = {
  id: "groceries",
  name: "Продукты",
  budgetCategory: "essential"  // или "nonEssential"
}

// Когда пользователь создает расход:
// 1. Выбирает категорию "Продукты"
// 2. Система смотрит budgetCategory = "essential"
// 3. Вызывает recordExpense(amount, 'essential')
```

**Кнопки:**
```javascript
// Для каждой категории 2 кнопки:
[Обязательные] [Необязательные]

// При нажатии:
handleBudgetCategoryChange(categoryId, 'essential') {
  // Обновляем поле budgetCategory в базе данных
  updateCategory(categoryId, { budgetCategory: 'essential' })
}
```

---

### 6️⃣ ДОБАВЛЕНИЕ ТРАНЗАКЦИИ: `src/components/AddTransactionModal.tsx`
**Что делает:** Обрабатывает новые доходы и расходы

**Логика добавления дохода:**
```javascript
handleSave() {
  if (isIncome && includeBudget) {
    // 1. Сначала обрабатываем доход через систему бюджета
    await processIncome(amount, true)
    // Это распределяет деньги: 50% + 30% + 20%

    // 2. Потом создаем саму транзакцию в базе данных
    await createTransaction({
      type: 'income',
      amount: amount,
      ...
    })
  }
}
```

**Логика добавления расхода:**
```javascript
handleSave() {
  if (!isIncome && isBudgetEnabled) {
    // 1. Определяем тип категории
    const category = categories.find(c => c.id === selectedCategoryId)
    const isEssential = category.budgetCategory === 'essential'

    // 2. Записываем расход в нужную категорию бюджета
    await recordExpense(amount, isEssential ? 'essential' : 'nonEssential')

    // 3. Создаем транзакцию
    await createTransaction({
      type: 'expense',
      amount: amount,
      ...
    })
  }
}
```

**Переключатель "Учитывать в бюджете":**
```javascript
// Показывается только для доходов, только если система включена
{isIncome && isBudgetEnabled && (
  <Switch
    value={includeBudget}
    onValueChange={setIncludeBudget}
  />
)}

// По умолчанию включен:
useEffect(() => {
  if (isIncome && isBudgetEnabled) {
    setIncludeBudget(true)
  }
}, [isIncome, isBudgetEnabled])
```

---

### 7️⃣ ОТОБРАЖЕНИЕ В ЗАГОЛОВКЕ: `src/components/BalanceHeader.tsx`
**Что делает:** Показывает дневной лимит в шапке приложения

**Логика:**
```javascript
<BalanceHeader showDailyAllowance={true} />

// Отображает:
// Общий баланс: 150,000₸
// Можно потратить сегодня: 3,500₸ (зеленым/красным)
```

---

## 🔄 КАК ВСЕ РАБОТАЕТ ВМЕСТЕ

### Сценарий 1: Пользователь включает систему бюджетирования

```
1. Пользователь: Планы → Система бюджетирования → Включить
   ↓
2. BudgetSystemSettings.tsx:
   - handleToggleBudgetSystem()
   - saveBudgetSettings({ enabled: true })
   ↓
3. useBudget.ts:
   - budgetSettings.enabled = true
   - Сохраняет в AsyncStorage('@cashcraft_budget_settings')
   ↓
4. BudgetContext:
   - Все компоненты получают isEnabled = true
   ↓
5. BalanceHeader, PlansScreen, AddTransactionModal:
   - Показывают информацию о бюджете
```

### Сценарий 2: Пользователь добавляет доход

```
1. Пользователь: FAB кнопка (+) → Доход → 100,000₸
   ↓
2. AddTransactionModal.tsx:
   - Проверяет isBudgetEnabled = true
   - Показывает переключатель "Учитывать в бюджете" (включен)
   - Пользователь нажимает "Сохранить"
   ↓
3. handleSave():
   if (isIncome && includeBudget) {
     await processIncome(100000, true)
   }
   ↓
4. useBudget.ts → processIncome():
   - totalIncomeThisMonth = 100,000
   - Считает дневной бюджет:
     * essential = 100,000 * 50% = 50,000
     * nonEssential = 100,000 * 30% = 30,000
     * savings = 100,000 * 20% = 20,000
     * daysRemaining = 10 (пример)
     * dailyBudget = (50,000 + 30,000) / 10 = 8,000₸
   - Сохраняет в AsyncStorage('@cashcraft_budget_tracking')
   ↓
5. BudgetContext:
   - Все компоненты получают обновленные данные
   ↓
6. PlansScreen обновляется:
   - Доход за месяц: 100,000₸
   - Дневной бюджет: 8,000₸
   - Карточки:
     * Обязательные: 50,000₸ (0% использовано)
     * Необязательные: 30,000₸ (0% использовано)
     * Сбережения: 20,000₸ (0% накоплено)
   ↓
7. BalanceHeader обновляется:
   - Можно потратить сегодня: 8,000₸ (зеленым)
```

### Сценарий 3: Пользователь добавляет расход

```
1. Пользователь: FAB (+) → Расход → Категория "Продукты" → 5,000₸
   ↓
2. AddTransactionModal.tsx:
   - handleSave()
   - Находит категорию "Продукты"
   - Проверяет category.budgetCategory = "essential"
   ↓
3. recordExpense(5000, 'essential'):
   - essentialSpent = 5,000
   - spentToday = 5,000
   - Пересчитывает dailyBudget:
     * remainingEssential = 50,000 - 5,000 = 45,000
     * remainingNonEssential = 30,000
     * totalRemaining = 75,000
     * daysRemaining = 10
     * dailyBudget = 75,000 / 10 = 7,500₸
   - Сохраняет
   ↓
4. PlansScreen обновляется:
   - Обязательные расходы:
     * Выделено: 50,000₸
     * Потрачено: 5,000₸ (красным)
     * Осталось: 45,000₸ (зеленым)
     * Прогресс: 10% (зеленый)
   - Дневной бюджет: 7,500₸
   - Потрачено сегодня: 5,000₸
   - Можно потратить сегодня: 2,500₸
   ↓
5. BalanceHeader:
   - Можно потратить сегодня: 2,500₸ (зеленым)
```

### Сценарий 4: Наступает полночь (новый день)

```
1. useBudget.ts → scheduleNextDailyReset():
   - Таймер срабатывает в 00:00
   ↓
2. performResetIfNeeded():
   - Проверяет lastDailyResetDate
   - Видит что день изменился
   ↓
3. Дневной сброс:
   - spentToday = 0 (обнуляем траты дня)
   - Пересчитываем dailyBudget:
     * remainingEssential = 50,000 - 5,000 = 45,000
     * remainingNonEssential = 30,000
     * totalRemaining = 75,000
     * daysRemaining = 9 (на один день меньше!)
     * dailyBudget = 75,000 / 9 = 8,333₸
   - Сохраняет
   ↓
4. PlansScreen обновляется:
   - Дневной бюджет: 8,333₸
   - Потрачено сегодня: 0₸
   - Можно потратить сегодня: 8,333₸
```

### Сценарий 5: Наступает новый месяц

```
1. useBudget.ts → performResetIfNeeded():
   - Проверяет lastResetDate
   - Видит что месяц изменился
   ↓
2. Месячный сброс:
   - totalIncomeThisMonth = 0
   - essentialSpent = 0
   - nonEssentialSpent = 0
   - savingsAllocated = 0
   - spentToday = 0
   - dailyBudget = 0
   ↓
3. PlansScreen:
   - Показывает: "Добавьте доход чтобы начать"
   ↓
4. BalanceHeader:
   - Скрывает дневной лимит
```

---

## 📂 ХРАНЕНИЕ ДАННЫХ

### AsyncStorage (локальное хранилище телефона)

**Ключ 1: `@cashcraft_budget_settings`**
```json
{
  "enabled": true,
  "essentialPercentage": 50,
  "nonEssentialPercentage": 30,
  "savingsPercentage": 20
}
```
**Когда меняется:** При изменении настроек в BudgetSystemSettings

**Ключ 2: `@cashcraft_budget_tracking`**
```json
{
  "totalIncomeThisMonth": 100000,
  "essentialSpent": 5000,
  "nonEssentialSpent": 0,
  "savingsAllocated": 20000,
  "spentToday": 0,
  "dailyBudget": 8333,
  "lastResetDate": "2025-10-01T00:00:00.000Z",
  "lastDailyResetDate": "2025-10-27T00:00:00.000Z"
}
```
**Когда меняется:**
- При добавлении дохода
- При добавлении расхода
- Каждую полночь (дневной сброс)
- 1 числа месяца (месячный сброс)

---

## 🎨 ЦВЕТОВАЯ ИНДИКАЦИЯ

### В PlansScreen:

**Прогресс-бары:**
```javascript
if (spent > allocated) {
  color = '#F44336' // КРАСНЫЙ - перерасход!
} else {
  color = categoryColor // ЗЕЛЕНЫЙ - все ок
}
```

**Остаток:**
```javascript
if (remaining >= 0) {
  color = '#4CAF50' // ЗЕЛЕНЫЙ - есть деньги
} else {
  color = '#F44336' // КРАСНЫЙ - в минусе
}
```

### В BalanceHeader:

**Дневной лимит:**
```javascript
if (dailyAllowance > 0) {
  color = '#4CAF50' // ЗЕЛЕНЫЙ - можно тратить
} else if (dailyAllowance === 0) {
  color = '#FF9800' // ОРАНЖЕВЫЙ - лимит исчерпан
} else {
  color = '#F44336' // КРАСНЫЙ - перерасход
}
```

---

## ❓ ЧАСТЫЕ ВОПРОСЫ

### Q: Почему дневной бюджет меняется каждый день?
**A:** Потому что он делится на оставшиеся дни месяца. Чем меньше дней осталось, тем больше можно тратить в день (если не перерасходовали).

Пример:
```
Остаток: 60,000₸
Осталось дней: 10 → можно 6,000₸/день
Осталось дней: 5 → можно 12,000₸/день
```

### Q: Что если я потратил больше чем выделено?
**A:** Система покажет:
- Красный прогресс-бар (больше 100%)
- Отрицательный остаток (красным цветом)
- Но тратить не запретит - это просто индикатор

### Q: Сбережения куда-то переводятся?
**A:** Нет, это виртуальное распределение. Деньги остаются на вашем счету, но система "помечает" 20% как сбережения и не учитывает их в дневном лимите.

### Q: Можно изменить проценты?
**A:** Да! Планы → Система бюджетирования → Настроить проценты. Главное чтобы сумма была 100%.

### Q: Если выключить систему, данные потеряются?
**A:** Нет, они сохранены в AsyncStorage. При повторном включении все восстановится.

---

## 🔧 ДЛЯ РАЗРАБОТЧИКОВ

### Как добавить новую функцию?

**Пример: Хочу добавить уведомление при перерасходе**

1. **Где добавить логику:**
```javascript
// В useBudget.ts → recordExpense()
const recordExpense = async (amount, categoryType) => {
  // ... существующий код ...

  // НОВЫЙ КОД:
  const newDailyAllowance = newTrackingData.dailyBudget - newTrackingData.spentToday
  if (newDailyAllowance < 0) {
    // Показать уведомление
    Alert.alert(
      'Внимание!',
      `Вы превысили дневной лимит на ${Math.abs(newDailyAllowance)}₸`
    )
  }
}
```

2. **Где тестировать:**
- Добавить доход 10,000₸
- Дневной лимит будет ~3,000₸
- Добавить расход 5,000₸
- Должно появиться уведомление

### Как дебажить?

**Включить логи:**
```javascript
// В useBudget.ts уже есть много console.log
// Смотрите в Metro bundler:

console.log('💰 [useBudget] Daily allowance:', getDailyAllowance())
console.log('📊 [useBudget] Tracking data:', trackingData)
```

**Проверить AsyncStorage:**
```javascript
// В любом компоненте:
import AsyncStorage from '@react-native-async-storage/async-storage'

const checkStorage = async () => {
  const settings = await AsyncStorage.getItem('@cashcraft_budget_settings')
  const tracking = await AsyncStorage.getItem('@cashcraft_budget_tracking')
  console.log('Settings:', JSON.parse(settings))
  console.log('Tracking:', JSON.parse(tracking))
}
```

---

## 📝 ИТОГО

**Основные файлы:**
1. `useBudget.ts` - вся логика расчетов
2. `BudgetContext.tsx` - делает данные доступными везде
3. `BudgetSystemSettings.tsx` - настройки процентов
4. `PlansScreen.tsx` - отображение бюджета
5. `CategorySettingsScreen.tsx` - назначение типов категориям
6. `AddTransactionModal.tsx` - обработка доходов/расходов
7. `BalanceHeader.tsx` - дневной лимит в шапке

**Основные функции:**
- `processIncome()` - обработать доход
- `recordExpense()` - записать расход
- `getDailyBudget()` - получить дневной бюджет
- `getDailyAllowance()` - сколько можно еще потратить сегодня

**Основные данные:**
- `budgetSettings` - настройки (проценты)
- `trackingData` - текущее состояние (доход, траты, лимиты)

**Хранилище:**
- AsyncStorage, 2 ключа
- Автоматическое сохранение при любых изменениях
- Автоматические сбросы (день, месяц)

---

**Автор:** Claude
**Дата:** 27 октября 2025
**Версия:** 1.0
