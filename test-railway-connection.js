// Тест подключения к Railway backend
const testRailwayConnection = async () => {
  const url = 'https://cashcraft-backend-production.up.railway.app';
  
  console.log('Тестируем подключение к Railway backend...\n');
  console.log(`URL: ${url}\n`);

  try {
    console.log('1. Проверяем health endpoint...');
    const healthResponse = await fetch(`${url}/api/v1/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`✅ Health check успешен: ${JSON.stringify(healthData)}`);
    } else {
      console.log(`❌ Health check ошибка: ${healthResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Health check недоступен: ${error.message}`);
  }

  try {
    console.log('\n2. Проверяем корневой endpoint...');
    const rootResponse = await fetch(`${url}/api/v1/`);
    if (rootResponse.ok) {
      const rootData = await rootResponse.json();
      console.log(`✅ Корневой endpoint: ${JSON.stringify(rootData)}`);
    } else {
      console.log(`❌ Корневой endpoint ошибка: ${rootResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Корневой endpoint недоступен: ${error.message}`);
  }

  try {
    console.log('\n3. Проверяем exchange rates endpoint...');
    const ratesResponse = await fetch(`${url}/api/v1/exchange-rates/rate?from=USD&to=KZT`);
    if (ratesResponse.ok) {
      const ratesData = await ratesResponse.json();
      console.log(`✅ Exchange rates: ${JSON.stringify(ratesData)}`);
    } else {
      console.log(`❌ Exchange rates ошибка: ${ratesResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Exchange rates недоступен: ${error.message}`);
  }

  console.log('\n🎉 Тест завершен!');
};

// Запускаем тест
testRailwayConnection(); 