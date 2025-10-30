# Миграция с expo-iap на react-native-iap

## Что было сделано

Мы выполнили миграцию с устаревшей библиотеки `expo-iap` на современную `react-native-iap` версии 14.x с поддержкой Google Play Billing Library v8.

## Причины миграции

1. **expo-iap устарел** - больше не поддерживается с августа 2023
2. **Требования Google Play** - с августа 2025 требуется Billing Library v7+
3. **Новая архитектура подписок** - Google изменил подход к подпискам (базовые планы обязательны)
4. **Проблемы совместимости** - expo-iap не работает с современными версиями Google Play Billing Library

## Изменения в коде

### 1. Удалена зависимость expo-iap

```bash
npm uninstall expo-iap
```

### 2. Установлены новые зависимости

```bash
npm install react-native-iap react-native-nitro-modules
```

### 3. Обновлен app.json

Изменения в `app.json`:

```json
{
  "expo": {
    "plugins": [
      // Удален "expo-iap"
      // react-native-iap не требует плагина, работает через автолинкинг
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "2.1.20"  // Обновлен с 2.0.21
          }
        }
      ]
    ]
  }
}
```

**Важно:** `react-native-iap` не требует Expo config plugin - библиотека автоматически подключается через React Native autolinking.

### 4. Переписан src/services/iapService.ts

Основные изменения в API:

#### Импорты
```typescript
// Старый (expo-iap)
import {
  initConnection,
  getSubscriptions,
  requestSubscription,
} from 'expo-iap';

// Новый (react-native-iap)
import {
  initConnection,
  getSubscriptions as getRNIAPSubscriptions,
  requestSubscription,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'react-native-iap';
```

#### Получение продуктов
```typescript
// Старый API
const products = await getSubscriptions(skus);

// Новый API
const products = await getRNIAPSubscriptions({ skus });
```

#### Покупка подписки
```typescript
// Старый API
await requestSubscription({
  ios: { sku: productId },
  android: {
    skus: [productId],
    subscriptionOffers: [{ sku: productId, offerToken }]
  }
});

// Новый API
await requestSubscription({
  sku: productId,
  subscriptionOffers: [{ sku: productId, offerToken }]
});
```

#### Слушатели покупок
Новая библиотека требует настройки слушателей:

```typescript
purchaseUpdatedListener(async (purchase) => {
  // Обработка успешной покупки
});

purchaseErrorListener((error) => {
  // Обработка ошибки
});
```

### 5. Обновлен src/context/SubscriptionContext.tsx

Изменения в импортах:

```typescript
// Старый
import { type SubscriptionProduct } from 'expo-iap';

// Новый
import { type Subscription as SubscriptionProduct } from 'react-native-iap';
```

Изменения в доступе к свойствам продукта:

```typescript
// Старый API
product.id
product.displayPrice

// Новый API
product.productId
product.localizedPrice
```

### 6. Обновлен src/screens/SubscriptionScreen.tsx

Аналогичные изменения доступа к свойствам продукта:

```typescript
// Старый
availableProducts.find(p => p.id === plan.id)
product.displayPrice

// Новый
availableProducts.find(p => p.productId === plan.id)
product.localizedPrice
```

## Требования к Google Play Console

### КРИТИЧЕСКИ ВАЖНО!

Для работы подписок с react-native-iap необходимо:

1. **Создать базовые планы** для каждой подписки
2. **Активировать базовые планы** (статус должен быть "Активен")
3. Убедиться, что подписки имеют статус "Активна"

Подробные инструкции см. в [GOOGLE_PLAY_SUBSCRIPTIONS_SETUP.md](./GOOGLE_PLAY_SUBSCRIPTIONS_SETUP.md)

## Следующие шаги

### 1. Пересоберите приложение

После изменений необходимо пересобрать нативную часть:

```bash
# Очистить кеш и пересобрать Android
npm run android
```

### 2. Настройте подписки в Google Play Console

Следуйте инструкциям из [GOOGLE_PLAY_SUBSCRIPTIONS_SETUP.md](./GOOGLE_PLAY_SUBSCRIPTIONS_SETUP.md)

### 3. Протестируйте подписки

1. Добавьте тестовый аккаунт в лицензионное тестирование
2. Установите приложение из Google Play (закрытое тестирование)
3. Попробуйте купить подписку
4. Проверьте логи:
   ```
   ✅ [IAPService] Connected to store
   📦 [IAPService] Available products: 2
   🎫 [IAPService] Offer 1: { offerToken: '...', basePlanId: '...' }
   ```

## Отладка

### Проблема: offerToken не найден

**Лог**:
```
⚠️ [IAPService] No offerToken found for product
```

**Решение**: Активируйте базовый план в Google Play Console

### Проблема: Продукты не загружаются

**Лог**:
```
📦 [IAPService] Available products: 0
```

**Возможные причины**:
1. Подписки не активированы в Google Play Console
2. Неправильные ID подписок
3. Приложение не опубликовано в тестировании

### Проблема: Ошибка при покупке

**Лог**:
```
❌ [IAPService] Purchase failed
```

**Возможные причины**:
1. Аккаунт не добавлен в лицензионное тестирование
2. Приложение установлено не из Google Play
3. Базовый план не активирован

## Преимущества новой библиотеки

✅ **Современная** - поддержка Google Play Billing Library v8
✅ **Производительность** - использует Nitro Modules
✅ **Поддержка** - активно развивается
✅ **Совместимость** - соответствует требованиям Google 2025
✅ **Функциональность** - полная поддержка новых возможностей подписок

## Дополнительная документация

- [react-native-iap GitHub](https://github.com/dooboolab-community/react-native-iap)
- [Google Play Billing Library](https://developer.android.com/google/play/billing)
- [Expo Build Properties](https://docs.expo.dev/versions/latest/sdk/build-properties/)
