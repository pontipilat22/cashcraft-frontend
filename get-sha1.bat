@echo off
echo Getting SHA-1 fingerprint for Android debug keystore...
echo.

cd /d "%USERPROFILE%\.android"

keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android | findstr SHA1

echo.
echo Copy the SHA1 value above and paste it in Google Cloud Console
echo.
pause 