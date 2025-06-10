# Настройка Firebase для CashCraft3

## Текущие ошибки и их решения

### 1. Предупреждение об AsyncStorage
**Ошибка:** "@firebase/auth: Auth (11.9.0): You are initializing Firebase Auth for React Native without providing AsyncStorage"

**Решение:** Это предупреждение означает, что Firebase Auth будет хранить состояние авторизации только в памяти. Это нормально для разработки. В production можно будет настроить persistence позже.

### 2. "Component auth has not been registered yet"
**Ошибка:** "ERROR [runtime not ready]: Error: Component auth has not been registered yet"

**Возможные причины:**
- Firebase инициализируется до того, как React Native полностью загрузился
- Отсутствует или неправильный App ID

## Что нужно сделать прямо сейчас:

### 1. Установите Firebase (если еще не установлен):
```bash
npm install firebase
```

### 2. Получите правильный App ID:
1. Перейдите в [Firebase Console](https://console.firebase.google.com/project/cashcraft-b9781)
2. Нажмите на иконку настроек (шестеренка) → Project settings
3. Прокрутите вниз до раздела "Your apps"
4. Если нет приложений:
   - Нажмите "Add app" → выберите Web (иконка </>)
   - Назовите приложение "CashCraft Web"
   - Скопируйте `appId` из показанной конфигурации
5. Вставьте правильный `appId` в файл `firebase/firebaseConfig.ts`

### 3. Включите Email/Password авторизацию:
1. В Firebase Console перейдите в Authentication
2. Перейдите во вкладку "Sign-in method"
3. Включите "Email/Password"

### 4. Перезапустите приложение:
```bash
# Остановите сервер (Ctrl+C)
# Очистите кеш
npx expo start -c
```

## Если ошибки продолжаются:

### Временное решение (для тестирования без Firebase):
Вы можете временно отключить Firebase и использовать только локальную авторизацию:

1. В файле `src/context/AuthContext.tsx` закомментируйте импорт FirebaseAuthService
2. Используйте локальное хранилище для авторизации

### Альтернативное решение:
Попробуйте использовать Firebase Web SDK вместо React Native специфичных функций:
```javascript
// В firebaseConfig.ts используется упрощенная конфигурация
import { getAuth } from "firebase/auth";
export const auth = getAuth(firebaseApp);
```

## Проверка работы:

1. Откройте приложение
2. Попробуйте зарегистрировать нового пользователя
3. Если регистрация проходит успешно - Firebase работает
4. Если нет - проверьте консоль браузера для дополнительных ошибок

## Важно:
- Убедитесь, что у вас есть интернет-соединение
- Firebase требует подключения к интернету для работы
- В эмуляторе могут быть проблемы с сетью - попробуйте на реальном устройстве 