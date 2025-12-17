import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Calendar, Gamepad2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchGame, clearCurrentGame } from '../store/slices/gamesSlice';
import './GameDetail.css';

export function GameDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentGame, isLoading } = useAppSelector((state) => state.games);

    useEffect(() => {
        if (id) {
            dispatch(fetchGame(id));
        }

        return () => {
            dispatch(clearCurrentGame());
        };
    }, [id, dispatch]);

    if (isLoading || !currentGame) {
        return (
            <div className="loading-container">
                <div className="spinner-large" />
                <p>Betöltés...</p>
            </div>
        );
    }

    return (
        <div className="game-detail-page">
            {/* Header */}
            <div className="page-header">
                <button className="btn btn-ghost" onClick={() => navigate('/games')}>
                    <ArrowLeft size={18} />
                    Vissza
                </button>
            </div>

            {/* Game Header */}
            {/* Game Header */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="relative group">
                    {currentGame.imageUrl ? (
                        <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/10 relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                            <img
                                src={currentGame.imageUrl}
                                alt={currentGame.name}
                                className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                            />
                        </div>
                    ) : (
                        <div className="w-full aspect-video rounded-xl bg-gray-800 flex items-center justify-center border border-white/10">
                            <Gamepad2 size={64} className="text-gray-600" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col justify-center space-y-6">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-4">
                            {currentGame.name}
                        </h1>
                        {currentGame.description && (
                            <p className="text-lg text-gray-300 leading-relaxed max-w-2xl">
                                {currentGame.description}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-lg border border-white/10 backdrop-blur-sm">
                            <div className="p-2 bg-primary/20 rounded-md">
                                <Users size={20} className="text-primary" />
                            </div>
                            <div>
                                <span className="block text-xs text-uppercase text-muted font-semibold tracking-wider">Formátum</span>
                                <span className="font-bold text-white">{currentGame.teamSize}v{currentGame.teamSize}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-lg border border-white/10 backdrop-blur-sm">
                            <div className="p-2 bg-accent/20 rounded-md">
                                <Trophy size={20} className="text-accent" />
                            </div>
                            <div>
                                <span className="block text-xs text-uppercase text-muted font-semibold tracking-wider">Versenyek</span>
                                <span className="font-bold text-white">{currentGame._count?.tournaments || 0} darab</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rules Section */}
            {currentGame.rules && (
                <div className="game-section card">
                    <h2 className="section-title">Szabályok</h2>
                    <div className="rules-content">
                        <p>{currentGame.rules}</p>
                    </div>
                </div>
            )}

            {/* Active Tournaments */}
            <div className="game-section card">
                <h2 className="section-title">Aktív versenyek</h2>

                {currentGame.tournaments && currentGame.tournaments.length > 0 ? (
                    <div className="tournaments-list">
                        {currentGame.tournaments.map((tournament) => (
                            <Link
                                key={tournament.id}
                                to={`/tournaments/${tournament.id}`}
                                className="tournament-card card"
                            >
                                <div className="tournament-info">
                                    <h3>{tournament.name}</h3>
                                    {tournament.description && (
                                        <p className="tournament-description">{tournament.description}</p>
                                    )}
                                    <div className="tournament-meta">
                                        <span>
                                            <Users size={14} />
                                            {tournament._count?.entries || 0}/{tournament.maxTeams} csapat
                                        </span>
                                        <span>
                                            <Calendar size={14} />
                                            {new Date(tournament.startDate).toLocaleDateString('hu-HU')}
                                        </span>
                                    </div>
                                </div>
                                <span className={`badge badge-${tournament.status.toLowerCase()}`}>
                                    {tournament.status === 'REGISTRATION' ? 'Regisztráció' :
                                        tournament.status === 'IN_PROGRESS' ? 'Folyamatban' :
                                            tournament.status === 'COMPLETED' ? 'Befejezett' : tournament.status}
                                </span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <Trophy size={48} />
                        <p>Jelenleg nincsenek aktív versenyek ehhez a játékhoz</p>
                    </div>
                )}
            </div>

            {/* Stats Section */}
            <div className="stats-grid">
                <div className="stat-card card">
                    <div className="stat-icon">
                        <Trophy />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{currentGame._count?.tournaments || 0}</span>
                        <span className="stat-label">Összes verseny</span>
                    </div>
                </div>
                <div className="stat-card card">
                    <div className="stat-icon">
                        <Users />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{currentGame._count?.gameStats || 0}</span>
                        <span className="stat-label">Játékos statisztikák</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
