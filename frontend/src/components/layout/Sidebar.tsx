import { Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { toggleSidebar } from '../../store/slices/uiSlice';
import './Sidebar.css';

interface NavItem {
    to: string;
    icon: React.ReactNode;
    label: string;
    roles?: string[];
}

const navItems: NavItem[] = [
    { to: '/', icon: <Home size={20} />, label: 'Főoldal' },
    { to: '/tournaments', icon: <Trophy size={20} />, label: 'Versenyek' },
    { to: '/teams', icon: <Users size={20} />, label: 'Csapatok' },
    { to: '/games', icon: <Gamepad2 size={20} />, label: 'Játékok' },
    { to: '/calendar', icon: <Calendar size={20} />, label: 'Naptár' },
];

const adminItems: NavItem[] = [
    { to: '/admin', icon: <Shield size={20} />, label: 'Admin', roles: ['ADMIN', 'ORGANIZER'] },
    { to: '/settings', icon: <Settings size={20} />, label: 'Beállítások' },
];

export function Sidebar() {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { isOpen } = useAppSelector((state) => ({ isOpen: state.ui.sidebarOpen }));
    const { user, isAuthenticated } = useAuth();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const canView = (item: NavItem) => {
        if (!item.roles) return true;
        if (!user) return false;
        return item.roles.includes(user.role);
    };

    return (
        <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
            <div className="sidebar-header">
                {isOpen && (
                    <Link to="/" className="sidebar-logo">
                        <Gamepad2 size={28} className="logo-icon" />
                        <span className="logo-text">EsportHub</span>
                    </Link>
                )}
                <button
                    className="sidebar-toggle"
                    onClick={() => dispatch(toggleSidebar())}
                    aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    {isOpen && <span className="nav-section-title">Menü</span>}
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
                            title={!isOpen ? item.label : undefined}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {isOpen && <span className="nav-label">{item.label}</span>}
                        </Link>
                    ))}
                </div>

                {isAuthenticated && (
                    <div className="nav-section">
                        {isOpen && <span className="nav-section-title">Egyéb</span>}
                        {adminItems.filter(canView).map((item) => (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
                                title={!isOpen ? item.label : undefined}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {isOpen && <span className="nav-label">{item.label}</span>}
                            </Link>
                        ))}
                    </div>
                )}
            </nav>

            {isOpen && user && (
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="avatar avatar-sm">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.displayName || user.username} />
                            ) : (
                                (user.displayName || user.username).charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{user.displayName || user.username}</span>
                            <span className="user-elo">{user.elo} ELO</span>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
