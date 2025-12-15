import { useState } from 'react';
import { Save, Bell, Lock, User, Moon, Sun } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import './Settings.css';

export function SettingsPage() {
    const { user, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'appearance'>('account');

    // Settings state
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [notifications, setNotifications] = useState({
        tournaments: true,
        teams: true,
        matches: false,
        email: true,
    });
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [language, setLanguage] = useState('hu');

    if (!isAuthenticated) {
        return (
            <div className="settings-page">
                <div className="empty-state">
                    <Lock size={48} className="empty-icon" />
                    <h3>Nem vagy bejelentkezve</h3>
                    <p>Jelentkezz be a beállítások módosításához.</p>
                </div>
            </div>
        );
    }

    const handleSave = () => {
        // TODO: Implement save functionality
        console.log('Saving settings...');
    };

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1 className="page-title">Beállítások</h1>
                <p className="page-subtitle">Kezeld a fiókod és preferenciáid</p>
            </div>

            <div className="settings-container">
                <div className="settings-sidebar">
                    <button
                        className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
                        onClick={() => setActiveTab('account')}
                    >
                        <User size={18} />
                        Fiók
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        <Bell size={18} />
                        Értesítések
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('privacy')}
                    >
                        <Lock size={18} />
                        Adatvédelem
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('appearance')}
                    >
                        <Moon size={18} />
                        Megjelenés
                    </button>
                </div>

                <div className="settings-content card">
                    {activeTab === 'account' && (
                        <div className="settings-section">
                            <h2 className="section-title">Fiók beállítások</h2>

                            <div className="form-group">
                                <label htmlFor="displayName">Megjelenítendő név</label>
                                <input
                                    id="displayName"
                                    type="text"
                                    className="input"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email cím</label>
                                <input
                                    id="email"
                                    type="email"
                                    className="input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="username">Felhasználónév</label>
                                <input
                                    id="username"
                                    type="text"
                                    className="input"
                                    value={user?.username}
                                    disabled
                                />
                                <p className="help-text">A felhasználónév nem módosítható</p>
                            </div>

                            <button className="btn btn-primary" onClick={handleSave}>
                                <Save size={18} />
                                Mentés
                            </button>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="settings-section">
                            <h2 className="section-title">Értesítési beállítások</h2>

                            <div className="toggle-group">
                                <div className="toggle-item">
                                    <div className="toggle-info">
                                        <h3>Verseny értesítések</h3>
                                        <p>Értesítések új versenyekről és regisztrációkról</p>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={notifications.tournaments}
                                            onChange={(e) => setNotifications({ ...notifications, tournaments: e.target.checked })}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="toggle-item">
                                    <div className="toggle-info">
                                        <h3>Csapat értesítések</h3>
                                        <p>Értesítések csapat eseményekről és meghívókról</p>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={notifications.teams}
                                            onChange={(e) => setNotifications({ ...notifications, teams: e.target.checked })}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="toggle-item">
                                    <div className="toggle-info">
                                        <h3>Mérkőzés értesítések</h3>
                                        <p>Értesítések közelgő mérkőzésekről</p>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={notifications.matches}
                                            onChange={(e) => setNotifications({ ...notifications, matches: e.target.checked })}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="toggle-item">
                                    <div className="toggle-info">
                                        <h3>Email értesítések</h3>
                                        <p>Értesítések emailben</p>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={notifications.email}
                                            onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <button className="btn btn-primary" onClick={handleSave}>
                                <Save size={18} />
                                Mentés
                            </button>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="settings-section">
                            <h2 className="section-title">Adatvédelmi beállítások</h2>

                            <div className="toggle-group">
                                <div className="toggle-item">
                                    <div className="toggle-info">
                                        <h3>Profil láthatósága</h3>
                                        <p>Mások láthatják a profilodat</p>
                                    </div>
                                    <label className="toggle">
                                        <input type="checkbox" defaultChecked />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="toggle-item">
                                    <div className="toggle-info">
                                        <h3>Statisztikák láthatósága</h3>
                                        <p>Mások láthatják a statisztikáidat</p>
                                    </div>
                                    <label className="toggle">
                                        <input type="checkbox" defaultChecked />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <button className="btn btn-primary" onClick={handleSave}>
                                <Save size={18} />
                                Mentés
                            </button>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="settings-section">
                            <h2 className="section-title">Megjelenési beállítások</h2>

                            <div className="form-group">
                                <label>Téma</label>
                                <div className="theme-options">
                                    <button
                                        className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                                        onClick={() => setTheme('dark')}
                                    >
                                        <Moon size={24} />
                                        Sötét
                                    </button>
                                    <button
                                        className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                                        onClick={() => setTheme('light')}
                                    >
                                        <Sun size={24} />
                                        Világos
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="language">Nyelv</label>
                                <select
                                    id="language"
                                    className="input"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                >
                                    <option value="hu">Magyar</option>
                                    <option value="en">English</option>
                                </select>
                            </div>

                            <button className="btn btn-primary" onClick={handleSave}>
                                <Save size={18} />
                                Mentés
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
