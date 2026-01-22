
$AppName = "EsportManager"
$LogPath = "$env:ProgramData\EsportManager\startup_log.txt"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Ensure log directory exists
$LogDir = Split-Path -Parent $LogPath
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Log-Message {
    param([string]$Msg)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] $Msg"
    Add-Content -Path $LogPath -Value $logLine
    Write-Host $logLine
}

Log-Message "Watchdog started. ScriptDir: $ScriptDir"

# Determine App Path (Prioritize Launcher in Parent Directory)
$AppPath = Join-Path (Split-Path -Parent $ScriptDir) "EsportLauncher.exe"
$WorkDir = Split-Path -Parent $AppPath

if (-not (Test-Path $AppPath)) {
    Log-Message "Launcher not found at $AppPath. Checking alternatives..."
    
    # Check for direct EsportManager.exe in parent
    $DirectAppPath = Join-Path (Split-Path -Parent $ScriptDir) "EsportManager.exe"
    
    if (Test-Path $DirectAppPath) {
        $AppPath = $DirectAppPath
        $WorkDir = Split-Path -Parent $AppPath
        Log-Message "Found EsportManager directly at $AppPath"
    } else {
        # Check Dev Path (Debug/Release)
        $DevPathRelease = Join-Path (Split-Path -Parent $ScriptDir) "bin\Release\net8.0-windows\EsportManager.exe"
        $DevPathDebug = Join-Path (Split-Path -Parent $ScriptDir) "bin\Debug\net8.0-windows\EsportManager.exe"
        
        if (Test-Path $DevPathRelease) {
            $AppPath = $DevPathRelease
            $WorkDir = Split-Path -Parent $AppPath
            Log-Message "Dev Environment (Release) Detected: $AppPath"
        } elseif (Test-Path $DevPathDebug) {
            $AppPath = $DevPathDebug
            $WorkDir = Split-Path -Parent $AppPath
            Log-Message "Dev Environment (Debug) Detected: $AppPath"
        } else {
            Log-Message "CRITICAL: No executable found!"
        }
    }
} else {
    Log-Message "Launcher found at $AppPath"
}

Log-Message "Monitoring $AppName..."

while ($true) {
    if (Test-Path "$env:ProgramData\EsportManager_Stop.signal") {
        Log-Message "Stop signal detected. Exiting watchdog."
        Remove-Item "$env:ProgramData\EsportManager_Stop.signal" -ErrorAction SilentlyContinue
        break
    }

    $process = Get-Process -Name $AppName -ErrorAction SilentlyContinue
    $launcherProcess = Get-Process -Name "EsportLauncher" -ErrorAction SilentlyContinue

    if (-not $process -and -not $launcherProcess) {
        # Check again in case it was created just as app closed
        if (Test-Path "$env:ProgramData\EsportManager_Stop.signal") {
            break
        }

        Log-Message "$AppName is not running. Restarting..."
        try {
            Start-Process -FilePath $AppPath -WorkingDirectory $WorkDir -WindowStyle Maximized
            Log-Message "Start command sent."
        }
        catch {
            Log-Message "Error starting application: $_"
        }
    }

    Start-Sleep -Seconds 5
}
