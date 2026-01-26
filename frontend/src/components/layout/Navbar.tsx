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
import { ConfirmationModal } from "../common/ConfirmationModal";
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

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "warning" | "info" | "primary";
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    variant: "primary",
  });

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

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
    setConfirmModal({
      isOpen: true,
      title: "Értesítések törlése",
      message: "Biztosan törölni szeretnéd az összes értesítést?",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: () => {
        dispatch(clearAllNotifications());
      },
    });
  };

  const handleDeleteOne = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(deleteNotification(id));
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="relative flex h-16 items-center justify-between border-b border-white/5 bg-background/60 px-4 md:px-6 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20">
        <div className="flex items-center gap-4">
          <button
            className={`flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-white/10 hover:text-white`}
            onClick={() => dispatch(toggleSidebar())}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <MenuIcon size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://discord.gg/HWB2bAMUNP"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#5865F2] transition-all hover:bg-[#5865F2]/10 hover:scale-110"
            aria-label="Join Discord"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
            </svg>
          </a>

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
                  <div className="fixed inset-x-4 top-20 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 rounded-xl border border-white/10 bg-[#1a1b26] shadow-xl shadow-black/50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                      <h3 className="font-semibold text-white">Értesítések</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={handleDeleteAll}
                          className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-md hover:bg-white/5"
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
                            <div
                              key={notification.id}
                              className={`relative group transition-colors hover:bg-white/5 ${!notification.read ? "bg-primary/5" : ""
                                }`}
                            >
                              <Link
                                to={notification.link || "/notifications"}
                                onClick={() => {
                                  if (!notification.read) {
                                    dispatch(markAsRead(notification.id));
                                  }
                                  setShowNotifications(false);
                                }}
                                className="block px-4 py-3"
                              >
                                <div className="flex gap-3">
                                  <div
                                    className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${!notification.read
                                        ? "bg-primary"
                                        : "bg-gray-600"
                                      }`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`text-sm ${!notification.read
                                          ? "text-white font-medium"
                                          : "text-gray-400"
                                        } pr-6 break-words`}
                                    >
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(
                                        notification.createdAt,
                                      ).toLocaleString("hu-HU", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </Link>
                              <button
                                onClick={(e) =>
                                  handleDeleteOne(e, notification.id)
                                }
                                className="absolute right-2 top-3 p-1.5 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all z-10"
                                title="Törlés"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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
                  <div className="hidden md:flex md:flex-col md:items-end">
                    <span className="text-sm font-medium text-white/90">
                      {user.displayName || user.username}
                    </span>
                    {user.role !== "STUDENT" && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getRoleColor(
                          user.role,
                        )}`}
                      >
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    )}
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] shadow-lg shadow-primary/20">
                    <div className="h-full w-full overflow-hidden rounded-full bg-background">
                      {user.avatarUrl ? (
                        <img
                          key={user.avatarUrl}
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

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmLabel={confirmModal.confirmLabel}
      />
    </header>
  );
}
