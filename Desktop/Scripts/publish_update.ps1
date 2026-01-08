param(
    [string]$BackendUrl = "https://esport-backend.pollak.info/api/client/update/upload"
)

$ErrorActionPreference = "Stop"

# 1. Determine Paths
$BasePath = Split-Path -Parent $PSScriptRoot
$VersionFile = Join-Path $BasePath "version.txt"
$BuildDir = Join-Path $BasePath "bin\Release\net8.0-windows"
$ZipPath = Join-Path $BasePath "Installers\update.zip"

# 2. Increment Version
if (-not (Test-Path $VersionFile)) {
    Set-Content -Path $VersionFile -Value "1.0.0"
}

[version]$currentVersion = Get-Content $VersionFile
$newVersion = "{0}.{1}.{2}" -f $currentVersion.Major, $currentVersion.Minor, ($currentVersion.Build + 1)
Set-Content -Path $VersionFile -Value $newVersion
Write-Host "Build Version: $newVersion" -ForegroundColor Cyan

# 3. Clean up old builds (Fix for duplicate attributes)
Write-Host "Cleaning up old build artifacts..."
$DirsToClean = @(
    "$BasePath\obj",
    "$BasePath\bin",
    "$BasePath\Launcher\obj",
    "$BasePath\Launcher\bin"
)

foreach ($dir in $DirsToClean) {
    if (Test-Path $dir) {
        Write-Host "Removing $dir..."
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 4. Build Main App
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
    Add-Type -AssemblyName System.Net.Http
    $httpClient = New-Object System.Net.Http.HttpClient
    $httpClient.Timeout = [TimeSpan]::FromMinutes(5)

    $multipartContent = New-Object System.Net.Http.MultipartFormDataContent

    # Add Version
    $versionContent = New-Object System.Net.Http.StringContent($newVersion)
    $multipartContent.Add($versionContent, "version")

    # Add File
    $fileStream = [System.IO.File]::OpenRead($ZipPath)
    $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
    $streamContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/zip")
    $multipartContent.Add($streamContent, "file", "update.zip")

    # Post
    $result = $httpClient.PostAsync($BackendUrl, $multipartContent).Result
    
    $fileStream.Close()

    if ($result.IsSuccessStatusCode) {
        Write-Host "SUCCESS! Version $newVersion deployed." -ForegroundColor Green
    } else {
        $errorBody = $result.Content.ReadAsStringAsync().Result
        throw "Status: $($result.StatusCode), Message: $errorBody"
    }
} catch {
    Write-Error "Upload failed: $_"
    if ($fileStream) { $fileStream.Dispose() }
}
