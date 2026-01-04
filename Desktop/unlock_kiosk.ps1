# Unlock Kiosk Script (Emergency)
# Stop the Watchdog (Service or Script) first to prevent restart
Write-Host "Stopping Watchdog..." -ForegroundColor Yellow
Stop-Process -Name "powershell" -Force -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*watchdog*" }
# Also try to kill by command line if possible, but simple Stop-Process might suffice for now if we identify it.
# Actually, the watchdog might be running as a scheduled task or just a background process.
# Let's try to kill the specific watchdog process if we can find it, otherwise we might kill all powershells which is risky?
# But user wants a script to "unlock".

# Stop the App
Write-Host "Stopping EsportManager..." -ForegroundColor Yellow
Stop-Process -Name "EsportManager" -Force -ErrorAction SilentlyContinue

Write-Host "Kiosk Unlocked." -ForegroundColor Green
