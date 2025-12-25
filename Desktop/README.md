# Esport Manager - Kiosk Lock Screen

## Működés

Az alkalmazás zárolási képernyőt biztosít Keycloak autentikációval.

### Funkciók

1. **Zárolási képernyő** - Induláskor fullscreen zárolás
2. **Keycloak bejelentkezés** - Felhasználói autentikáció
3. **Automatikus kijelentkeztetés** - Sikeres bejelentkezés után
4. **Fail-safe mód** - Teszteléshez admin kilépés

## Használat

### Normál használat

1. **SPACE** - Bejelentkező képernyő megnyitása
2. Add meg a Keycloak felhasználóneved és jelszavad
3. Sikeres bejelentkezés után az app eltűnik és a rendszer kijelentkezteti a felhasználót

### Billentyű kombinációk

- **SPACE** - Login képernyő megjelenítése
- **ESC** - Login képernyő bezárása (vissza a zároláshoz)
- **Ctrl+Shift+F12** - Fail-safe admin kilépés
  - Jelszó: `emergency123`

### Keycloak Konfiguráció

Az alkalmazás a következő Keycloak beállításokat használja:

```
URL: http://localhost:8080/auth/realms/esport/protocol/openid-connect/token
Client ID: esport-kiosk
Grant Type: password
```

### Keycloak szerver beállítása (példa)

1. Hozz létre egy új Realm-et: `esport`
2. Hozz létre egy új Client-et: `esport-kiosk`
   - Access Type: `public` vagy `confidential`
   - Direct Access Grants: `Enabled`
3. Adj hozzá felhasználókat a Realm-hez

## API Integráció

Az alkalmazás 5 másodpercenként ellenőrzi a státuszt:

```
GET http://localhost:5000/api/status/{machineName}
```

Válasz formátum:
```json
{
  "Locked": true,
  "Message": "Computer is locked"
}
```

## Fejlesztési jegyzetek

- A Task Manager le van tiltva zárolás alatt
- Alt+F4 le van tiltva
- Az ablak nem zárható be normál módon
- Sikeres Keycloak autentikáció után `logoff` parancs fut

## Biztonsági megjegyzések

⚠️ **FONTOS**: Ez az alkalmazás csak fejlesztési/tesztelési célokra készült!

- A fail-safe jelszó (`emergency123`) változtatható a kódban
- Éles környezetben használj erősebb biztonsági intézkedéseket
- A Keycloak kapcsolat nincs titkosítva (használj HTTPS-t élesben)
