# Настройка Google Sign In

## 1. Создайте файл `.env` в корне проекта:

```env
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=XXXX.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YYYY.apps.googleusercontent.com  
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=ZZZZ.apps.googleusercontent.com
```

## 2. Замените в `app.json` в секции `extra`:

```json
"googleWebClientId": "ВАШ_WEB_CLIENT_ID.apps.googleusercontent.com",
"googleAndroidClientId": "ВАШ_ANDROID_CLIENT_ID.apps.googleusercontent.com", 
"googleIosClientId": "ВАШ_IOS_CLIENT_ID.apps.googleusercontent.com"
```

## 3. Замените в секции `ios.config.googleSignIn`:

```json
"reservedClientId": "com.googleusercontent.apps.ВАШ_IOS_CLIENT_ID_REVERSED"
```

## 4. Где взять Client ID:

1. **Web Client ID** - из Firebase Console > Authentication > Sign-in providers > Google
2. **Android Client ID** - из `google-services.json`, поле `client.oauth_client.client_id` где `client_type: 1`
3. **iOS Client ID** - из `.plist` файла, поле `CLIENT_ID`
4. **iOS Reversed Client ID** - из `.plist` файла, поле `REVERSED_CLIENT_ID`

## 5. После настройки:

```bash
# Очистить кеш и перезапустить
npm run start:clear
``` 