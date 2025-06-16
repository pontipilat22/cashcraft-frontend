# 🚨 РЕШЕНИЕ ОШИБКИ redirect_uri_mismatch

## 📋 Быстрое решение

### Шаг 1: Запустите приложение и посмотрите консоль

При запуске приложения вы увидите отладочную информацию:
```
🔍 === ОТЛАДКА OAuth REDIRECT URI ===
```

Скопируйте ВСЕ URI из секции "🎯 Рекомендуемые Redirect URI для Google Console"

### Шаг 2: Откройте Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Выберите ваш проект
3. Перейдите в "APIs & Services" → "Credentials"
4. Найдите ваши OAuth 2.0 Client IDs

### Шаг 3: Добавьте ВСЕ эти URI

#### Для Android Client ID (457720015497-gnh2llpfktu1mf9f0jg9dbq2kne53vhd):
```
com.zarutskiy.cashcraft://
cashcraft://
com.zarutskiy.cashcraft://redirect
cashcraft://redirect
com.zarutskiy.cashcraft:/oauth2redirect
cashcraft:/oauth2redirect
```

#### Для iOS Client ID (457720015497-8o0ubpefff6rvb7v2m21nhofg51iukdd):
```
com.zarutskiy.cashcraft://
cashcraft://
com.googleusercontent.apps.457720015497-8o0ubpefff6rvb7v2m21nhofg51iukdd://
com.zarutskiy.cashcraft://redirect
com.googleusercontent.apps.457720015497-8o0ubpefff6rvb7v2m21nhofg51iukdd:/oauth2redirect
```

#### Если используете Expo Go, также добавьте:
```
exp://localhost:8081
exp://localhost:8081/--/cashcraft
exp://127.0.0.1:8081
exp://127.0.0.1:8081/--/cashcraft
https://auth.expo.io/@YOUR_EXPO_USERNAME/cashcraft3
```

## 🔧 Дополнительные проверки

### 1. Проверьте google-services.json
Убедитесь, что в `android/app/google-services.json` правильный client_id

### 2. Проверьте bundle identifier
- iOS: `com.zarutskiy.cashcraft`
- Android: `com.zarutskiy.cashcraft`

### 3. Очистите кеш
```bash
# Остановите сервер Expo
# Затем выполните:
npx expo start -c
```

## 🎯 Альтернативное решение - использовать Expo Auth Proxy

Если ничего не помогает, можно временно использовать Expo Auth Proxy:

```typescript
// В GoogleSignInButton.tsx измените:
const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: Platform.select({
    android: ids.googleAndroidClientId,
    ios: ids.googleIosClientId,
    default: ids.googleAndroidClientId,
  }),
  scopes: ['openid', 'profile', 'email'],
  // Добавьте эту строку:
  redirectUri: makeRedirectUri({ useProxy: true })
});
```

И добавьте в Google Console:
```
https://auth.expo.io/@YOUR_EXPO_USERNAME/cashcraft3
```

## ⚠️ Частые ошибки

1. **Забыли добавить слеш в конце**: `cashcraft://` (правильно) vs `cashcraft:` (неправильно)
2. **Неправильный Client ID**: Убедитесь, что используете правильный ID для вашей платформы
3. **Кеш браузера**: Очистите кеш браузера если тестируете в вебе
4. **Задержка Google**: Иногда изменения в Google Console применяются до 5 минут

## 📱 Тестирование

1. Запустите приложение
2. Нажмите кнопку "Sign in with Google"
3. Если появляется ошибка, посмотрите в URL браузера параметр `redirect_uri`
4. Убедитесь, что ТОЧНО такой же URI добавлен в Google Console (включая кодировку символов) 