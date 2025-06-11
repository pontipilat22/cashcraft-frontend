import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearDatabase = async (userId: string) => {
  try {
    // Clear AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const userKeys = keys.filter(key => key.includes(userId));
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
    }

    // Delete database file
    const safeUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
    const db = SQLite.openDatabaseSync(`cashcraft_${safeUserId}.db`);
    
    // Drop all tables
    db.execSync('DROP TABLE IF EXISTS accounts');
    db.execSync('DROP TABLE IF EXISTS transactions');
    db.execSync('DROP TABLE IF EXISTS categories');
    db.execSync('DROP TABLE IF EXISTS debts');
    db.execSync('DROP TABLE IF EXISTS sync_metadata');
    
    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
}; 