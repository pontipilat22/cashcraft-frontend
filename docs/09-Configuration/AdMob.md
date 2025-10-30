# 📢 Конфигурация AdMob

[[README|← Назад к содержанию]]

---

## 📖 Что такое AdMob?

**Google AdMob** - платформа для монетизации мобильных приложений через рекламу. CashCraft использует AdMob для показа рекламы бесплатным пользователям.

**Файл конфигурации:** `src/config/admob.config.ts`

---

## 💰 Типы рекламы в CashCraft

| Тип | Описание | Где показывается | Частота |
|-----|----------|-----------------|---------|
| **Banner** | Горизонтальный баннер внизу экрана | Экран "Еще" | Всегда |
| **Interstitial** | Полноэкранная реклама | Между действиями | Каждые 6 транзакций, каждый 3-й счет, раз в день при переключении вкладок |
| **Rewarded** | Реклама за награду | - | Отключена |

---

## 📋 Структура конфигурации

**Файл:** `src/config/admob.config.ts`

```typescript
import { Platform } from 'react-native';

/**
 * AdMob конфигурация для CashCraft
 *
 * ВАЖНО: Используются PRODUCTION ID (не тестовые!)
 */

// Получение ID в зависимости от платформы
const getAdMobIds = () => {
  const IDS = {
    android: {
      banner: 'ca-app-pub-8853061795959758/9297826581',
      interstitial: 'ca-app-pub-8853061795959758/5043365733',
      rewarded: 'ca-app-pub-8853061795959758/6188146193',
    },
    ios: {
      banner: 'ca-app-pub-3940256099942544/2934735716',
      interstitial: 'ca-app-pub-3940256099942544/4411468910',
      rewarded: 'ca-app-pub-3940256099942544/1712485313',
    },
  };

  return Platform.OS === 'ios' ? IDS.ios : IDS.android;
};

const ids = getAdMobIds();

// Экспорт конфигурации
export const AdMobConfig = {
  banner: ids.banner,
  interstitial: ids.interstitial,
  rewarded: ids.rewarded,
};

// Настройки показа рекламы
export const AdSettings = {
  showBanners: true,                        // Показывать banner рекламу
  showInterstitials: true,                  // Показывать interstitial рекламу
  transactionsBeforeInterstitial: 6,        // Каждые 6 транзакций
  minInterstitialInterval: 1000 * 60 * 2,   // Минимум 2 минуты между показами (мс)
};
```

---

## 🔑 AdMob ID

### Структура ID:

```
ca-app-pub-PUBLISHER_ID/AD_UNIT_ID
             │              │
             │              └─ ID конкретной рекламной единицы
             └─ ID вашего аккаунта в AdMob
```

**Пример:**
```
ca-app-pub-8853061795959758/9297826581
            └─ Publisher ID   └─ Banner Ad Unit ID
```

### Где взять свои ID:

