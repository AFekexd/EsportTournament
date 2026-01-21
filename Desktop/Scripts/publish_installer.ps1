param(
    [string]$BackendUrl = "https://esport-backend.pollak.info/api/client/update/installer/upload"
)

$ErrorActionPreference = "Stop"

# 1. Determine Paths
$BasePath = Split-Path -Parent $PSScriptRoot
$VersionFile = Join-Path $BasePath "version.txt"

# 2. Run create_installer.ps1 to build
Write-Host "Building Installer Package..." -ForegroundColor Cyan
& "$PSScriptRoot\create_installer.ps1"

# 3. Get version
$version = Get-Content $VersionFile -ErrorAction Stop

# 4. Find the installer zip
$InstallersDir = Join-Path $BasePath "Installers"
$ZipPath = Join-Path $InstallersDir "EsportManager_Installer_v$version.zip"

if (-not (Test-Path $ZipPath)) {
    Write-Error "Installer ZIP not found at: $ZipPath"
    exit 1
}

Write-Host "Uploading Installer v$version to $BackendUrl..." -ForegroundColor Yellow

# 5. Upload to Backend
try {
    Add-Type -AssemblyName System.Net.Http
    $httpClient = New-Object System.Net.Http.HttpClient
    $httpClient.Timeout = [TimeSpan]::FromMinutes(10)

    $multipartContent = New-Object System.Net.Http.MultipartFormDataContent

    # Add Version
    $versionContent = New-Object System.Net.Http.StringContent($version)
    $multipartContent.Add($versionContent, "version")

    # Add File
    $fileStream = [System.IO.File]::OpenRead($ZipPath)
    $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
    $streamContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/zip")
    $multipartContent.Add($streamContent, "file", "installer.zip")

    # Post
    $result = $httpClient.PostAsync($BackendUrl, $multipartContent).Result
    
    $fileStream.Close()

    if ($result.IsSuccessStatusCode) {
        Write-Host "`n[SUCCESS] Installer v$version uploaded!" -ForegroundColor Green
        Write-Host "Download URL: https://esport-backend.pollak.info/api/client/update/installer/download" -ForegroundColor Cyan
    } else {
        $errorBody = $result.Content.ReadAsStringAsync().Result
        throw "Status: $($result.StatusCode), Message: $errorBody"
    }
} catch {
    Write-Error "Upload failed: $_"
    if ($fileStream) { $fileStream.Dispose() }
}
