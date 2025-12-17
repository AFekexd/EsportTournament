import { useState, useEffect } from 'react';
import { Users, Trophy, Gamepad2, BarChart3, Shield, AlertCircle, Edit2, Monitor, Plus, Trash2, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchTournaments } from '../store/slices/tournamentsSlice';
import { fetchGames } from '../store/slices/gamesSlice';
import { fetchSchedules, createSchedule, deleteSchedule, fetchComputers, seedComputers, checkInByCode } from '../store/slices/bookingsSlice';
import { GameCreateModal, TournamentCreateModal, TournamentEditModal } from '../components/admin';
import { AdminBookingStats } from '../components/booking';
import type { Tournament } from '../types';
import './Admin.css';

export function AdminPage() {
    const { isAdmin } = useAuth();
    const dispatch = useAppDispatch();
    const { tournaments, isLoading: tournamentsLoading } = useAppSelector((state) => state.tournaments);
    const { games } = useAppSelector((state) => state.games);
    const { schedules, computers } = useAppSelector((state) => state.bookings);
    const [newSchedule, setNewSchedule] = useState({ dayOfWeek: 5, startHour: 14, endHour: 18 });

    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tournaments' | 'games' | 'booking'>('overview');
    const [showGameModal, setShowGameModal] = useState(false);
    const [showTournamentModal, setShowTournamentModal] = useState(false);
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
    const [bookingSubTab, setBookingSubTab] = useState<'management' | 'stats'>('stats');
    const [checkInCode, setCheckInCode] = useState('');

    const handleCheckIn = async () => {
        if (!checkInCode.trim()) return;
        try {
            await dispatch(checkInByCode(checkInCode)).unwrap();
            alert('Sikeres bejelentkezés!');
            setCheckInCode('');
        } catch (error) {
            alert('Sikertelen bejelentkezés: Érvénytelen kód vagy a foglalás nem most esedékes.');
        }
    };

    useEffect(() => {
        if (isAdmin) {
            dispatch(fetchTournaments({ page: 1 }));
            dispatch(fetchGames());
            dispatch(fetchSchedules());
            dispatch(fetchComputers());
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
                    <button
                        className={`admin-tab ${activeTab === 'booking' ? 'active' : ''}`}
                        onClick={() => setActiveTab('booking')}
                    >
                        <Monitor size={18} />
                        Gépfoglalás
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

                    {activeTab === 'booking' && (
                        <div className="admin-section">
                            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 className="section-title" style={{ marginBottom: 0 }}>Gépfoglalás</h2>
                                <div className="view-toggle" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className={`btn btn-small ${bookingSubTab === 'stats' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setBookingSubTab('stats')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <BarChart3 size={16} />
                                        Statisztika
                                    </button>
                                    <button
                                        className={`btn btn-small ${bookingSubTab === 'management' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setBookingSubTab('management')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Edit2 size={16} />
                                        Kezelés
                                    </button>
                                </div>
                            </div>

                            {bookingSubTab === 'stats' ? (
                                <AdminBookingStats />
                            ) : (
                                <div>
                                    {/* Check-in Section */}
                                    <div className="card mb-4 p-3" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                                        <h3 className="section-subtitle mt-0 mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Shield size={18} />
                                            Kódos Check-in
                                        </h3>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Írd be a foglalási kódot..."
                                                value={checkInCode}
                                                onChange={(e) => setCheckInCode(e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleCheckIn}
                                                disabled={!checkInCode}
                                            >
                                                Bejelentkezés
                                            </button>
                                        </div>
                                    </div>

                                    {/* Seed Computers Button */}
                                    {computers.length === 0 && (
                                        <div className="alert alert-warning mb-2">
                                            <AlertCircle size={20} />
                                            <div>
                                                <h4>Nincs gép létrehozva</h4>
                                                <p>Kattints a gombra a 10 gép (2x5 rács) létrehozásához.</p>
                                            </div>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => dispatch(seedComputers())}
                                            >
                                                <Plus size={18} />
                                                Gépek létrehozása
                                            </button>
                                        </div>
                                    )}

                                    {computers.length > 0 && (
                                        <div className="alert alert-success mb-2">
                                            <Monitor size={20} />
                                            <span>{computers.length} gép elérhető</span>
                                        </div>
                                    )}

                                    <h3 className="section-subtitle">
                                        <Clock size={18} />
                                        Nyitvatartási idők
                                    </h3>
                                    <p className="text-muted mb-1">Add meg, hogy melyik napokon és mikor érhető el a gaming szoba.</p>

                                    {/* Add New Schedule Form */}
                                    <div className="schedule-form card mb-2">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Nap</label>
                                                <select
                                                    value={newSchedule.dayOfWeek}
                                                    onChange={(e) => setNewSchedule({ ...newSchedule, dayOfWeek: parseInt(e.target.value) })}
                                                >
                                                    <option value={1}>Hétfő</option>
                                                    <option value={2}>Kedd</option>
                                                    <option value={3}>Szerda</option>
                                                    <option value={4}>Csütörtök</option>
                                                    <option value={5}>Péntek</option>
                                                    <option value={6}>Szombat</option>
                                                    <option value={0}>Vasárnap</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Kezdés</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={23}
                                                    value={newSchedule.startHour}
                                                    onChange={(e) => setNewSchedule({ ...newSchedule, startHour: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Vége</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={23}
                                                    value={newSchedule.endHour}
                                                    onChange={(e) => setNewSchedule({ ...newSchedule, endHour: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => {
                                                    dispatch(createSchedule(newSchedule));
                                                }}
                                            >
                                                <Plus size={18} />
                                                Hozzáadás
                                            </button>
                                        </div>
                                    </div>

                                    {/* Schedule List */}
                                    <div className="schedule-list">
                                        {schedules.length === 0 ? (
                                            <p className="text-muted">Még nincs nyitvatartás beállítva.</p>
                                        ) : (
                                            schedules.map((schedule) => {
                                                const dayNames = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
                                                return (
                                                    <div key={schedule.id} className="schedule-item card">
                                                        <div className="schedule-info">
                                                            <strong>{dayNames[schedule.dayOfWeek]}</strong>
                                                            <span>{schedule.startHour}:00 - {schedule.endHour}:00</span>
                                                        </div>
                                                        <button
                                                            className="btn-small btn-danger"
                                                            onClick={() => dispatch(deleteSchedule(schedule.id))}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
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
