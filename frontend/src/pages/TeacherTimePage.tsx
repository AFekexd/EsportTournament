import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { authService } from "../lib/auth-service";
import { UserTimeModal } from "../components/admin/UserTimeModal";
import { API_URL } from "../config";

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  timeBalanceSeconds: number;
}

export function TeacherTimePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timeModalUser, setTimeModalUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = authService.keycloak?.token;
      if (!token) return;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: debouncedSearch,
        // role: "STUDENT" // Optional: if we want to filter by student only
      });

      const response = await fetch(
        `${API_URL}/users?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
        if (data.meta) {
          setTotalPages(data.meta.totalPages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds && seconds !== 0) return "-";

    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);

    const hours = Math.floor(absSeconds / 3600);
    const mins = Math.floor((absSeconds % 3600) / 60);

    const sign = isNegative ? "-" : "";

    if (hours > 0) {
      return `${sign}${hours}ó ${mins}p`;
    }
    return `${sign}${mins}p`;
  };

  const generateRole = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-xs font-medium border border-red-500/20">
            Admin
          </span>
        );
      case "TEACHER":
        return (
          <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-xs font-medium border border-green-500/20">
            Tanár
          </span>
        );
      case "STUDENT":
        return (
          <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 text-xs font-medium border border-blue-500/20">
            Diák
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-md bg-white/5 text-gray-400 text-xs font-medium border border-white/10">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Időkeret Kezelés
          </h1>
          <p className="text-gray-400">
            Diákok időegyenlegének megtekintése és módosítása
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <Search
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Keresés..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0f1015] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm"
            autoFocus
          />
        </div>
      </div>

      <div className="bg-[#0f1015] border border-white/5 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Felhasználó
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Rang
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">
                      Időegyenleg
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">
                      Művelet
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setTimeModalUser(user)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden ${
                              user.role === "TEACHER"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-primary/20 text-primary"
                            }`}
                          >
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (user.displayName || user.username)
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white group-hover:text-primary transition-colors">
                              {user.displayName || user.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{generateRole(user.role)}</td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-mono font-bold text-lg ${
                            user.timeBalanceSeconds < 0
                              ? "text-red-400"
                              : "text-green-400"
                          }`}
                        >
                          {["ADMIN", "TEACHER"].includes(user.role)
                            ? "∞"
                            : formatTime(user.timeBalanceSeconds || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-primary hover:bg-primary/20 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTimeModalUser(user);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-clock"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        Nincs találat a keresési feltétekre.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.02]">
                <div className="text-sm text-gray-500">
                  {page}. oldal / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {timeModalUser && (
        <UserTimeModal
          user={timeModalUser}
          onClose={() => setTimeModalUser(null)}
          onSuccess={() => {
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
