param(
    [string]$BackendUrl = "https://esport-backend.pollak.info/api/client/update/upload"
)

$ErrorActionPreference = "Stop"

# 1. Determine Paths
$BasePath = "d:\Codes\EsportTournament\Desktop"
$VersionFile = Join-Path $BasePath "version.txt"
$BuildDir = Join-Path $BasePath "bin\Release\net8.0-windows"
$ZipPath = Join-Path $BasePath "update.zip"

# 2. Increment Version
if (-not (Test-Path $VersionFile)) {
    Set-Content -Path $VersionFile -Value "1.0.0"
}

[version]$currentVersion = Get-Content $VersionFile
$newVersion = "{0}.{1}.{2}" -f $currentVersion.Major, $currentVersion.Minor, ($currentVersion.Build + 1)
Set-Content -Path $VersionFile -Value $newVersion
Write-Host "Build Version: $newVersion" -ForegroundColor Cyan

# 3. Build Main App
Write-Host "Building EsportManager..."
dotnet publish "$BasePath\EsportManager.csproj" -c Release -o $BuildDir /p:Version=$newVersion
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

# 4. Zip the Build (Exclude junk)
Write-Host "Zipping..."
if (Test-Path $ZipPath) { Remove-Item $ZipPath }
Compress-Archive -Path "$BuildDir\*" -DestinationPath $ZipPath -Force

# 5. Upload to Backend
Write-Host "Uploading to $BackendUrl..."

try {
    $form = @{
        version = $newVersion
        file = Get-Item -Path $ZipPath
    }
    Invoke-RestMethod -Uri $BackendUrl -Method Post -Form $form
    Write-Host "SUCCESS! Version $newVersion deployed." -ForegroundColor Green
} catch {
    Write-Error "Upload failed: $_"
}
