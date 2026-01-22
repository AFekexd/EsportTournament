$TargetDir = "C:\EsportManager"

Write-Host "Fixing permissions on $TargetDir..."
if (-not (Test-Path $TargetDir)) {
    Write-Error "Directory $TargetDir not found!"
    exit 1
}

# Grant "Users" (Built-in group) Modify access recursively
# (OI) - Object Inherit (files inherit this)
# (CI) - Container Inherit (folders inherit this)
# M - Modify access
# /T - Apply recursively to existing files
# /Q - Quite mode
$Args = "`"$TargetDir`" /grant *S-1-5-32-545:(OI)(CI)M /T /Q"

Start-Process -FilePath "icacls.exe" -ArgumentList $Args -NoNewWindow -Wait

Write-Host "Permissions updated successfully." -ForegroundColor Green
Write-Host "You should now be able to run the update."
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
