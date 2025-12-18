import { useState } from 'react';
import { Save, Bell, Lock, User, Moon, Sun } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ImageUpload } from '../components/common/ImageUpload';
import { API_URL } from '../config';
import { authService } from '../lib/auth-service';

export function SettingsPage() {
    const { user, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'appearance'>('account');

    // Settings state
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
    const [email] = useState(user?.email || '');
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
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center justify-center py-20 bg-[#1a1b26]/50 rounded-2xl border border-white/5">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Lock size={40} className="text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nem vagy bejelentkezve</h3>
                    <p className="text-gray-400">Jelentkezz be a beállítások módosításához.</p>
                </div>
            </div>
        );
    }

    const [saveLoading, setSaveLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSave = async () => {
        if (!user?.id) return;

        setSaveLoading(true);
        setSaveSuccess(false);

        try {
            const token = authService.keycloak?.token;

            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${API_URL}/users/${user.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    displayName,
                    avatarUrl: avatarUrl || undefined,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Hiba történt a mentés során');
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Modern Header with Gradient */}
            <div className="mb-12 text-center relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-3xl rounded-full -z-10" />
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary-100 to-gray-400 bg-clip-text text-transparent mb-4">
                    Beállítások
                </h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                    Kezeld a fiókod és preferenciáid
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-[#1a1b26] rounded-xl border border-white/5 p-2">
                        <button
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'account'
                                ? 'bg-primary text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            onClick={() => setActiveTab('account')}
                        >
                            <User size={18} />
                            Fiók
                        </button>
                        <button
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'notifications'
                                ? 'bg-primary text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            <Bell size={18} />
                            Értesítések
                        </button>
                        <button
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'privacy'
                                ? 'bg-primary text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            onClick={() => setActiveTab('privacy')}
                        >
                            <Lock size={18} />
                            Adatvédelem
                        </button>
                        <button
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'appearance'
                                ? 'bg-primary text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            onClick={() => setActiveTab('appearance')}
                        >
                            <Moon size={18} />
                            Megjelenés
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="lg:col-span-3">
                    <div className="bg-[#1a1b26] rounded-xl border border-white/5 p-8">
                        {activeTab === 'account' && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6">Fiók beállítások</h2>

                                <div className="space-y-6">
                                    {/* Avatar Upload */}
                                    <div>
                                        <ImageUpload
                                            value={avatarUrl}
                                            onChange={setAvatarUrl}
                                            label="Profilkép"
                                            placeholder="https://example.com/avatar.jpg"
                                            maxSizeMB={15}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                                            Megjelenítendő név
                                        </label>
                                        <input
                                            id="displayName"
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                            Email cím
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            disabled
                                            className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                                        />
                                        <p className="text-sm text-gray-500 mt-2">Az email cím nem módosítható</p>
                                    </div>

                                    <div>
                                        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                                            Felhasználónév
                                        </label>
                                        <input
                                            id="username"
                                            type="text"
                                            value={user?.username}
                                            disabled
                                            className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                                        />
                                        <p className="text-sm text-gray-500 mt-2">A felhasználónév nem módosítható</p>
                                    </div>

                                    <button
                                        type="button"
                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${saveSuccess
                                            ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                                            : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                                            }`}
                                        onClick={handleSave}
                                        disabled={saveLoading}
                                    >
                                        {saveLoading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Mentés...
                                            </>
                                        ) : saveSuccess ? (
                                            <>
                                                <Save size={18} />
                                                Mentve!
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                Mentés
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6">Értesítési beállítások</h2>

                                <div className="space-y-4">
                                    {[
                                        { key: 'tournaments', title: 'Verseny értesítések', desc: 'Értesítések új versenyekről és regisztrációkról' },
                                        { key: 'teams', title: 'Csapat értesítések', desc: 'Értesítések csapat eseményekről és meghívókról' },
                                        { key: 'matches', title: 'Mérkőzés értesítések', desc: 'Értesítések közelgő mérkőzésekről' },
                                        { key: 'email', title: 'Email értesítések', desc: 'Értesítések emailben' },
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 bg-[#0f1015] rounded-xl">
                                            <div>
                                                <h3 className="font-medium text-white">{item.title}</h3>
                                                <p className="text-sm text-gray-400 mt-1">{item.desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={notifications[item.key as keyof typeof notifications]}
                                                    onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    ))}

                                    <button
                                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 mt-6"
                                        onClick={handleSave}
                                    >
                                        <Save size={18} />
                                        Mentés
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6">Adatvédelmi beállítások</h2>

                                <div className="space-y-4">
                                    {[
                                        { title: 'Profil láthatósága', desc: 'Mások láthatják a profilodat' },
                                        { title: 'Statisztikák láthatósága', desc: 'Mások láthatják a statisztikáidat' },
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-[#0f1015] rounded-xl">
                                            <div>
                                                <h3 className="font-medium text-white">{item.title}</h3>
                                                <p className="text-sm text-gray-400 mt-1">{item.desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    ))}

                                    <button
                                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 mt-6"
                                        onClick={handleSave}
                                    >
                                        <Save size={18} />
                                        Mentés
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6">Megjelenési beállítások</h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-4">Téma</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                className={`p-6 rounded-xl border-2 transition-all ${theme === 'dark'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-white/10 bg-[#0f1015] hover:border-white/20'
                                                    }`}
                                                onClick={() => setTheme('dark')}
                                            >
                                                <Moon size={32} className={theme === 'dark' ? 'text-primary' : 'text-gray-400'} />
                                                <p className={`mt-2 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-400'}`}>
                                                    Sötét
                                                </p>
                                            </button>
                                            <button
                                                className={`p-6 rounded-xl border-2 transition-all ${theme === 'light'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-white/10 bg-[#0f1015] hover:border-white/20'
                                                    }`}
                                                onClick={() => setTheme('light')}
                                            >
                                                <Sun size={32} className={theme === 'light' ? 'text-primary' : 'text-gray-400'} />
                                                <p className={`mt-2 font-medium ${theme === 'light' ? 'text-white' : 'text-gray-400'}`}>
                                                    Világos
                                                </p>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="language" className="block text-sm font-medium text-gray-300 mb-2">
                                            Nyelv
                                        </label>
                                        <select
                                            id="language"
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors"
                                        >
                                            <option value="hu">Magyar</option>
                                            <option value="en">English</option>
                                        </select>
                                    </div>

                                    <button
                                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20"
                                        onClick={handleSave}
                                    >
                                        <Save size={18} />
                                        Mentés
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
