$ErrorActionPreference = "Stop"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "You must run this script as Administrator to install the certificate!"
    Write-Host "Requesting Admin privileges..." -ForegroundColor Yellow
    Start-Process powershell.exe "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$PfxPath = Join-Path $PSScriptRoot "EsportManager_Key.pfx"

if (-not (Test-Path $PfxPath)) {
    Write-Error "Certificate file not found: $PfxPath"
    exit 1
}

Write-Host "Installing Certificate to Trusted Root..." -ForegroundColor Cyan

$CertPassword = "password123"
$Password = ConvertTo-SecureString -String $CertPassword -Force -AsPlainText

try {
    # Import into Root (Trusted Root Certification Authorities)
    Import-PfxCertificate -FilePath $PfxPath -CertStoreLocation Cert:\LocalMachine\Root -Password $Password -ErrorAction Stop
    
    # Also import into Trusted Publisher to suppress more warnings
    Import-PfxCertificate -FilePath $PfxPath -CertStoreLocation Cert:\LocalMachine\TrustedPublisher -Password $Password -ErrorAction Stop
    
    Write-Host "SUCCESS: Certificate installed. The app should now be trusted." -ForegroundColor Green
    Read-Host "Press Enter to exit..."
    
} catch {
    Write-Error "Failed to install certificate: $_"
    Read-Host "Press Enter to exit..."
}
