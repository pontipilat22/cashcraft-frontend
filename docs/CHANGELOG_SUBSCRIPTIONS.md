# Changelog - Миграция системы подписок

## [1.0.1] - 2025-10-30

### 🔄 Миграция с expo-iap на react-native-iap

#### Добавлено
- ✅ Установлен `react-native-iap@14.4.35` - современная библиотека для in-app purchases
- ✅ Установлен `react-native-nitro-modules` - требуется для react-native-iap v14
- ✅ Обновлен Kotlin до версии 2.1.20 (требование react-native-iap v14)
- ✅ Создана полная документация по настройке Google Play Console
- ✅ Создано руководство по миграции

#### Удалено
- ❌ Удален `expo-iap` - устаревшая библиотека (deprecated с августа 2023)
- ❌ Удален плагин `react-native-iap` из app.json (не требуется, работает через autolinking)

#### Изменено

**src/services/iapService.ts:**
- Полностью переписан для работы с react-native-iap v14 API
- `getSubscriptions()` → `fetchProducts({ skus, type: 'subs' })`
- `requestSubscription()` → `requestPurchase({ type: 'subs', request: {...} })`
- Обновлены типы: `Subscription` → `ProductSubscription`
- Обновлены типы: `Purchase` с правильной структурой для v14
- Добавлены слушатели покупок: `purchaseUpdatedListener`, `purchaseErrorListener`
- Исправлена структура параметров для покупки подписок (platform-specific)

**src/context/SubscriptionContext.tsx:**
- Обновлен импорт типов: `Subscription` → `ProductSubscription`
- Обновлены свойства продуктов: `productId` → `id`
- Обновлены свойства продуктов: `localizedPrice` → `displayPrice`

**src/screens/SubscriptionScreen.tsx:**
- Обновлены свойства продуктов: `productId` → `id`
- Обновлены свойства продуктов: `localizedPrice` → `displayPrice`

**app.json:**
- Обновлен `kotlinVersion` с 2.0.21 на 2.1.20
- Удален плагин `react-native-iap` (не требуется)

**android/app/build.gradle:**
- Используется Google Play Billing Library v8.0.0 (уже установлена)

#### Исправлено
- ✅ Все ошибки TypeScript исправлены
- ✅ Корректная работа с nullable полями (`orderId`, `isAcknowledged`)
- ✅ Правильный доступ к Android-специфичным свойствам
- ✅ Правильная структура запроса покупки для Android и iOS

### 📚 Документация

Созданы следующие документы:

1. **docs/GOOGLE_PLAY_SUBSCRIPTIONS_SETUP.md**
   - Пошаговая инструкция по настройке подписок в Google Play Console
   - Настройка базовых планов (Base Plans) - КРИТИЧЕСКИ ВАЖНО!
   - Активация подписок
   - Настройка тестирования
   - Решение распространенных проблем

2. **docs/MIGRATION_TO_REACT_NATIVE_IAP.md**
   - Техническая документация миграции
   - Сравнение старого и нового API
   - Детальное описание всех изменений
   - Требования и следующие шаги

3. **docs/README_SUBSCRIPTIONS.md**
   - Краткое руководство для быстрого старта
   - Чек-лист настройки
   - Проверка работоспособности
   - FAQ

### ⚠️ Breaking Changes

**КРИТИЧЕСКИ ВАЖНО!** Для работы подписок необходимо:

1. **Пересобрать приложение:**
   ```bash
   npm run android
   ```

2. **Настроить Google Play Console:**
   - Создать базовые планы для каждой подписки
   - Активировать базовые планы
   - Убедиться, что подписки имеют статус "Активна"

Без настройки базовых планов подписки **НЕ будут работать**!

### 🐛 Известные проблемы

- **offerToken не найден** - базовый план не активирован в Google Play Console
- **Продукты не загружаются** - подписки не активированы или неправильные ID
- **Ошибка при покупке** - приложение не опубликовано в тестировании или тестировщик не добавлен

Решения всех проблем см. в `docs/GOOGLE_PLAY_SUBSCRIPTIONS_SETUP.md`

### 📋 Технические детали

**Версии:**
- react-native-iap: 14.4.35
- react-native-nitro-modules: latest
- Google Play Billing Library: 8.0.0
- Kotlin: 2.1.20

**Требования Google Play (2025):**
- Минимум Billing Library v7+ (мы используем v8)
- Базовые планы обязательны для всех подписок
- offerToken обязателен для покупки на Android

### 🚀 Следующие шаги

1. Прочитайте `docs/README_SUBSCRIPTIONS.md`
2. Настройте Google Play Console согласно `docs/GOOGLE_PLAY_SUBSCRIPTIONS_SETUP.md`
3. Пересоберите приложение
4. Протестируйте подписки

### 📞 Поддержка

При возникновении проблем:
1. Проверьте логи приложения (ищите `[IAPService]`)
2. Изучите документацию в папке `docs/`
3. Убедитесь, что базовые планы активированы в Google Play Console
