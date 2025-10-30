# 🔐 AuthContext - Авторизация

[[06-Context/Overview|← Обзор Context API]] | [[README|Содержание]]

---

## 📖 Что такое AuthContext?

**AuthContext** - контекст для управления **авторизацией и аутентификацией пользователей**. Отвечает за:

- 🔑 Вход/Выход из системы (Login/Logout)
- 👤 Текущий пользователь (User)
- 🎭 Гостевой режим (Guest Mode)
- 🔄 Проверка JWT токена
- 💾 Сохранение сессии

**Файл:** `src/context/AuthContext.tsx`

---

## 🎯 Основные возможности

```typescript
const {
  user,              // Текущий пользователь
  isAuthenticated,   // Авторизован ли пользователь
  isGuest,           // Гостевой режим
  loading,           // Загрузка данных
  login,             // Вход (email, password)
  loginWithGoogle,   // Вход через Google
  register,          // Регистрация
  logout,            // Выход
  continueAsGuest,   // Продолжить как гость
  updateProfile,     // Обновить профиль
} = useAuth();
```

---

## 📋 Интерфейс User

```typescript
interface User {
  id: string;                    // UUID пользователя
  email: string;                 // Email
  name: string;                  // Имя пользователя
  createdAt: string;             // Дата регистрации
  isGuest?: boolean;             // Гостевой режим
  googleId?: string;             // Google ID (если вход через Google)
  picture?: string;              // URL аватара
}
```

### Пример объекта User:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "name": "Иван Иванов",
  "createdAt": "2024-01-15T10:30:00Z",
  "isGuest": false,
  "picture": "https://lh3.googleusercontent.com/..."
}
```

---

## 🏗 Структура контекста

```typescript
interface AuthContextType {
  // Данные
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;

  // Методы авторизации
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;

  // Методы профиля
  updateProfile: (data: Partial<User>) => Promise<void>;
}
```

---

## 🔄 Жизненный цикл

```
1. App.tsx монтируется
   ↓
2. AuthProvider монтируется
   ↓
3. useEffect() запускается
   ├─ Проверяет AsyncStorage на наличие токена
   │  ├─ Если токен найден:
   │  │  ├─ Проверяет валидность токена через API
   │  │  ├─ Если токен валиден → загружает данные пользователя
   │  │  └─ Если токен невалиден → удаляет токен, setUser(null)
   │  │
   │  └─ Если токен не найден:
   │     └─ Проверяет гостевой режим в AsyncStorage
   │        ├─ Если isGuest=true → показывает главный экран (гостевой режим)
   │        └─ Если isGuest=false → показывает LoginScreen
   │
   └─ setLoading(false)
   ↓
4. Компоненты получают доступ через useAuth()
   ↓
5. Пользователь взаимодействует с приложением
   ├─ Вход → login() → сохраняет токен → загружает user
   ├─ Выход → logout() → удаляет токен → setUser(null)
   └─ Гостевой режим → continueAsGuest() → setIsGuest(true)
