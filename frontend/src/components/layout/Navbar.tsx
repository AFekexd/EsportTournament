import { Link } from 'react-router-dom';
import { Menu, Bell, LogIn, LogOut, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/useRedux';
import { toggleMobileMenu } from '../../store/slices/uiSlice';
import './Navbar.css';

export function Navbar() {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, isLoading, login, logout } = useAuth();

    return (
        <header className="navbar">
            <div className="navbar-left">
                <button
                    className="navbar-menu-btn"
                    onClick={() => dispatch(toggleMobileMenu())}
                    aria-label="Toggle menu"
                >
                    <Menu size={24} />
                </button>

                <div className="navbar-search">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Keresés versenyekben, csapatokban..."
                        className="search-input"
                    />
                </div>
            </div>

            <div className="navbar-right">
                {isLoading ? (
                    <div className="skeleton" style={{ width: 100, height: 36 }} />
                ) : isAuthenticated && user ? (
                    <>
                        <button className="navbar-icon-btn" aria-label="Notifications">
                            <Bell size={20} />
                            <span className="notification-badge">3</span>
                        </button>

                        <div className="navbar-user">
                            <Link to="/profile" className="user-btn">
                                <div className="avatar avatar-sm">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.displayName || user.username} />
                                    ) : (
                                        (user.displayName || user.username).charAt(0).toUpperCase()
                                    )}
                                </div>
                                <span className="user-name">{user.displayName || user.username}</span>
                            </Link>
                            <button className="navbar-icon-btn" onClick={logout} aria-label="Logout">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </>
                ) : (
                    <button className="btn btn-primary" onClick={login}>
                        <LogIn size={18} />
                        <span>Bejelentkezés</span>
                    </button>
                )}
            </div>
        </header>
    );
}
