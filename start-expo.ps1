# Скрипт для запуска Expo с обходом проблем кириллицы в пути
Write-Host "Starting CashCraft3 Expo server..." -ForegroundColor Green

# Устанавливаем переменные окружения
$env:EXPO_USE_METRO_WORKSPACE_ROOT = "true"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "localhost"
$env:NODE_OPTIONS = "--no-deprecation"

# Очищаем кэш и запускаем
Write-Host "Clearing cache..." -ForegroundColor Yellow
npx expo start --clear --localhost

# Если не работает, пробуем альтернативный запуск
if ($LASTEXITCODE -ne 0) {
    Write-Host "Trying alternative start method..." -ForegroundColor Yellow
    npx expo start --clear --host localhost
} 