```

---

## 📝 Методы

### 1. `login(email, password)`

Вход пользователя по email и паролю.

```typescript
const login = async (email: string, password: string) => {
  try {
    setLoading(true);

    // 1. Отправляем запрос на backend
    const response = await ApiService.login({ email, password });

    // 2. Сохраняем токены
    await AsyncStorage.setItem('accessToken', response.accessToken);
    await AsyncStorage.setItem('refreshToken', response.refreshToken);

    // 3. Сохраняем пользователя
    setUser(response.user);
    setIsAuthenticated(true);

  } catch (error) {
    console.error('[AuthContext] Login error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await login(email, password);
      // Автоматически перенаправит на главный экран
    } catch (error) {
      Alert.alert('Ошибка', 'Неверный email или пароль');
    }
  };

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Войти" onPress={handleLogin} />
    </View>
  );
};
```

---

### 2. `loginWithGoogle()`

Вход через Google OAuth.

```typescript
const loginWithGoogle = async () => {
  try {
    setLoading(true);

    // 1. Открываем Google Sign-In
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    // 2. Получаем ID token
    const idToken = userInfo.idToken;

    // 3. Отправляем на backend для верификации
    const response = await ApiService.loginWithGoogle(idToken);

    // 4. Сохраняем токены и пользователя
    await AsyncStorage.setItem('accessToken', response.accessToken);
    await AsyncStorage.setItem('refreshToken', response.refreshToken);
    setUser(response.user);
    setIsAuthenticated(true);

  } catch (error) {
    console.error('[AuthContext] Google login error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const LoginScreen = () => {
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось войти через Google');
    }
  };

  return (
    <TouchableOpacity onPress={handleGoogleLogin}>
      <Image source={require('../assets/google-logo.png')} />
      <Text>Войти через Google</Text>
    </TouchableOpacity>
  );
};
```

---

### 3. `register(email, password, name)`

Регистрация нового пользователя.

```typescript
const register = async (email: string, password: string, name: string) => {
  try {
    setLoading(true);

    // 1. Отправляем запрос на backend
    const response = await ApiService.register({ email, password, name });

    // 2. Сохраняем токены
    await AsyncStorage.setItem('accessToken', response.accessToken);
    await AsyncStorage.setItem('refreshToken', response.refreshToken);

    // 3. Сохраняем пользователя
    setUser(response.user);
    setIsAuthenticated(true);

  } catch (error) {
    console.error('[AuthContext] Register error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const RegisterScreen = () => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleRegister = async () => {
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть минимум 6 символов');
      return;
    }

    try {
      await register(email, password, name);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось зарегистрироваться');
    }
  };

  return (
    <View>
      <TextInput placeholder="Имя" value={name} onChangeText={setName} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Пароль" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Зарегистрироваться" onPress={handleRegister} />
    </View>
  );
};
```

---

### 4. `logout()`

Выход из системы.

```typescript
const logout = async () => {
  try {
    setLoading(true);

    // 1. Удаляем токены из AsyncStorage
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');

    // 2. Если был вход через Google - выходим из Google
    if (user?.googleId) {
      await GoogleSignin.signOut();
    }

    // 3. Очищаем состояние
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(false);

    // 4. Можно также очистить локальную БД
    // await database.write(async () => {
    //   await database.unsafeResetDatabase();
    // });

  } catch (error) {
    console.error('[AuthContext] Logout error:', error);
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const MoreScreen = () => {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Автоматически перенаправит на LoginScreen
          },
        },
      ]
    );
  };

  return (
    <View>
      <Text>Пользователь: {user?.name}</Text>
      <Button title="Выйти" onPress={handleLogout} color="red" />
    </View>
  );
};
```

---

### 5. `continueAsGuest()`

Продолжить использование в гостевом режиме (без регистрации).

```typescript
const continueAsGuest = async () => {
  try {
    setLoading(true);

    // 1. Создаем временного пользователя
    const guestUser: User = {
      id: `guest-${Date.now()}`,
      email: '',
      name: 'Гость',
      createdAt: new Date().toISOString(),
      isGuest: true,
    };

    // 2. Сохраняем флаг гостевого режима
    await AsyncStorage.setItem('isGuest', 'true');

    // 3. Устанавливаем состояние
    setUser(guestUser);
    setIsGuest(true);
    setIsAuthenticated(false); // Гость НЕ авторизован

  } catch (error) {
    console.error('[AuthContext] Guest mode error:', error);
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const LoginScreen = () => {
  const { continueAsGuest } = useAuth();

  return (
    <View>
      <Button title="Войти" onPress={handleLogin} />
      <Button title="Регистрация" onPress={handleRegister} />

      <TouchableOpacity onPress={continueAsGuest}>
        <Text>Продолжить без регистрации</Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

### 6. `updateProfile(data)`

Обновление профиля пользователя.

```typescript
const updateProfile = async (data: Partial<User>) => {
  try {
    setLoading(true);

    // 1. Отправляем обновления на backend
    const updatedUser = await ApiService.updateProfile(data);

    // 2. Обновляем локальное состояние
    setUser(updatedUser);

  } catch (error) {
    console.error('[AuthContext] Update profile error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Пример использования:**

```typescript
const ProfileScreen = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');

  const handleSave = async () => {
    try {
      await updateProfile({ name });
      Alert.alert('Успех', 'Профиль обновлен');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить профиль');
    }
  };

  return (
    <View>
      <TextInput value={name} onChangeText={setName} />
      <Button title="Сохранить" onPress={handleSave} />
    </View>
  );
};
```

---

## 🔐 JWT Токены

### Структура токенов:

```typescript
interface Tokens {
  accessToken: string;   // Короткоживущий токен (15 минут)
  refreshToken: string;  // Долгоживущий токен (7 дней)
}
```

### Процесс обновления токена:

```typescript
// В ApiService.ts
const refreshAccessToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await axios.post('/auth/refresh', { refreshToken });

    // Сохраняем новый access token
    await AsyncStorage.setItem('accessToken', response.data.accessToken);

    return response.data.accessToken;
  } catch (error) {
    // Если refresh token невалиден - выходим
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    throw error;
  }
};

// Автоматически вызывается при 401 ошибке
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      try {
        const newToken = await refreshAccessToken();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios.request(error.config);
      } catch (refreshError) {
        // Перенаправляем на LoginScreen
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 🎭 Гостевой режим vs Авторизованный режим

| Функция | Гостевой режим | Авторизованный режим |
|---------|----------------|---------------------|
| **Создание счетов** | ✅ Да (локально) | ✅ Да (с синхронизацией) |
| **Транзакции** | ✅ Да (локально) | ✅ Да (с синхронизацией) |
| **Синхронизация** | ❌ Нет | ✅ Да |
| **Backup на сервер** | ❌ Нет | ✅ Да |
| **Мультиустройства** | ❌ Нет | ✅ Да |
| **Premium подписка** | ❌ Недоступна | ✅ Доступна |
| **Данные при удалении** | ❌ Теряются | ✅ Сохраняются на сервере |

---

## 🛡 Безопасность

### 1. Хранение токенов:

```typescript
// ✅ Хорошо - используем AsyncStorage (на Android - SharedPreferences с encryption)
await AsyncStorage.setItem('accessToken', token);

// ❌ Плохо - не храним в plain text переменных
const accessToken = '...'; // НЕ ДЕЛАЙТЕ ТАК!
```

### 2. HTTPS Only:

```typescript
// Все запросы ТОЛЬКО через HTTPS
const API_BASE_URL = 'https://cashcraft-backend-production.up.railway.app';
```

### 3. Автоматический logout при невалидном токене:

```typescript
useEffect(() => {
  const checkToken = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      try {
        await ApiService.verifyToken(token);
      } catch (error) {
        // Токен невалиден - выходим
        await logout();
      }
    }
  };
  checkToken();
}, []);
```

---

## 🐛 Отладка

### Логирование событий:

```typescript
const login = async (email: string, password: string) => {
  console.log('[AuthContext] Login attempt:', email);

  try {
    const response = await ApiService.login({ email, password });
    console.log('[AuthContext] Login success:', response.user.id);
    // ...
  } catch (error) {
    console.error('[AuthContext] Login error:', error);
    throw error;
  }
};
```

### Проверка состояния:

```typescript
const DebugScreen = () => {
  const auth = useAuth();

  return (
    <ScrollView>
      <Text>isAuthenticated: {auth.isAuthenticated.toString()}</Text>
      <Text>isGuest: {auth.isGuest.toString()}</Text>
      <Text>loading: {auth.loading.toString()}</Text>
      <Text>user: {JSON.stringify(auth.user, null, 2)}</Text>
    </ScrollView>
  );
};
```

---

## 📚 Примеры использования

### Пример 1: Защита экрана (только для авторизованных)

```typescript
const SubscriptionScreen = () => {
  const { isAuthenticated, isGuest } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isAuthenticated || isGuest) {
      Alert.alert(
        'Требуется вход',
        'Для покупки Premium необходимо авторизоваться',
        [
          {
            text: 'Войти',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    }
  }, [isAuthenticated, isGuest]);

  if (!isAuthenticated || isGuest) {
    return null;
  }

  return <SubscriptionContent />;
};
```

### Пример 2: Условный рендер

```typescript
const App = () => {
  const { isAuthenticated, isGuest, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated && !isGuest) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <BottomTabNavigator />
    </NavigationContainer>
  );
};
```

### Пример 3: Конвертация гостя в пользователя

```typescript
const ConvertGuestScreen = () => {
  const { isGuest, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleConvert = async () => {
    try {
      // Регистрируемся с текущими данными
      await register(email, password, 'Пользователь');

      // Данные автоматически сохранятся при синхронизации
      Alert.alert('Успех', 'Теперь ваши данные синхронизируются!');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать аккаунт');
    }
  };

  if (!isGuest) {
    return null;
  }

  return (
    <View>
      <Text>Создайте аккаунт для синхронизации данных</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Пароль" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Создать аккаунт" onPress={handleConvert} />
    </View>
  );
};
```

---

## 🔗 Связанные контексты

- [[06-Context/DataContext|DataContext]] - использует `user.id` для фильтрации данных
- [[06-Context/SubscriptionContext|SubscriptionContext]] - проверяет статус Premium только для авторизованных
- [[05-Services/ApiService|ApiService]] - использует токены для запросов

---

## ⚙️ Конфигурация

### AsyncStorage ключи:

```typescript
'accessToken'   // JWT токен доступа
'refreshToken'  // JWT токен обновления
'isGuest'       // 'true' если гостевой режим
```

---

[[06-Context/DataContext|Следующая: DataContext →]]

[[README|← Назад к содержанию]]
