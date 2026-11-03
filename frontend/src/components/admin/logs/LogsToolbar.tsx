import { Search, Calendar, Filter, X, Download } from "lucide-react";
import { useState } from "react";

interface LogsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onExport: () => void;
  userId?: string;
  onClearUserFilter?: () => void;
}

export function LogsToolbar({
  search,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onExport,
  userId,
  onClearUserFilter,
}: LogsToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = filterType || startDate || endDate || userId;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            size={14}
          />
          <input
            type="text"
            placeholder="Keresés üzenetben, felhasználóban..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 bg-secondary/80 border border-border rounded pl-9 pr-4 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 h-9 px-3.5 rounded border transition-all text-xs font-mono font-bold uppercase tracking-wider ${showFilters || hasActiveFilters
                ? "bg-primary/20 border-primary text-primary"
                : "bg-secondary/80 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
          >
            <Filter size={14} />
            Szűrők
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded bg-secondary/80 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all text-xs font-mono font-bold uppercase tracking-wider"
            title="Exportálás CSV-be"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {(showFilters || hasActiveFilters) && (
        <div className="tactical-card p-4 animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Type Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Esemény Típus
            </label>
            <select
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary/50"
            >
              <option value="">Összes típus</option>
              <optgroup label="Általános">
                <option value="LOGIN">Bejelentkezés</option>
                <option value="LOGOUT">Kijelentkezés</option>
                <option value="ERROR">Hiba</option>
                <option value="WARN">Figyelmeztetés</option>
              </optgroup>
              <optgroup label="Gépfoglalás & Labor">
                <option value="BOOKING_CREATE">Foglalás létrehozása</option>
                <option value="BOOKING_DELETE">Foglalás törlése</option>
                <option value="BOOKING_AUTO_CANCEL">Automatikus törlés (48h)</option>
                <option value="BOOKING_CHECKIN">Bejelentkezés gépen</option>
                <option value="SCHEDULE_CREATE">Nyitvatartás felvétele</option>
                <option value="SCHEDULE_UPDATE">Nyitvatartás módosítása</option>
                <option value="SCHEDULE_DELETE">Nyitvatartás törlése</option>
                <option value="WAITLIST_JOIN">Várólista jelentkezés</option>
                <option value="WAITLIST_LEAVE">Várólista elhagyása</option>
              </optgroup>
              <optgroup label="Kioszk & Időegyenleg">
                <option value="LOCK">Gép lezárás</option>
                <option value="UNLOCK">Gép feloldás</option>
                <option value="ADD_TIME">Idő jóváírás</option>
                <option value="REMOVE_TIME">Idő levonás</option>
              </optgroup>
              <optgroup label="Versenyek & Mérkőzések">
                <option value="TOURNAMENT_CREATE">Verseny létrehozás</option>
                <option value="TOURNAMENT_UPDATE">Verseny módosítás</option>
                <option value="TOURNAMENT_DELETE">Verseny törlés</option>
                <option value="MATCH_RESULT_UPDATE">Eredmény rögzítés</option>
              </optgroup>
              <optgroup label="Csapatok">
                <option value="TEAM_CREATE">Csapat létrehozás</option>
                <option value="TEAM_UPDATE">Csapat módosítás</option>
                <option value="TEAM_DELETE">Csapat törlés</option>
                <option value="TEAM_JOIN">Belépés csapatba</option>
                <option value="TEAM_LEAVE">Kilépés csapatból</option>
                <option value="TEAM_KICK">Tag eltávolítása</option>
              </optgroup>
              <optgroup label="Gépek & Játékok">
                <option value="COMPUTER_CREATE">Új gép regisztráció</option>
                <option value="COMPUTER_DELETE">Gép törlése</option>
                <option value="GAME_CREATE">Játék hozzáadás</option>
                <option value="GAME_UPDATE">Játék módosítás</option>
                <option value="GAME_DELETE">Játék törlés</option>
              </optgroup>
              <optgroup label="Adminisztráció & Felhasználók">
                <option value="USER_ROLE_UPDATE">Rang módosítás</option>
                <option value="USER_PROFILE_UPDATE">Profil szerkesztés</option>
                <option value="USER_DELETE">Felhasználó törlése</option>
              </optgroup>
            </select>
          </div>

          {/* Date Range Start */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Kezdő dátum
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                size={14}
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Date Range End */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Záró dátum
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                size={14}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Active User Filter Chip */}
          {userId && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Aktív szűrők
              </label>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 bg-primary/20 text-primary px-2 py-1.5 rounded-lg text-xs font-medium border border-primary/30">
                  User ID: {userId.substring(0, 8)}...
                  <button
                    onClick={onClearUserFilter}
                    className="hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clear All */}
          {hasActiveFilters && (
            <div className="flex items-end justify-end md:col-span-2 lg:col-span-1">
              <button
                onClick={() => {
                  onFilterTypeChange("");
                  onStartDateChange("");
                  onEndDateChange("");
                  if (onClearUserFilter) onClearUserFilter();
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline decoration-dashed"
              >
                Szűrők törlése
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
