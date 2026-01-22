Param(
    [string]$TargetDir = "C:\EsportManager"
)

# Ensure Admin
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Host "Re-launching as Administrator..."
    $Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"" + $MyInvocation.MyCommand.Definition + "`""
    if ($TargetDir -ne "C:\EsportManager") { $Arguments += " -TargetDir `"$TargetDir`"" }
    Start-Process powershell -Verb RunAs -ArgumentList $Arguments
    exit
}

Write-Host "--- PERMISSION RESCUE TOOL ---" -ForegroundColor Cyan
Write-Host "Target: $TargetDir"
Write-Host "This script will TAKE OWNERSHIP and RESET permissions."
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

if (-not (Test-Path $TargetDir)) {
    Write-Error "Directory $TargetDir not found!"
    exit 1
}

# 1. Take Ownership (Recursive)
Write-Host "1. Taking Ownership..."
# /f = file/folder, /r = recursive, /d y = default answer yes
takeown /f "$TargetDir" /r /d y
if ($LASTEXITCODE -eq 0) { Write-Host "   [OK] Ownership taken." -ForegroundColor Green }

# 2. Reset Permissions (Recursive)
Write-Host "2. Resetting Permissions..."
# /reset = replace with inherited permissions
# /t = recursive
icacls "$TargetDir" /reset /t
if ($LASTEXITCODE -eq 0) { Write-Host "   [OK] Permissions reset." -ForegroundColor Green }

# 3. Grant Correct Permissions (Clean Start)
Write-Host "3. Applying Clean Permissions..."
# Admins -> Full Control
icacls "$TargetDir" /grant:r "*S-1-5-32-544:(OI)(CI)F" /t /q
# System -> Full Control
icacls "$TargetDir" /grant:r "SYSTEM:(OI)(CI)F" /t /q
# Users -> Modify (NO DENY RULES!)
icacls "$TargetDir" /grant:r "*S-1-5-32-545:(OI)(CI)M" /t /q

Write-Host "   [OK] Clean permissions applied." -ForegroundColor Green

Write-Host "`nDONE! You should now have full access." -ForegroundColor Cyan
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
