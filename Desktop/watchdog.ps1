
$AppName = "EsportManager"
$AppPath = "d:\Codes\EsportTournament\Desktop\bin\Debug\net8.0-windows\EsportManager.exe" # Adjust if needed for release/published path

Write-Host "Monitoring $AppName..."
Write-Host "Press Ctrl+C to stop."

while ($true) {
    if (Test-Path "$env:TEMP\EsportManager_Stop.signal") {
        Write-Host "Stop signal detected. Exiting watchdog."
        Remove-Item "$env:TEMP\EsportManager_Stop.signal" -ErrorAction SilentlyContinue
        break
    }

    $process = Get-Process -Name $AppName -ErrorAction SilentlyContinue

    if (-not $process) {
        # Check again in case it was created just as app closed
        if (Test-Path "$env:TEMP\EsportManager_Stop.signal") {
            Write-Host "Stop signal detected. Exiting watchdog."
            Remove-Item "$env:TEMP\EsportManager_Stop.signal" -ErrorAction SilentlyContinue
            break
        }

        Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $AppName is not running. Restarting..."
        try {
            Start-Process -FilePath $AppPath -WindowStyle Maximized
        }
        catch {
            Write-Host "Error starting application: $_"
        }
    }

    Start-Sleep -Seconds 2
}
