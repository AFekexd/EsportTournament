$ErrorActionPreference = "Stop"

$CertName = "EsportManager"
$CertPassword = "password123" # Simple password for internal use
$PfxPath = Join-Path $PSScriptRoot "EsportManager_Key.pfx"

# Check if certificate already exists in store
$existingCert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -match "CN=$CertName" }

if ($existingCert) {
    Write-Host "Certificate already exists in store." -ForegroundColor Yellow
    $Cert = $existingCert[0]
} else {
    Write-Host "Generating new Self-Signed Certificate..." -ForegroundColor Cyan
    $Cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$CertName" -CertStoreLocation Cert:\CurrentUser\My
    Write-Host "Certificate Generated: $($Cert.Thumbprint)" -ForegroundColor Green
}

# Export to PFX if it doesn't exist locally
if (-not (Test-Path $PfxPath)) {
    Write-Host "Exporting to PFX: $PfxPath"
    $Password = ConvertTo-SecureString -String $CertPassword -Force -AsPlainText
    Export-PfxCertificate -Cert $Cert -FilePath $PfxPath -Password $Password
    Write-Host "PFX Exported." -ForegroundColor Green
} else {
    Write-Host "PFX already exists at $PfxPath" -ForegroundColor Yellow
}

Write-Host "`nTo trust this certificate on other machines, run 'install_cert.ps1' as Admin." -ForegroundColor Magenta
