import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Trophy,
  Users,
  Calendar,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Monitor,
  ClipboardList,
  FileQuestion,
  GitCommit,
  Bug,
  AlertTriangle,
  ScrollText,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import { useAppSelector, useAppDispatch } from "../../hooks/useRedux";
import { toggleSidebar } from "../../store/slices/uiSlice";
import { useState, useEffect } from "react";
import { API_URL } from "../../config";
import { apiFetch } from "../../lib/api-client";
import { ChangelogModal } from "../common/ChangelogModal";

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles?: string[];
  badge?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", icon: <Home size={20} />, label: "Főoldal" },
  { to: "/teams", icon: <Users size={20} />, label: "Csapatok" },
  { to: "/booking", icon: <Monitor size={20} />, label: "Gépfoglalás" },
  { to: "/tournaments", icon: <Trophy size={20} />, label: "Versenyek" },
  { to: "/calendar", icon: <Calendar size={20} />, label: "Naptár" },
  { to: "/rules", icon: <ScrollText size={20} />, label: "Házirend" },
  { to: "/leaderboards", icon: <TrendingUp size={20} />, label: "Ranglisták" },
  { to: "/settings", icon: <Settings size={20} />, label: "Beállítások" },
  { to: "/incidents", icon: <AlertTriangle size={20} />, label: "Incidensek" },
  { to: "/bug-report", icon: <Bug size={20} />, label: "Hibajelentés" },
];

const adminItems: NavItem[] = [
  {
    to: "/admin",
    icon: <Shield size={20} />,
    label: "Menedzsment",
    roles: ["ADMIN", "ORGANIZER"],
  },
  {
    to: "/admin/releases",
    icon: <GitCommit size={20} />,
    label: "Kiadások",
    roles: ["ADMIN", "ORGANIZER"], // Only show for admins/organizers
  },
  {
    to: "/admin/logs",
    icon: <ClipboardList size={20} />,
    label: "Napló",
    roles: ["ADMIN"],
  },
  {
    to: "/teacher/time",
    icon: <Monitor size={20} />,
    label: "Időkeret",
    roles: ["ADMIN", "TEACHER"],
  },
  {
    to: "/discord-settings",
    icon: <MessageSquare size={20} />,
    label: "Discord",
    roles: ["ADMIN", "ORGANIZER", "MODERATOR", "TEACHER"],
  },
  {
    to: "/admin/requests",
    icon: <FileQuestion size={20} />,
    label: "Kérelmek",
    roles: ["ADMIN", "ORGANIZER", "MODERATOR"],
    badge: true,
  },
];

