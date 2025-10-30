# 🚀 Установка и настройка CashCraft

[[README|← Назад к содержанию]]

---

## 📋 Предварительные требования

Перед началом работы убедитесь, что у вас установлено:

### Обязательно:
- ✅ **Node.js** (версия 18 или выше) - [Скачать](https://nodejs.org/)
- ✅ **npm** или **yarn** (устанавливается вместе с Node.js)
- ✅ **Git** - [Скачать](https://git-scm.com/)

### Опционально (для разработки):
- 📱 **Android Studio** - для эмулятора Android
- 📱 **Xcode** - для разработки под iOS (только macOS)
- 📱 **Expo Go** - приложение на телефоне для тестирования

---

## 📦 Шаг 1: Клонирование проекта

```bash
# Клонируйте репозиторий
git clone https://github.com/your-username/cashcraft.git

# Перейдите в папку проекта
cd cashcraft3
```

---

## 📥 Шаг 2: Установка зависимостей

### Установка frontend зависимостей:

```bash
# В корне проекта
npm install
```

Это установит все необходимые пакеты:
- React Native и Expo
- WatermelonDB
- React Navigation
- Google Mobile Ads
- И другие библиотеки

**⏱ Время установки:** ~5-10 минут (зависит от скорости интернета)

### Установка backend зависимостей (опционально):

Если вы планируете запускать локальный backend:

```bash
# Перейдите в папку backend
cd backend

# Установите зависимости
npm install

# Вернитесь в корень проекта
cd ..
```

---

## ⚙️ Шаг 3: Конфигурация

### 3.1 Настройка AdMob (опционально для первого запуска)

Если вы хотите **свои рекламные ID**, зарегистрируйтесь в [AdMob](https://admob.google.com/) и замените ID в файле:

**`src/config/admob.config.ts`:**
```typescript
export const AdMobConfig = {
  banner: 'ca-app-pub-ВАШЕ_ID/BANNER_ID',
  interstitial: 'ca-app-pub-ВАШЕ_ID/INTERSTITIAL_ID',
}
```

> 💡 **Для тестирования** можно использовать существующие ID из файла.

### 3.2 Настройка Google Sign-In (опционально)

Для Google OAuth нужны Client ID. Они уже настроены в `app.json`:

```json
{
  "extra": {
    "googleWebClientId": "457720015497-e98pchk5nluung53cjckq960qvjfdm7b.apps.googleusercontent.com",
    "googleAndroidClientId": "457720015497-8j7ru4jrrec7qe0l53pv0c8tkfnuv1ob.apps.googleusercontent.com"
  }
}
```

> ⚠️ Для **production** нужно создать свои Client ID в [Google Cloud Console](https://console.cloud.google.com/).

### 3.3 Настройка backend URL

В режиме разработки приложение подключается к локальному backend.

**Варианты:**

#### **Вариант A: Использовать Railway backend (рекомендуется для начинающих)**
Уже настроено! Backend работает по адресу:
```
https://cashcraft-backend-production.up.railway.app/api/v1
```

#### **Вариант B: Запустить локальный backend**
Если хотите разрабатывать backend:

1. Настройте PostgreSQL базу данных
2. Создайте `.env` файл в папке `backend/`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/cashcraft
JWT_SECRET=your-secret-key
PORT=3000
```

3. Запустите backend:
```bash
cd backend
npm run dev
```

4. В файле `src/services/api.ts` проверьте URL:
```typescript
const API_BASE_URL = 'http://10.0.2.2:3000/api/v1'; // для Android эмулятора
```

---

## 🏃 Шаг 4: Запуск приложения

### Вариант 1: Запуск через Expo Go (проще всего)

1. **Установите Expo Go** на телефон:
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

2. **Запустите Metro Bundler:**
```bash
npm start
```

3. **Отсканируйте QR-код** в Expo Go

✅ **Готово!** Приложение запустится на вашем телефоне.

---

### Вариант 2: Запуск на Android эмуляторе

1. **Установите Android Studio** и создайте виртуальное устройство

2. **Запустите эмулятор**

3. **Запустите приложение:**
```bash
npm run android
```

**Первая сборка займёт ~10-15 минут**

---

### Вариант 3: Запуск на iOS симуляторе (только macOS)

1. **Установите Xcode** из App Store

2. **Установите Command Line Tools:**
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

3. **Запустите приложение:**
```bash
npm run ios
```

---

## 🔍 Проверка установки

После запуска вы должны увидеть:

✅ **Splash screen** с логотипом CashCraft
✅ **Главный экран** с вкладками внизу
✅ **Возможность создать счет** через кнопку "+"

---

## ⚠️ Частые проблемы

### Проблема 1: `Module not found: @nozbe/watermelondb`

**Решение:**
```bash
# Очистите кэш и переустановите
npm cache clean --force
rm -rf node_modules
npm install
```

### Проблема 2: Ошибка на Windows с кириллицей в пути

Если у вас в пути к проекту есть русские буквы (например, `C:\Пользователи\...`):

**Решение:**
```bash
# Запускайте с флагом для исправления localhost
npm run start:fix
```

Или перенесите проект в путь без кириллицы: `C:\projects\cashcraft3`

### Проблема 3: `Unable to resolve module`

**Решение:**
```bash
# Очистите Metro cache
npm start -- --reset-cache
```

### Проблема 4: Android эмулятор не подключается к backend

Если backend на `localhost:3000`, эмулятор не сможет подключиться.

**Решение:**
Используйте `10.0.2.2` вместо `localhost` (уже настроено в коде):
```typescript
// src/services/api.ts
const API_BASE_URL = 'http://10.0.2.2:3000/api/v1'; // ✅ Правильно для эмулятора
```

### Проблема 5: Google Sign-In не работает

**Причина:** Не настроен SHA-1 fingerprint в Google Cloud Console.

**Решение:**
1. Получите SHA-1:
```bash
cd android
./gradlew signingReport
```

2. Добавьте SHA-1 в [Google Cloud Console](https://console.cloud.google.com/)

---

## 🎯 Следующие шаги

После успешной установки:

1. [[01-Getting-Started/Quick-Start|Быстрый старт]] - Первые шаги в приложении
2. [[01-Getting-Started/Development|Разработка]] - Как разрабатывать и отлаживать
3. [[02-Architecture/Overview|Обзор архитектуры]] - Понимание структуры проекта

---

## 📚 Полезные команды

```bash
# Запуск приложения
npm start                    # Expo Dev Server
npm run android             # Android эмулятор
npm run ios                 # iOS симулятор

# Очистка кэша
npm start -- --reset-cache  # Очистить Metro cache
npm start -- --clear        # Полная очистка

# Проверка кода
npm run lint                # Проверка ESLint (если настроено)
npm run type-check          # Проверка TypeScript (если настроено)

# Backend (если запускаете локально)
cd backend
npm run dev                 # Запуск backend в dev режиме
npm run migrate            # Применить миграции БД
```

---

## 🆘 Нужна помощь?

- 📖 [[README|Главная документация]]
- 🐛 [GitHub Issues](https://github.com/your-username/cashcraft/issues)
- 📧 Email: [ваш email]

---

[[01-Getting-Started/Quick-Start|Следующая: Быстрый старт →]]

[[README|← Назад к содержанию]]
