import AsyncStorage from '@react-native-async-storage/async-storage';
const fs = require('fs');
const path = require('path');

/**
 * Тестовый скрипт для проверки исправлений синхронизации
 */
const testSyncFix = async () => {
  console.log('🧪 Testing sync fix...');
  
  try {
    // Получаем токен
    const token = await AsyncStorage.getItem('@cashcraft_access_token');
    if (!token) {
      console.log('❌ No access token found');
      return;
    }
    
    console.log('✅ Access token found');
    
    // Получаем userId
    const currentUser = await AsyncStorage.getItem('currentUser');
    if (!currentUser) {
      console.log('❌ No current user found');
      return;
    }
    
    const user = JSON.parse(currentUser);
    console.log('✅ Current user:', user.id);
    
    // Тестируем отправку данных на сервер
    const API_URL = 'https://cashcraft-backend-production.up.railway.app';
    
    const testData = {
      data: {
        accounts: [
          {
            id: 'test-account-1',
            name: 'Test Account',
            type: 'cash',
            balance: 1000,
            currency: 'KZT',
            exchange_rate: 1,
            card_number: null,
            color: '#FF6B6B',
            icon: 'wallet',
            is_default: false,
            is_included_in_total: true,
            target_amount: null,
            credit_start_date: null,
            credit_term: null,
            credit_rate: null,
            credit_payment_type: null,
            credit_initial_amount: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            synced_at: null
          }
        ],
        categories: [
          {
            id: 'test-category-1',
            name: 'Test Category',
            type: 'expense',
            icon: 'shopping',
            color: '#4ECDC4',
            is_system: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            synced_at: null
          }
        ],
        transactions: [],
        debts: [],
        exchangeRates: []
      }
    };
    
    console.log('📤 Sending test data to server...');
    console.log('📊 Test data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(`${API_URL}/api/v1/sync/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Sync successful:', result);
    } else {
      const errorText = await response.text();
      console.error('❌ Sync failed:', errorText);
    }
    
    console.log('✅ Sync fix test completed');
    
  } catch (error) {
    console.error('❌ Sync fix test failed:', error);
  }
};

testSyncFix(); 