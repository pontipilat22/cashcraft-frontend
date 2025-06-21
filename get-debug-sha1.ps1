Write-Host "🔍 Получение SHA-1 для debug версии приложения CashCraft" -ForegroundColor Cyan
Write-Host ""

$debugKeystore = "$env:USERPROFILE\.android\debug.keystore"

if (Test-Path $debugKeystore) {
    Write-Host "✅ Debug keystore найден: $debugKeystore" -ForegroundColor Green
    Write-Host ""
    
    try {
        $output = keytool -list -v -alias androiddebugkey -keystore $debugKeystore -storepass android -keypass android 2>&1
        
        # Ищем SHA1
        $sha1Line = $output | Select-String "SHA1:" | Select-Object -First 1
        
        if ($sha1Line) {
            $sha1 = $sha1Line.ToString().Trim()
            Write-Host "📋 $sha1" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "👆 Скопируйте этот SHA-1 и добавьте его в Google Cloud Console:" -ForegroundColor Cyan
            Write-Host "1. Перейдите на https://console.cloud.google.com/" -ForegroundColor White
            Write-Host "2. Выберите ваш проект" -ForegroundColor White
            Write-Host "3. APIs & Services → Credentials" -ForegroundColor White
            Write-Host "4. Найдите Android OAuth 2.0 Client (457720015497-phj9gjn84anqsnoufvv6bro3ca9oud03.apps.googleusercontent.com)" -ForegroundColor White
            Write-Host "5. Нажмите на него и добавьте новый SHA-1 fingerprint" -ForegroundColor White
            Write-Host "6. Package name должен быть: com.pontipilat.cashcraft" -ForegroundColor White
        } else {
            Write-Host "❌ SHA-1 не найден в выводе keytool" -ForegroundColor Red
            Write-Host "Полный вывод:" -ForegroundColor Yellow
            $output
        }
    } catch {
        Write-Host "❌ Ошибка при выполнении keytool: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Убедитесь, что Java установлена и keytool доступен в PATH" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Debug keystore не найден!" -ForegroundColor Red
    Write-Host "Попробуйте запустить приложение в эмуляторе хотя бы раз, чтобы создать debug.keystore" -ForegroundColor Yellow
} 