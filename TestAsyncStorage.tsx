import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TestAsyncStorage: React.FC = () => {
  const [storageData, setStorageData] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const keys = await AsyncStorage.getAllKeys();
      console.log('🔑 Все ключи в AsyncStorage:', keys);
      
      const data: { [key: string]: any } = {};
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            try {
              data[key] = JSON.parse(value);
            } catch {
              data[key] = value; // Если не JSON, сохраняем как строку
            }
          }
        } catch (error) {
          console.error(`Ошибка загрузки ${key}:`, error);
        }
      }
      
      setStorageData(data);
      console.log('📦 Данные из AsyncStorage:', data);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFallbackData = async () => {
    try {
      await AsyncStorage.removeItem('fallback_cloud_data');
      console.log('🗑️ Fallback данные очищены');
      await loadAllData();
    } catch (error) {
      console.error('Ошибка очистки fallback данных:', error);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AsyncStorage Debug</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fallback данные:</Text>
        {storageData['fallback_cloud_data'] ? (
          <View>
            <Text>✅ Есть fallback данные</Text>
            <Text>Счета: {storageData['fallback_cloud_data'].accounts?.length || 0}</Text>
            <Text>Транзакции: {storageData['fallback_cloud_data'].transactions?.length || 0}</Text>
            <Text>Категории: {storageData['fallback_cloud_data'].categories?.length || 0}</Text>
            <Text>Долги: {storageData['fallback_cloud_data'].debts?.length || 0}</Text>
          </View>
        ) : (
          <Text>❌ Нет fallback данных</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Токены:</Text>
        <Text>Access token: {storageData['@cashcraft_access_token'] ? '✅ Есть' : '❌ Нет'}</Text>
        <Text>Refresh token: {storageData['@cashcraft_refresh_token'] ? '✅ Есть' : '❌ Нет'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Все ключи:</Text>
        {Object.keys(storageData).map(key => (
          <Text key={key} style={styles.key}>{key}</Text>
        ))}
      </View>

      <View style={styles.buttons}>
        <Button title="Обновить" onPress={loadAllData} />
        <Button title="Очистить fallback" onPress={clearFallbackData} color="red" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  key: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  buttons: {
    marginTop: 20,
    gap: 10,
  },
}); 