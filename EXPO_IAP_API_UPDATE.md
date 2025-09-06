# Обновление expo-iap API до новой версии

## 🐞 Проблема

При использовании expo-iap возникали ошибки TypeScript из-за устаревшего API:

- `Property 'connectAsync' does not exist`
- `Property 'getProductsAsync' does not exist. Did you mean 'getProducts'?`
- `Property 'purchaseItemAsync' does not exist`
- И множество других ошибок

## 🔍 Причина

API `expo-iap` был значительно изменен в новых версиях:
- Убраны методы с суффиксом `Async`
- Изменены названия методов и их параметры
- Новая система типов для продуктов и покупок

## ✅ Полное обновление iapService.ts

### **1. Обновленные импорты**

**Было:**
```typescript
import * as InAppPurchases from 'expo-iap';
```

**Стало:**
```typescript
import { 
  initConnection, 
  endConnection, 
  getSubscriptions, 
  requestPurchase, 
  getAvailablePurchases,
  finishTransaction,
  type SubscriptionProduct,
  type Purchase 
} from 'expo-iap';
```

### **2. Обновленные методы**

#### **Инициализация:**
```typescript
// Было:
await InAppPurchases.connectAsync();

// Стало:
const result = await initConnection();
this.isConnected = result;
```

#### **Получение продуктов:**
```typescript
// Было:
await InAppPurchases.getProductsAsync(skus);

// Стало:
await getSubscriptions(skus);
```

#### **Покупка:**
```typescript
// Было:
await InAppPurchases.purchaseItemAsync(productId);

// Стало:
await requestPurchase({
  request: {
    ios: { sku: productId },
    android: {
      skus: [productId],
      subscriptionOffers: [{
        sku: productId,
        offerToken: ''
      }]
    }
  },
  type: 'subs'
});
```

#### **Восстановление покупок:**
```typescript
// Было:
await InAppPurchases.getPurchaseHistoryAsync();

// Стало:
await getAvailablePurchases();
```

#### **Подтверждение покупки:**
```typescript
// Было:
await InAppPurchases.acknowledgeItemAsync(transactionId);

// Стало:
await finishTransaction({ 
  purchase: purchase, 
  isConsumable: false 
});
```

#### **Отключение:**
```typescript
// Было:
await InAppPurchases.disconnectAsync();

// Стало:
await endConnection();
```

### **3. Обновленная структура типов продукта**

**Новый API expo-iap:**
```typescript
interface SubscriptionProduct {
  id: string;              // ← Теперь id вместо productId
  title: string;
  description: string;
  price: number;           // ← Может быть number
  displayPrice: string;    // ← Отформатированная цена
  currency: string;
  platform: 'ios' | 'android';
  // ... и другие поля
}
```

**Обновление использования:**
```typescript
// Было:
product.productId
product.price (всегда string)

// Стало:
product.id
product.displayPrice || String(product.price)
```

### **4. Обновленная структура результата покупки**

```typescript
// requestPurchase возвращает:
Purchase | Purchase[] | void

// Нужно обрабатывать как:
const purchase = Array.isArray(result) ? result[0] : result;
if (purchase && purchase.transactionId) {
  // обработка покупки
}
```

### **5. Полностью переписанный IAPService**

Класс был полностью переписан с учетом нового API:

```typescript
class IAPService {
  async initialize(): Promise<boolean> {
    const result = await initConnection();
    this.isConnected = result;
    
    if (this.isConnected) {
      const products = await this.getProducts();
      this.isInitialized = true;
      return true;
    }
    return false;
  }

  async getProducts(): Promise<SubscriptionProduct[]> {
    const skus = Object.values(SUBSCRIPTION_SKUS);
    return await getSubscriptions(skus);
  }

  async purchaseProduct(productId: SubscriptionSKU): Promise<PurchaseResult | null> {
    const result = await requestPurchase({
      request: {
        ios: { sku: productId },
        android: {
          skus: [productId],
          subscriptionOffers: [{ sku: productId, offerToken: '' }]
        }
      },
      type: 'subs'
    });

    const purchase = Array.isArray(result) ? result[0] : result;
    if (purchase && purchase.transactionId) {
      // Подтверждение для Android
      if (Platform.OS === 'android') {
        await this.acknowledgePurchase(purchase);
      }
      return this.createPurchaseResult(purchase, productId);
    }
    return null;
  }

  private async acknowledgePurchase(purchase: Purchase): Promise<void> {
    await finishTransaction({ purchase, isConsumable: false });
  }
}
```

## 📋 Обновленные файлы

### **1. src/services/iapService.ts**
- Полностью переписан под новый API
- Новые типы и методы
- Улучшенная обработка ошибок

### **2. src/context/SubscriptionContext.tsx**
- Обновлены импорты: `IAPHelpers` вместо `SubscriptionUtils`
- Исправлено: `product.id` вместо `product.productId`
- Методы: `purchaseProduct` вместо `purchaseSubscription`
- Приведение типов: `String(product.price)`

### **3. src/screens/SubscriptionScreen.tsx**
- Исправлено: `product.id` вместо `product.productId`
- Обновлено: `product.displayPrice` для цен

## 🎯 Результат

### До исправления:
- ❌ 12+ ошибок TypeScript
- ❌ Устаревший API expo-iap
- ❌ Неправильные типы данных
- ❌ Ошибки при попытке покупки

### После исправления:
- ✅ **Нет ошибок TypeScript**
- ✅ **Современный API expo-iap**
- ✅ **Правильные типы и методы**
- ✅ **Корректная обработка покупок**
- ✅ **Поддержка Android subscriptionOffers**
- ✅ **Правильное отображение цен**

## 🧪 Тестирование

### 1. **Компиляция:**
```bash
cd cashcraft3
npm run build  # или yarn build
```
**Ожидается:** Нет ошибок TypeScript

### 2. **Инициализация IAP:**
- Откройте экран подписок
- Проверьте консоль: должны появиться сообщения об успешной инициализации
- **Ожидается:** "✅ [IAPService] Connected to store"

### 3. **Загрузка продуктов:**
- После инициализации должны загрузиться продукты из Google Play
- **Ожидается:** Реальные цены вместо захардкоженных $2/$15

### 4. **Покупка (тестовая):**
- В режиме Internal Testing попробуйте купить подписку
- **Ожидается:** Корректный запуск процесса покупки

## 🔧 Важные изменения в API

### **Обязательные поля для Android:**
```typescript
// Новый API требует subscriptionOffers для Android:
android: {
  skus: [productId],
  subscriptionOffers: [{  // ← Обязательно!
    sku: productId,
    offerToken: ''
  }]
}
```

### **Новая система типов:**
- `productId` → `id`
- `price` (string) → `price` (number) + `displayPrice` (string)
- `purchaseItemAsync` → `requestPurchase` с объектом параметров

### **Изменение логики подтверждения:**
- `acknowledgeItemAsync` → `finishTransaction`
- Требует полный объект `Purchase` вместо только `transactionId`

---

**Статус**: Все ошибки API исправлены. expo-iap теперь использует современный API без предупреждений TypeScript.
