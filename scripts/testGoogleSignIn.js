#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Проверка конфигурации Google Sign-In для CashCraft\n');

// Проверяем app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log('📱 Информация о приложении:');
console.log(`   Package: ${appJson.expo.android.package}`);
console.log(`   Bundle ID: ${appJson.expo.ios.bundleIdentifier}`);

console.log('\n🔑 Google Client IDs:');
const googleWebClientId = appJson.expo.extra?.googleWebClientId;
const googleAndroidClientId = appJson.expo.extra?.googleAndroidClientId;
const googleIosClientId = appJson.expo.extra?.googleIosClientId;

console.log(`   Web Client ID: ${googleWebClientId || '❌ НЕ НАЙДЕН'}`);
console.log(`   Android Client ID: ${googleAndroidClientId || '❌ НЕ НАЙДЕН'}`);
console.log(`   iOS Client ID: ${googleIosClientId || '❌ НЕ НАЙДЕН'}`);

// Проверяем плагин
console.log('\n🔌 Плагины:');
const hasPlugin = appJson.expo.plugins?.some(plugin => 
  Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin'
);
console.log(`   @react-native-google-signin/google-signin: ${hasPlugin ? '✅ Настроен' : '❌ НЕ НАЙДЕН'}`);

// Проверяем package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('\n📦 Зависимости:');
const hasGoogleSignIn = '@react-native-google-signin/google-signin' in packageJson.dependencies;
console.log(`   @react-native-google-signin/google-signin: ${hasGoogleSignIn ? '✅ Установлен' : '❌ НЕ УСТАНОВЛЕН'}`);

// Проверяем, что старые зависимости удалены
const hasExpoAuthSession = 'expo-auth-session' in packageJson.dependencies;
const hasExpoWebBrowser = 'expo-web-browser' in packageJson.dependencies;

if (hasExpoAuthSession || hasExpoWebBrowser) {
  console.log('\n⚠️  Предупреждение: Найдены старые зависимости:');
  if (hasExpoAuthSession) console.log('   - expo-auth-session');
  if (hasExpoWebBrowser) console.log('   - expo-web-browser');
  console.log('   Рекомендуется удалить их командой: npm uninstall expo-auth-session expo-web-browser');
}

// Инструкции
console.log('\n📋 Следующие шаги:');
console.log('1. Запустите: npm install');
console.log('2. Запустите: npx expo prebuild --clean');
console.log('3. Для Android: npx expo run:android');
console.log('4. Для iOS: npx expo run:ios');
console.log('\n💡 Не забудьте добавить SHA-1 fingerprint в Google Console!');
console.log('   Получить SHA-1: cd android && ./gradlew signingReport'); 