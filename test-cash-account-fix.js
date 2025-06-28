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

async function testCashAccountFix() {
  try {
    console.log('🧪 Тестируем исправление проблемы с автоматическим созданием счета "Наличные"...\n');

    // 1. Получаем текущие счета
    console.log('📋 1. Получаем текущие счета...');
    const accountsResponse = await fetch('https://cashcraft-backend-production.up.railway.app/api/v1/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!accountsResponse.ok) {
      console.error('❌ Ошибка получения счетов:', accountsResponse.status, accountsResponse.statusText);
      return;
    }

    const accounts = await accountsResponse.json();
    console.log(`📊 Найдено счетов: ${accounts.length}`);
    accounts.forEach(acc => console.log(`   - ${acc.name} (${acc.type})`));

    // 2. Создаем тестовый счет
    console.log('\n📝 2. Создаем тестовый счет...');
    const testAccount = {
      name: 'Test Account',
      type: 'card',
      balance: 1000,
      currency: 'KZT',
      isDefault: false,
      isIncludedInTotal: true,
      color: '#4CAF50',
      icon: 'card'
    };

    const createResponse = await fetch('https://cashcraft-backend-production.up.railway.app/api/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAccount)
    });

    if (!createResponse.ok) {
      console.error('❌ Ошибка создания счета:', createResponse.status, createResponse.statusText);
      return;
    }

    const createdAccount = await createResponse.json();
    console.log('✅ Тестовый счет создан:', createdAccount.name);

    // 3. Сбрасываем все данные
    console.log('\n🗑️ 3. Сбрасываем все данные...');
    const resetResponse = await fetch('https://cashcraft-backend-production.up.railway.app/api/v1/sync/wipe', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!resetResponse.ok) {
      console.error('❌ Ошибка сброса данных:', resetResponse.status, resetResponse.statusText);
      return;
    }

    const resetResult = await resetResponse.json();
    console.log('✅ Данные сброшены:', resetResult.message);

    // 4. Проверяем счета после сброса
    console.log('\n🔍 4. Проверяем счета после сброса...');
    const accountsAfterResetResponse = await fetch('https://cashcraft-backend-production.up.railway.app/api/v1/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!accountsAfterResetResponse.ok) {
      console.error('❌ Ошибка получения счетов после сброса:', accountsAfterResetResponse.status, accountsAfterResetResponse.statusText);
      return;
    }

    const accountsAfterReset = await accountsAfterResetResponse.json();
    console.log(`📊 Счетов после сброса: ${accountsAfterReset.length}`);

    if (accountsAfterReset.length === 0) {
      console.log('✅ ИСПРАВЛЕНИЕ РАБОТАЕТ! Счет "Наличные" больше не создается автоматически после сброса данных');
    } else {
      console.log('❌ ПРОБЛЕМА НЕ ИСПРАВЛЕНА! Найдены счета после сброса:');
      accountsAfterReset.forEach(acc => console.log(`   - ${acc.name} (${acc.type})`));
    }

    // 5. Создаем новый счет для проверки
    console.log('\n📝 5. Создаем новый счет для проверки...');
    const newAccount = {
      name: 'My Custom Account',
      type: 'bank',
      balance: 5000,
      currency: 'KZT',
      isDefault: true,
      isIncludedInTotal: true,
      color: '#2196F3',
      icon: 'bank'
    };

    const newAccountResponse = await fetch('https://cashcraft-backend-production.up.railway.app/api/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newAccount)
    });

    if (!newAccountResponse.ok) {
      console.error('❌ Ошибка создания нового счета:', newAccountResponse.status, newAccountResponse.statusText);
      return;
    }

    const newCreatedAccount = await newAccountResponse.json();
    console.log('✅ Новый счет создан:', newCreatedAccount.name);

    // 6. Финальная проверка
    console.log('\n🔍 6. Финальная проверка счетов...');
    const finalAccountsResponse = await fetch('https://cashcraft-backend-production.up.railway.app/api/v1/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const finalAccounts = await finalAccountsResponse.json();
    console.log(`📊 Финальное количество счетов: ${finalAccounts.length}`);
    finalAccounts.forEach(acc => console.log(`   - ${acc.name} (${acc.type})`));

    if (finalAccounts.length === 1 && finalAccounts[0].name === 'My Custom Account') {
      console.log('\n🎉 ТЕСТ ПРОЙДЕН! Счет "Наличные" больше не создается автоматически');
    } else {
      console.log('\n❌ ТЕСТ НЕ ПРОЙДЕН! Найдены неожиданные счета');
    }

  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
}

testCashAccountFix(); 