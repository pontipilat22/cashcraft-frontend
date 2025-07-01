# 🔓 Исправление проблемы с выбором Google аккаунта

## 🐛 Проблема
При выходе из приложения и повторном входе через Google система не предлагала выбрать аккаунт, а автоматически входила в тот же аккаунт. Пользователь не мог выбрать другой Google аккаунт.

## 🔍 Анализ
1. **Первый вход**: ✅ Google предлагает выбрать аккаунт
2. **Повторный вход**: ❌ Google автоматически входит в тот же аккаунт
3. **Нет выбора аккаунта**: ❌ Пользователь не может выбрать другой аккаунт
4. **Google сохраняет состояние**: ❌ Google кэширует авторизацию

## 🛠️ Исправления

### 1. Выход из Google аккаунта при выходе из приложения (`AuthContext.tsx`)
```typescript
const logout = async () => {
  const isGuest = user?.isGuest;
  
  // Синхронизируем данные перед выходом
  if (!isGuest && user) {
    // ... синхронизация данных
  }
  
  // Выходим из Google аккаунта (если пользователь не гость)
  if (!isGuest) {
    try {
      console.log('🔓 Signing out from Google...');
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      await GoogleSignin.signOut();
      console.log('✅ Successfully signed out from Google');
    } catch (googleSignOutError) {
      console.error('❌ Failed to sign out from Google:', googleSignOutError);
    }
  }
  
  // ... остальная логика выхода
};
```

### 2. Принудительный выбор аккаунта при входе (`GoogleSignInButton.tsx`)
```typescript
interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showSignOut?: boolean;
  forceAccountSelection?: boolean; // Новый проп
}

const handleGoogleSignIn = async () => {
  // Если нужно принудительно показать выбор аккаунта, сначала выходим
  if (forceAccountSelection) {
    try {
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) {
        console.log('Force account selection: signing out current user...');
        await GoogleSignin.signOut();
      }
    } catch (error) {
      console.log('No current user found, proceeding with sign in...');
    }
  } else {
    // Проверяем, есть ли уже авторизованный пользователь
    try {
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) {
        console.log('User already signed in, signing out to show account selection...');
        await GoogleSignin.signOut();
      }
    } catch (error) {
      console.log('No current user found, proceeding with sign in...');
    }
  }
  
  // ... остальная логика входа
};
```

### 3. Обновление экрана авторизации (`AuthScreen.tsx`)
```typescript
<GoogleSignInButton
  forceAccountSelection={true}
  onSuccess={() => {
    // Авторизация прошла успешно
  }}
  onError={(error) => {
    Alert.alert(t('common.error'), error.message || t('auth.googleSignInError'));
  }}
/>
```

## 📋 Что было исправлено

### ✅ AuthContext.tsx
- Добавлен выход из Google аккаунта при выходе из приложения
- Автоматическая очистка Google состояния

### ✅ GoogleSignInButton.tsx
- Добавлен проп `forceAccountSelection` для принудительного выбора аккаунта
- Автоматический выход из текущего аккаунта перед входом
- Улучшена логика проверки текущего пользователя

### ✅ AuthScreen.tsx
- Обновлен основной кнопка Google входа с `forceAccountSelection={true}`
- Сохранена кнопка выхода из Google аккаунта

## 🧪 Тестирование

### Сценарий тестирования:
1. Войти в приложение через Google (выбрать аккаунт A)
2. Создать счета и транзакции
3. Выйти из приложения
4. Нажать "Продолжить с Google"
5. Проверить, что предлагается выбор аккаунта
6. Выбрать другой аккаунт (аккаунт B)
7. Проверить, что данные загружаются для аккаунта B

### Ожидаемый результат:
- ✅ При первом входе Google предлагает выбрать аккаунт
- ✅ При повторном входе Google снова предлагает выбрать аккаунт
- ✅ Можно переключаться между разными Google аккаунтами
- ✅ Данные синхронизируются для каждого аккаунта отдельно
- ✅ При выходе из приложения Google аккаунт очищается

## 🔧 Дополнительные улучшения

### Автоматический выход из Google
- При выходе из приложения автоматически выходим из Google аккаунта
- Очистка Google кэша и состояния
- Подготовка к следующему входу

### Принудительный выбор аккаунта
- Опция `forceAccountSelection` для принудительного показа выбора
- Автоматический выход из текущего аккаунта
- Гарантированный показ списка аккаунтов

### Обработка ошибок
- Graceful handling ошибок Google Sign-In
- Логирование всех операций с Google
- Fallback режим при проблемах с Google

## 📝 Логи для отладки

При возникновении проблем проверьте логи:
```
🔓 Signing out from Google...
✅ Successfully signed out from Google
Force account selection: signing out current user...
User already signed in, signing out to show account selection...
No current user found, proceeding with sign in...
```

## 🚀 Результат

После этих исправлений:
- ✅ Google всегда предлагает выбрать аккаунт при входе
- ✅ Можно переключаться между разными Google аккаунтами
- ✅ При выходе из приложения Google аккаунт очищается
- ✅ Каждый аккаунт имеет свои данные
- ✅ Нет автоматического входа в последний использованный аккаунт 