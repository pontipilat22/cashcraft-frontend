# Как правильно получить offerToken для Android подписок

## 🔹 Что такое offerToken

`offerToken` - это уникальный токен, который Google Play автоматически генерирует для каждого базового плана подписки. Он **обязателен** для покупки подписок на Android.

**❌ Его нельзя:**
- Придумать самому
- Скопировать из Google Play Console вручную
- Использовать захардкоженные значения (`'default'`, `''`, etc.)

**✅ Его можно получить только:**
- Через API `getSubscriptions()` из объекта продукта
- Из поля `subscriptionOfferDetails[0].offerToken`

## 🔹 Откуда берется offerToken

### **Шаг 1: Загружаем продукты**
```typescript
const products = await getSubscriptions(['cashcraft_monthly', 'cashcraft_yearly']);
```

### **Шаг 2: Извлекаем токен из продукта**
```typescript
const monthly = products.find(p => p.id === 'cashcraft_monthly');
const offerToken = monthly?.subscriptionOfferDetails?.[0]?.offerToken;

console.log("OfferToken:", offerToken);
// Результат: "AUj/YhcqHe4nLEiAaFds..." (реальный токен от Google)
```

### **Шаг 3: Используем в покупке**
```typescript
await requestPurchase({
  request: {
    android: {
      skus: ['cashcraft_monthly'],
      subscriptionOffers: [{
        sku: 'cashcraft_monthly',
        offerToken: offerToken  // ← Реальный токен
      }]
    }
  },
  type: 'subs'
});
```

## ✅ Наше исправление

### **Обновленный код в iapService.ts:**

```typescript
async purchaseProduct(productId: SubscriptionSKU): Promise<PurchaseResult | null> {
  try {
    if (!this.isInitialized) {
      throw new Error('IAPService не инициализирован');
    }

    console.log('💳 [IAPService] Purchasing subscription:', productId);
    
    // Получаем реальный offerToken из продукта
    let offerToken = '';
    
    if (Platform.OS === 'android') {
      try {
        const products = await this.getProducts();
        const product = products.find(p => p.id === productId);
        
        console.log('🔍 [IAPService] Found product:', product);
        
        if (product && 'subscriptionOfferDetails' in product) {
          const subscriptionOfferDetails = (product as any).subscriptionOfferDetails;
          console.log('📋 [IAPService] SubscriptionOfferDetails:', subscriptionOfferDetails);
          
          if (subscriptionOfferDetails && subscriptionOfferDetails.length > 0) {
            offerToken = subscriptionOfferDetails[0].offerToken;
            console.log('🔑 [IAPService] Found offerToken:', offerToken);
          }
        }
        
        if (!offerToken) {
          console.warn('⚠️ [IAPService] No offerToken found for product:', productId);
          throw new Error('Подписка еще не активирована в Google Play Console. Попробуйте позже.');
        }
      } catch (error) {
        console.error('❌ [IAPService] Error getting offerToken:', error);
        throw error;
      }
    }

    // Используем deprecated метод requestSubscription с реальным offerToken
    const result = await requestSubscription({
      ios: { sku: productId },
      android: { 
        skus: [productId],
        subscriptionOffers: [{
          sku: productId,
          offerToken: offerToken || 'default' // Используем реальный токен или fallback
        }]
      }
    });
    
    // ... остальная обработка результата
  } catch (error) {
    console.error('❌ [IAPService] Purchase failed:', error);
    throw error;
  }
}
```

## 🔹 Логи для отладки

Теперь в консоли будут показываться подробные логи:

### **Успешное получение токена:**
```
💳 [IAPService] Purchasing subscription: cashcraft_yearly
🔍 [IAPService] Found product: { id: "cashcraft_yearly", ... }
📋 [IAPService] SubscriptionOfferDetails: [{ offerToken: "AUj/YhcqHe4nLEiAaFds...", ... }]
🔑 [IAPService] Found offerToken: AUj/YhcqHe4nLEiAaFds...
✅ [IAPService] Purchase result: { ... }
```

### **Отсутствие токена:**
```
💳 [IAPService] Purchasing subscription: cashcraft_yearly
🔍 [IAPService] Found product: { id: "cashcraft_yearly", ... }
📋 [IAPService] SubscriptionOfferDetails: undefined
⚠️ [IAPService] No offerToken found for product: cashcraft_yearly
❌ [IAPService] Error getting offerToken: Error: Подписка еще не активирована в Google Play Console
```

## 🚨 Почему offerToken может быть undefined

### **1. Подписка не активирована в Google Play Console**
- Создали продукт, но не опубликовали
- Не установили цену
- Не активировали базовый план

### **2. Недавно созданная подписка (нужно подождать)**
- После создания подписки в Play Console
- Google Play нужно 15-60 минут для генерации токенов
- Попробуйте позже

### **3. Проблемы с Internal Testing**
- Приложение не опубликовано в Internal Testing
- Тестовый аккаунт не добавлен в список тестировщиков
- Не принят лицензионный договор

## 🔧 Исправленная обработка ошибок

### **В SubscriptionScreen.tsx добавлены понятные сообщения:**

```typescript
if (error.message.includes('еще не активирована в Google Play Console')) {
  errorMessage = 'Подписка настраивается. Попробуйте через 15-60 минут или обратитесь в поддержку.';
} else if (error.message.includes('offerToken')) {
  errorMessage = 'Подписки временно недоступны. Попробуйте позже.';
}
```

## 🎯 Что делать дальше

### **1. Проверьте Google Play Console:**
- Зайдите в "Продукты" → "Подписки"
- Убедитесь, что `cashcraft_monthly` и `cashcraft_yearly` **активны**
- Проверьте, что у них установлены **цены**
- Убедитесь, что базовые планы **опубликованы**

### **2. Проверьте Internal Testing:**
- Загрузите APK в Internal Testing
- Добавьте ваш аккаунт в список тестировщиков
- Примите лицензию и начните тестирование

### **3. Проверьте логи:**
- Откройте консоль разработчика
- Попробуйте покупку
- Найдите логи `🔑 [IAPService] Found offerToken`
- Если токен есть - покупка должна работать
- Если токена нет - нужно настроить Google Play Console

## 📋 Контрольный список

- ✅ Продукты созданы в Google Play Console
- ✅ Цены установлены для всех регионов
- ✅ Базовые планы активированы
- ✅ Приложение загружено в Internal Testing
- ✅ Тестовый аккаунт добавлен в список
- ✅ Логи показывают offerToken в консоли
- ✅ Покупка работает без ошибок

---

**Важно**: offerToken - это ключ к успешным покупкам на Android. Без него подписки работать не будут. Всегда получайте его из API Google Play, а не придумывайте сами.
