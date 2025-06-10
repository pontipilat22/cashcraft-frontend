# Как получить правильный Firebase App ID

## Шаг 1: Перейдите в Firebase Console
Откройте: https://console.firebase.google.com/project/cashcraft-b9781/overview

## Шаг 2: Добавьте Web приложение
1. Нажмите на иконку "</>" (Web) под названием проекта
2. Или нажмите "Add app" и выберите Web платформу

## Шаг 3: Зарегистрируйте приложение
1. Введите название: "CashCraft Web"
2. НЕ включайте Firebase Hosting
3. Нажмите "Register app"

## Шаг 4: Скопируйте конфигурацию
После регистрации вы увидите код примерно такого вида:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB-ZP0kJMi92yzxF3FJ-ZZWqgRauRfXT4",
  authDomain: "cashcraft-b9781.firebaseapp.com",
  projectId: "cashcraft-b9781",
  storageBucket: "cashcraft-b9781.appspot.com",
  messagingSenderId: "475144195261",
  appId: "ВОТ ЗДЕСЬ БУДЕТ ВАШ НАСТОЯЩИЙ APP ID"
};
```

## Шаг 5: Обновите файл конфигурации
Скопируйте значение `appId` и вставьте его в файл `cashcraft3/firebase/firebaseConfig.ts`

## Шаг 6: Включите Authentication
1. В левом меню выберите "Authentication"
2. Нажмите "Get started"
3. Во вкладке "Sign-in method" включите "Email/Password"
4. Нажмите "Save"

## Готово!
После этих шагов Firebase должен заработать. 