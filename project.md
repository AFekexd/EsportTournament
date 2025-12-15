Iskolai esport versenysenek szervezése projekt

Célkitűzés
Az iskolai esport versenysorozat célja, hogy népszerűsítse az esportot az iskolai közösségekben, fejlessze a diákok csapatmunkáját és stratégiai gondolkodását, valamint lehetőséget biztosítson a tehetséges játékosok számára, hogy megmutassák képességeiket.

Backend: 
Prisma V6, PostgreSQL, Node.js typescript, Express.js 
Frontend:
Vite, React, TailwindCSS, Redux Toolkit, React Router declarative routing for React, Shadcn UI

Jogosultságok
- Adminisztrátor: Teljes hozzáférés a rendszerhez, versenyek létrehozása, felhasználók kezelése.
- Szervező: Versenyek létrehozása és kezelése, eredmények rögzítése.
- Moderátor: Felhasználók felügyelete, szabályok betartatása.
- Diák: Versenyeken való részvétel, eredmények megtekintése.

Főbb funkciók
1. Felhasználói regisztráció és bejelentkezés: Diákok és tanárok regisztrálhatnak és bejelentkezhetnek a rendszerbe. (Központi Keycloak szerver használata https://www.keycloak.pollak.info/)
2. Versenynaptár: A közelgő versenyek megtekintése, jelentkezés versenyekre.
3. Csapatkezelés: Csapatok létrehozása, tagok hozzáadása és kezelése. Akár kód alapú csatlakozás is. Mindenki köteles az adott játékhoz tartozó szabályzatot elfogadni, és a játékbeli statiszikákat is csatolni a profiljához.
4. Eredmények és ranglisták: Versenyek eredményeinek rögzítése, ranglisták megjelenítése. 
A versenyek lebonyolítása során a játékok API-jain keresztül automatikusan gyűjtött statisztikák alapján történik az eredmények rögzítése.
A tournament bracketek generálása is automatikusan történik a regisztrált csapatok száma alapján és a Szervezők tudnak a csapatoknak egy ELO pontszámot is adni a teljesítményük alapján. Ezt számítja bele a rendszer a következő versenyek bracket generálásába.
5. Értesítések: E-mail és alkalmazáson belüli értesítések a versenyekkel kapcsolatos fontos információkról.
6. Adminisztrációs felület: Felhasználók, versenyek és eredmények kezelése.
7. Statisztikák és elemzések: Részletes statisztikák a játékosok és csapatok teljesítményéről.
8. Szabályzatok és irányelvek: Az esport versenyek szabályzatainak és irányelveinek megjelenítése.

Egyéb funkciók: Nem csak versenyek szervezése, hanem fun aktivitások is, mint például közös játéknapok amikor mindenki összegyűlik az iskolában és együtt játszanak különböző játékokat, akár kisebb versenyeket is szervezve ezekre az alkalmakra.


