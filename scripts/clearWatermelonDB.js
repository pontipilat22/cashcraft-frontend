import AsyncStorage from '@react-native-async-storage/async-storage';

const clearWatermelonDB = async () => {
  try {
    // Получаем все ключи
    const keys = await AsyncStorage.getAllKeys();
    
    // Фильтруем ключи, связанные с WatermelonDB
    const watermelonKeys = keys.filter(key => 
      key.includes('watermelon') || 
      key.includes('database') ||
      key.includes('_loki')
    );
    
    // Удаляем найденные ключи
    if (watermelonKeys.length > 0) {
      await AsyncStorage.multiRemove(watermelonKeys);
      console.log(`Cleared ${watermelonKeys.length} WatermelonDB keys`);
    } else {
      console.log('No WatermelonDB data found');
    }
    
    console.log('WatermelonDB cleared successfully');
  } catch (error) {
    console.error('Error clearing WatermelonDB:', error);
  }
};

// Экспортируем для использования в приложении
export default clearWatermelonDB; 