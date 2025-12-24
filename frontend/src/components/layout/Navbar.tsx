import { Link } from "react-router-dom";
import {
  Bell,
  LogIn,
  LogOut,
  Shield,
  Crown,
  Star,
  MenuIcon,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
  fetchUnreadCount,
  fetchNotifications,
  markAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../../store/slices/notificationsSlice";
import { useEffect, useState, useRef } from "react";
import { toggleSidebar } from "@/store/slices/uiSlice";

const getRoleIcon = (role: string) => {
  switch (role) {
    case "ADMIN":
      return <Crown size={12} className="text-yellow-400" />;
    case "MODERATOR":
      return <Shield size={12} className="text-blue-400" />;
    case "ORGANIZER":
      return <Star size={12} className="text-purple-400" />;
    default:
      return null;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    case "MODERATOR":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "ORGANIZER":
      return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    default:
      return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  }
};

export function Navbar() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const {
    unreadCount,
    notifications,
    isLoading: notificationsLoading,
  } = useAppSelector((state) => state.notifications);
  const isOpen = useAppSelector((state) => state.ui.sidebarOpen);

  // Notification dropdown state
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUnreadCount());
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        dispatch(fetchUnreadCount());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, dispatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    if (!showNotifications) {
      // Fetch latest 5 notifications when opening
      dispatch(fetchNotifications({ page: 1, limit: 5 }));
    }
    setShowNotifications(!showNotifications);
  };

  const handleDeleteAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Biztosan törölni szeretnéd az összes értesítést?")) {
      dispatch(clearAllNotifications());
    }
  };

  const handleDeleteOne = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(deleteNotification(id));
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="relative flex h-16 items-center justify-between border-b border-white/5 bg-background/60 px-6 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20">
        <div className="flex items-center gap-4">
          <button
            className={`ml-auto flex md:invisible  h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-white/10 hover:text-white ${
              !isOpen && "mx-auto"
            }`}
            onClick={() => dispatch(toggleSidebar())}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {!isOpen ? <MenuIcon /> : null}
          </button>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-white/5" />
          ) : isAuthenticated && user ? (
            <>
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={handleNotificationClick}
                  className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-white/5 bg-white/5 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  aria-label="Notifications"
                >
                  <Bell
                    size={18}
                    className="text-muted-foreground transition-colors group-hover:text-primary"
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#1a1b26] shadow-xl shadow-black/50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                      <h3 className="font-semibold text-white">Értesítések</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={handleDeleteAll}
                          className="text-gray-400 hover:text-red-400 transition-colors p-1"
                          title="Összes törlése"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="p-4 text-center text-gray-400 text-sm">
                          Betöltés...
                        </div>
                      ) : notifications.length > 0 ? (
                        <div className="divide-y divide-white/5">
                          {notifications.slice(0, 5).map((notification) => (
                            <Link
                              key={notification.id}
                              to={notification.link || "/notifications"}
                              onClick={() => {
                                if (!notification.read) {
                                  dispatch(markAsRead(notification.id));
                                }
                                setShowNotifications(false);
                              }}
                              className={`block px-4 py-3 hover:bg-white/5 transition-colors ${
                                !notification.read ? "bg-primary/5" : ""
                              }`}
                            >
                              <div className="flex gap-3">
                                <div
                                  className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                                    !notification.read
                                      ? "bg-primary"
                                      : "bg-gray-600"
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm ${
                                      !notification.read
                                        ? "text-white font-medium"
                                        : "text-gray-400"
                                    } pr-6 break-words`}
                                  >
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(
                                      notification.createdAt
                                    ).toLocaleString("hu-HU", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) =>
                                    handleDeleteOne(e, notification.id)
                                  }
                                  className="absolute right-2 top-3 p-1.5 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                                  title="Törlés"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500 text-sm">
                          Nincs új értesítés
                        </div>
                      )}
                    </div>
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="block w-full border-t border-white/5 bg-white/5 px-4 py-2 text-center text-xs font-medium text-primary transition-colors hover:bg-white/10"
                    >
                      Összes megtekintése
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 transition-opacity hover:opacity-80"
                >
                  <div className="hidden sm:flex sm:flex-col sm:items-end">
                    <span className="text-sm font-medium text-white/90">
                      {user.displayName || user.username}
                    </span>
                    {user.role !== "STUDENT" && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    )}
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] shadow-lg shadow-primary/20">
                    <div className="h-full w-full overflow-hidden rounded-full bg-background">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName || user.username}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-900 font-bold text-white">
                          {(user.displayName || user.username)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-white/10 hover:text-destructive"
                  onClick={logout}
                  aria-label="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:shadow-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              onClick={login}
            >
              <LogIn size={16} />
              <span>Bejelentkezés</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
