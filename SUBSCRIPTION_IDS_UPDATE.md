# Обновление ID подписок в expo-iap

## 🔄 Изменения

Обновлены ID товаров для подписок в соответствии с требованиями:

### Старые ID:
```typescript
export const SUBSCRIPTION_SKUS = {
  MONTHLY: 'cashcraft_premium_monthly',
  YEARLY: 'cashcraft_premium_yearly',
} as const;
```

### Новые ID:
```typescript
export const SUBSCRIPTION_SKUS = {
  MONTHLY: 'cashcraft_monthly',
  YEARLY: 'cashcraft_yearly',
} as const;
```

## 📁 Обновленные файлы

### 1. `src/services/iapService.ts`
- Изменены константы `SUBSCRIPTION_SKUS`
- Обновлены ID для месячной и годовой подписки

### 2. `GOOGLE_PLAY_IAP_SETUP.md`
- Обновлены инструкции по настройке Google Play Console
- Исправлены примеры кода
- Обновлены логи в разделе отладки

## 🛠️ Настройка Google Play Console

При создании товаров в Google Play Console используйте новые ID:

**Месячная подписка:**
- ID продукта: `cashcraft_monthly`
- Название: `CashCraft Premium - Месячная подписка`

**Годовая подписка:**
- ID продукта: `cashcraft_yearly`
- Название: `CashCraft Premium - Годовая подписка`

## ⚠️ Важно

1. **Google Play Console** - создайте товары с новыми ID
2. **App Store Connect** - создайте товары с теми же ID
3. **Тестирование** - проверьте покупки с новыми ID
4. **Документация** - инструкции обновлены

## 🔗 Связанные константы

Массив для удобства (как в примере):
```typescript
const SUBS = ['cashcraft_monthly', 'cashcraft_yearly'];
```

Этот массив можно использовать для дополнительных операций, но основной код использует объект `SUBSCRIPTION_SKUS` для типобезопасности.

---

**Результат**: ID подписок обновлены во всем коде и документации. Готово к настройке в Google Play Console и App Store Connect.
