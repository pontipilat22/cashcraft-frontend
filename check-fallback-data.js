import AsyncStorage from '@react-native-async-storage/async-storage';

const checkFallbackData = async () => {
  try {
    console.log('🔍 Проверяем fallback данные в AsyncStorage...\n');
    
    // Получаем все ключи
    const keys = await AsyncStorage.getAllKeys();
    console.log('📋 Все ключи в AsyncStorage:', keys);
    
    // Проверяем fallback данные
    const fallbackData = await AsyncStorage.getItem('fallback_cloud_data');
    if (fallbackData) {
      console.log('\n✅ Найдены fallback данные!');
      const data = JSON.parse(fallbackData);
      console.log('\n📊 Структура данных:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n📈 Статистика:');
      console.log('  - Счета:', Array.isArray(data.accounts) ? data.accounts.length : 'не массив');
      console.log('  - Транзакции:', Array.isArray(data.transactions) ? data.transactions.length : 'не массив');
      console.log('  - Категории:', Array.isArray(data.categories) ? data.categories.length : 'не массив');
      console.log('  - Долги:', Array.isArray(data.debts) ? data.debts.length : 'не массив');
    } else {
      console.log('\n❌ Fallback данные не найдены');
    }
    
    // Проверяем токены
    console.log('\n🔐 Проверяем токены:');
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    console.log('  - Access token:', accessToken ? 'Есть' : 'Нет');
    console.log('  - Refresh token:', refreshToken ? 'Есть' : 'Нет');
    
    // Проверяем пользователя
    const userInfo = await AsyncStorage.getItem('userInfo');
    if (userInfo) {
      console.log('\n👤 Информация о пользователе:');
      console.log(JSON.parse(userInfo));
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
};

// Запускаем проверку
checkFallbackData(); 