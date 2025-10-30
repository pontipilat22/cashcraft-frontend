# 🛠 Стек технологий CashCraft

[[README|← Назад к содержанию]]

---

## 📱 Frontend (Mobile App)

### Основной фреймворк

#### **React Native** (v0.76.5)
- **Что это:** Кроссплатформенный фреймворк для создания нативных мобильных приложений
- **Зачем:** Позволяет писать код один раз и запускать на Android и iOS
- **Особенности:**
  - Использует нативные компоненты
  - Высокая производительность
  - Большое комьюнити

#### **Expo** (SDK 52)
- **Что это:** Набор инструментов и сервисов для React Native
- **Зачем:** Упрощает разработку, сборку и деплой
- **Что использует:**
  - `expo-constants` - Константы приложения
  - `expo-crypto` - Криптография
  - `expo-file-system` - Работа с файлами
  - `expo-font` - Кастомные шрифты
  - `expo-haptics` - Вибрация
  - `expo-iap` - In-App Purchases (подписки)
  - `expo-localization` - Локализация
  - `expo-secure-store` - Безопасное хранилище
  - `expo-splash-screen` - Splash screen
  - `expo-web-browser` - Браузер

### Язык программирования

#### **TypeScript** (v5.3.3)
- **Что это:** JavaScript с типизацией
- **Зачем:**
  - Меньше ошибок на этапе разработки
  - Автодополнение в IDE
  - Легче поддерживать большой проект
- **Пример:**
```typescript
interface Transaction {
  id: string;
  amount: number;
  currency: string;
  date: Date;
}
```

---

## 🗄 База данных

### **WatermelonDB** (v0.27.1)
- **Что это:** Локальная база данных для React Native
- **Зачем:**
  - Offline-first подход
  - Быстрая работа с большими объемами данных
  - Реактивность (автообновление UI)
- **Основано на:** SQLite
- **Особенности:**
  - Lazy loading (загрузка по требованию)
  - Оптимизированные запросы
  - Поддержка миграций

#### Модели данных:
- `Account` - Счета (карты, наличные, сбережения)
- `Transaction` - Транзакции (доходы, расходы, переводы)
- `Category` - Категории транзакций
- `Debt` - Долги и кредиты
- `Goal` - Финансовые цели
- `ExchangeRate` - Курсы валют
- `User` - Пользователи
- `Setting` - Настройки
- `SyncMetadata` - Метаданные синхронизации

---

## 🎨 UI и UX

### Навигация

#### **React Navigation** (v7.0.14)
- **Что это:** Библиотека для навигации между экранами
- **Компоненты:**
  - `@react-navigation/bottom-tabs` - Нижняя панель вкладок
  - `@react-navigation/native-stack` - Stack навигация
- **Структура:**
  - Bottom Tab Navigator (Счета, Транзакции, Планы, Еще)
  - Stack Navigators для каждой секции

### UI компоненты

#### **React Native Gesture Handler** (v2.20.2)
- Обработка жестов (свайпы, тапы)

#### **React Native Reanimated** (v3.16.4)
- Плавные анимации
- Используется в FAB меню и переходах

#### **React Native SVG** (v15.9.0)
- Векторная графика для иконок и графиков

#### **@expo/vector-icons** (Ionicons)
- Иконки Material Design и iOS

---

## 🔐 Аутентификация

### **@react-native-google-signin/google-signin** (v14.0.1)
- **Что это:** Google Sign-In интеграция
- **Зачем:**
  - Быстрая регистрация через Google аккаунт
  - OAuth 2.0 авторизация
- **Используется:**
  - Web Client ID для backend
  - Android Client ID для мобильного приложения

### **expo-auth-session**
- OAuth сессии
- Обработка redirect URLs

---

## 💰 Монетизация

### **react-native-google-mobile-ads** (v15.4.0)
- **Что это:** Google AdMob интеграция
- **Типы рекламы:**
  - **Banner** - баннер на экране "Еще"
  - **Interstitial** - полноэкранная реклама:
    - Каждые 6 транзакций
    - Каждый 3-й счет
    - Раз в день при переключении вкладок
  - **Rewarded** - реклама за награду (отключена)

### **expo-iap**
- **Что это:** In-App Purchases
- **Зачем:** Premium подписки
- **Подписки:**
  - Monthly ($2.99/месяц)
  - Yearly ($29.99/год)

---

## 🌐 Сетевое взаимодействие

### **Fetch API** (нативный)
- Запросы к backend API
- Обработка JWT токенов
- Автоматический refresh токенов

### Backend API
- **Development:** `http://10.0.2.2:3000/api/v1` (локальный)
- **Production:** `https://cashcraft-backend-production.up.railway.app/api/v1`

---

## 🎯 Управление состоянием

