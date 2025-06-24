// Тест подключения к backend
const testBackendConnection = async () => {
  const urls = [
    'http://0.0.0.0:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://10.0.2.2:3000', // Android emulator
    'http://192.168.1.1:3000', // Пример локального IP
  ];

  console.log('Тестируем подключение к backend...\n');

  for (const url of urls) {
    try {
      console.log(`Пробуем ${url}...`);
      const response = await fetch(`${url}/api/v1/health`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Успешно! ${url} - ${data.status}`);
        return url;
      } else {
        console.log(`❌ Ошибка ${response.status}: ${url}`);
      }
    } catch (error) {
      console.log(`❌ Недоступен: ${url} - ${error.message}`);
    }
  }

  console.log('\n❌ Ни один URL не доступен');
  return null;
};

// Запускаем тест
testBackendConnection().then(workingUrl => {
  if (workingUrl) {
    console.log(`\n🎉 Рабочий URL: ${workingUrl}`);
    console.log('Обновите API_URL в CloudSyncService на этот адрес');
  }
}); 