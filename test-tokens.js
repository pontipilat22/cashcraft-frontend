// Тест токенов
const testTokens = async () => {
  console.log('Тестируем токены...\n');
  
  try {
    // Импортируем необходимые модули
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    
    // Проверяем сохраненные токены
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    console.log('Access Token:', accessToken ? 'Есть' : 'Нет');
    console.log('Refresh Token:', refreshToken ? 'Есть' : 'Нет');
    
    if (accessToken) {
      console.log('Access Token (первые 20 символов):', accessToken.substring(0, 20) + '...');
    }
    
    if (refreshToken) {
      console.log('Refresh Token (первые 20 символов):', refreshToken.substring(0, 20) + '...');
    }
    
    // Проверяем другие ключи
    const keys = await AsyncStorage.getAllKeys();
    console.log('\nВсе ключи в AsyncStorage:');
    keys.forEach(key => {
      console.log('-', key);
    });
    
  } catch (error) {
    console.error('Ошибка при проверке токенов:', error);
  }
};

// Запускаем тест
testTokens(); 