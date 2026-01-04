$ErrorActionPreference = "Stop"

$BasePath = $PSScriptRoot
$BuildDir = Join-Path $BasePath "installer_build"
$VersionFile = Join-Path $BasePath "version.txt"

# 1. Clean previous build
if (Test-Path $BuildDir) { Remove-Item $BuildDir -Recurse -Force }
New-Item -ItemType Directory -Path $BuildDir | Out-Null

# 2. Get Version
$version = "1.0.0"
if (Test-Path $VersionFile) {
    $version = Get-Content $VersionFile
}
Write-Host "Creating Installer for Version: $version" -ForegroundColor Cyan

# 2.5 Clean Artifacts to prevent build errors
Write-Host "Cleaning debris..."
Get-ChildItem -Path $BasePath -Include bin,obj -Recurse | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# 3. Publish Applications
Write-Host "Publishing EsportManager..."
dotnet publish "$BasePath\EsportManager.csproj" -c Release -o "$BuildDir" /p:Version=$version
if ($LASTEXITCODE -ne 0) { throw "Manager Build failed" }

Write-Host "Publishing EsportLauncher..."
dotnet publish "$BasePath\Launcher\EsportLauncher.csproj" -c Release -o "$BuildDir" /p:Version=$version
if ($LASTEXITCODE -ne 0) { throw "Launcher Build failed" }

# 4. Copy Startup Scripts
Write-Host "Copying scripts..."
$Scripts = @(
    "watchdog.ps1",
    "run_watchdog.vbs",
    "install_fast_startup.ps1",
    "remove_startup.ps1"
)

foreach ($script in $Scripts) {
    Copy-Item (Join-Path $BasePath $script) $BuildDir
}

# 5. Create Zip
$ZipName = "EsportManager_Installer_v$version.zip"
$ZipPath = Join-Path $BasePath $ZipName
if (Test-Path $ZipPath) { Remove-Item $ZipPath }

Write-Host "Creating Zip: $ZipName"
Compress-Archive -Path "$BuildDir\*" -DestinationPath $ZipPath

# 6. Cleanup
Remove-Item $BuildDir -Recurse -Force

Write-Host "`n[SUCCESS] Installer Package Created: $ZipPath" -ForegroundColor Green
Write-Host "NOTE: The installer now includes EsportLauncher. Check watchdog configuration." -ForegroundColor Yellow