1. Зайдите в [AdMob Console](https://apps.admob.com/)
2. Создайте приложение (если еще не создано)
3. Создайте рекламные блоки (Ad Units):
   - Banner Ad Unit
   - Interstitial Ad Unit
   - Rewarded Ad Unit (опционально)
4. Скопируйте ID каждого блока

---

## 🎨 Текущая конфигурация

### Android (Production):

```typescript
banner: 'ca-app-pub-8853061795959758/9297826581'
interstitial: 'ca-app-pub-8853061795959758/5043365733'
rewarded: 'ca-app-pub-8853061795959758/6188146193'
```

### iOS (Test IDs):

```typescript
banner: 'ca-app-pub-3940256099942544/2934735716'
interstitial: 'ca-app-pub-3940256099942544/4411468910'
rewarded: 'ca-app-pub-3940256099942544/1712485313'
```

> ⚠️ **Важно:** iOS использует тестовые ID. Замените на свои перед релизом!

---

## ⚙️ Настройки показа рекламы

### `AdSettings` объект:

```typescript
export const AdSettings = {
  // Включить/выключить banner рекламу
  showBanners: true,

  // Включить/выключить interstitial рекламу
  showInterstitials: true,

  // После скольких транзакций показывать interstitial
  transactionsBeforeInterstitial: 6,

  // Минимальный интервал между показами interstitial (в миллисекундах)
  minInterstitialInterval: 1000 * 60 * 2, // 2 минуты
};
```

### Изменение частоты показа:

```typescript
// Показывать каждые 10 транзакций вместо 6
transactionsBeforeInterstitial: 10,

// Минимальный интервал 5 минут вместо 2
minInterstitialInterval: 1000 * 60 * 5,
```

---

## 📱 Настройка в AndroidManifest.xml

**Файл:** `android/app/src/main/AndroidManifest.xml`

```xml
<manifest>
  <!-- 1. Разрешения -->
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="com.google.android.gms.permission.AD_ID"/>

  <application>
    <!-- 2. AdMob App ID -->
    <meta-data
      android:name="com.google.android.gms.ads.APPLICATION_ID"
      android:value="ca-app-pub-8853061795959758~8255072189"
      tools:replace="android:value"/>

    <!-- 3. Оптимизация загрузки рекламы -->
    <meta-data
      android:name="com.google.android.gms.ads.flag.OPTIMIZE_AD_LOADING"
      android:value="true"
      tools:replace="android:value"/>

    <!-- 4. Оптимизация инициализации -->
    <meta-data
      android:name="com.google.android.gms.ads.flag.OPTIMIZE_INITIALIZATION"
      android:value="true"
      tools:replace="android:value"/>
  </application>
</manifest>
```

### Объяснение:

1. **`AD_ID` разрешение** - требуется для Android 13+ (API 33+)
2. **`APPLICATION_ID`** - App ID из AdMob Console
3. **`OPTIMIZE_AD_LOADING`** - ускоряет загрузку рекламы
4. **`OPTIMIZE_INITIALIZATION`** - ускоряет инициализацию SDK

---

## 📦 Настройка в app.json

**Файл:** `app.json`

```json
{
  "expo": {
    "android": {
      "permissions": [
        "com.google.android.gms.permission.AD_ID"
      ]
    },
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-8853061795959758~8255072189",
          "iosAppId": "ca-app-pub-3940256099942544~1458002511"
        }
      ]
    ]
  }
}
```

### Где взять App ID:

1. Откройте [AdMob Console](https://apps.admob.com/)
2. Выберите свое приложение
3. App settings → App ID
4. Скопируйте ID (формат: `ca-app-pub-XXXXXX~XXXXXX`)

---

## 🎯 Логика показа рекламы

### Interstitial реклама:

```
┌────────────────────────────────────────────────────────────┐
│ Условия показа (все должны быть выполнены):                │
│                                                              │
│ 1. ✅ Пользователь НЕ Premium                               │
│ 2. ✅ Прошло минимум 2 минуты с последнего показа           │
│ 3. ✅ Одно из:                                              │
│    • Счетчик транзакций >= 6                                │
│    • Создан каждый 3-й счет (3, 6, 9...)                   │
│    • Первое переключение вкладки за сегодня                 │
│ 4. ✅ НЕТ активного периода "без рекламы"                   │
│ 5. ✅ Реклама загружена (isLoaded = true)                   │
└────────────────────────────────────────────────────────────┘
```

### Banner реклама:

```
┌────────────────────────────────────────────────────────────┐
│ Условия показа:                                             │
│                                                              │
│ 1. ✅ Пользователь НЕ Premium                               │
│ 2. ✅ showBanners = true в настройках                       │
│ 3. ✅ НЕТ активного периода "без рекламы"                   │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 Изменение конфигурации

### Замена на свои ID:

```typescript
// 1. Откройте src/config/admob.config.ts

// 2. Замените ID для Android
const IDS = {
  android: {
    banner: 'ca-app-pub-ВАШ_ID/BANNER_ID',
    interstitial: 'ca-app-pub-ВАШ_ID/INTERSTITIAL_ID',
    rewarded: 'ca-app-pub-ВАШ_ID/REWARDED_ID',
  },
  // ...
};

// 3. Замените App ID в app.json
{
  "androidAppId": "ca-app-pub-ВАШ_PUBLISHER_ID~ВАШ_APP_ID"
}

// 4. Замените в AndroidManifest.xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-ВАШ_PUBLISHER_ID~ВАШ_APP_ID"
/>
```

### Отключение рекламы (для тестирования):

```typescript
// Временно отключить всю рекламу
export const AdSettings = {
  showBanners: false,
  showInterstitials: false,
  // ...
};
```

---

## 🐛 Отладка

### Проверка загрузки рекламы:

```typescript
// В консоли должны быть логи:
[InterstitialAd] Ad loaded
[BannerAd] Ad loaded successfully
```

### Проверка показа:

```typescript
[AdService] Transaction count: 6
[AdService] Can show interstitial! Transactions: 6
[InterstitialAd] Showing ad for transaction
[InterstitialAd] Ad shown successfully
```

### Тестовые ID для разработки:

Google предоставляет [тестовые ID](https://developers.google.com/admob/android/test-ads#sample_ad_units):

```typescript
// ТОЛЬКО ДЛЯ РАЗРАБОТКИ!
const TEST_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};
```

> ⚠️ **Важно:** Используйте тестовые ID ТОЛЬКО во время разработки! В production замените на свои.

---

## 📊 Мониторинг в AdMob Console

### Метрики для отслеживания:

1. **Impressions** - сколько раз показана реклама
2. **Click-through rate (CTR)** - % кликов
3. **eCPM** - доход за 1000 показов
4. **Estimated earnings** - примерный доход

### Где смотреть:

1. Откройте [AdMob Console](https://apps.admob.com/)
2. Выберите приложение
3. Reports → Посмотрите статистику

---

## ⚠️ Важные правила AdMob

### ✅ Разрешено:

- Показывать рекламу бесплатным пользователям
- Предлагать Premium для отключения рекламы
- Показывать разные типы рекламы (banner, interstitial)

### ❌ Запрещено:

- **Кликать по своей рекламе** (баннируют аккаунт!)
- Просить пользователей кликать
- Слишком частый показ (раздражает пользователей)
- Скрывать кнопку закрытия
- Показывать рекламу детям до 13 лет (COPPA)

---

## 🎯 Рекомендации по монетизации

### Оптимальная частота:

| Тип | Рекомендация | CashCraft |
|-----|-------------|-----------|
| **Banner** | На 1-2 экранах | ✅ На экране "Еще" |
| **Interstitial** | После каждых 3-5 действий | ✅ Каждые 6 транзакций + каждый 3-й счет |
| **Rewarded** | За дополнительные функции | ❌ Отключена |

### Баланс UX и монетизации:

```
Слишком редко             Оптимально              Слишком часто
     │                         │                         │
     │                         │                         │
     ▼                         ▼                         ▼
Мало дохода          Баланс UX/доход           Раздражение
```

**CashCraft**: Мы показываем рекламу достаточно редко, чтобы не раздражать пользователей, но достаточно часто для монетизации.

---

## 🔄 Обновление конфигурации

### Процесс обновления ID:

1. **Создайте новые Ad Units в AdMob**
2. **Обновите `admob.config.ts`**
   ```typescript
   banner: 'ca-app-pub-НОВЫЙ_ID/BANNER'
   ```
3. **Обновите `app.json`**
   ```json
   "androidAppId": "ca-app-pub-НОВЫЙ_ID~APP"
   ```
4. **Обновите `AndroidManifest.xml`**
   ```xml
   android:value="ca-app-pub-НОВЫЙ_ID~APP"
   ```
5. **Пересоберите приложение**
   ```bash
   eas build --platform android
   ```

---

## 📚 Дополнительные ресурсы

- [AdMob Официальная документация](https://developers.google.com/admob)
- [react-native-google-mobile-ads](https://github.com/invertase/react-native-google-mobile-ads)
- [Тестовые Ad Unit ID](https://developers.google.com/admob/android/test-ads)
- [AdMob Политика](https://support.google.com/admob/answer/6128543)

---

[[09-Configuration/Environment|Следующая: Environment →]]

[[README|← Назад к содержанию]]
