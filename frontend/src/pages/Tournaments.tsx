import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Users, Filter, Search, ChevronRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchTournaments } from '../store/slices/tournamentsSlice';
import { fetchGames } from '../store/slices/gamesSlice';
import type { Tournament, Game } from '../types';
import './Tournaments.css';

const statusLabels: Record<string, { label: string; class: string }> = {
    DRAFT: { label: 'Tervezet', class: 'badge' },
    REGISTRATION: { label: 'Regisztráció', class: 'badge badge-success' },
    IN_PROGRESS: { label: 'Folyamatban', class: 'badge badge-warning' },
    COMPLETED: { label: 'Befejezett', class: 'badge badge-primary' },
    CANCELLED: { label: 'Törölve', class: 'badge badge-error' },
};

const formatLabels: Record<string, string> = {
    SINGLE_ELIMINATION: 'Single Elim.',
    DOUBLE_ELIMINATION: 'Double Elim.',
    ROUND_ROBIN: 'Körmérkőzés',
    SWISS: 'Svájci',
};

function TournamentCard({ tournament }: { tournament: Tournament }) {
    const startDate = new Date(tournament.startDate);
    const regDeadline = new Date(tournament.registrationDeadline);

    return (
        <Link to={`/tournaments/${tournament.id}`} className="tournament-card card card-glow">
            <div className="tournament-header">
                <div className="tournament-game">
                    {tournament.game?.imageUrl ? (
                        <img src={tournament.game.imageUrl} alt={tournament.game.name} />
                    ) : (
                        <div className="game-placeholder">
                            <Trophy size={20} />
                        </div>
                    )}
                    <span>{tournament.game?.name}</span>
                </div>
                <span className={statusLabels[tournament.status]?.class}>
                    {statusLabels[tournament.status]?.label}
                </span>
            </div>

            <h3 className="tournament-name">{tournament.name}</h3>

            {tournament.description && (
                <p className="tournament-description">{tournament.description}</p>
            )}

            <div className="tournament-meta">
                <div className="meta-item">
                    <Calendar size={16} />
                    <span>{startDate.toLocaleDateString('hu-HU')}</span>
                </div>
                <div className="meta-item">
                    <Users size={16} />
                    <span>{tournament._count?.entries || 0} / {tournament.maxTeams}</span>
                </div>
            </div>

            <div className="tournament-footer">
                <span className="tournament-format">{formatLabels[tournament.format]}</span>
                {tournament.status === 'REGISTRATION' && (
                    <span className="reg-deadline">
                        Regisztráció: {regDeadline.toLocaleDateString('hu-HU')}
                    </span>
                )}
            </div>

            <div className="tournament-action">
                <span>Részletek</span>
                <ChevronRight size={16} />
            </div>
        </Link>
    );
}

export function TournamentsPage() {
    const dispatch = useAppDispatch();
    const { tournaments, isLoading, pagination } = useAppSelector((state) => state.tournaments);
    const { games } = useAppSelector((state) => state.games);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [gameFilter, setGameFilter] = useState<string>('');

    useEffect(() => {
        dispatch(fetchTournaments({ page: 1, status: statusFilter, gameId: gameFilter }));
        dispatch(fetchGames());
    }, [dispatch, statusFilter, gameFilter]);

    const filteredTournaments = tournaments.filter((t: Tournament) =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="tournaments-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Versenyek</h1>
                    <p className="page-subtitle">Böngészd a közelgő és folyamatban lévő versenyeket</p>
                </div>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Keresés..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input"
                    />
                </div>

                <div className="filter-group">
                    <Filter size={18} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input"
                    >
                        <option value="">Minden státusz</option>
                        <option value="REGISTRATION">Regisztráció</option>
                        <option value="IN_PROGRESS">Folyamatban</option>
                        <option value="COMPLETED">Befejezett</option>
                    </select>

                    <select
                        value={gameFilter}
                        onChange={(e) => setGameFilter(e.target.value)}
                        className="input"
                    >
                        <option value="">Minden játék</option>
                        {games.map((game: Game) => (
                            <option key={game.id} value={game.id}>
                                {game.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="tournaments-grid">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="tournament-card-skeleton card">
                            <div className="skeleton" style={{ height: 24, width: '60%' }} />
                            <div className="skeleton" style={{ height: 32, width: '80%', marginTop: 16 }} />
                            <div className="skeleton" style={{ height: 48, width: '100%', marginTop: 16 }} />
                            <div className="skeleton" style={{ height: 20, width: '40%', marginTop: 16 }} />
                        </div>
                    ))}
                </div>
            ) : filteredTournaments.length === 0 ? (
                <div className="empty-state">
                    <Trophy size={48} className="empty-icon" />
                    <h3>Nincs találat</h3>
                    <p>Próbálj más szűrőket vagy keresési feltételeket.</p>
                </div>
            ) : (
                <div className="tournaments-grid">
                    {filteredTournaments.map((tournament: Tournament) => (
                        <TournamentCard key={tournament.id} tournament={tournament} />
                    ))}
                </div>
            )}

            {pagination && pagination.pages > 1 && (
                <div className="pagination">
                    {[...Array(pagination.pages)].map((_, i) => (
                        <button
                            key={i}
                            className={`pagination-btn ${pagination.page === i + 1 ? 'active' : ''}`}
                            onClick={() => dispatch(fetchTournaments({ page: i + 1, status: statusFilter, gameId: gameFilter }))}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
