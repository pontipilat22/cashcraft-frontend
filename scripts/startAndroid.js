const { spawn } = require('child_process');
const path = require('path');

// Устанавливаем переменные окружения для обхода проблем с кириллицей
process.env.METRO_CACHE_KEY_VERSION = '1';
process.env.RCT_METRO_PORT = '8081';

// Запускаем expo с дополнительными параметрами
const expo = spawn('npx', ['expo', 'start', '--android', '--clear'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    // Дополнительные настройки для Metro
    REACT_NATIVE_PACKAGER_HOSTNAME: 'localhost',
  }
});

expo.on('error', (error) => {
  console.error('Failed to start expo:', error);
});

expo.on('exit', (code) => {
  console.log(`Expo exited with code ${code}`);
}); 