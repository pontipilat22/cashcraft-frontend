// Принудительный вход заново
const forceLogin = async () => {
  console.log('Принудительный вход заново...\n');
  
  try {
    // Импортируем необходимые модули
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    
    // Очищаем все токены
    console.log('Очищаем старые токены...');
    await AsyncStorage.multiRemove([
      'accessToken',
      'refreshToken',
      'isGuest'
    ]);
    
    console.log('✅ Токены очищены');
    console.log('\nТеперь войдите в приложение заново через Google');
    console.log('Это должно решить проблему с истекшим токеном');
    
  } catch (error) {
    console.error('Ошибка при очистке токенов:', error);
  }
};

// Запускаем
forceLogin(); 