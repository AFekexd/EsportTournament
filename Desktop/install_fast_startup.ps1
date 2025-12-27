$ErrorActionPreference = "Stop"

# Self-elevate if not running as Administrator
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Host "Re-launching as Administrator..."
    $Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"" + $MyInvocation.MyCommand.Definition + "`""
    Start-Process powershell -Verb RunAs -ArgumentList $Arguments
    exit
}

$TaskName = "EsportManagerWatchdog"
$VbsPath = "d:\Codes\EsportTournament\Desktop\run_watchdog.vbs"
$Description = "Starts the Esport Manager Watchdog immediately at logon."

Write-Host "--- Esport Manager Startup Installer ---"

# Enable script scope error handling but don't crash immediately on non-criticals
$ErrorActionPreference = "Continue"

# 1. Remove Registry Run Key (Old Method)
Write-Host "1. Checking for legacy Registry startup entry..."
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$RegName = "EsportHubKiosk"

try {
    if (Get-ItemProperty -Path $RegPath -Name $RegName -ErrorAction SilentlyContinue) {
        Remove-ItemProperty -Path $RegPath -Name $RegName -ErrorAction Stop
        Write-Host "   [OK] Removed legacy registry key." -ForegroundColor Green
    } else {
        Write-Host "   [INFO] Legacy registry key not found (already clean)." -ForegroundColor Gray
    }
} catch {
    Write-Warning "   [WARN] Failed to remove registry key: $_"
}

# 2. Cleanup Existing Task (Safe Method)
Write-Host "2. Cleaning up any existing scheduled tasks..."
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
    Write-Host "   [OK] Existing task removed." -ForegroundColor Green
} catch {
    # Ignore errors if task doesn't exist
    Write-Host "   [INFO] Task not found or already clean." -ForegroundColor Gray
}

# 3. Create New Scheduled Task
Write-Host "3. Creating new Scheduled Task..."

try {
    # Verify VBS path exists
    if (-not (Test-Path $VbsPath)) {
        throw "Watchdog script not found at: $VbsPath"
    }

    $Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsPath`""
    $Trigger = New-ScheduledTaskTrigger -AtLogon
    
    # Resolve the "Users" group name dynamically (Handles Hungarian "Felhasználók" etc.)
    $usersSid = New-Object System.Security.Principal.SecurityIdentifier("S-1-5-32-545")
    $usersGroupName = $usersSid.Translate([System.Security.Principal.NTAccount]).Value
    Write-Host "   [INFO] Resolved Users group to: '$usersGroupName'"

    # Create Principal for "Users" group with Highest privileges
    $Principal = New-ScheduledTaskPrincipal -GroupId $usersGroupName -RunLevel Highest
    
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 0) -Priority 0

    # Register the task
    Register-ScheduledTask -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -TaskName $TaskName -Description $Description -Force -ErrorAction Stop

    Write-Host "   [SUCCESS] Task '$TaskName' created successfully." -ForegroundColor Green
    
    # Verify
    $taskState = (Get-ScheduledTask -TaskName $TaskName).State
    Write-Host "   [INFO] Task State: $taskState"

    Write-Host "`nDONE! The application will start automatically at next login." -ForegroundColor Cyan
} catch {
    Write-Host "`n[ERROR] Failed to create scheduled task!" -ForegroundColor Red
    Write-Host "Error Details: $_" -ForegroundColor Red
    
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "- Make sure you are running this script as Administrator." -ForegroundColor Yellow
    Write-Host "- Check if the path exists: $VbsPath" -ForegroundColor Yellow
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