export function Sidebar() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const { user, isAuthenticated } = useAuth();
  const [requestCount, setRequestCount] = useState(0);

  // Changelog State
  const [showChangelog, setShowChangelog] = useState(false);
  const [appVersion, setAppVersion] = useState("0.0.0");
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (user && ["ADMIN", "ORGANIZER", "MODERATOR"].includes(user.role)) {
        try {
          const res = await apiFetch(`${API_URL}/change-requests/stats`);
          const data = await res.json();
          if (data.success) {
            setRequestCount(data.data.pendingCount);
          }
        } catch (error) {
          console.error("Failed to fetch request stats", error);
        }
      }
    };

    const fetchVersion = async () => {
      try {
        const res = await apiFetch(`${API_URL}/changelog`);
        const data = await res.json();
        if (data.success && data.data.latestVersion) {
          const serverVersion = data.data.latestVersion;
          setAppVersion(serverVersion);

          const lastSeen = localStorage.getItem("last_seen_version");
          if (lastSeen !== serverVersion) {
            setHasUpdate(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch version", error);
      }
    };

    // Fetch version regardless of auth
    fetchVersion();

    if (isAuthenticated) {
      fetchStats();

      // Listen for updates from RequestsPage
      window.addEventListener("requests-updated", fetchStats);

      // Poll every minute
      const interval = setInterval(() => {
        fetchStats();
      }, 60000);

      return () => {
        clearInterval(interval);
        window.removeEventListener("requests-updated", fetchStats);
      };
    }
  }, [user, isAuthenticated]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const canView = (item: NavItem) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  };

  return (
    <>
      {/* Mobile Overlay */}

      <div
        className={`fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-all duration-300 md:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        onClick={() => dispatch(toggleSidebar())}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-background/95 backdrop-blur-xl transition-all duration-300 ease-in-out ${isOpen
          ? "w-full md:w-64 translate-x-0"
          : "-translate-x-full md:w-20 md:translate-x-0"
          }`}
      >
        <div className="flex h-16 items-center border-b border-border/80 px-4">
          {isOpen && (
            <Link
              to="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <img
                src="/esportlogo.png"
                alt="Pollák Esport"
                className="w-10 h-10 object-contain"
              />
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold tracking-wider text-foreground leading-tight">
                  POLLÁK <span className="text-primary">ESPORT</span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  HUB // V2.6
                </span>
              </div>
            </Link>
          )}
          <button
            className={`ml-auto flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-all hover:bg-secondary hover:text-foreground ${!isOpen && "mx-auto"
              }`}
            onClick={() => dispatch(toggleSidebar())}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <div className="mb-6 px-3">
            {isOpen && (
              <div className="px-3 pb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                // NAVIGÁCIÓ
              </div>
            )}
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    // Automatikus bezárás mobilon kattintáskor
                    if (window.innerWidth < 768) {
                      dispatch(toggleSidebar());
                    }
                  }}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${isActive(item.to)
                    ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary rounded-l-none"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    } ${!isOpen && "justify-center px-0"}`}
                  title={!isOpen ? item.label : undefined}
                >
                  <span
                    className={`transition-colors ${isActive(item.to)
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                      }`}
                  >
                    {item.icon}
                  </span>
                  {isOpen && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>

          {isAuthenticated && (
            <div className="border-t border-border/60 pt-4">
              <div className="mb-6 px-3">
                {isOpen && (
                  <div className="px-3 pb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                    // ADMINISZTRÁCIÓ
                  </div>
                )}
                <div className="space-y-1">
                  {adminItems.filter(canView).map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          dispatch(toggleSidebar());
                        }
                      }}
                      className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${isActive(item.to)
                        ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary rounded-l-none"
                        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                        } ${!isOpen && "justify-center px-0"}`}
                      title={!isOpen ? item.label : undefined}
                    >
                      <div className="relative">
                        <span
                          className={`transition-colors ${isActive(item.to)
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                            }`}
                        >
                          {item.icon}
                        </span>
                        {!isOpen && (item as any).badge && requestCount > 0 && (
                          <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card" />
                        )}
                      </div>
                      {isOpen && (
                        <div className="flex items-center justify-between flex-1">
                          <span>{item.label}</span>
                          {(item as any).badge && requestCount > 0 && (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                              {requestCount}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mobile User Profile Section */}
          {isAuthenticated && user && (
            <div
              className={`mt-auto mb-2 border-t border-border pt-4 md:hidden ${isOpen ? "mx-3" : "hidden"}`}
            >
              <Link
                to="/profile"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-border">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm font-bold text-foreground">
                      {(user.displayName || user.username)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium text-foreground">
                    {user.displayName || user.username}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.role}
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* Version Footer */}
          <div
            className={`border-t border-border transition-all duration-300 ${isOpen
              ? "mx-3 px-6 pb-6 pt-4"
              : "mx-0 px-2 py-4 flex justify-center"
              }`}
          >
            <button
              onClick={() => setShowChangelog(true)}
              className={`flex items-center group transition-all ${isOpen
                ? "w-full justify-between"
                : "flex-col gap-1 justify-center"
                }`}
              title={`Verzió: v${appVersion}`}
            >
              <div
                className={`flex flex-col ${isOpen ? "items-start" : "items-center"
                  }`}
              >
                <span
                  className={`text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors ${!isOpen && "hidden"
                    }`}
                >
                  Verzió:{" "}
                </span>
                <span
                  className={`font-mono transition-colors ${isOpen
                    ? "text-muted-foreground"
                    : "text-[10px] text-muted-foreground group-hover:text-foreground"
                    }`}
                >
                  v{appVersion}
                </span>
              </div>
              {hasUpdate && (
                <span
                  className={`bg-primary/20 text-primary font-bold rounded-full animate-pulse shadow-[0_0_10px_hsla(var(--primary),0.25)] ${isOpen
                    ? "text-[10px] px-2 py-0.5"
                    : "text-[8px] px-1.5 py-0.5 mt-1"
                    }`}
                >
                  {isOpen ? "ÚJ" : "NEW"}
                </span>
              )}
            </button>
          </div>
        </nav>
      </aside>

      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => {
          setShowChangelog(false);
          setHasUpdate(false);
          localStorage.setItem("last_seen_version", appVersion);
        }}
      />
    </>
  );
}
