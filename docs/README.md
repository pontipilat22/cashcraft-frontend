# 📚 Документация CashCraft

> Полная документация проекта CashCraft - приложения для управления личными финансами

---

## 🚀 Быстрый старт

- [[01-Getting-Started/Installation|Установка и настройка]]
- [[01-Getting-Started/Quick-Start|Быстрый запуск]]
- [[01-Getting-Started/Development|Разработка]]

---

## 📖 Содержание

### 1️⃣ Начало работы
- [[01-Getting-Started/Installation|Установка и настройка]]
- [[01-Getting-Started/Quick-Start|Быстрый запуск]]
- [[01-Getting-Started/Development|Разработка и отладка]]
- [[01-Getting-Started/Building|Сборка приложения]]

### 2️⃣ Архитектура
- [[02-Architecture/Overview|Обзор архитектуры]]
- [[02-Architecture/Tech-Stack|Стек технологий]]
- [[02-Architecture/Project-Structure|Структура проекта]]
- [[02-Architecture/Data-Flow|Поток данных]]
- [[02-Architecture/State-Management|Управление состоянием]]

### 3️⃣ Экраны (Screens)
- [[03-Screens/Overview|Обзор экранов]]
- [[03-Screens/AccountsScreen|AccountsScreen - Экран счетов]]
- [[03-Screens/TransactionsScreen|TransactionsScreen - Экран транзакций]]
- [[03-Screens/MoreScreen|MoreScreen - Экран настроек]]
- [[03-Screens/SubscriptionScreen|SubscriptionScreen - Premium подписка]]

### 4️⃣ Компоненты (Components)
- [[04-Components/Overview|Обзор компонентов]]
- [[04-Components/UI-Components|UI компоненты]]
- [[04-Components/Modals|Модальные окна]]
- [[04-Components/Ads|Рекламные компоненты]]

### 5️⃣ Сервисы (Services)
- [[05-Services/Overview|Обзор сервисов]]
- [[05-Services/ApiService|ApiService - Работа с API]]
- [[05-Services/ExchangeRateService|ExchangeRateService - Курсы валют]]
- [[05-Services/AdService|AdService - Управление рекламой]]
- [[05-Services/AuthService|AuthService - Аутентификация]]

### 6️⃣ Контекст (Context)
- [[06-Context/Overview|Обзор Context API]]
- [[06-Context/AuthContext|AuthContext - Аутентификация]]
- [[06-Context/DataContext|DataContext - Данные приложения]]
- [[06-Context/ThemeContext|ThemeContext - Темы]]
- [[06-Context/CurrencyContext|CurrencyContext - Валюты]]

### 7️⃣ Навигация (Navigation)
- [[07-Navigation/Overview|Обзор навигации]]
- [[07-Navigation/BottomTabNavigator|Bottom Tab Navigator]]
- [[07-Navigation/Stack-Navigators|Stack Navigators]]

### 8️⃣ База данных (Database)
- [[08-Database/Overview|Обзор базы данных]]
- [[08-Database/WatermelonDB|WatermelonDB]]
- [[08-Database/Models|Модели данных]]
- [[08-Database/Migrations|Миграции]]

### 9️⃣ Конфигурация
- [[09-Configuration/AdMob|AdMob - Реклама]]
- [[09-Configuration/Environment|Переменные окружения]]
- [[09-Configuration/App-Json|app.json конфигурация]]

### 🔟 API
- [[10-API/Backend|Backend API]]
- [[10-API/Exchange-Rates|API курсов валют]]
- [[10-API/Authentication|API аутентификации]]

---

## 🎯 О проекте

**CashCraft** - мобильное приложение для управления личными финансами с поддержкой:
- ✅ Множественных валют
- ✅ Синхронизации между устройствами
- ✅ Offline-first архитектуры
- ✅ Google Sign-In
- ✅ Premium подписки
- ✅ Интеграции с AdMob

---

## 🛠 Технологии

- **React Native** - Кроссплатформенная разработка
- **Expo** - Инструменты и сервисы
- **TypeScript** - Типизация
- **WatermelonDB** - Локальная база данных
- **React Navigation** - Навигация
- **Context API** - Управление состоянием
- **AdMob** - Монетизация
- **Node.js + Express** - Backend
- **PostgreSQL** - Серверная база данных

---

## 📱 Основные возможности

### Управление финансами
- Учет доходов и расходов
- Множественные счета (карты, наличные, сбережения)
- Категории транзакций
- Переводы между счетами
- Финансовые цели

### Мультивалютность
- Поддержка любых валют
- Автоматическое обновление курсов
- Ручное управление курсами
- Конвертация при переводах

### Синхронизация
- Облачное хранение данных
- Синхронизация между устройствами
- Offline-first режим
- Автоматическое разрешение конфликтов

### Монетизация
- Banner реклама на экране "Еще"
- Interstitial реклама:
  - Каждые 6 транзакций
  - Каждый 3-й созданный счет
  - Раз в день при переключении вкладок
- Premium подписка отключает всю рекламу

---

## 👥 Для разработчиков

### Начало работы
1. Клонируйте репозиторий
2. Установите зависимости: `npm install`
3. Настройте окружение (см. [[01-Getting-Started/Installation]])
4. Запустите: `npm start`

### Структура документации
Документация организована по уровням сложности:
- **01-Getting-Started** - Для новичков, установка и первые шаги
- **02-Architecture** - Общая архитектура проекта
- **03-10** - Детальная документация по каждому модулю

### Навигация в Obsidian
- Используйте `Ctrl+O` для быстрого поиска файлов
- Кликайте по ссылкам `[[...]]` для перехода
- Используйте граф связей для визуализации

---

## 📞 Контакты

- **Разработчик:** [Ваше имя]
- **Email:** [Ваш email]
- **Google Play:** [Ссылка на приложение]

---

## 📝 Лицензия

[Укажите лицензию проекта]

---

*Документация обновлена: 2025-10-29*
