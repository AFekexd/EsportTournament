import { useState, useEffect } from 'react';
import { Users, Trophy, Gamepad2, BarChart3, Shield, AlertCircle, Edit2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchTournaments } from '../store/slices/tournamentsSlice';
import { fetchGames } from '../store/slices/gamesSlice';
import { GameCreateModal, TournamentCreateModal, TournamentEditModal } from '../components/admin';
import type { Tournament } from '../types';
import './Admin.css';

export function AdminPage() {
    const { isAdmin } = useAuth();
    const dispatch = useAppDispatch();
    const { tournaments, isLoading: tournamentsLoading } = useAppSelector((state) => state.tournaments);
    const { games } = useAppSelector((state) => state.games);

    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tournaments' | 'games'>('overview');
    const [showGameModal, setShowGameModal] = useState(false);
    const [showTournamentModal, setShowTournamentModal] = useState(false);
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

    useEffect(() => {
        if (isAdmin) {
            dispatch(fetchTournaments({ page: 1 }));
            dispatch(fetchGames());
        }
    }, [dispatch, isAdmin]);

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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('hu-HU');
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { class: string; label: string }> = {
            DRAFT: { class: 'badge-warning', label: 'Piszkozat' },
            REGISTRATION: { class: 'badge-success', label: 'Regisztráció' },
            IN_PROGRESS: { class: 'badge-info', label: 'Folyamatban' },
            COMPLETED: { class: 'badge-primary', label: 'Befejezett' },
            CANCELLED: { class: 'badge-error', label: 'Törölve' },
        };
        const config = statusConfig[status] || { class: 'badge-secondary', label: status };
        return <span className={`badge ${config.class}`}>{config.label}</span>;
    };

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
                        <span className="stat-value">-</span>
                        <span className="stat-label">Felhasználók</span>
                    </div>
                </div>

                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <Trophy size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{tournaments.length}</span>
                        <span className="stat-label">Versenyek</span>
                    </div>
                </div>

                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">-</span>
                        <span className="stat-label">Csapatok</span>
                    </div>
                </div>

                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <Gamepad2 size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{games.length}</span>
                        <span className="stat-label">Játékok</span>
                    </div>
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
                                            <td colSpan={5} className="text-center text-muted">
                                                Felhasználók betöltése hamarosan...
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
                                            <th>Formátum</th>
                                            <th>Státusz</th>
                                            <th>Csapatok</th>
                                            <th>Kezdés</th>
                                            <th>Műveletek</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tournamentsLoading ? (
                                            <tr>
                                                <td colSpan={7} className="text-center">
                                                    <div className="spinner" /> Betöltés...
                                                </td>
                                            </tr>
                                        ) : tournaments.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="text-center text-muted">
                                                    Még nincs verseny létrehozva
                                                </td>
                                            </tr>
                                        ) : (
                                            tournaments.map((tournament) => (
                                                <tr key={tournament.id}>
                                                    <td>{tournament.name}</td>
                                                    <td>{tournament.game?.name || '-'}</td>
                                                    <td>
                                                        {tournament.format === 'SINGLE_ELIMINATION' && 'Egyenes'}
                                                        {tournament.format === 'DOUBLE_ELIMINATION' && 'Dupla'}
                                                        {tournament.format === 'ROUND_ROBIN' && 'Körmérkőzés'}
                                                        {tournament.format === 'SWISS' && 'Svájci'}
                                                    </td>
                                                    <td>{getStatusBadge(tournament.status)}</td>
                                                    <td>{tournament._count?.entries || 0}/{tournament.maxTeams}</td>
                                                    <td>{formatDate(tournament.startDate)}</td>
                                                    <td>
                                                        <button
                                                            className="btn-small btn-secondary"
                                                            onClick={() => setEditingTournament(tournament)}
                                                        >
                                                            <Edit2 size={14} />
                                                            Szerkeszt
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
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
                                {games.length === 0 ? (
                                    <p className="text-muted">Még nincs játék létrehozva</p>
                                ) : (
                                    games.map((game) => (
                                        <div key={game.id} className="game-admin-card card">
                                            <h3>{game.name}</h3>
                                            <p>{game.description || 'Nincs leírás'}</p>
                                            <div className="game-stats">
                                                <span>{game._count?.tournaments || 0} verseny</span>
                                                <span>Csapatméret: {game.teamSize}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
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
                <TournamentCreateModal onClose={() => {
                    setShowTournamentModal(false);
                    dispatch(fetchTournaments({ page: 1 }));
                }} />
            )}
            {editingTournament && (
                <TournamentEditModal
                    tournament={editingTournament}
                    onClose={() => {
                        setEditingTournament(null);
                        dispatch(fetchTournaments({ page: 1 }));
                    }}
                />
            )}
        </div>
    );
}
