$ErrorActionPreference = "Stop"

# Self-elevate if not running as Administrator
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Host "Re-launching as Administrator..."
    $Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"" + $MyInvocation.MyCommand.Definition + "`""
    Start-Process powershell -Verb RunAs -ArgumentList $Arguments
    exit
}

$TaskName = "EsportManagerWatchdog"

Write-Host "--- Esport Manager Startup Removal ---"
$ErrorActionPreference = "Continue"

# 1. Remove Scheduled Task
Write-Host "1. Removing Scheduled Task '$TaskName'..."
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
    Write-Host "   [OK] Task removed successfully." -ForegroundColor Green
} catch {
    Write-Warning "   [INFO] Task removal failed or task not found: $_"
}

# 2. Remove Registry Key (Legacy)
Write-Host "2. Checking for legacy Registry startup entry..."
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$RegName = "EsportHubKiosk"

try {
    if (Get-ItemProperty -Path $RegPath -Name $RegName -ErrorAction SilentlyContinue) {
        Remove-ItemProperty -Path $RegPath -Name $RegName -ErrorAction Stop
        Write-Host "   [OK] Legacy registry key removed." -ForegroundColor Green
    } else {
        Write-Host "   [INFO] Legacy registry key not found." -ForegroundColor Gray
    }
} catch {
    Write-Warning "   [WARN] Failed to remove registry key: $_"
}

Write-Host "`nDONE! The application will NO LONGER start automatically." -ForegroundColor Cyan
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
