import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Calendar, Users, Award, UserPlus, Maximize, Minimize } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { useAuth } from '../hooks/useAuth';
import {
    fetchTournament,
    clearCurrentTournament,
    registerForTournament,
    generateBracket,
    updateMatch,
} from '../store/slices/tournamentsSlice';
import { fetchTeams } from '../store/slices/teamsSlice';
import { TournamentStatusModal } from '../components/admin';
import { TournamentBracket, MatchEditModal } from '../components/tournament';
import type { Match } from '../types';
import './TournamentDetail.css';

const statusLabels: Record<string, { label: string; class: string }> = {
    DRAFT: { label: 'Tervezet', class: 'badge' },
    REGISTRATION: { label: 'Regisztráció nyitva', class: 'badge badge-success' },
    IN_PROGRESS: { label: 'Folyamatban', class: 'badge badge-warning' },
    COMPLETED: { label: 'Befejezett', class: 'badge badge-primary' },
    CANCELLED: { label: 'Törölve', class: 'badge badge-error' },
};

export function TournamentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAuth();
    const { currentTournament, isLoading } = useAppSelector((state) => state.tournaments);
    const { myTeams } = useAppSelector((state) => state.teams);

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'bracket'>('info');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    useEffect(() => {
        if (id) {
            dispatch(fetchTournament(id));
        }
        if (isAuthenticated) {
            dispatch(fetchTeams({ page: 1 }));
        }

        return () => {
            dispatch(clearCurrentTournament());
        };
    }, [id, dispatch, isAuthenticated]);

    const handleRegister = async () => {
        if (!selectedTeamId || !currentTournament) return;

        try {
            await dispatch(registerForTournament({
                tournamentId: currentTournament.id,
                teamId: selectedTeamId,
            })).unwrap();

            setShowRegisterModal(false);
            // Refresh tournament data
            dispatch(fetchTournament(currentTournament.id));
        } catch (err) {
            console.error('Failed to register:', err);
        }
    };

    const handleGenerateBracket = async () => {
        if (!currentTournament) return;

        try {
            await dispatch(generateBracket(currentTournament.id)).unwrap();
            // Refresh tournament to get matches
            dispatch(fetchTournament(currentTournament.id));
        } catch (err) {
            console.error('Failed to generate bracket:', err);
        }
    };

    const handleMatchClick = (match: Match) => {
        console.log('Match clicked:', match.id, 'User role:', user?.role);
        if (user?.role === 'ADMIN' || user?.role === 'ORGANIZER') {
            setSelectedMatch(match);
            setShowMatchModal(true);
        }
    };

    const handleMatchUpdate = async (data: { homeScore?: number; awayScore?: number; winnerId?: string }) => {
        if (!selectedMatch) return;

        try {
            await dispatch(updateMatch({ matchId: selectedMatch.id, data })).unwrap();
            setShowMatchModal(false);
            setSelectedMatch(null);
            // Refresh tournament
            if (currentTournament) {
                dispatch(fetchTournament(currentTournament.id));
            }
        } catch (err) {
            console.error('Failed to update match:', err);
        }
    };

    if (isLoading || !currentTournament) {
        return (
            <div className="loading-container">
                <div className="spinner-large" />
                <p>Betöltés...</p>
            </div>
        );
    }

    const startDate = new Date(currentTournament.startDate);
    const regDeadline = new Date(currentTournament.registrationDeadline);
    const isRegistrationOpen = currentTournament.status === 'REGISTRATION' && new Date() < regDeadline;
    const userTeamIds = myTeams.map(t => t.id);
    const isAlreadyRegistered = currentTournament.entries?.some(e => userTeamIds.includes(e.teamId));

    return (
        <div className="tournament-detail-page">
            {/* Header */}
            <div className="page-header">
                <button className="btn btn-ghost" onClick={() => navigate('/tournaments')}>
                    <ArrowLeft size={18} />
                    Vissza
                </button>
            </div>

            {/* Tournament Header */}
            <div className="tournament-header card">
                <div className="tournament-header-content">
                    <div className="tournament-info">
                        <div className="tournament-game-badge">
                            {currentTournament.game?.imageUrl && (
                                <img src={currentTournament.game.imageUrl} alt={currentTournament.game.name} />
                            )}
                            <span>{currentTournament.game?.name}</span>
                        </div>
                        <h1 className="tournament-name">{currentTournament.name}</h1>
                        {currentTournament.description && (
                            <p className="tournament-description">{currentTournament.description}</p>
                        )}
                        <div className="tournament-meta">
                            <span className="meta-item">
                                <Calendar size={16} />
                                {startDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            <span className="meta-item">
                                <Users size={16} />
                                {currentTournament._count?.entries || 0} / {currentTournament.maxTeams} csapat
                            </span>
                            <span className={statusLabels[currentTournament.status]?.class}>
                                {statusLabels[currentTournament.status]?.label}
                            </span>
                        </div>
                    </div>

                    {isRegistrationOpen && isAuthenticated && !isAlreadyRegistered && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowRegisterModal(true)}
                        >
                            <UserPlus size={18} />
                            Regisztráció
                        </button>
                    )}

                    {user?.role === 'ADMIN' && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowStatusModal(true)}
                        >
                            Státusz módosítása
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card card">
                    <div className="stat-icon">
                        <Trophy />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Formátum</span>
                        <span className="stat-value">
                            {currentTournament.format === 'SINGLE_ELIMINATION' ? 'Egyenes kieséses' :
                                currentTournament.format === 'DOUBLE_ELIMINATION' ? 'Dupla kieséses' :
                                    currentTournament.format === 'ROUND_ROBIN' ? 'Körmérkőzés' : currentTournament.format}
                        </span>
                    </div>
                </div>
                <div className="stat-card card">
                    <div className="stat-icon">
                        <Calendar />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Regisztráció határideje</span>
                        <span className="stat-value">{regDeadline.toLocaleDateString('hu-HU')}</span>
                    </div>
                </div>
                {(currentTournament as any).prizePool && (
                    <div className="stat-card card">
                        <div className="stat-icon">
                            <Award />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Díjazás</span>
                            <span className="stat-value">{(currentTournament as any).prizePool}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        Információk
                    </button>
                    <button
                        className={`tab ${activeTab === 'bracket' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bracket')}
                    >
                        Bracket
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'info' && (
                <>
                    {/* Registered Participants */}
                    <div className="tournament-section card">
                        <h2 className="section-title">
                            {currentTournament.game?.teamSize === 1 ? 'Regisztrált játékosok' : 'Regisztrált csapatok'}
                        </h2>

                        {currentTournament.entries && currentTournament.entries.length > 0 ? (
                            <div className="teams-grid">
                                {currentTournament.entries.map((entry) => {
                                    // Solo entry (player without team)
                                    if (entry.user && !entry.team) {
                                        return (
                                            <div key={entry.id} className="team-entry card">
                                                <div className="team-entry-content">
                                                    {entry.user.avatarUrl ? (
                                                        <div className="team-logo">
                                                            <img src={entry.user.avatarUrl} alt={entry.user.displayName || entry.user.username} />
                                                        </div>
                                                    ) : (
                                                        <div className="team-logo player-avatar">
                                                            {(entry.user.displayName || entry.user.username).charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="team-info">
                                                        <h3>{entry.user.displayName || entry.user.username}</h3>
                                                        <p className="team-elo">{entry.user.elo || 1000} ELO</p>
                                                    </div>
                                                </div>
                                                <span className="team-seed">#{entry.seed}</span>
                                            </div>
                                        );
                                    }

                                    // Team entry
                                    if (entry.team) {
                                        return (
                                            <Link
                                                key={entry.id}
                                                to={`/teams/${entry.team.id}`}
                                                className="team-entry card"
                                            >
                                                <div className="team-entry-content">
                                                    {entry.team.logoUrl && (
                                                        <div className="team-logo">
                                                            <img src={entry.team.logoUrl} alt={entry.team.name} />
                                                        </div>
                                                    )}
                                                    <div className="team-info">
                                                        <h3>{entry.team.name}</h3>
                                                        <p className="team-elo">{entry.team.elo} ELO</p>
                                                    </div>
                                                </div>
                                                <span className="team-seed">#{entry.seed}</span>
                                            </Link>
                                        );
                                    }

                                    return null;
                                })}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Users size={48} />
                                <p>Még nincsenek regisztrált {currentTournament.game?.teamSize === 1 ? 'játékosok' : 'csapatok'}</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'bracket' && (
                <div className={`tournament-section card ${isFullscreen ? 'fullscreen-bracket' : ''}`}>
                    <div className="section-header">
                        <h2 className="section-title">Bracket</h2>
                        <div className="section-actions">
                            {(user?.role === 'ADMIN' || user?.role === 'ORGANIZER') && (
                                <>
                                    {!currentTournament.matches?.length ? (
                                        <button className="btn btn-primary" onClick={handleGenerateBracket}>
                                            Bracket generálása
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-warning"
                                            onClick={() => {
                                                if (window.confirm('Biztosan újra akarod generálni a bracketet? Ez törli az összes jelenlegi meccset és eredményt!')) {
                                                    handleGenerateBracket();
                                                }
                                            }}
                                        >
                                            Bracket újragenerálása
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                className="btn btn-secondary"
                                onClick={toggleFullscreen}
                                title={isFullscreen ? 'Kilépés a teljes képernyőből' : 'Teljes képernyő'}
                            >
                                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                {isFullscreen ? 'Kilépés' : 'Teljes képernyő'}
                            </button>
                        </div>
                    </div>
                    <TournamentBracket
                        tournament={currentTournament}
                        onMatchClick={handleMatchClick}
                    />
                </div>
            )}

            {/* Registered Teams */}
            <div className="tournament-section card">
                <h2 className="section-title">Regisztrált csapatok</h2>

                {currentTournament.entries && currentTournament.entries.length > 0 ? (
                    <div className="teams-grid">
                        {currentTournament.entries.map((entry) => entry.team && (
                            <Link
                                key={entry.id}
                                to={`/teams/${entry.team.id}`}
                                className="team-entry card"
                            >
                                <div className="team-entry-content">
                                    {entry.team.logoUrl && (
                                        <div className="team-logo">
                                            <img src={entry.team.logoUrl} alt={entry.team.name} />
                                        </div>
                                    )}
                                    <div className="team-info">
                                        <h3>{entry.team.name}</h3>
                                        <p className="team-elo">{entry.team.elo} ELO</p>
                                    </div>
                                </div>
                                <span className="team-seed">#{entry.seed}</span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>Még nincsenek regisztrált csapatok</p>
                    </div>
                )}
            </div>

            {/* Matches/Bracket */}
            {currentTournament.matches && currentTournament.matches.length > 0 && (
                <div className="tournament-section card">
                    <h2 className="section-title">Mérkőzések</h2>
                    <div className="matches-list">
                        {currentTournament.matches.map((match) => (
                            <div key={match.id} className="match-card">
                                <span className="match-round">Kör {match.round}</span>
                                <div className="match-teams">
                                    <div className="match-team">
                                        <span>{match.homeTeam?.name || 'Nincs meghatározva'}</span>
                                        {match.homeScore !== null && <span className="score">{match.homeScore}</span>}
                                    </div>
                                    <span className="vs">vs</span>
                                    <div className="match-team">
                                        <span>{match.awayTeam?.name || 'Nincs meghatározva'}</span>
                                        {match.awayScore !== null && <span className="score">{match.awayScore}</span>}
                                    </div>
                                </div>
                                {match.winner && (
                                    <span className="match-winner">Győztes: {match.winner.name}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Registration Modal */}
            {showRegisterModal && (
                <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Csapat regisztrálása</h2>
                            <button className="modal-close" onClick={() => setShowRegisterModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Válaszd ki a csapatot, amellyel regisztrálni szeretnél:</p>
                            <select
                                className="input"
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                            >
                                <option value="">Válassz csapatot...</option>
                                {myTeams
                                    .filter(team => team.ownerId === user?.id)
                                    .map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name} ({team.elo} ELO)
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>
                                Mégse
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleRegister}
                                disabled={!selectedTeamId}
                            >
                                Regisztráció
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Modal */}
            {showStatusModal && currentTournament && (
                <TournamentStatusModal
                    tournamentId={currentTournament.id}
                    currentStatus={currentTournament.status}
                    currentNotifyUsers={currentTournament.notifyUsers}
                    currentNotifyDiscord={currentTournament.notifyDiscord}
                    currentDiscordChannel={currentTournament.discordChannelId}
                    onClose={() => setShowStatusModal(false)}
                />
            )}

            {/* Match Edit Modal */}
            {showMatchModal && selectedMatch && (
                <MatchEditModal
                    match={selectedMatch}
                    onClose={() => {
                        setShowMatchModal(false);
                        setSelectedMatch(null);
                    }}
                    onSave={handleMatchUpdate}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}
