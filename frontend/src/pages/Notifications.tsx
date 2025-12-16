import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchNotifications, markAsRead, markAllAsRead } from '../store/slices/notificationsSlice';
import type { Notification } from '../store/slices/notificationsSlice';
import './Notifications.css';

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
        <div className="notifications-page">
            <div className="page-header">
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
                <div className="notifications-list">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`notification-card card ${!notification.read ? 'unread' : ''}`}
                        >
                            <div className="notification-icon">{getNotificationIcon(notification.type)}</div>
                            <div className="notification-content">
                                <h3 className="notification-title">{notification.title}</h3>
                                <p className="notification-message">{notification.message}</p>
                                <span className="notification-time">{formatDate(notification.createdAt)}</span>
                            </div>
                            <div className="notification-actions">
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
