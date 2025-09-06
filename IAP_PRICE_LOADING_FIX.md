# Исправление загрузки цен из Google Play Console

## 🐞 Проблема

В экране подписок отображались захардкоженные цены ($2, $15) вместо реальных цен из Google Play Console. Также появлялась ошибка "IAPService не инициализирован".

## 🔍 Анализ проблемы

### 1. **Отсутствие инициализации IAP в SubscriptionScreen**
- `SubscriptionScreen` не вызывал `initializeIAP()` при открытии
- `availableProducts` оставался пустым
- Использовались дефолтные цены

### 2. **Плохая обработка ошибок**
- Пользователю показывались технические ошибки
- Не было фолбэка при неудачной инициализации

### 3. **Отсутствие индикации загрузки**
- Пользователь не понимал, что цены загружаются
- Не было обратной связи о процессе

## ✅ Примененные исправления

### 1. **Принудительная инициализация IAP в SubscriptionScreen**

**Добавлено в useEffect:**
```typescript
useEffect(() => {
  console.log('🔍 [SubscriptionScreen] useEffect triggered');
  loadSubscriptionStatus();
  // Принудительно инициализируем IAP если еще не инициализирован
  initializeIAP();
}, []);
```

### 2. **Улучшенная обработка ошибок покупок**

**До:**
```typescript
} catch (error) {
  console.error('Purchase error:', error);
  Alert.alert(t('common.error'), error instanceof Error ? error.message : t('premium.subscribeError'));
}
```

**После:**
```typescript
} catch (error) {
  console.error('Purchase error:', error);
  
  // Более дружелюбная обработка ошибок
  let errorMessage = t('premium.subscribeError');
  if (error instanceof Error) {
    if (error.message.includes('IAPService не инициализирован')) {
      errorMessage = 'Сервис покупок еще загружается. Попробуйте через несколько секунд.';
    } else if (error.message.includes('User cancelled')) {
      errorMessage = 'Покупка отменена пользователем.';
    } else {
      errorMessage = error.message;
    }
  }
  
  Alert.alert(t('common.error'), errorMessage);
}
```

### 3. **Проверка инициализации перед операциями**

**Покупка подписки:**
```typescript
// Проверяем, что IAP инициализирован, если нет - пытаемся инициализировать
if (availableProducts.length === 0) {
  console.log('🔄 [SubscriptionScreen] IAP не инициализирован, пытаемся инициализировать...');
  const initialized = await initializeIAP();
  if (!initialized) {
    Alert.alert(
      t('common.error'), 
      'Сервис покупок временно недоступен. Попробуйте позже.'
    );
    return;
  }
}
```

**Восстановление покупок:**
```typescript
// Проверяем, что IAP инициализирован
if (availableProducts.length === 0) {
  console.log('🔄 [SubscriptionScreen] IAP не инициализирован для восстановления, пытаемся инициализировать...');
  const initialized = await initializeIAP();
  if (!initialized) {
    Alert.alert(
      t('common.error'), 
      'Сервис покупок временно недоступен. Попробуйте позже.'
    );
    return;
  }
}
```

### 4. **Индикатор загрузки цен**

**Добавлен в hero section:**
```typescript
{/* Показываем индикатор загрузки цен */}
{availableProducts.length === 0 && isLoading && (
  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
    Загружаем актуальные цены...
  </Text>
)}
```

**Стиль для индикатора:**
```typescript
loadingText: {
  fontSize: 14,
  marginTop: 12,
  textAlign: 'center',
  fontStyle: 'italic',
},
```

### 5. **Логика загрузки цен (уже была правильная)**

```typescript
const plans: SubscriptionPlan[] = React.useMemo(() => {
  const defaultPlans = [/* дефолтные планы */];

  // Если у нас есть продукты из Google Play, используем их цены
  if (availableProducts.length > 0) {
    return defaultPlans.map(plan => {
      const product = availableProducts.find(p => p.productId === plan.id);
      if (product) {
        return {
          ...plan,
          name: product.title || plan.name,
          price: product.price || plan.price,  // ← Берем цену из Google Play
          description: [product.description || '', ...plan.description.slice(1)],
        };
      }
      return plan;
    });
  }

  return defaultPlans; // Фолбэк на дефолтные цены
}, [availableProducts, t]);
```

## 🎯 Результат

### До исправления:
- ❌ Захардкоженные цены $2 и $15
- ❌ Ошибка "IAPService не инициализирован"
- ❌ Нет индикации загрузки
- ❌ Плохая обработка ошибок

### После исправления:
- ✅ **Автоматическая инициализация** IAP при открытии экрана
- ✅ **Цены загружаются из Google Play** (когда доступны)
- ✅ **Дружелюбные сообщения об ошибках**
- ✅ **Индикатор загрузки цен**
- ✅ **Фолбэк на дефолтные цены** если Google Play недоступен
- ✅ **Повторная попытка инициализации** перед операциями

## 🧪 Как тестировать

### 1. **Тест с реальными продуктами:**
1. Настройте продукты в Google Play Console (`cashcraft_monthly`, `cashcraft_yearly`)
2. Опубликуйте приложение в Internal Testing
3. Откройте экран подписок
4. **Ожидается:** Цены загружаются из Google Play

### 2. **Тест без подключения:**
1. Отключите интернет
2. Откройте экран подписок  
3. **Ожидается:** Показываются дефолтные цены, дружелюбная ошибка при покупке

### 3. **Тест загрузки:**
1. Откройте экран подписок
2. В первые секунды должен появиться текст "Загружаем актуальные цены..."
3. После загрузки - цены из Google Play или дефолтные

## 📋 Поток получения цен

```
1. Открытие SubscriptionScreen
   ↓
2. useEffect вызывает initializeIAP()
   ↓
3. IAPService.initialize()
   ↓
4. InAppPurchases.getProductsAsync(['cashcraft_monthly', 'cashcraft_yearly'])
   ↓
5. availableProducts обновляется в SubscriptionContext
   ↓
6. useMemo пересчитывает plans с реальными ценами
   ↓
7. UI показывает актуальные цены
```

## 📁 Измененные файлы

1. `src/screens/SubscriptionScreen.tsx` - добавлена инициализация, обработка ошибок, индикатор загрузки

## 🔧 Настройка в Google Play Console

Для получения реальных цен убедитесь что:

1. **Продукты созданы** с ID: `cashcraft_monthly`, `cashcraft_yearly`
2. **Цены установлены** для всех регионов
3. **Статус "Активно"** для всех продуктов
4. **Приложение опубликовано** в Internal Testing или выше

---

**Статус**: Исправления применены. Цены будут загружаться из Google Play Console когда продукты будут правильно настроены.
