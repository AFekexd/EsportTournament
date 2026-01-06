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
Copy-Item (Join-Path $BasePath "install_cert.ps1") $BuildDir
Copy-Item (Join-Path $BasePath "EsportManager_Key.pfx") $BuildDir

# 5. Sign Executables
$PfxPath = Join-Path $BasePath "EsportManager_Key.pfx"
$CertPassword = "password123"

if (Test-Path $PfxPath) {
    Write-Host "Signing Executables..."
    try {
        $Cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 $PfxPath, $CertPassword
        
        $ExesToSign = Get-ChildItem -Path $BuildDir -Filter "*.exe" -Recurse
        foreach ($exe in $ExesToSign) {
            Write-Host "Signing $($exe.Name)..."
            Set-AuthenticodeSignature -Certificate $Cert -FilePath $exe.FullName -HashAlgorithm SHA256 -TimestampServer "http://timestamp.digicert.com"
        }
    } catch {
        Write-Warning "Signing failed: $_"
    }
} else {
    Write-Warning "Certificate not found. Executables will NOT be signed."
}

# 6. Create Zip
$ZipName = "EsportManager_Installer_v$version.zip"
$ZipPath = Join-Path $BasePath $ZipName
if (Test-Path $ZipPath) { Remove-Item $ZipPath }

Write-Host "Creating Zip: $ZipName"
Compress-Archive -Path "$BuildDir\*" -DestinationPath $ZipPath

# 7. Cleanup
Remove-Item $BuildDir -Recurse -Force

Write-Host "`n[SUCCESS] Installer Package Created: $ZipPath" -ForegroundColor Green
Write-Host "NOTE: The installer now includes EsportLauncher. Check watchdog configuration." -ForegroundColor Yellow
