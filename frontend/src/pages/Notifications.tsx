import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchNotifications, markAsRead, markAllAsRead } from '../store/slices/notificationsSlice';
import type { Notification } from '../store/slices/notificationsSlice';

const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
        case 'TOURNAMENT_INVITE':
        case 'MATCH_SCHEDULED':
        case 'MATCH_RESULT':
            return '🏆';
        case 'TEAM_INVITE':
            return '👥';
        case 'SYSTEM':
            return '📢';
        default:
            return '🔔';
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
    return date.toLocaleDateString('hu-HU');
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

    return (
        <div className="pb-12">
            <div className="flex justify-between items-center mb-8 max-md:flex-col max-md:items-start max-md:gap-4">
                <div className="page-title-section">
                    <h1 className="page-title">Értesítések</h1>
                    <p className="page-subtitle">Legfrissebb hírek és értesítések</p>
                </div>
                {notifications.some((n) => !n.read) && (
                    <button className="btn btn-secondary" onClick={handleMarkAllAsRead}>
                        <Check size={18} />
                        Mind olvasottnak jelölés
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="loading-container">
                    <div className="spinner-large" />
                    <p>Betöltés...</p>
                </div>
            ) : notifications.length === 0 ? (
                <div className="empty-state card">
                    <Bell size={48} className="empty-icon" />
                    <h3>Nincs értesítés</h3>
                    <p>Jelenleg nincsenek értesítéseid.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`flex items-start gap-6 p-6 transition-all duration-150 relative hover:translate-x-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] max-md:flex-col max-md:gap-4 card ${!notification.read ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-[3px] border-l-primary' : ''}`}
                        >
                            <div className="text-2xl shrink-0 w-12 h-12 flex items-center justify-center bg-secondary rounded-lg">{getNotificationIcon(notification.type)}</div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-base font-semibold mb-2 ${!notification.read ? 'text-primary' : 'text-foreground'}`}>{notification.title}</h3>
                                <p className="text-sm text-secondary-foreground mb-2 leading-relaxed">{notification.message}</p>
                                <span className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</span>
                            </div>
                            <div className="flex gap-2 shrink-0 max-md:w-full max-md:justify-end">
                                {notification.link && (
                                    <Link to={notification.link} className="btn btn-ghost btn-sm">
                                        <ExternalLink size={16} />
                                    </Link>
                                )}
                                {!notification.read && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleMarkAsRead(notification.id)}
                                        title="Olvasottnak jelölés"
                                    >
                                        <Check size={16} />
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
