import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Calendar } from 'lucide-react';
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
            <div className="game-header card">
                <div className="game-header-content">
                    {currentGame.imageUrl && (
                        <div className="game-image">
                            <img src={currentGame.imageUrl} alt={currentGame.name} />
                        </div>
                    )}
                    <div className="game-info">
                        <h1 className="game-name">{currentGame.name}</h1>
                        {currentGame.description && (
                            <p className="game-description">{currentGame.description}</p>
                        )}
                        <div className="game-meta">
                            <span className="game-team-size">
                                <Users size={16} />
                                {currentGame.teamSize}v{currentGame.teamSize}
                            </span>
                            <span className="game-tournaments">
                                <Trophy size={16} />
                                {currentGame._count?.tournaments || 0} verseny
                            </span>
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
