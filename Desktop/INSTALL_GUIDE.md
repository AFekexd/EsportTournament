# Esport Manager - Telepítési Útmutató

Ez az útmutató leírja, hogyan készítsd el a telepítő csomagot, és hogyan telepítsd azt egy új gépre.

## 1. Telepítő Csomag Elkészítése (Fejlesztői Gépen)

Mielőtt átmásolnád az alkalmazást, készíts egy ZIP csomagot, ami minden szükséges fájlt tartalmaz.

1. Nyisd meg a terminált a `d:\Codes\EsportTournament\Desktop` mappában.
2. Futtasd a telepítő készítő scriptet:
   ```powershell
   .\create_installer.ps1
   ```
   _Ez létrehoz egy `EsportManager_Installer_vX.Y.Z.zip` fájlt a mappában._

## 2. Telepítés az Új Gépen

Vidd át az elkészült ZIP fájlt az új számítógépre (pendrive-on vagy hálózaton).

1. **Másold** a ZIP tartalmát egy végleges helyre, például:
   `C:\EsportManager`
   _(Fontos: Ne ideiglenes mappába rakd, mert onnan fog futni az app!)_

2. **Csomagold ki** a ZIP-et.

3. **Indítsd el** a `install_fast_startup.ps1` fájlt **Rendszergazdaként**:

   - Jobb kllikk a fájlra -> _Run with PowerShell_
   - VAGY nyiss egy Admin PowerShellt, navigálj a mappába és futtasd: `.\install_fast_startup.ps1`

4. **Kész!**
   - A script automatikusan hozzáadja az alkalmazást az ütemezett feladatokhoz (Task Scheduler).
   - Indításkor először az **EsportLauncher** indul el, ami ellenőrzi a frissítéseket, letölti őket ha szükséges, majd elindítja a fő alkalmazást.
   - **Biztonság:** A script lezárja a mappát úgy, hogy a **diákok (Users) csak olvasni és futtatni** tudják a programot, de **törölni nem**. Csak rendszergazda módosíthatja a fájlokat.
   - Az alkalmazás most már automatikusan elindul minden bejelentkezéskor, és nem lehet könnyen bezárni.

## 3. Karbantartás

- **Auto-Start Kikapcsolása**: Futtasd a `remove_startup.ps1` scriptet, vagy Adminként bejelentkezve használd a tálca ikon menüjét.
- **Kézi indítás**: `EsportManager.exe`
