# Настройка Google Auth с нуля для Expo + Firebase

## Шаг 1: Создание проекта Firebase

1. Перейдите на https://console.firebase.google.com/
2. Нажмите "Create a project" (Создать проект)
3. Введите название проекта: `CashCraft` (или любое другое)
4. Отключите Google Analytics (не обязательно для начала)
5. Нажмите "Create project"

## Шаг 2: Добавление Web приложения в Firebase

1. В консоли Firebase нажмите на иконку Web (</>) 
2. Введите название приложения: `CashCraft Web`
3. НЕ включайте Firebase Hosting
4. Нажмите "Register app"
5. Скопируйте конфигурацию Firebase (мы её уже имеем в firebaseConfig.ts)

## Шаг 3: Включение Google Authentication

1. В консоли Firebase перейдите в Authentication → Sign-in method
2. Нажмите на "Google"
3. Включите переключатель "Enable"
4. Заполните:
   - Project support email: ваш email
   - Project public-facing name: CashCraft
5. Нажмите "Save"

## Шаг 4: Настройка OAuth 2.0 в Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Выберите ваш Firebase проект из выпадающего списка сверху
3. Перейдите в "APIs & Services" → "Credentials"

### Создание OAuth 2.0 Client IDs:

#### Для Web (ОБЯЗАТЕЛЬНО для Expo):
1. Нажмите "CREATE CREDENTIALS" → "OAuth client ID"
2. Application type: "Web application"
3. Name: "CashCraft Web Client"
4. Authorized JavaScript origins:
   ```
   https://auth.expo.io
   http://localhost
   http://localhost:19006
   http://localhost:8081
   ```
5. Authorized redirect URIs:
   ```
   https://auth.expo.io/@your-expo-username/cashcraft3
   http://localhost
   http://localhost:19006
   http://localhost:8081
   ```
6. Нажмите "CREATE"
7. Скопируйте Client ID (это будет ваш googleWebClientId)

#### Для Android:
1. Нажмите "CREATE CREDENTIALS" → "OAuth client ID"
2. Application type: "Android"
3. Name: "CashCraft Android"
4. Package name: `com.pontipilat.cashcraft`
5. SHA-1 certificate fingerprint: 
   - Для development: выполните команду:
   ```
   cd %USERPROFILE%\.android && keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
   - Скопируйте SHA1
6. Нажмите "CREATE"
7. Скопируйте Client ID (это будет ваш googleAndroidClientId)

#### Для iOS:
1. Нажмите "CREATE CREDENTIALS" → "OAuth client ID"
2. Application type: "iOS"
3. Name: "CashCraft iOS"
4. Bundle ID: `com.pontipilat.cashcraft`
5. Нажмите "CREATE"
6. Скопируйте Client ID (это будет ваш googleIosClientId)

## Шаг 5: Скачивание конфигурационных файлов

### Для Android:
1. Вернитесь в Firebase Console
2. Перейдите в Project Settings (шестеренка) → General
3. Добавьте Android app:
   - Android package name: `com.pontipilat.cashcraft`
   - App nickname: CashCraft Android
   - SHA-1: тот же, что использовали выше
4. Скачайте `google-services.json`
5. Поместите файл в корень проекта

### Для iOS:
1. В Firebase Console добавьте iOS app:
   - iOS bundle ID: `com.pontipilat.cashcraft`
   - App nickname: CashCraft iOS
2. Скачайте `GoogleService-Info.plist`
3. Поместите файл в корень проекта

## Шаг 6: Обновление конфигурации проекта

Обновите `app.json`:
```json
{
  "expo": {
    // ... другие настройки
    "extra": {
      "googleWebClientId": "ВАШ_WEB_CLIENT_ID.apps.googleusercontent.com",
      "googleAndroidClientId": "ВАШ_ANDROID_CLIENT_ID.apps.googleusercontent.com", 
      "googleIosClientId": "ВАШ_IOS_CLIENT_ID.apps.googleusercontent.com"
    }
  }
}
```

## Важные моменты:

1. **Web Client ID обязателен** для работы в Expo Go
2. Убедитесь, что в Authorized redirect URIs добавлен URL вида:
   ```
   https://auth.expo.io/@your-expo-username/your-app-slug
   ```
   Где `your-expo-username` - ваш username в Expo, а `your-app-slug` - slug из app.json

3. Для production build потребуются дополнительные SHA-1 fingerprints

## Проверка:

После настройки запустите приложение:
```bash
npx expo start --clear
```

И проверьте в консоли, какие Client ID используются при нажатии на кнопку Google Sign In. 