import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Trophy,
  Users,
  Gamepad2,
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
  Newspaper,
  Swords,
  Bug,
  AlertTriangle,
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
  { to: "/games", icon: <Gamepad2 size={20} />, label: "Játékok" },
  { to: "/calendar", icon: <Calendar size={20} />, label: "Naptár" },
  { to: "/news", icon: <Newspaper size={20} />, label: "Hírek" },
  { to: "/leaderboards", icon: <TrendingUp size={20} />, label: "Ranglisták" },
  { to: "/scrims", icon: <Swords size={20} />, label: "Gyakorló (Scrims)" },
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
        className={`fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-all duration-300 md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => dispatch(toggleSidebar())}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-white/5 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isOpen
            ? "w-full md:w-64 translate-x-0"
            : "-translate-x-full md:w-20 md:translate-x-0"
        }`}
      >
        <div className="flex h-16 items-center border-b border-white/5 px-4">
          {isOpen && (
            <Link
              to="/"
              className="flex items-center gap-2 font-bold text-primary transition-opacity hover:opacity-80"
            >
              <img
                src="/esportlogo.png"
                className="md:w-15 md:h-15 w-12 h-12"
              />
              <span className="text-xl tracking-tight text-white font-black tracking-tighter drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                EsportHub
              </span>
            </Link>
          )}
          <button
            className={`ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-white/10 hover:text-white ${
              !isOpen && "mx-auto"
            }`}
            onClick={() => dispatch(toggleSidebar())}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <div className="mb-8 px-3">
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
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive(item.to)
                      ? "bg-primary/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-primary/30"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  } ${!isOpen && "justify-center px-0"}`}
                  title={!isOpen ? item.label : undefined}
                >
                  <span
                    className={`transition-transform duration-200 group-hover:scale-110 ${
                      isActive(item.to)
                        ? "text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]"
                        : ""
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
            <div className="border-t border-white/5 pt-5">
              <div className="mb-8 px-3">
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
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive(item.to)
                          ? "bg-primary/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-primary/30"
                          : "text-muted-foreground hover:bg-white/5 hover:text-white"
                      } ${!isOpen && "justify-center px-0"}`}
                      title={!isOpen ? item.label : undefined}
                    >
                      <div className="relative">
                        <span
                          className={`transition-transform duration-200 group-hover:scale-110 ${
                            isActive(item.to)
                              ? "text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]"
                              : ""
                          }`}
                        >
                          {item.icon}
                        </span>
                        {!isOpen && (item as any).badge && requestCount > 0 && (
                          <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-[#0f1016]" />
                        )}
                      </div>
                      {isOpen && (
                        <div className="flex items-center justify-between flex-1">
                          <span>{item.label}</span>
                          {(item as any).badge && requestCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
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
              className={`mt-auto mb-2 border-t border-white/5 pt-4 md:hidden ${isOpen ? "mx-3" : "hidden"}`}
            >
              <Link
                to="/profile"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/10">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm font-bold text-white">
                      {(user.displayName || user.username)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium text-white">
                    {user.displayName || user.username}
                  </span>
                  <span className="truncate text-xs text-gray-400">
                    {user.role}
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* Version Footer */}
          <div
            className={`border-t border-white/5 transition-all duration-300 ${
              isOpen
                ? "mx-3 px-6 pb-6 pt-4"
                : "mx-0 px-2 py-4 flex justify-center"
            }`}
          >
            <button
              onClick={() => setShowChangelog(true)}
              className={`flex items-center group transition-all ${
                isOpen
                  ? "w-full justify-between"
                  : "flex-col gap-1 justify-center"
              }`}
              title={`Verzió: v${appVersion}`}
            >
              <div
                className={`flex flex-col ${
                  isOpen ? "items-start" : "items-center"
                }`}
              >
                <span
                  className={`text-xs font-medium text-gray-500 group-hover:text-white transition-colors ${
                    !isOpen && "hidden"
                  }`}
                >
                  Verzió:{" "}
                </span>
                <span
                  className={`font-mono transition-colors ${
                    isOpen
                      ? "text-gray-400"
                      : "text-[10px] text-gray-500 group-hover:text-white"
                  }`}
                >
                  v{appVersion}
                </span>
              </div>
              {hasUpdate && (
                <span
                  className={`bg-primary/20 text-primary font-bold rounded-full animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.3)] ${
                    isOpen
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
