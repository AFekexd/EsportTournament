import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  ExternalLink,
  Trophy,
  Users,
  Megaphone,
  Swords,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchNotifications, markAsRead, markAllAsRead } from '../store/slices/notificationsSlice';
import type { Notification } from '../store/slices/notificationsSlice';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'TOURNAMENT_INVITE':
      return <Trophy className="h-5 w-5 text-primary" />;
    case 'MATCH_SCHEDULED':
      return <Calendar className="h-5 w-5 text-accent" />;
    case 'MATCH_RESULT':
      return <Swords className="h-5 w-5 text-amber-400" />;
    case 'TEAM_INVITE':
      return <Users className="h-5 w-5 text-emerald-400" />;
    case 'SYSTEM':
      return <Megaphone className="h-5 w-5 text-pink-400" />;
    default:
      return <Bell className="h-5 w-5 text-primary" />;
  }
};

const generateTitle = (title: Notification['title']) => {
  switch (title) {
    case 'TOURNAMENT_INVITE':
      return 'Verseny Meghívó';
    case 'MATCH_SCHEDULED':
      return 'Mérkőzés Kitűzve';
    case 'MATCH_RESULT':
      return 'Mérkőzés Eredmény';
    case 'TEAM_INVITE':
      return 'Csapat Meghívó';
    case 'SYSTEM':
      return 'Rendszerüzenet';
    case 'BOOKING_CONFIRMED':
      return 'Foglalás Megerősítve';
    case 'BOOKING_REMINDER':
      return 'Foglalási Emlékeztető';
    case 'WAITLIST_AVAILABLE':
      return 'Várólista Értesítés';
    default:
      return 'Értesítés';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Most';
  if (minutes < 60) return `${minutes} perce`;
  if (hours < 24) return `${hours} órája`;
  if (days < 7) return `${days} napja`;
  return date.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function NotificationsPage() {
  const dispatch = useAppDispatch();
  const { notifications, isLoading } = useAppSelector((state) => state.notifications);

  useEffect(() => {
    dispatch(fetchNotifications({}));
  }, [dispatch]);

  const handleMarkAsRead = (id: string) => {
    dispatch(markAsRead(id));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Tactical Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded border border-border bg-secondary/80 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
            <Bell className="h-3.5 w-3.5" />
            <span>ÉRTESÍTÉSI KÖZPONT // NOTIFICATIONS FEED</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-foreground">
            ÉRTESÍTÉSEK {unreadCount > 0 && <span className="text-primary font-mono text-2xl">({unreadCount})</span>}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Valós idejű versenyfrissítések, mérkőzésértesítések és csapatmeghívók egy helyen.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded border border-border bg-secondary hover:border-primary/60 text-foreground font-mono text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <Check size={14} className="text-primary" />
            <span>Mind olvasottnak jelölés</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="font-mono text-xs uppercase tracking-widest">Értesítések betöltése...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="tactical-card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded bg-secondary border border-border flex items-center justify-center mb-4 text-muted-foreground">
            <Bell size={24} />
          </div>
          <h3 className="font-display text-lg font-bold uppercase tracking-wider text-foreground mb-1">
            Nincs új értesítés
          </h3>
          <p className="text-muted-foreground text-sm font-mono">
            Jelenleg nincsenek olvasatlan vagy függőben lévő értesítéseid.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`tactical-card p-4 sm:p-5 flex items-start gap-4 transition-all duration-150 ${
                !notification.read
                  ? 'border-l-4 border-l-primary bg-secondary/30'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <div className="shrink-0 w-10 h-10 rounded bg-secondary border border-border flex items-center justify-center shadow-sm">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h3
                    className={`font-display text-base font-bold uppercase tracking-wider ${
                      !notification.read ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {generateTitle(notification.title)}
                  </h3>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-secondary-foreground leading-relaxed">
                  {notification.message}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-center">
                {notification.link && (
                  <Link
                    to={notification.link}
                    className="p-2 rounded border border-border bg-secondary hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors"
                    title="Ugrás"
                  >
                    <ExternalLink size={15} />
                  </Link>
                )}
                {!notification.read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="p-2 rounded border border-border bg-secondary hover:border-emerald-500/50 text-muted-foreground hover:text-emerald-400 transition-colors"
                    title="Olvasottnak jelölés"
                  >
                    <Check size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
