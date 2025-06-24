const fs = require('fs');
const path = require('path');

// Читаем access token из файла
const tokenFile = path.join(__dirname, 'test-token.txt');
let accessToken = '';

if (fs.existsSync(tokenFile)) {
  accessToken = fs.readFileSync(tokenFile, 'utf8').trim();
  console.log('✅ Access token загружен из файла');
} else {
  console.error('❌ Файл test-token.txt не найден!');
  console.log('Создайте файл test-token.txt и поместите в него ваш access token');
  process.exit(1);
}

async function testSyncDownload() {
  try {
    const response = await fetch('https://cashcraft-backend-production.up.railway.app/api/v1/sync/download', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Статус ответа:', response.status, response.statusText);
    console.log('📋 Заголовки ответа:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('\n📄 Сырой ответ сервера:');
    console.log(text);

    try {
      const data = JSON.parse(text);
      console.log('\n📊 Разобранный JSON:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.accounts) {
        console.log('\n📈 Статистика:');
        console.log('  - Счета:', Array.isArray(data.accounts) ? data.accounts.length : 'не массив');
        console.log('  - Транзакции:', Array.isArray(data.transactions) ? data.transactions.length : 'не массив');
        console.log('  - Категории:', Array.isArray(data.categories) ? data.categories.length : 'не массив');
        console.log('  - Долги:', Array.isArray(data.debts) ? data.debts.length : 'не массив');
      }
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON:', parseError);
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error);
  }
}

testSyncDownload(); 