### **React Context API** (нативный)
- **Почему Context, а не Redux:**
  - Проще для понимания
  - Меньше boilerplate кода
  - Достаточно для нашего проекта

#### Контексты:
1. **AuthContext** - Аутентификация пользователя
2. **DataContext** - Данные приложения (счета, транзакции)
3. **ThemeContext** - Светлая/темная тема
4. **CurrencyContext** - Валюты и курсы
5. **LocalizationContext** - Локализация (13 языков)
6. **SubscriptionContext** - Premium подписка
7. **BudgetContext** - Бюджеты
8. **FABContext** - FAB меню

---

## 🔧 Утилиты и вспомогательные библиотеки

### Хранилище данных

#### **@react-native-async-storage/async-storage** (v2.1.0)
- Простое key-value хранилище
- Используется для:
  - JWT токены
  - Настройки приложения
  - Кэш курсов валют

#### **expo-secure-store**
- Безопасное хранилище для чувствительных данных
- Шифрование на уровне ОС

### Дата и время

#### **@react-native-community/datetimepicker** (v8.3.1)
- Нативный picker для выбора даты и времени
- Поддержка iOS и Android стилей

### Другие

#### **react-native-get-random-values**
- Генерация UUID для WatermelonDB

#### **react-native-safe-area-context** (v5.0.1)
- Учет безопасных зон (notch, navigation bar)

#### **@react-native-picker/picker** (v2.9.0)
- Нативный picker для выбора из списка

---

## 🖥 Backend

### **Node.js + Express**
- REST API сервер
- JWT аутентификация
- Обработка курсов валют

### **PostgreSQL**
- Серверная база данных
- Синхронизация данных между устройствами

### **Railway**
- Хостинг backend
- Автоматический деплой из Git

---

## 🌍 Локализация

### Поддерживаемые языки:
- 🇬🇧 English (en)
- 🇷🇺 Русский (ru)
- 🇩🇪 Deutsch (de)
- 🇫🇷 Français (fr)
- 🇮🇹 Italiano (it)
- 🇹🇷 Türkçe (tr)
- 🇵🇱 Polski (pl)
- 🇨🇳 中文 (zh)
- 🇺🇦 Українська (uk)
- 🇰🇿 Қазақша (kk)
- 🇮🇳 हिन्दी (hi)
- 🇸🇦 العربية (ar)
- 🇬🇷 Ελληνικά (el)

---

## 📦 Сборка и деплой

### **EAS (Expo Application Services)**
- Облачная сборка приложений
- Автоматизация деплоя
- Управление версиями

### **EAS Build**
```bash
eas build --platform android --profile production
```

### **Google Play Console**
- Публикация в Google Play
- Управление релизами
- Аналитика

---

## 🔍 Разработка и отладка

### **Metro Bundler**
- JavaScript bundler для React Native
- Hot reload во время разработки

### **Expo Go**
- Приложение для тестирования на реальных устройствах
- Без необходимости сборки

### **Android Studio**
- Эмулятор Android
- Отладка нативного кода

---

## 📊 Сравнение версий

| Технология | Версия | Назначение |
|-----------|--------|-----------|
| React Native | 0.76.5 | Основной фреймворк |
| Expo SDK | 52 | Инструменты разработки |
| TypeScript | 5.3.3 | Типизация |
| WatermelonDB | 0.27.1 | Локальная БД |
| React Navigation | 7.0.14 | Навигация |
| Google Mobile Ads | 15.4.0 | Монетизация |

---

## 🚀 Почему именно этот стек?

### ✅ Преимущества:

1. **Кроссплатформенность**
   - Один код для Android и iOS
   - Экономия времени разработки

2. **Offline-first**
   - WatermelonDB обеспечивает работу без интернета
   - Синхронизация при появлении сети

3. **Производительность**
   - React Native использует нативные компоненты
   - WatermelonDB оптимизирована для больших данных

4. **Масштабируемость**
   - Context API легко расширять
   - Модульная архитектура

5. **Монетизация**
   - AdMob - проверенная платформа
   - expo-iap - простая интеграция подписок

### ⚠️ Ограничения:

1. **Размер приложения**
   - React Native увеличивает размер APK
   - Решение: ProGuard, code splitting

2. **Зависимость от Expo**
   - Некоторые нативные модули требуют custom dev client
   - Решение: Expo prebuild

3. **Обновления**
   - Необходимо следить за совместимостью версий
   - Тестирование после обновлений

---

## 📚 Полезные ссылки

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [WatermelonDB Docs](https://watermelondb.dev/)
- [React Navigation Docs](https://reactnavigation.org/)
- [AdMob Integration](https://docs.expo.dev/versions/latest/sdk/admob/)

---

[[02-Architecture/Overview|Следующая: Обзор архитектуры →]]

[[README|← Назад к содержанию]]
