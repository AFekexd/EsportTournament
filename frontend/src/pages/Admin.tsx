import { useState, useEffect } from 'react';
import {
    Users, Trophy, Calendar, Gamepad2, Settings, Plus,
    Shield, Edit2, Trash2, ArrowUpRight, Monitor
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { useAuth } from '../hooks/useAuth';
import { fetchGames, deleteGame } from '../store/slices/gamesSlice';
import { fetchTournaments } from '../store/slices/tournamentsSlice';
import { fetchTeams } from '../store/slices/teamsSlice';
import { fetchSchedules, fetchComputers } from '../store/slices/bookingsSlice';
import { GameCreateModal } from '../components/admin/GameCreateModal';
import { GameEditModal } from '../components/admin/GameEditModal';
import { GameRankModal } from '../components/admin/GameRankModal';
import { TournamentCreateModal } from '../components/admin/TournamentCreateModal';
import { TournamentEditModal } from '../components/admin/TournamentEditModal';
import { TournamentStatusModal } from '../components/admin/TournamentStatusModal';
import { BookingManagement } from '../components/booking/BookingManagement';
import { UserManagement } from '../components/admin/UserManagement';
import { KioskManager } from '../components/admin/KioskManager';
import { Link } from 'react-router-dom';
import './Admin.css';
import type { Game, Tournament } from '../types';

export function AdminPage() {
    const dispatch = useAppDispatch();
    const { user } = useAuth();
    const { games } = useAppSelector((state) => state.games);
    const { tournaments } = useAppSelector((state) => state.tournaments);
    const { pagination } = useAppSelector((state) => state.teams);

    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tournaments' | 'games' | 'bookings' | 'kiosk'>('overview');
    const [showGameModal, setShowGameModal] = useState(false);
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [showTournamentModal, setShowTournamentModal] = useState(false);
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
    const [statusTournament, setStatusTournament] = useState<Tournament | null>(null);
    const [editingGameRanks, setEditingGameRanks] = useState<Game | null>(null);

    useEffect(() => {
        dispatch(fetchGames());
        dispatch(fetchTournaments({}));
        dispatch(fetchTeams({ page: 1 }));
        dispatch(fetchSchedules());
        dispatch(fetchComputers());
    }, [dispatch]);



    const handleDeleteGame = async (gameId: string) => {
        if (confirm('Biztosan törölni szeretnéd ezt a játékot? Ez a művelet nem visszavonható!')) {
            try {
                await dispatch(deleteGame(gameId)).unwrap();
            } catch (error) {
                console.error('Failed to delete game:', error);
                alert('Nem sikerült törölni a játékot. Ellenőrizd, hogy nincsenek-e hozzárendelt versenyek.');
            }
        }
    };

    if (!user || (user.role !== 'ADMIN' && user.role !== 'ORGANIZER')) {
        return (
            <div className="container py-5">
                <div className="alert alert-error">
                    Nincs jogosultságod az admin felület megtekintéséhez.
                </div>
            </div>
        );
    }

    const totalUsers = pagination?.total || 0;
    const totalTournaments = tournaments.length;
    const activeTournaments = tournaments.filter(t => t.status === 'IN_PROGRESS').length;
    const totalTeams = pagination?.total || 0;

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
                <h1 className="page-title">Admin Dashboard</h1>
                <p className="page-subtitle">Rendszer kezelés és statisztikák</p>
            </div>

            <div className="admin-stats">
                <div className="stat-card card">
                    <div className="stat-icon">
                        <Users />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{totalUsers}</span>
                        <span className="stat-label">Felhasználók</span>
                    </div>
                </div>
                <div className="stat-card card">
                    <div className="stat-icon">
                        <Trophy />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{totalTournaments}</span>
                        <span className="stat-label">Versenyek</span>
                    </div>
                </div>
                <div className="stat-card card">
                    <div className="stat-icon">
                        <Users />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{totalTeams}</span>
                        <span className="stat-label">Csapatok</span>
                    </div>
                </div>
                <div className="stat-card card">
                    <div className="stat-icon">
                        <Gamepad2 />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{games.length}</span>
                        <span className="stat-label">Játékok</span>
                    </div>
                </div>
            </div>

            <div className="admin-container">
                <div className="admin-sidebar card h-fit">
                    <button
                        className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <Settings size={18} />
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
                        className={`admin-tab ${activeTab === 'bookings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bookings')}
                    >
                        <Calendar size={18} />
                        Gépfoglalás
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'kiosk' ? 'active' : ''}`}
                        onClick={() => setActiveTab('kiosk')}
                    >
                        <Monitor size={18} />
                        Gépterem
                    </button>
                </div>

                <div className="admin-content card min-h-[500px]">
                    {activeTab === 'overview' && (
                        <div className="admin-section">
                            <h2 className="section-title">Áttekintés</h2>
                            <div className="grid grid-2 gap-4">
                                <div className="card bg-tertiary">
                                    <h3>Legutóbbi regisztrációk</h3>
                                    <div className="empty-state py-8">
                                        <p className="text-muted">Hamarosan...</p>
                                    </div>
                                </div>
                                <div className="card bg-tertiary">
                                    <h3>Aktív versenyek</h3>
                                    {activeTournaments > 0 ? (
                                        <ul className="list-none p-0 m-0">
                                            {tournaments
                                                .filter(t => t.status === 'IN_PROGRESS')
                                                .map(t => (
                                                    <li key={t.id} className="py-2 border-b border-white/10 flex justify-between items-center">
                                                        <span>{t.name}</span>
                                                        <Link to={`/tournaments/${t.id}`} className="text-primary hover:text-primary-hover">
                                                            <ArrowUpRight size={16} />
                                                        </Link>
                                                    </li>
                                                ))}
                                        </ul>
                                    ) : (
                                        <p className="text-muted py-4">Nincs aktív verseny</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'games' && (
                        <div className="admin-section">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="section-title mb-0">Játék kezelés</h2>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowGameModal(true)}
                                >
                                    <Plus size={18} />
                                    Új játék hozzáadása
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {games.length === 0 ? (
                                    <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white/5 rounded-xl border border-white/10 border-dashed">
                                        <Gamepad2 size={48} className="text-gray-500 mb-4" />
                                        <p className="text-muted text-lg">Még nincs játék létrehozva</p>
                                        <button
                                            className="btn btn-primary mt-4"
                                            onClick={() => setShowGameModal(true)}
                                        >
                                            <Plus size={18} />
                                            Játék létrehozása
                                        </button>
                                    </div>
                                ) : (
                                    games.map((game) => (
                                        <div key={game.id} className="group flex flex-col bg-[#1a1b26] rounded-xl overflow-hidden border border-white/5 shadow-md hover:shadow-xl hover:border-primary/50 transition-all duration-300">
                                            {/* Image & Overlay */}
                                            <div className="relative w-full aspect-video overflow-hidden bg-gray-900 border-b border-white/5">
                                                {game.imageUrl ? (
                                                    <img
                                                        src={game.imageUrl}
                                                        alt={game.name}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Gamepad2 size={40} className="text-gray-600" />
                                                    </div>
                                                )}

                                                {/* Team Size Badge */}
                                                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                                                    {game.teamSize}v{game.teamSize}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-4 flex flex-col flex-grow">
                                                <h3 className="text-lg font-bold text-white mb-1 truncate">{game.name}</h3>
                                                <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[2.5em]">
                                                    {game.description || 'Nincs leírás'}
                                                </p>

                                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                                    <span className="flex items-center gap-1">
                                                        <Trophy size={12} className="text-yellow-500" />
                                                        {game._count?.tournaments || 0} verseny
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users size={12} className="text-blue-400" />
                                                        {game.teamSize} fős csapatok
                                                    </span>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-white/10">
                                                    <button
                                                        className="flex flex-col items-center justify-center p-2 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors gap-1"
                                                        onClick={() => setEditingGameRanks(game)}
                                                        title="Rangok kezelése"
                                                    >
                                                        <Shield size={16} />
                                                        <span className="text-[10px]">Rangok</span>
                                                    </button>
                                                    <button
                                                        className="flex flex-col items-center justify-center p-2 rounded hover:bg-white/5 text-gray-400 hover:text-primary transition-colors gap-1"
                                                        onClick={() => setEditingGame(game)}
                                                        title="Szerkesztés"
                                                    >
                                                        <Edit2 size={16} />
                                                        <span className="text-[10px]">Módosít</span>
                                                    </button>
                                                    <button
                                                        className="flex flex-col items-center justify-center p-2 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors gap-1"
                                                        onClick={() => handleDeleteGame(game.id)}
                                                        title="Törlés"
                                                    >
                                                        <Trash2 size={16} />
                                                        <span className="text-[10px]">Törlés</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'bookings' && (
                        <BookingManagement />
                    )}

                    {activeTab === 'kiosk' && (
                        <KioskManager />
                    )}

                    {activeTab === 'users' && (
                        <UserManagement />
                    )}

                    {activeTab === 'tournaments' && (
                        <div className="admin-section">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="section-title mb-0">Verseny kezelés</h2>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowTournamentModal(true)}
                                >
                                    <Plus size={18} />
                                    Új verseny
                                </button>
                            </div>

                            <div className="admin-table-container overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 text-muted text-sm uppercase">
                                            <th className="p-3">Név</th>
                                            <th className="p-3">Játék</th>
                                            <th className="p-3">Formátum</th>
                                            <th className="p-3">Státusz</th>
                                            <th className="p-3">Létszám</th>
                                            <th className="p-3">Kezdés</th>
                                            <th className="p-3 text-right">Műveletek</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tournaments.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="text-center p-8 text-muted">
                                                    Még nincs verseny létrehozva
                                                </td>
                                            </tr>
                                        ) : (
                                            tournaments.map((tournament) => (
                                                <tr key={tournament.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="p-3 font-medium">{tournament.name}</td>
                                                    <td className="p-3 text-muted">{tournament.game?.name || '-'}</td>
                                                    <td className="p-3 text-sm">
                                                        {tournament.format === 'SINGLE_ELIMINATION' && 'Egyenes'}
                                                        {tournament.format === 'DOUBLE_ELIMINATION' && 'Dupla'}
                                                        {tournament.format === 'ROUND_ROBIN' && 'Körmérkőzés'}
                                                        {tournament.format === 'SWISS' && 'Svájci'}
                                                    </td>
                                                    <td className="p-3">{getStatusBadge(tournament.status)}</td>
                                                    <td className="p-3 text-sm text-center">{tournament._count?.entries || 0}/{tournament.maxTeams}</td>
                                                    <td className="p-3 text-sm text-muted">{new Date(tournament.startDate).toLocaleDateString('hu-HU')}</td>
                                                    <td className="p-3 text-right flex gap-2 justify-end">
                                                        <button
                                                            className="btn-icon hover:bg-white/10"
                                                            onClick={() => setStatusTournament(tournament)}
                                                            title="Státusz módosítása"
                                                        >
                                                            <Settings size={16} />
                                                        </button>
                                                        <button
                                                            className="btn-icon hover:bg-white/10"
                                                            onClick={() => setEditingTournament(tournament)}
                                                            title="Szerkesztés"
                                                        >
                                                            <Edit2 size={16} />
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
                </div>
            </div>

            {/* Modals */}
            {showGameModal && (
                <GameCreateModal onClose={() => setShowGameModal(false)} />
            )}

            {editingGame && (
                <GameEditModal
                    game={editingGame}
                    onClose={() => setEditingGame(null)}
                />
            )}

            {editingGameRanks && (
                <GameRankModal
                    game={editingGameRanks}
                    onClose={() => setEditingGameRanks(null)}
                />
            )}

            {showTournamentModal && (
                <TournamentCreateModal onClose={() => setShowTournamentModal(false)} />
            )}

            {editingTournament && (
                <TournamentEditModal
                    tournament={editingTournament}
                    onClose={() => setEditingTournament(null)}
                />
            )}

            {statusTournament && (
                <TournamentStatusModal
                    tournamentId={statusTournament.id}
                    currentStatus={statusTournament.status}
                    currentNotifyUsers={statusTournament.notifyUsers}
                    currentNotifyDiscord={statusTournament.notifyDiscord}
                    currentDiscordChannel={statusTournament.discordChannelId}
                    onClose={() => setStatusTournament(null)}
                />
            )}
        </div>
    );
}
