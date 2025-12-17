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
    TrendingUp,
    MessageSquare,
    Monitor,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { toggleSidebar } from '../../store/slices/uiSlice';


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
    { to: '/booking', icon: <Monitor size={20} />, label: 'Gépfoglalás' },
    { to: '/calendar', icon: <Calendar size={20} />, label: 'Naptár' },
    { to: '/leaderboards', icon: <TrendingUp size={20} />, label: 'Ranglisták' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Beállítások' },
];

const adminItems: NavItem[] = [
    { to: '/admin', icon: <Shield size={20} />, label: 'Admin', roles: ['ADMIN', 'ORGANIZER'] },
    { to: '/discord-settings', icon: <MessageSquare size={20} />, label: 'Discord', roles: ['ADMIN', 'ORGANIZER'] },

];

export function Sidebar() {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const isOpen = useAppSelector((state) => state.ui.sidebarOpen);
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
        <>
            {/* Mobile Overlay */}

            <div
                className={`fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-all duration-300 md:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                onClick={() => dispatch(toggleSidebar())}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-white/5 bg-background/60 backdrop-blur-xl transition-all duration-300 ease-in-out ${isOpen ? 'w-64 translate-x-0' : '-translate-x-full md:w-20 md:translate-x-0'
                    }`}
            >
                <div className="flex h-16 items-center border-b border-white/5 px-4">
                    {isOpen && (
                        <Link to="/" className="flex items-center gap-2 font-bold text-primary transition-opacity hover:opacity-80">
                            <Gamepad2 size={24} className="text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.8)] animate-pulse" />
                            <span className="text-xl tracking-tight text-white font-black tracking-tighter drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">EsportHub</span>
                        </Link>
                    )}
                    <button
                        className={`ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-white/10 hover:text-white ${!isOpen && 'mx-auto'
                            }`}
                        onClick={() => dispatch(toggleSidebar())}
                        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
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
                                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive(item.to)
                                        ? 'bg-primary/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-primary/30'
                                        : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                                        } ${!isOpen && 'justify-center px-0'}`}
                                    title={!isOpen ? item.label : undefined}
                                >
                                    <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive(item.to) ? 'text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]' : ''}`}>
                                        {item.icon}
                                    </span>
                                    {isOpen && <span>{item.label}</span>}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {isAuthenticated && (
                        <div className="border-t border-white/5 pt-5">
                            <div className="space-y-1">
                                {adminItems.filter(canView).map((item) => (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive(item.to)
                                            ? 'bg-primary/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-primary/30'
                                            : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                                            } ${!isOpen && 'justify-center px-0'}`}
                                        title={!isOpen ? item.label : undefined}
                                    >
                                        <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive(item.to) ? 'text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]' : ''}`}>
                                            {item.icon}
                                        </span>
                                        {isOpen && <span>{item.label}</span>}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </nav>


            </aside>
        </>
    );
}
