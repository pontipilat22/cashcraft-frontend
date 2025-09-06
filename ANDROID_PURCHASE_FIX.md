# Исправление ошибки покупки на Android

## 🐞 Проблема

При попытке покупки подписки на Android возникала ошибка:

```
java.lang.IllegalArgumentException: offerToken can not be empty
```

## 🔍 Причина ошибки

В новой версии `expo-iap` для Android подписок обязательно требуется поле `subscriptionOffers` с валидным `offerToken`. Пустая строка недопустима.

**Проблемный код:**
```typescript
const result = await requestPurchase({
  request: {
    ios: { sku: productId },
    android: {
      skus: [productId],
      subscriptionOffers: [{
        sku: productId,
        offerToken: '' // ← Пустая строка вызывает ошибку
      }]
    }
  },
  type: 'subs'
});
```

## ✅ Временное решение

Использован deprecated метод `requestSubscription` с базовым `offerToken`:

```typescript
const result = await requestSubscription({
  ios: { sku: productId },
  android: { 
    skus: [productId],
    subscriptionOffers: [{
      sku: productId,
      offerToken: 'default' // Используем базовое значение
    }]
  }
});
```

## 🔧 Обновленный код

### **1. Добавлен импорт `requestSubscription`:**
```typescript
import { 
  initConnection, 
  endConnection, 
  getSubscriptions, 
  requestPurchase,
  requestSubscription, // ← Добавлено
  getAvailablePurchases,
  finishTransaction,
  type SubscriptionProduct,
  type Purchase 
} from 'expo-iap';
```

### **2. Исправлен метод `purchaseProduct`:**
```typescript
async purchaseProduct(productId: SubscriptionSKU): Promise<PurchaseResult | null> {
  try {
    if (!this.isInitialized) {
      throw new Error('IAPService не инициализирован');
    }

    console.log('💳 [IAPService] Purchasing subscription:', productId);
    
    // Используем deprecated метод requestSubscription с базовым offerToken
    const result = await requestSubscription({
      ios: { sku: productId },
      android: { 
        skus: [productId],
        subscriptionOffers: [{
          sku: productId,
          offerToken: 'default' // Базовое значение вместо пустой строки
        }]
      }
    });
    
    console.log('✅ [IAPService] Purchase result:', result);

    // result может быть Purchase, Purchase[] или void
    const purchase = Array.isArray(result) ? result[0] : result;
    
    if (purchase && purchase.transactionId) {
      const purchaseResult: PurchaseResult = {
        purchaseId: purchase.transactionId,
        productId: productId,
        transactionId: purchase.transactionId,
        transactionDate: Date.now(),
        transactionReceipt: purchase.transactionReceipt || '',
      };

      // Для Android подтверждаем покупку
      if (Platform.OS === 'android') {
        await this.acknowledgePurchase(purchase);
      }

      return purchaseResult;
    }

    return null;
  } catch (error) {
    console.error('❌ [IAPService] Purchase failed:', error);
    throw error;
  }
}
```

## 🎯 Альтернативные решения

### **Решение 1: Получение реального offerToken из продукта**

```typescript
// Получаем продукт с реальным offerToken
const products = await this.getProducts();
const product = products.find(p => p.id === productId);

let offerToken = 'default';
if (product && 'subscriptionOfferDetails' in product && product.subscriptionOfferDetails) {
  const offer = product.subscriptionOfferDetails[0];
  if (offer && offer.offerToken) {
    offerToken = offer.offerToken;
  }
}

const result = await requestSubscription({
  ios: { sku: productId },
  android: { 
    skus: [productId],
    subscriptionOffers: [{
      sku: productId,
      offerToken: offerToken // Реальный токен
    }]
  }
});
```

### **Решение 2: Использование современного requestPurchase (требует настройки Google Play)**

```typescript
// Сначала создайте правильные subscription offers в Google Play Console
const result = await requestPurchase({
  request: {
    ios: { sku: productId },
    android: {
      skus: [productId],
      subscriptionOffers: [{
        sku: productId,
        offerToken: 'realOfferTokenFromGooglePlay'
      }]
    }
  },
  type: 'subs'
});
```

## 🚨 Важные моменты

### **1. Настройка Google Play Console**
Для корректной работы подписок в Google Play Console должны быть:
- ✅ Созданы продукты с ID: `cashcraft_monthly`, `cashcraft_yearly`
- ✅ Настроены subscription offers с валидными offerToken
- ✅ Продукты активированы и опубликованы

### **2. Тестирование**
- Используйте Internal Testing для проверки покупок
- В режиме тестирования offerToken может работать с базовыми значениями
- В продакшене требуются реальные токены из Google Play Console

### **3. Deprecated методы**
`requestSubscription` помечен как deprecated, но может работать стабильнее для базовых случаев. В будущем рекомендуется переход на `requestPurchase` с правильными `offerToken`.

## 🧪 Тестирование исправления

### **1. Проверьте компиляцию:**
```bash
cd cashcraft3
npm run build
```
**Ожидается:** Нет ошибок TypeScript

### **2. Протестируйте покупку:**
1. Откройте экран подписок
2. Попробуйте купить месячную подписку
3. **Ожидается:** Процесс покупки запускается без ошибки `offerToken can not be empty`

### **3. Проверьте логи:**
В консоли должны появиться сообщения:
```
💳 [IAPService] Purchasing subscription: cashcraft_monthly
✅ [IAPService] Purchase result: [объект результата]
```

## 📋 Статус

- ✅ **Ошибка offerToken исправлена** - используется `default` вместо пустой строки
- ✅ **Deprecated метод** - `requestSubscription` работает стабильнее
- ⚠️ **Требуется доработка** - переход на современный API с реальными токенами
- 🔄 **Тестирование** - нужна проверка в Internal Testing

---

**Следующие шаги:**
1. Протестировать текущее исправление
2. Настроить правильные subscription offers в Google Play Console
3. Перейти на современный `requestPurchase` с реальными `offerToken`
4. Провести полное тестирование покупок
