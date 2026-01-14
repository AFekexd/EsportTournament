import { useState, useEffect } from "react";
import {
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
  Trophy,
  Gamepad2,
  Trash2,
  Edit,
  PlusCircle,
  Users,
  Calendar as CalendarIcon,
  ListTodo,
  MoreHorizontal,
  Filter,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api-client";
import { API_URL } from "../../config";
import { LogsToolbar } from "./logs/LogsToolbar";
import { LogMetadataViewer } from "./logs/LogMetadataViewer";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface Log {
  id: string;
  type: string;
  message: string;
  metadata?: any;
  createdAt: string;
  admin?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
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

  // Filter State
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterUserId, setFilterUserId] = useState<string | undefined>(
    undefined
  );

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
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "50", // Increased limit for better overview
      });

      if (filterType) queryParams.append("type", filterType);
      if (debouncedSearch) queryParams.append("search", debouncedSearch);
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      if (filterUserId) queryParams.append("userId", filterUserId);

      const response = await apiFetch(
        `${API_URL}/logs?${queryParams.toString()}`
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
  }, [
    page,
    filterType,
    debouncedSearch,
    startDate,
    endDate,
    filterUserId,
    user,
  ]);

  const handleExportCSV = () => {
    // Generate CSV content
    const headers = [
      "ID",
      "Időpont",
      "Típus",
      "Üzenet",
      "Végrehajtó",
      "Érintett Felhasználó",
      "Részletek (JSON)",
    ];

    const rows = logs.map((log) => [
      log.id,
      format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
      log.type,
      `"${log.message.replace(/"/g, '""')}"`, // Escape quotes
      log.admin?.username || "System",
      log.user?.username || "-",
      `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `esport_logs_${format(new Date(), "yyyyMMdd_HHmm")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case "ERROR":
        return <AlertCircle className="text-red-500" size={16} />;
      case "WARN":
        return <AlertTriangle className="text-yellow-500" size={16} />;
      case "LOGIN":
        return <Shield className="text-blue-500" size={16} />;
      case "LOGOUT":
        return <LogOut className="text-gray-400" size={16} />;
      case "LOCK":
        return <Lock className="text-red-500" size={16} />;
      case "UNLOCK":
        return <Unlock className="text-green-500" size={16} />;
      case "ADD_TIME":
      case "REMOVE_TIME":
        return (
          <Clock
            className={
              type === "ADD_TIME" ? "text-green-500" : "text-orange-500"
            }
            size={16}
          />
        );
      case "COMPETITION_MODE":
        return <Swords className="text-purple-500" size={16} />;
      case "PASSWORD_RESET":
        return <Key className="text-yellow-500" size={16} />;
      case "TOURNAMENT_CREATE":
      case "GAME_CREATE":
      case "TEAM_CREATE":
      case "COMPUTER_CREATE":
      case "SCHEDULE_CREATE":
      case "BOOKING_CREATE":
        return <PlusCircle className="text-emerald-500" size={16} />;
      case "TOURNAMENT_UPDATE":
      case "GAME_UPDATE":
      case "TEAM_UPDATE":
      case "USER_PROFILE_UPDATE":
        return <Edit className="text-blue-400" size={16} />;
      case "TOURNAMENT_DELETE":
      case "GAME_DELETE":
      case "USER_DELETE":
      case "TEAM_DELETE":
      case "COMPUTER_DELETE":
      case "SCHEDULE_DELETE":
      case "BOOKING_DELETE":
        return <Trash2 className="text-red-500" size={16} />;
      case "USER_ROLE_UPDATE":
        return <Shield className="text-purple-500" size={16} />;
      case "TEAM_JOIN":
      case "TEAM_LEAVE":
      case "TEAM_KICK":
        return <Users className="text-orange-400" size={16} />;
      case "BOOKING_CHECKIN":
        return <CalendarIcon className="text-green-500" size={16} />;
      case "WAITLIST_JOIN":
      case "WAITLIST_LEAVE":
        return <ListTodo className="text-blue-400" size={16} />;
      case "MATCH_RESULT_UPDATE":
        return <Swords className="text-amber-500" size={16} />;
      default:
        if (type.startsWith("TOURNAMENT"))
          return <Trophy className="text-amber-500" size={16} />;
        if (type.startsWith("GAME"))
          return <Gamepad2 className="text-purple-500" size={16} />;
        return <Info className="text-gray-400" size={16} />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case "ERROR":
      case "LOCK":
      case "TOURNAMENT_DELETE":
      case "GAME_DELETE":
      case "USER_DELETE":
      case "TEAM_DELETE":
      case "COMPUTER_DELETE":
      case "BOOKING_DELETE":
      case "SCHEDULE_DELETE":
        return "bg-red-500/10 border-red-500/20 text-red-500";
      case "WARN":
      case "PASSWORD_RESET":
      case "REMOVE_TIME":
      case "TEAM_KICK":
      case "TEAM_LEAVE":
      case "WAITLIST_LEAVE":
        return "bg-yellow-500/10 border-yellow-500/20 text-yellow-500";
      case "SUCCESS":
      case "UNLOCK":
      case "ADD_TIME":
      case "TOURNAMENT_CREATE":
      case "GAME_CREATE":
      case "TEAM_CREATE":
      case "COMPUTER_CREATE":
      case "BOOKING_CREATE":
      case "SCHEDULE_CREATE":
      case "BOOKING_CHECKIN":
        return "bg-green-500/10 border-green-500/20 text-green-500";
      case "LOGIN":
      case "TOURNAMENT_UPDATE":
      case "GAME_UPDATE":
      case "USER_PROFILE_UPDATE":
      case "TEAM_UPDATE":
      case "WAITLIST_JOIN":
        return "bg-blue-500/10 border-blue-500/20 text-blue-500";
      case "COMPETITION_MODE":
      case "USER_ROLE_UPDATE":
      case "MATCH_RESULT_UPDATE":
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
    <div className="container mx-auto p-4 max-w-[1600px] animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Info size={20} />
            </div>
            Rendszer Napló
          </h2>
          <p className="text-sm text-gray-400 mt-1 ml-13">
            Részletes audit napló és rendszertevékenységek
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <LogsToolbar
        search={search}
        onSearchChange={setSearch}
        filterType={filterType}
        onFilterTypeChange={(val) => {
          setFilterType(val);
          setPage(1);
        }}
        startDate={startDate}
        onStartDateChange={(val) => {
          setStartDate(val);
          setPage(1);
        }}
        endDate={endDate}
        onEndDateChange={(val) => {
          setEndDate(val);
          setPage(1);
        }}
        onExport={handleExportCSV}
        userId={filterUserId}
        onClearUserFilter={() => {
          setFilterUserId(undefined);
          setPage(1);
        }}
      />

      {/* Main Table Container */}
      <div className="bg-[#1a1b26] border border-white/10 rounded-xl overflow-hidden shadow-xl flex flex-col h-[calc(100vh-320px)]">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-[#13141c] sticky top-0 z-10 shadow-sm">
              <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="p-4 w-12 border-b border-white/5"></th>
                <th className="p-4 w-48 border-b border-white/5">Időpont</th>
                <th className="p-4 w-40 border-b border-white/5">Típus</th>
                <th className="p-4 border-b border-white/5">Üzenet</th>
                <th className="p-4 w-48 border-b border-white/5">Végrehajtó</th>
                <th className="p-4 w-48 border-b border-white/5">Érintett</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span>Napló betöltése...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500 opacity-50">
                      <Info size={40} />
                      <span>Nincs találat a keresési feltételekre</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className={`group transition-colors text-sm cursor-pointer ${
                        expandedLogId === log.id
                          ? "bg-white/[0.03]"
                          : "hover:bg-white/[0.02]"
                      }`}
                      onClick={() =>
                        setExpandedLogId(
                          expandedLogId === log.id ? null : log.id
                        )
                      }
                    >
                      <td className="p-4 text-gray-600">
                        {log.metadata ? (
                          <div
                            className={`transition-transform duration-200 ${
                              expandedLogId === log.id
                                ? "rotate-90 text-primary"
                                : ""
                            }`}
                          >
                            <Filter size={12} className="opacity-0" />{" "}
                            {/* Spacer hack */}
                            {expandedLogId === log.id ? (
                              <MoreHorizontal size={16} />
                            ) : (
                              <MoreHorizontal
                                size={16}
                                className="opacity-50 group-hover:opacity-100"
                              />
                            )}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-4 text-gray-400 font-mono text-xs whitespace-nowrap">
                        {format(
                          new Date(log.createdAt),
                          "yyyy. MM. dd. HH:mm:ss",
                          { locale: hu }
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getLogColor(
                            log.type
                          )}`}
                        >
                          {getLogIcon(log.type)}
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">
                        <div className="flex items-center gap-2">
                          <span>{log.message}</span>
                          {log.computer && (
                            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-gray-400 whitespace-nowrap">
                              {log.computer.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {log.admin ? (
                          <div
                            className="flex items-center gap-2 group/user"
                            title={`Admin ID: ${log.admin.id}`}
                          >
                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-indigo-500/30">
                              {log.admin.avatarUrl ? (
                                <img
                                  src={log.admin.avatarUrl}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                (log.admin.displayName || log.admin.username)
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </div>
                            <span className="text-gray-400 text-xs font-medium group-hover/user:text-white transition-colors truncate max-w-[120px]">
                              {log.admin.displayName || log.admin.username}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-700 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {log.user ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterUserId(log.user!.id);
                              setPage(1);
                            }}
                            className="flex items-center gap-2 group/user hover:bg-white/5 px-2 py-1 -ml-2 rounded-lg transition-colors text-left"
                            title="Kattints a szűréshez erre a felhasználóra"
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-white/10">
                              {log.user.avatarUrl ? (
                                <img
                                  src={log.user.avatarUrl}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                (log.user.displayName || log.user.username)
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </div>
                            <span className="text-gray-400 text-xs font-medium group-hover/user:text-white transition-colors truncate max-w-[120px]">
                              {log.user.displayName || log.user.username}
                            </span>
                          </button>
                        ) : (
                          <span className="text-gray-600 italic text-xs">
                            Rendszer
                          </span>
                        )}
                      </td>
                    </tr>
                    {expandedLogId === log.id && log.metadata && (
                      <tr className="bg-[#161722]">
                        <td colSpan={6} className="p-0 border-b border-white/5">
                          <div className="p-4 pl-16 grid gap-2 animate-fade-in">
                            <LogMetadataViewer
                              data={log.metadata}
                              initiallyExpanded={true}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="bg-[#13141c] border-t border-white/5 p-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Összesen {totalPages * 50} bejegyzés (becsült)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Előző
            </button>
            <span className="text-xs font-medium bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Következő
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
