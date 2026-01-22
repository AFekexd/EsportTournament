# Esport Manager Telepítés

Ez a dokumentum leírja a kliens gépek telepítésének folyamatát.

## 1. Előkészületek

Szükséges fájlok (egy pendrive-on vagy hálózaton):
- `EsportManager` mappa (A teljes alkalmazás, benne a `Launcher`, `Scripts` stb.)

A mappát másold be a célgép **C:\** meghajtójára úgy, hogy az útvonal ez legyen:
`C:\EsportManager`

## 2. Telepítés

1. Nyisd meg a mappát: `C:\EsportManager\Scripts`.
2. Jobb klikk a `install_fast_startup.ps1` fájlon.
3. Válaszd a **Run with PowerShell** (Futtatás PowerShell-lel) opciót.
4. Ha kérdezi, engedélyezd a futtatást (A: "Yes to All").

**Mit csinál a telepítő?**
- Törli a régi indítási beállításokat.
- Létrehozza a naplózáshoz szükséges mappát (`C:\ProgramData\EsportManager`).
- Beállítja, hogy bejelentkezéskor automatikusan elinduljon a program (Watchdog).

## 3. Ellenőrzés

1. Jelentkezz ki, majd jelentkezz vissza (vagy indítsd újra a gépet).
2. A belépés után várj ~5-10 másodpercet.
3. A `C:\ProgramData\EsportManager\startup_log.txt` fájlban látnod kell a bejegyzéseket:
   `Watchdog started...`
   `Launcher found...`
   `Monitoring EsportManager...`

## Hibaelhárítás

### Hozzáférés megtagadva (Access Denied)
Ha a mappa zárolva van (nem tudod törölni, módosítani, vagy frissíteni):
1. Másold a `rescue_folder.ps1` scriptet a gépre (pl. Asztalra).
2. Jobb klikk -> **Run with PowerShell** (Rendszergazdaként).
3. Nyomj egy gombot, amikor kéri.
Ez visszaállítja a jogosultságokat alapállapotba (Mindenkinek minden jog), így újra tudod telepíteni/frissíteni a fájlokat.

### Frissítés nem indul el
Nézd meg a logot itt: `C:\ProgramData\EsportManager\launcher_debug.log`.
- Ha "Permission denied" hiba van, futtasd a `rescue_folder.ps1`-t.
- Ha hálózati hiba van, ellenőrizd az internetet.
