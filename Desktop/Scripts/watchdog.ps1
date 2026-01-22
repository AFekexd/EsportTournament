
$AppName = "EsportManager"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$AppPath = Join-Path $ScriptDir "EsportLauncher.exe" # Start Launcher to check for updates
$WorkDir = $ScriptDir

# Dev Environment Detection: If Launcher is missing, try to find the compiled App directly
if (-not (Test-Path $AppPath)) {
    # Check parent directory (Standard Install)
    $ParentPath = Join-Path (Split-Path -Parent $ScriptDir) "EsportManager.exe"
    if (Test-Path $ParentPath) {
        $AppPath = $ParentPath
        $WorkDir = Split-Path -Parent $AppPath
    } else {
        # Check Dev Path
        $DevPath = Join-Path (Split-Path -Parent $ScriptDir) "bin\Release\net8.0-windows\EsportManager.exe"
        if (Test-Path $DevPath) {
            $AppPath = $DevPath
            $WorkDir = Split-Path -Parent $AppPath
            Write-Host "Dev Environment Detected: Using build output at $AppPath" -ForegroundColor Cyan
        }
    }
}

Write-Host "Monitoring $AppName..."
Write-Host "Press Ctrl+C to stop."

while ($true) {
    if (Test-Path "$env:ProgramData\EsportManager_Stop.signal") {
        Write-Host "Stop signal detected. Exiting watchdog."
        Remove-Item "$env:ProgramData\EsportManager_Stop.signal" -ErrorAction SilentlyContinue
        break
    }

    $process = Get-Process -Name $AppName -ErrorAction SilentlyContinue

    if (-not $process) {
        # Check again in case it was created just as app closed
        if (Test-Path "$env:ProgramData\EsportManager_Stop.signal") {
            Write-Host "Stop signal detected. Exiting watchdog."
            Remove-Item "$env:ProgramData\EsportManager_Stop.signal" -ErrorAction SilentlyContinue
            break
        }

        Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $AppName is not running. Restarting..."
        try {
            Start-Process -FilePath $AppPath -WorkingDirectory $WorkDir -WindowStyle Maximized
        }
        catch {
            Write-Host "Error starting application: $_"
        }
    }

    Start-Sleep -Seconds 2
}
