import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Экстренный скрипт для остановки цикла wipeData
 * Запустите этот скрипт если приложение застряло в бесконечном цикле
 */
const stopWipeCycle = async () => {
  try {
    console.log('🚨 [Emergency] Останавливаем цикл wipeData...');
    
    // Получаем все ключи
    const keys = await AsyncStorage.getAllKeys();
    
    // Находим все флаги сброса данных
    const resetFlags = keys.filter(key => key.startsWith('dataReset_'));
    
    if (resetFlags.length > 0) {
      console.log(`🗑️ [Emergency] Удаляем ${resetFlags.length} флагов сброса данных:`);
      resetFlags.forEach(flag => console.log(`  - ${flag}`));
      
      await AsyncStorage.multiRemove(resetFlags);
      console.log('✅ [Emergency] Флаги сброса данных удалены');
    } else {
      console.log('ℹ️ [Emergency] Флаги сброса данных не найдены');
    }
    
    // Также очищаем fallback данные
    await AsyncStorage.removeItem('fallback_cloud_data');
    console.log('🗑️ [Emergency] Fallback данные очищены');
    
    console.log('✅ [Emergency] Цикл wipeData остановлен');
    console.log('💡 [Emergency] Перезапустите приложение');
    
  } catch (error) {
    console.error('❌ [Emergency] Ошибка при остановке цикла:', error);
  }
};

// Экспортируем для использования в других скриптах
export default stopWipeCycle;

// Если скрипт запущен напрямую
if (require.main === module) {
  stopWipeCycle();
} 