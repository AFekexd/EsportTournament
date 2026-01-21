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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Keresés üzenetben, felhasználóban..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#1a1b26] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all shadow-sm"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
              showFilters || hasActiveFilters
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-[#1a1b26] border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            <Filter size={16} />
            Szűrők
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1b26] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
            title="Exportálás CSV-be"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {(showFilters || hasActiveFilters) && (
        <div className="p-4 bg-[#1a1b26] border border-white/10 rounded-xl animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Type Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">
              Esemény Típus
            </label>
            <select
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary/50"
            >
              <option value="">Összes típus</option>
              <optgroup label="Általános">
                <option value="LOGIN">Bejelentkezés</option>
                <option value="LOGOUT">Kijelentkezés</option>
                <option value="ERROR">Hiba</option>
                <option value="WARN">Figyelmeztetés</option>
              </optgroup>
              <optgroup label="Gépkezelés">
                <option value="LOCK">Lezárás</option>
                <option value="UNLOCK">Feloldás</option>
                <option value="ADD_TIME">Idő jóváírás</option>
                <option value="REMOVE_TIME">Idő levonás</option>
              </optgroup>
              <optgroup label="Versenyek">
                <option value="TOURNAMENT_CREATE">Létrehozás</option>
                <option value="TOURNAMENT_UPDATE">Módosítás</option>
                <option value="TOURNAMENT_DELETE">Törlés</option>
                <option value="MATCH_RESULT_UPDATE">Eredmény rögzítés</option>
              </optgroup>
              <optgroup label="Adminisztráció">
                <option value="USER_ROLE_UPDATE">Rang módosítás</option>
                <option value="USER_PROFILE_UPDATE">Profil szerkesztés</option>
              </optgroup>
            </select>
          </div>

          {/* Date Range Start */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">
              Kezdő dátum
            </label>
            <div className="relative">
              <Calendar
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={14}
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Date Range End */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">
              Záró dátum
            </label>
            <div className="relative">
              <Calendar
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={14}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Active User Filter Chip */}
          {userId && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">
                Aktív szűrők
              </label>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 bg-primary/20 text-primary px-2 py-1.5 rounded-lg text-xs font-medium border border-primary/30">
                  User ID: {userId.substring(0, 8)}...
                  <button
                    onClick={onClearUserFilter}
                    className="hover:text-white"
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
                className="text-xs text-gray-500 hover:text-white underline decoration-dashed"
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
