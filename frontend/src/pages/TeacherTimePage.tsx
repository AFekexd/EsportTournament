import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
        },
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
          <span className="tactical-badge border-destructive/40 text-destructive bg-destructive/10">
            Admin
          </span>
        );
      case "TEACHER":
        return (
          <span className="tactical-badge border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
            Tanár
          </span>
        );
      case "STUDENT":
        return (
          <span className="tactical-badge border-primary/40 text-primary bg-primary/10">
            Diák
          </span>
        );
      default:
        return (
          <span className="tactical-badge border-border text-muted-foreground bg-secondary">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary mb-2">
            <Clock size={14} className="text-primary" />
            <span>Rendszerkezelés // Időkeret</span>
          </div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-foreground">
            Időkeret Kezelés
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            Diákok és felhasználók egyenlegének valós idejű adminisztrációja
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Felhasználó keresése..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary/80 border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-mono transition-all"
            autoFocus
          />
        </div>
      </div>

      <div className="tactical-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-6 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Felhasználó
                    </th>
                    <th className="px-6 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Rang
                    </th>
                    <th className="px-6 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground text-right">
                      Időegyenleg
                    </th>
                    <th className="px-6 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground text-center">
                      Művelet
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="group hover:bg-secondary/40 transition-colors cursor-pointer"
                      onClick={() => setTimeModalUser(user)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 shrink-0 rounded flex items-center justify-center text-xs font-bold overflow-hidden cursor-pointer border border-border hover:border-primary transition-all ${user.role === "TEACHER"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-primary/20 text-primary"
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${user.id}`);
                            }}
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
                          <div
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${user.id}`);
                            }}
                          >
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {user.displayName || user.username}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{generateRole(user.role)}</td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-mono font-bold text-base ${user.timeBalanceSeconds < 0
                              ? "text-red-400"
                              : "text-emerald-400"
                            }`}
                        >
                          {["ADMIN", "TEACHER"].includes(user.role)
                            ? "∞"
                            : formatTime(user.timeBalanceSeconds || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          className="p-2 rounded bg-secondary border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTimeModalUser(user);
                          }}
                          title="Időkeret szerkesztése"
                        >
                          <Clock size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-muted-foreground font-mono text-xs uppercase tracking-wider"
                      >
                        Nincs találat a keresési feltételekre.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-secondary/20">
                <div className="text-xs font-mono text-muted-foreground">
                  {page}. oldal / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded bg-secondary border border-border text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary/80 hover:border-primary/50 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded bg-secondary border border-border text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary/80 hover:border-primary/50 transition-colors"
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
