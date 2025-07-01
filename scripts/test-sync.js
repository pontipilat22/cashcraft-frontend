import AsyncStorage from '@react-native-async-storage/async-storage';
const fs = require('fs');
const path = require('path');
const { CloudSyncService } = require('../src/services/cloudSync');
const { ApiService } = require('../src/services/api');
const { LocalDatabaseService } = require('../src/services/localDatabase');

/**
 * Тестовый скрипт для проверки синхронизации
 */
const testSync = async () => {
  console.log('🧪 Testing data synchronization...');
  
  try {
    // Получаем токен
    const token = await ApiService.getAccessToken();
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
    
    // Проверяем локальные данные
    const accounts = await LocalDatabaseService.getAccounts();
    const transactions = await LocalDatabaseService.getTransactions();
    const categories = await LocalDatabaseService.getCategories();
    const debts = await LocalDatabaseService.getDebts();
    
    console.log('📊 Local data:');
    console.log('  - Accounts:', accounts.length);
    console.log('  - Transactions:', transactions.length);
    console.log('  - Categories:', categories.length);
    console.log('  - Debts:', debts.length);
    
    // Синхронизируем данные
    console.log('🔄 Syncing data to cloud...');
    const syncSuccess = await CloudSyncService.syncData(user.id, token);
    console.log('📤 Sync result:', syncSuccess ? 'Success' : 'Failed');
    
    // Загружаем данные обратно
    console.log('📥 Downloading data from cloud...');
    const downloadSuccess = await CloudSyncService.downloadData(user.id, token);
    console.log('📥 Download result:', downloadSuccess ? 'Success' : 'Failed');
    
    // Проверяем данные после синхронизации
    const accountsAfter = await LocalDatabaseService.getAccounts();
    const transactionsAfter = await LocalDatabaseService.getTransactions();
    const categoriesAfter = await LocalDatabaseService.getCategories();
    const debtsAfter = await LocalDatabaseService.getDebts();
    
    console.log('📊 Data after sync:');
    console.log('  - Accounts:', accountsAfter.length);
    console.log('  - Transactions:', transactionsAfter.length);
    console.log('  - Categories:', categoriesAfter.length);
    console.log('  - Debts:', debtsAfter.length);
    
    console.log('✅ Sync test completed');
    
  } catch (error) {
    console.error('❌ Sync test failed:', error);
  }
};

// Читаем access token из файла
const tokenFile = path.join(__dirname, '..', 'test-token.txt');
let accessToken = '';

if (fs.existsSync(tokenFile)) {
  accessToken = fs.readFileSync(tokenFile, 'utf8').trim();
  console.log('✅ Access token загружен из файла');
} else {
  console.error('❌ Файл test-token.txt не найден!');
  console.log('Создайте файл test-token.txt и поместите в него ваш access token');
  process.exit(1);
}

const API_URL = 'https://cashcraft-backend-production.up.railway.app';

async function testCorrectSyncOrder() {
  try {
    console.log('🔄 Тестируем правильный порядок синхронизации...\n');
    
    // 1. Сначала отправляем данные на сервер (sync.upload)
    console.log('📤 1. Отправляем данные на сервер (sync.upload)...');
    const uploadResponse = await fetch(`${API_URL}/api/v1/sync/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          accounts: [
            {
              id: 'test-account-1',
              name: 'Тестовый счет',
              balance: 1000,
              currency: 'USD',
              type: 'cash',
              isIncludedInTotal: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          categories: [],
          transactions: [],
          debts: [],
          exchangeRates: []
        }
      })
    });

    console.log('📡 Статус upload:', uploadResponse.status, uploadResponse.statusText);
    
    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log('✅ Upload успешен:', uploadResult);
    } else {
      const errorText = await uploadResponse.text();
      console.error('❌ Upload ошибка:', errorText);
    }

    console.log('\n📥 2. Загружаем данные с сервера (sync.download)...');
    
    // 2. Потом загружаем данные с сервера (sync.download)
    const downloadResponse = await fetch(`${API_URL}/api/v1/sync/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Статус download:', downloadResponse.status, downloadResponse.statusText);

    if (downloadResponse.ok) {
      const downloadData = await downloadResponse.json();
      console.log('✅ Download успешен');
      console.log('📊 Полученные данные:');
      console.log('  - Счета:', Array.isArray(downloadData.accounts) ? downloadData.accounts.length : 'не массив');
      console.log('  - Транзакции:', Array.isArray(downloadData.transactions) ? downloadData.transactions.length : 'не массив');
      console.log('  - Категории:', Array.isArray(downloadData.categories) ? downloadData.categories.length : 'не массив');
      console.log('  - Долги:', Array.isArray(downloadData.debts) ? downloadData.debts.length : 'не массив');
      
      if (downloadData.accounts && downloadData.accounts.length > 0) {
        console.log('📋 Первый счет:', downloadData.accounts[0]);
      }
    } else {
      const errorText = await downloadResponse.text();
      console.error('❌ Download ошибка:', errorText);
    }

    console.log('\n✅ Тест правильного порядка синхронизации завершен!');
    console.log('📋 Правильный порядок:');
    console.log('   1. sync.upload (отправка локальных изменений)');
    console.log('   2. sync.download (загрузка обновленных данных)');
    console.log('   3. importCloudData (применение данных локально)');

  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
}

// Экспортируем для использования в других скриптах
export default testSync;

// Если скрипт запущен напрямую
if (require.main === module) {
  testSync();
  testCorrectSyncOrder();
} 