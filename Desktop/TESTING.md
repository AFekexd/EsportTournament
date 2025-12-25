# Tesztelési Útmutató

## Keycloak nélküli tesztelés

Ha még nincs Keycloak szerver, tesztelheted az alkalmazást a fail-safe móddal:

### 1. Indítsd el az alkalmazást
```powershell
cd c:\Users\feke1\source\repos\EsportManager
dotnet run
```

### 2. Tesztelés fail-safe móddal

1. Az alkalmazás teljes képernyőben elindul zárolva
2. Nyomj **Ctrl+Shift+F12**-t
3. Add meg a jelszót: `emergency123`
4. Az alkalmazás bezáródik

### 3. Tesztelés login képernyővel

1. Az alkalmazás zárolási képernyőn van
2. Nyomj **SPACE**-t
3. Megjelenik a bejelentkező form
4. Próbálj bejelentkezni (sikertelen lesz Keycloak nélkül)
5. Nyomj **ESC**-et a bezáráshoz

## Keycloak szerverrel való tesztelés

### Keycloak gyors telepítés Docker-rel

```bash
docker run -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

### Keycloak beállítása

1. Nyisd meg: http://localhost:8080
2. Jelentkezz be admin/admin-nal
3. Hozz létre egy Realm-et: `esport`
4. Hozz létre egy Client-et:
   - Client ID: `esport-kiosk`
   - Client Protocol: `openid-connect`
   - Access Type: `public`
   - Direct Access Grants Enabled: `ON`
5. Hozz létre egy teszt felhasználót:
   - Username: `testuser`
   - Password: `testpass123` (állítsd be a Credentials tabon)

### Teljes tesztelés

1. Indítsd el az alkalmazást
2. Nyomj **SPACE**-t
3. Jelentkezz be:
   - Username: `testuser`
   - Password: `testpass123`
4. Sikeres bejelentkezés után a rendszer kijelentkeztet

## Backend API tesztelés

Ha a backend API-t is tesztelni akarod, készíts egy egyszerű szervert:

```csharp
// Példa ASP.NET Core minimal API
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/api/status/{machineName}", (string machineName) =>
{
    return new { Locked = false, Message = "Test mode" };
});

app.Run("http://localhost:5000");
```

## Hibaelhárítás

### "Hálózati hiba" üzenet
- Ellenőrizd, hogy a Keycloak szerver fut-e
- Ellenőrizd az URL-t: `http://localhost:8080/auth/realms/esport/protocol/openid-connect/token`

### Nem lehet kilépni
- Használd a fail-safe módot: **Ctrl+Shift+F12**, jelszó: `emergency123`
- Vagy állítsd le Task Manager-ből (Admin jogosultság kell)

### Task Manager nem nyílik meg kilépés után
- Indítsd újra a gépet, vagy
- Futtasd adminként PowerShell-ből:
  ```powershell
  Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System" -Name "DisableTaskMgr" -Force
  ```
