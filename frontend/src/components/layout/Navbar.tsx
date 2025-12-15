import { Link } from 'react-router-dom';
import { Menu, Bell, LogIn, LogOut, Search, Shield, Crown, Star } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/useRedux';
import { toggleMobileMenu } from '../../store/slices/uiSlice';
import { Input } from '../ui/input';

const getRoleIcon = (role: string) => {
    switch (role) {
        case 'ADMIN':
            return <Crown size={12} className="text-yellow-400" />;
        case 'MODERATOR':
            return <Shield size={12} className="text-blue-400" />;
        case 'ORGANIZER':
            return <Star size={12} className="text-purple-400" />;
        default:
            return null;
    }
};

const getRoleColor = (role: string) => {
    switch (role) {
        case 'ADMIN':
            return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        case 'MODERATOR':
            return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        case 'ORGANIZER':
            return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        default:
            return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
};


export function Navbar() {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, isLoading, login, logout } = useAuth();

    return (
        <header className="sticky top-0 z-40 w-full">
            <div className="relative flex h-16 items-center justify-between border-b border-white/5 bg-background/60 px-6 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20">
                <div className="flex items-center gap-4">
          

           
                </div>

                <div className="flex items-center gap-4">
                    {isLoading ? (
                        <div className="h-9 w-24 animate-pulse rounded-full bg-white/5" />
                    ) : isAuthenticated && user ? (
                        <>
                            <button className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-white/5 bg-white/5 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary" aria-label="Notifications">
                                <Bell size={18} className="text-muted-foreground transition-colors group-hover:text-primary" />
                                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                                    3
                                </span>
                            </button>

                            <div className="flex items-center gap-4">
                                <Link to="/profile" className="flex items-center gap-3 transition-opacity hover:opacity-80">
                                    <div className="hidden sm:flex sm:flex-col sm:items-end">
                                        <span className="text-sm font-medium text-white/90">
                                            {user.displayName || user.username}
                                        </span>
                                        {user.role !== 'STUDENT' && (
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getRoleColor(user.role)}`}>
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
                                                    {(user.displayName || user.username).charAt(0).toUpperCase()}
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
