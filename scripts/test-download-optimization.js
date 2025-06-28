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

async function testDownloadOptimization() {
  try {
    console.log('🔄 Тестируем оптимизацию downloadData...\n');
    
    // 1. Первый запрос - получаем данные
    console.log('📥 1. Первый запрос - загружаем данные с сервера...');
    const response1 = await fetch(`${API_URL}/api/v1/sync/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Статус первого запроса:', response1.status, response1.statusText);
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Первый запрос успешен');
      console.log('⏰ lastSyncAt из первого запроса:', data1.lastSyncAt);
      console.log('📊 Данные:', {
        accounts: Array.isArray(data1.accounts) ? data1.accounts.length : 'не массив',
        transactions: Array.isArray(data1.transactions) ? data1.transactions.length : 'не массив',
        categories: Array.isArray(data1.categories) ? data1.categories.length : 'не массив',
        debts: Array.isArray(data1.debts) ? data1.debts.length : 'не массив',
      });
      
      // 2. Второй запрос сразу после первого - должен быть оптимизирован
      console.log('\n📥 2. Второй запрос - должен быть оптимизирован...');
      const response2 = await fetch(`${API_URL}/api/v1/sync/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Статус второго запроса:', response2.status, response2.statusText);
      
      if (response2.ok) {
        const data2 = await response2.json();
        console.log('✅ Второй запрос успешен');
        console.log('⏰ lastSyncAt из второго запроса:', data2.lastSyncAt);
        
        // Проверяем, что lastSyncAt одинаковый
        if (data1.lastSyncAt === data2.lastSyncAt) {
          console.log('✅ lastSyncAt одинаковый - оптимизация должна сработать');
          console.log('📋 В приложении второй downloadData должен пропустить импорт');
        } else {
          console.log('⚠️ lastSyncAt различается - возможно есть новые данные');
        }
      } else {
        const errorText = await response2.text();
        console.error('❌ Второй запрос ошибка:', errorText);
      }
      
    } else {
      const errorText = await response1.text();
      console.error('❌ Первый запрос ошибка:', errorText);
    }

    console.log('\n✅ Тест оптимизации downloadData завершен!');
    console.log('📋 Ожидаемое поведение в приложении:');
    console.log('   1. Первый downloadData - очищает и импортирует данные');
    console.log('   2. Второй downloadData - пропускает импорт (lastSyncAt одинаковый)');

  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
}

testDownloadOptimization(); 