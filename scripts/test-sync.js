import AsyncStorage from '@react-native-async-storage/async-storage';
const fs = require('fs');
const path = require('path');

/**
 * Тестовый скрипт для проверки синхронизации
 */
const testSync = async () => {
  try {
    console.log('🧪 [TestSync] Начинаем тестирование синхронизации...');
    
    // 1. Проверяем токен
    const token = await AsyncStorage.getItem('@cashcraft_access_token');
    console.log('🔑 [TestSync] Токен:', token ? 'Найден' : 'Не найден');
    
    // 2. Проверяем userId
    const userId = await AsyncStorage.getItem('@cashcraft_user_id');
    console.log('👤 [TestSync] User ID:', userId || 'Не найден');
    
    // 3. Проверяем время последней синхронизации
    const lastSyncTime = await AsyncStorage.getItem('@cashcraft_last_sync_time');
    console.log('⏰ [TestSync] Последняя синхронизация:', lastSyncTime || 'Не найдена');
    
    // 4. Проверяем флаг сброса данных
    const resetFlag = userId ? await AsyncStorage.getItem(`dataReset_${userId}`) : null;
    console.log('🏷️ [TestSync] Флаг сброса данных:', resetFlag || 'Не установлен');
    
    // 5. Проверяем fallback данные
    const fallbackData = await AsyncStorage.getItem('fallback_cloud_data');
    console.log('💾 [TestSync] Fallback данные:', fallbackData ? 'Есть' : 'Нет');
    
    // 6. Проверяем готовность базы данных
    const { WatermelonDatabaseService } = await import('../src/services/watermelonDatabase');
    const isDatabaseReady = WatermelonDatabaseService.isDatabaseReady();
    console.log('🗄️ [TestSync] База данных готова:', isDatabaseReady);
    
    if (isDatabaseReady) {
      // 7. Проверяем несинхронизированные данные
      const unsyncedData = await WatermelonDatabaseService.getUnsyncedData();
      console.log('📊 [TestSync] Несинхронизированные данные:', {
        accounts: unsyncedData.accounts?.length || 0,
        categories: unsyncedData.categories?.length || 0,
        transactions: unsyncedData.transactions?.length || 0,
        debts: unsyncedData.debts?.length || 0,
      });
      
      // 8. Проверяем общие данные
      const accounts = await WatermelonDatabaseService.getAccounts();
      const transactions = await WatermelonDatabaseService.getTransactions();
      const categories = await WatermelonDatabaseService.getCategories();
      const debts = await WatermelonDatabaseService.getDebts();
      
      console.log('📊 [TestSync] Общие данные в базе:', {
        accounts: accounts.length,
        transactions: transactions.length,
        categories: categories.length,
        debts: debts.length,
      });
    }
    
    console.log('✅ [TestSync] Тестирование завершено');
    
  } catch (error) {
    console.error('❌ [TestSync] Ошибка при тестировании:', error);
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