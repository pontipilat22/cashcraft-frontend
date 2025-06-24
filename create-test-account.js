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

async function createTestAccount() {
  try {
    // Создаем тестовый счет
    const testAccount = {
      name: 'Test Account',
      type: 'cash',
      balance: 1000,
      currency: 'KZT',
      isDefault: true,
      isIncludedInTotal: true,
      color: '#4CAF50',
      icon: 'cash'
    };

    console.log('📝 Создаем тестовый счет:', testAccount);

    const response = await fetch('https://cashcraft-backend-production.up.railway.app/api/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAccount)
    });

    console.log('📡 Статус ответа:', response.status, response.statusText);

    const text = await response.text();
    console.log('\n📄 Ответ сервера:');
    console.log(text);

    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✅ Счет успешно создан!');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Ошибка создания счета');
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error);
  }
}

createTestAccount(); 