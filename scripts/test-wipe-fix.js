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

async function testWipeFix() {
  try {
    console.log('🔄 Тестируем исправление wipeData...\n');
    
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
      
      // 2. Выполняем wipe (сброс данных)
      console.log('\n🗑️ 2. Выполняем wipe (сброс данных)...');
      const wipeResponse = await fetch(`${API_URL}/api/v1/sync/wipe`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Статус wipe:', wipeResponse.status, wipeResponse.statusText);
      
      if (wipeResponse.ok) {
        console.log('✅ Wipe успешен');
      } else {
        const errorText = await wipeResponse.text();
        console.error('❌ Wipe ошибка:', errorText);
        return;
      }
      
      // 3. Проверяем, что данные на сервере очищены
      console.log('\n📊 3. Проверяем, что данные на сервере очищены...');
      const downloadResponse2 = await fetch(`${API_URL}/api/v1/sync/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Статус download после wipe:', downloadResponse2.status, downloadResponse2.statusText);
      
      if (downloadResponse2.ok) {
        const data2 = await downloadResponse2.json();
        console.log('✅ Данные на сервере после wipe:');
        console.log('  - Счета:', Array.isArray(data2.accounts) ? data2.accounts.length : 'не массив');
        console.log('  - Транзакции:', Array.isArray(data2.transactions) ? data2.transactions.length : 'не массив');
        console.log('  - Категории:', Array.isArray(data2.categories) ? data2.categories.length : 'не массив');
        console.log('  - Долги:', Array.isArray(data2.debts) ? data2.debts.length : 'не массив');
        
        // Проверяем, что данные действительно очищены
        const isCleared = (data2.accounts?.length || 0) === 0 && 
                         (data2.transactions?.length || 0) === 0 && 
                         (data2.categories?.length || 0) === 0 && 
                         (data2.debts?.length || 0) === 0;
        
        if (isCleared) {
          console.log('✅ Данные на сервере успешно очищены');
        } else {
          console.log('⚠️ Данные на сервере не полностью очищены');
        }
      } else {
        const errorText = await downloadResponse2.text();
        console.error('❌ Download после wipe ошибка:', errorText);
      }
      
      // 4. Симулируем повторный вход (отправляем данные, которые должны быть базовыми)
      console.log('\n📤 4. Симулируем повторный вход (отправляем базовые данные)...');
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
                id: 'cash-account',
                name: 'Наличные',
                type: 'cash',
                balance: 0,
                currency: 'USD',
                isDefault: true,
                isIncludedInTotal: true
              }
            ],
            categories: [
              {
                id: 'food-category',
                name: 'Еда',
                type: 'expense',
                icon: 'restaurant',
                color: '#FF6B6B'
              }
            ],
            transactions: [],
            debts: [],
            exchangeRates: []
          }
        })
      });

      console.log('📡 Статус upload (базовые данные):', uploadResponse.status, uploadResponse.statusText);
      
      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        console.log('✅ Upload базовых данных успешен:', uploadResult);
      } else {
        const errorText = await uploadResponse.text();
        console.error('❌ Upload базовых данных ошибка:', errorText);
      }
      
      // 5. Проверяем финальное состояние
      console.log('\n📊 5. Проверяем финальное состояние...');
      const downloadResponse3 = await fetch(`${API_URL}/api/v1/sync/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Статус download (финальный):', downloadResponse3.status, downloadResponse3.statusText);
      
      if (downloadResponse3.ok) {
        const data3 = await downloadResponse3.json();
        console.log('✅ Финальные данные на сервере:');
        console.log('  - Счета:', Array.isArray(data3.accounts) ? data3.accounts.length : 'не массив');
        console.log('  - Транзакции:', Array.isArray(data3.transactions) ? data3.transactions.length : 'не массив');
        console.log('  - Категории:', Array.isArray(data3.categories) ? data3.categories.length : 'не массив');
        console.log('  - Долги:', Array.isArray(data3.debts) ? data3.debts.length : 'не массив');
      } else {
        const errorText = await downloadResponse3.text();
        console.error('❌ Финальный download ошибка:', errorText);
      }
      
    } else {
      const errorText = await downloadResponse1.text();
      console.error('❌ Первый download ошибка:', errorText);
    }

    console.log('\n✅ Тест исправления wipeData завершен!');
    console.log('📋 Ожидаемое поведение в приложении:');
    console.log('   1. После wipe - локальная база переинициализируется с базовыми данными');
    console.log('   2. Устанавливается флаг dataReset - синхронизация отключается');
    console.log('   3. При повторном входе - данные загружаются с сервера (пустые)');
    console.log('   4. Базовые данные не отправляются на сервер');

  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
}

testWipeFix(); 