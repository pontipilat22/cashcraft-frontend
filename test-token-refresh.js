// Простой тест обновления токена
const testTokenRefresh = async () => {
  console.log('🔍 Тестируем обновление токена...\n');
  
  try {
    // Импортируем необходимые модули
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    
    // Проверяем текущие токены
    const accessToken = await AsyncStorage.getItem('@cashcraft_access_token');
    const refreshToken = await AsyncStorage.getItem('@cashcraft_refresh_token');
    
    console.log('📋 Текущие токены:');
    console.log('  Access Token:', accessToken ? 'Есть' : 'Нет');
    console.log('  Refresh Token:', refreshToken ? 'Есть' : 'Нет');
    
    if (!refreshToken) {
      console.log('❌ Refresh Token отсутствует - нужно войти заново');
      return;
    }
    
    // Пытаемся обновить токен
    console.log('\n🔄 Пытаемся обновить токен...');
    
    const response = await fetch('https://cashcraft-backend-production.up.railway.app/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: refreshToken
      }),
    });
    
    console.log('📡 Ответ сервера:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Токен обновлен успешно!');
      console.log('  Новый Access Token:', data.accessToken ? 'Есть' : 'Нет');
      console.log('  Новый Refresh Token:', data.refreshToken ? 'Есть' : 'Нет');
      
      // Сохраняем новые токены
      await AsyncStorage.setItem('@cashcraft_access_token', data.accessToken);
      await AsyncStorage.setItem('@cashcraft_refresh_token', data.refreshToken);
      
      console.log('💾 Новые токены сохранены');
      
      // Тестируем запрос с новым токеном
      console.log('\n🧪 Тестируем запрос с новым токеном...');
      try {
        const meResponse = await fetch('https://cashcraft-backend-production.up.railway.app/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${data.accessToken}`,
          },
        });
        
        if (meResponse.ok) {
          const userData = await meResponse.json();
          console.log('✅ Запрос с новым токеном успешен:', userData.user.email);
        } else {
          console.log('❌ Запрос с новым токеном не удался:', meResponse.status);
        }
      } catch (error) {
        console.log('❌ Ошибка при тестировании запроса:', error.message);
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Ошибка обновления токена:', errorText);
      console.log('🔧 Рекомендация: войдите заново');
    }
    
  } catch (error) {
    console.error('💥 Ошибка при тестировании:', error.message);
  }
};

// Запускаем тест
testTokenRefresh(); 