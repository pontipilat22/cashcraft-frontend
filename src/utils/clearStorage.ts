import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllStorage = async () => {
  try {
    console.log('Clearing all AsyncStorage data...');
    await AsyncStorage.clear();
    console.log('AsyncStorage cleared successfully');
  } catch (error) {
    console.error('Error clearing AsyncStorage:', error);
  }
};

export const debugAsyncStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('AsyncStorage keys:', keys);
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`AsyncStorage[${key}]:`, value);
    }
  } catch (error) {
    console.error('Error reading AsyncStorage:', error);
  }
}; 