const fs = require('fs');
const path = require('path');

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

async function testReentryFix() {
  try {
    console.log('🔄 Тестируем исправление проблемы с перезаходом в аккаунт...\n');
    
    // 1. Проверяем текущие данные на сервере
    console.log('📊 1. Проверяем текущие данные на сервере...');
    const downloadResponse1 = await fetch(`${API_URL}/api/v1/sync/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Статус download:', downloadResponse1.status, downloadResponse1.statusText);
    
    if (downloadResponse1.ok) {
      const data1 = await downloadResponse1.json();
      console.log('✅ Данные на сервере:');
      console.log('  - Счета:', Array.isArray(data1.accounts) ? data1.accounts.length : 'не массив');
      console.log('  - Транзакции:', Array.isArray(data1.transactions) ? data1.transactions.length : 'не массив');
      console.log('  - Категории:', Array.isArray(data1.categories) ? data1.categories.length : 'не массив');
      console.log('  - Долги:', Array.isArray(data1.debts) ? data1.debts.length : 'не массив');
      console.log('  - lastSyncAt:', data1.lastSyncAt);
      
      // 2. Симулируем отправку пустых данных (как при перезаходе)
      console.log('\n📤 2. Симулируем отправку пустых данных (как при перезаходе)...');
      const uploadResponse = await fetch(`${API_URL}/api/v1/sync/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            accounts: [],
            categories: [],
            transactions: [],
            debts: [],
            exchangeRates: []
          }
        })
      });

      console.log('📡 Статус upload (пустые данные):', uploadResponse.status, uploadResponse.statusText);
      
      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        console.log('✅ Upload пустых данных успешен:', uploadResult);
      } else {
        const errorText = await uploadResponse.text();
        console.error('❌ Upload пустых данных ошибка:', errorText);
      }
      
      // 3. Проверяем, что данные на сервере не изменились
      console.log('\n📊 3. Проверяем, что данные на сервере не изменились...');
      const downloadResponse2 = await fetch(`${API_URL}/api/v1/sync/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Статус download (повторный):', downloadResponse2.status, downloadResponse2.statusText);
      
      if (downloadResponse2.ok) {
        const data2 = await downloadResponse2.json();
        console.log('✅ Данные на сервере после upload пустых данных:');
        console.log('  - Счета:', Array.isArray(data2.accounts) ? data2.accounts.length : 'не массив');
        console.log('  - Транзакции:', Array.isArray(data2.transactions) ? data2.transactions.length : 'не массив');
        console.log('  - Категории:', Array.isArray(data2.categories) ? data2.categories.length : 'не массив');
        console.log('  - Долги:', Array.isArray(data2.debts) ? data2.debts.length : 'не массив');
        console.log('  - lastSyncAt:', data2.lastSyncAt);
        
        // Проверяем, что данные не изменились
        const accountsSame = Array.isArray(data1.accounts) && Array.isArray(data2.accounts) && 
                            data1.accounts.length === data2.accounts.length;
        const transactionsSame = Array.isArray(data1.transactions) && Array.isArray(data2.transactions) && 
                                data1.transactions.length === data2.transactions.length;
        const categoriesSame = Array.isArray(data1.categories) && Array.isArray(data2.categories) && 
                              data1.categories.length === data2.categories.length;
        const debtsSame = Array.isArray(data1.debts) && Array.isArray(data2.debts) && 
                         data1.debts.length === data2.debts.length;
        
        if (accountsSame && transactionsSame && categoriesSame && debtsSame) {
          console.log('✅ Данные на сервере не изменились - сервер защищен от перезаписи пустыми данными');
        } else {
          console.log('⚠️ Данные на сервере изменились - возможно есть проблема с защитой');
        }
      } else {
        const errorText = await downloadResponse2.text();
        console.error('❌ Повторный download ошибка:', errorText);
      }
      
    } else {
      const errorText = await downloadResponse1.text();
      console.error('❌ Первый download ошибка:', errorText);
    }

    console.log('\n✅ Тест исправления проблемы с перезаходом завершен!');
    console.log('📋 Ожидаемое поведение в приложении:');
    console.log('   1. При перезаходе в аккаунт - сначала download, потом upload');
    console.log('   2. При обычной работе - сначала upload, потом download');
    console.log('   3. Сервер не должен перезаписываться пустыми данными');

  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
}

testReentryFix(); 