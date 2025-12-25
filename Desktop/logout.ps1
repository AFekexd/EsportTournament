# Logout Script - Felhasználó kijelentkeztetése
# Ez a script automatikusan fut sikeres Keycloak bejelentkezés után

param(
    [string]$Username = ""
)

Write-Host "Kijelentkeztetés folyamatban..." -ForegroundColor Yellow

# Opció 1: Egyszerű logoff (az aktuális felhasználót jelentkezteti ki)
# logoff

# Opció 2: Specifikus session kijelentkeztetése (ha ismert a session ID)
# logoff <SessionId> /server:<ServerName>

# Opció 3: Query user és majd logoff
# Ha több felhasználó van bejelentkezve, megtalálhatjuk a megfelelőt
$sessions = quser 2>$null
if ($sessions) {
    Write-Host "Aktív sessionök:"
    Write-Host $sessions
    
    # Automatikus kijelentkeztetés az első sessionből
    # logoff
}

# Az app ezt egyszerűen hívja meg
logoff

Write-Host "Kijelentkeztetés kész!" -ForegroundColor Green
