import { useState, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  Clock,
  LogOut,
  Swords,
  Key,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../lib/auth-service";

interface Log {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  computer?: {
    id: string;
    name: string;
  };
}

export function AdminLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = authService.keycloak?.token;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (filterType) queryParams.append("type", filterType);
      if (debouncedSearch) queryParams.append("search", debouncedSearch);

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3000/api"
        }/logs?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs);
        setTotalPages(data.data.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [page, filterType, debouncedSearch, user]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case "ERROR":
        return <AlertCircle className="text-red-500" size={18} />;
      case "WARN":
        return <AlertTriangle className="text-yellow-500" size={18} />;
      case "LOGIN":
        return <Shield className="text-blue-500" size={18} />;
      case "LOGOUT":
        return <LogOut className="text-gray-400" size={18} />;
      case "LOCK":
        return <Lock className="text-red-500" size={18} />;
      case "UNLOCK":
        return <Unlock className="text-green-500" size={18} />;
      case "ADD_TIME":
        return <Clock className="text-green-500" size={18} />;
      case "REMOVE_TIME":
        return <Clock className="text-orange-500" size={18} />;
      case "COMPETITION_MODE":
        return <Swords className="text-purple-500" size={18} />;
      case "PASSWORD_RESET":
        return <Key className="text-yellow-500" size={18} />;
      default:
        return <Info className="text-gray-400" size={18} />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case "ERROR":
      case "LOCK":
        return "bg-red-500/10 border-red-500/20 text-red-500";
      case "WARN":
      case "PASSWORD_RESET":
      case "REMOVE_TIME":
        return "bg-yellow-500/10 border-yellow-500/20 text-yellow-500";
      case "SUCCESS":
      case "UNLOCK":
      case "ADD_TIME":
        return "bg-green-500/10 border-green-500/20 text-green-500";
      case "LOGIN":
        return "bg-blue-500/10 border-blue-500/20 text-blue-500";
      case "COMPETITION_MODE":
        return "bg-purple-500/10 border-purple-500/20 text-purple-500";
      case "LOGOUT":
      default:
        return "bg-gray-500/10 border-gray-500/20 text-gray-400";
    }
  };

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="container py-8">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} />
          <span>Nincs jogosultságod az oldal megtekintéséhez.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Info className="text-primary" size={24} />
            Rendszer Napló
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Felhasználói és rendszer tevékenységek követése
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Keresés..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#1a1b26] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 w-full md:w-64 transition-all"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#1a1b26] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer hover:bg-white/5"
          >
            <option value="">Összes típus</option>
            <option value="LOGIN">Bejelentkezés</option>
            <option value="LOGOUT">Kijelentkezés</option>
            <option value="LOCK">Gép lezárás</option>
            <option value="UNLOCK">Gép feloldás</option>
            <option value="ADD_TIME">Idő jóváírás</option>
            <option value="REMOVE_TIME">Idő levonás</option>
            <option value="COMPETITION_MODE">Verseny mód</option>
            <option value="PASSWORD_RESET">Jelszó visszaállítás</option>
          </select>
        </div>
      </div>

      <div className="bg-[#161722]/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4 font-medium w-48">Időpont</th>
                <th className="p-4 font-medium w-32">Típus</th>
                <th className="p-4 font-medium">Üzenet</th>
                <th className="p-4 font-medium w-48">Felhasználó</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                    Betöltés...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <Info size={32} className="mx-auto mb-3 opacity-20" />
                    Nincs találat a keresési feltételekre
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="group hover:bg-white/5 transition-colors text-sm"
                  >
                    <td className="p-4 text-gray-400 font-mono text-xs">
                      {new Date(log.createdAt).toLocaleString("hu-HU")}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getLogColor(
                          log.type
                        )}`}
                      >
                        {getLogIcon(log.type)}
                        {log.type}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">
                      {log.message}
                      {log.computer && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
                          🖥️ {log.computer.name}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-white/10">
                            {log.user.avatarUrl ? (
                              <img
                                src={log.user.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-gray-500">
                                {log.user.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-300">
                            {log.user.displayName || log.user.username}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 italic">Rendszer</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
            <span className="text-xs text-gray-500">
              Oldal: {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
