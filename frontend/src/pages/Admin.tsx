import { useState } from 'react';
import { Users, Trophy, Gamepad2, BarChart3, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { GameCreateModal, TournamentCreateModal } from '../components/admin';
import './Admin.css';

export function AdminPage() {
    const { isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tournaments' | 'games'>('overview');
    const [showGameModal, setShowGameModal] = useState(false);
    const [showTournamentModal, setShowTournamentModal] = useState(false);

    if (!isAdmin) {
        return (
            <div className="admin-page">
                <div className="empty-state">
                    <Shield size={48} className="empty-icon" />
                    <h3>Hozzáférés megtagadva</h3>
                    <p>Nincs jogosultságod az admin felület megtekintéséhez.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Admin Panel</h1>
                    <p className="page-subtitle">Rendszer kezelés és statisztikák</p>
                </div>
            </div>

            <div className="admin-stats">
                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">1,234</span>
                        <span className="stat-label">Felhasználók</span>
                    </div>
                    <span className="stat-change positive">+12%</span>
                </div>

                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <Trophy size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">45</span>
                        <span className="stat-label">Aktív versenyek</span>
                    </div>
                    <span className="stat-change positive">+5</span>
                </div>

                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">328</span>
                        <span className="stat-label">Csapatok</span>
                    </div>
                    <span className="stat-change positive">+8%</span>
                </div>

                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <Gamepad2 size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">12</span>
                        <span className="stat-label">Játékok</span>
                    </div>
                    <span className="stat-change neutral">0</span>
                </div>
            </div>

            <div className="admin-container">
                <div className="admin-sidebar">
                    <button
                        className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <BarChart3 size={18} />
                        Áttekintés
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={18} />
                        Felhasználók
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'tournaments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tournaments')}
                    >
                        <Trophy size={18} />
                        Versenyek
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'games' ? 'active' : ''}`}
                        onClick={() => setActiveTab('games')}
                    >
                        <Gamepad2 size={18} />
                        Játékok
                    </button>
                </div>

                <div className="admin-content card">
                    {activeTab === 'overview' && (
                        <div className="admin-section">
                            <h2 className="section-title">Rendszer áttekintés</h2>

                            <div className="alert alert-info">
                                <AlertCircle size={20} />
                                <div>
                                    <h3>Rendszer státusz: Működik</h3>
                                    <p>Minden szolgáltatás normálisan működik</p>
                                </div>
                            </div>

                            <div className="chart-placeholder card">
                                <h3>Felhasználói aktivitás (30 nap)</h3>
                                <div className="chart-content">
                                    <BarChart3 size={48} className="chart-icon" />
                                    <p>Grafikon hamarosan elérhető</p>
                                </div>
                            </div>

                            <div className="chart-placeholder card">
                                <h3>Verseny statisztikák</h3>
                                <div className="chart-content">
                                    <Trophy size={48} className="chart-icon" />
                                    <p>Grafikon hamarosan elérhető</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="admin-section">
                            <h2 className="section-title">Felhasználó kezelés</h2>

                            <div className="admin-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Név</th>
                                            <th>Email</th>
                                            <th>Szerepkör</th>
                                            <th>Regisztráció</th>
                                            <th>Műveletek</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>András Feke</td>
                                            <td>feke@example.com</td>
                                            <td><span className="badge badge-error">ADMIN</span></td>
                                            <td>2024-01-15</td>
                                            <td>
                                                <button className="btn-small btn-secondary">Szerkeszt</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Példa Felhasználó</td>
                                            <td>user@example.com</td>
                                            <td><span className="badge badge-success">STUDENT</span></td>
                                            <td>2024-02-20</td>
                                            <td>
                                                <button className="btn-small btn-secondary">Szerkeszt</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tournaments' && (
                        <div className="admin-section">
                            <h2 className="section-title">Verseny kezelés</h2>

                            <button
                                className="btn btn-primary mb-2"
                                onClick={() => setShowTournamentModal(true)}
                            >
                                <Trophy size={18} />
                                Új verseny létrehozása
                            </button>

                            <div className="admin-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Név</th>
                                            <th>Játék</th>
                                            <th>Státusz</th>
                                            <th>Csapatok</th>
                                            <th>Kezdés</th>
                                            <th>Műveletek</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Példa Verseny</td>
                                            <td>League of Legends</td>
                                            <td><span className="badge badge-success">REGISTRATION</span></td>
                                            <td>12/32</td>
                                            <td>2024-03-15</td>
                                            <td>
                                                <button className="btn-small btn-secondary">Szerkeszt</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'games' && (
                        <div className="admin-section">
                            <h2 className="section-title">Játék kezelés</h2>

                            <button
                                className="btn btn-primary mb-2"
                                onClick={() => setShowGameModal(true)}
                            >
                                <Gamepad2 size={18} />
                                Új játék hozzáadása
                            </button>

                            <div className="games-grid">
                                <div className="game-admin-card card">
                                    <h3>League of Legends</h3>
                                    <p>MOBA</p>
                                    <div className="game-stats">
                                        <span>15 verseny</span>
                                        <span>234 csapat</span>
                                    </div>
                                    <button className="btn-small btn-secondary">Szerkeszt</button>
                                </div>
                                <div className="game-admin-card card">
                                    <h3>Counter-Strike 2</h3>
                                    <p>FPS</p>
                                    <div className="game-stats">
                                        <span>8 verseny</span>
                                        <span>156 csapat</span>
                                    </div>
                                    <button className="btn-small btn-secondary">Szerkeszt</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showGameModal && (
                <GameCreateModal onClose={() => setShowGameModal(false)} />
            )}
            {showTournamentModal && (
                <TournamentCreateModal onClose={() => setShowTournamentModal(false)} />
            )}
        </div>
    );
}
