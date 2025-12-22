import { useEffect } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { User, Trophy, Users, Calendar, Edit, Settings as SettingsIcon, Award, TrendingUp, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchGames, fetchUserRanks, setUserRank, fetchRanks } from '../store/slices/gamesSlice';
import { fetchTeams } from '../store/slices/teamsSlice';
import { fetchTournaments } from '../store/slices/tournamentsSlice';
import type { Team, Tournament, Game, UserRank } from '../types';
import './Profile.css';

export function ProfilePage() {
    const { user, isAuthenticated } = useAuth();
    const dispatch = useAppDispatch();

    const { teams } = useAppSelector((state) => state.teams);
    const { tournaments } = useAppSelector((state) => state.tournaments);
    const { games, gameRanks, userRanks } = useAppSelector((state) => state.games);



    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchTeams({ page: 1 }));
            dispatch(fetchTournaments({ page: 1 }));
            dispatch(fetchGames());
            dispatch(fetchGames());
            dispatch(fetchUserRanks());
        }
    }, [dispatch, isAuthenticated]);

    useEffect(() => {
        if (games.length > 0) {
            games.forEach(game => {
                // Fetch ranks if not already loaded (simple cache via redux state check)
                // Note: gameRanks is a Record object, checking key existance
                if (!gameRanks[game.id]) {
                    dispatch(fetchRanks(game.id));
                }
            });
        }
    }, [dispatch, games]);

    const handleRankChange = async (gameId: string, rankId: string) => {
        if (!rankId) return;
        try {
            await dispatch(setUserRank({ gameId, rankId })).unwrap();
        } catch (error) {
            console.error('Failed to update rank', error);
            toast.error('Hiba történt a rang frissítésekor');
        }
    };

    if (!isAuthenticated || !user) {
        return (
            <div className="profile-page">
                <div className="empty-state">
                    <User size={48} className="empty-icon" />
                    <h3>Nem vagy bejelentkezve</h3>
                    <p>Jelentkezz be a profilod megtekintéséhez.</p>
                </div>
            </div>
        );
    }

    // Filter user's teams (mock - would need proper filtering from backend)
    const userTeams = teams.slice(0, 3);
    const userTournaments = tournaments.slice(0, 3);

    return (
        <div className="profile-page">
            <div className="profile-header card card-glow">
                <div className="profile-avatar-section">
                    <div className="profile-avatar">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.displayName || user.username} />
                        ) : (
                            <span>{(user.displayName || user.username).charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="profile-info">
                        <h1 className="profile-name">{user.displayName}</h1>
                        <p className="profile-username">@{user.username}</p>
                        <span className={`role-badge badge ${user.role === 'ADMIN' ? 'badge-error' :
                            user.role === 'MODERATOR' ? 'badge-warning' :
                                user.role === 'ORGANIZER' ? 'badge-primary' :
                                    'badge-success'
                            }`}>
                            {user.role}
                        </span>
                    </div>
                </div>

                <div className="profile-actions">
                    <Link to="/settings" className="btn btn-secondary">
                        <SettingsIcon size={18} />
                        Beállítások
                    </Link>
                    <button className="btn btn-primary">
                        <Edit size={18} />
                        Profil szerkesztése
                    </button>
                </div>
            </div>

            <div className="profile-stats">
                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{userTeams.length}</span>
                        <span className="stat-label">Csapat</span>
                    </div>
                </div>

                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <Trophy size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{userTournaments.length}</span>
                        <span className="stat-label">Verseny</span>
                    </div>
                </div>

                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <Award size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">0</span>
                        <span className="stat-label">Győzelem</span>
                    </div>
                </div>

                <div className="stat-card card card-glow">
                    <div className="stat-icon">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">1200</span>
                        <span className="stat-label">ELO</span>
                    </div>
                </div>
            </div>

            <div className="profile-content">

                {/* Skill Levels Section */}


                {/* Skill Levels Section */}
                <div className="profile-section">
                    <div className="section-header">
                        <h2 className="section-title">
                            <Shield size={20} />
                            Skill Szintek
                        </h2>
                    </div>

                    {games.length === 0 ? (
                        <div className="empty-section card">
                            <p>Még nincsenek játékok a rendszerben.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {games.map((game: Game) => {
                                const ranks = gameRanks[game.id] || [];
                                const userRank = userRanks.find((ur: UserRank) => ur.gameId === game.id);
                                const currentRankId = userRank?.rankId || '';

                                return (
                                    <div key={game.id} className="card p-4 flex items-center justify-between card-glow" style={{ background: 'var(--bg-secondary)' }}>
                                        <div className="flex items-center gap-3">
                                            {game.imageUrl ? (
                                                <img src={game.imageUrl} alt={game.name} className="w-10 h-10 object-cover rounded" />
                                            ) : (
                                                <div className="w-10 h-10 bg-black/30 rounded flex items-center justify-center">
                                                    {(game.name).charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-sm mb-0">{game.name}</h3>
                                                <div className="text-xs text-muted">
                                                    {userRank?.rank ? `Jelenlegi: ${userRank.rank.name} (${userRank.rank.value} P-ELO)` : 'Nincs rang kiválasztva'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            {ranks.length > 0 ? (
                                                <select
                                                    className="input input-sm"
                                                    style={{ width: '150px' }}
                                                    value={currentRankId}
                                                    onChange={(e) => handleRankChange(game.id, e.target.value)}
                                                >
                                                    <option value="">Válassz rangot...</option>
                                                    {ranks.map(rank => (
                                                        <option key={rank.id} value={rank.id}>
                                                            {rank.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-xs text-muted">A játékhoz nincsenek rangok</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="profile-section">
                    <div className="section-header">
                        <h2 className="section-title">
                            <Users size={20} />
                            Csapataim
                        </h2>
                        <Link to="/teams" className="section-link">Összes megtekintése</Link>
                    </div>

                    {userTeams.length === 0 ? (
                        <div className="empty-section card">
                            <p>Még nem vagy tagja egyetlen csapatnak sem.</p>
                            <Link to="/teams" className="btn btn-primary">
                                Csapatok böngészése
                            </Link>
                        </div>
                    ) : (
                        <div className="teams-grid">
                            {userTeams.map((team: Team) => (
                                <Link key={team.id} to={`/teams/${team.id}`} className="team-mini-card card card-glow">
                                    <div className="team-mini-avatar">
                                        {team.logoUrl ? (
                                            <img src={team.logoUrl} alt={team.name} />
                                        ) : (
                                            <span>{team.name.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="team-mini-info">
                                        <h3>{team.name}</h3>
                                        <p>{team.members?.length || 0} tagok</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="profile-section">
                    <div className="section-header">
                        <h2 className="section-title">
                            <Trophy size={20} />
                            Versenyeim
                        </h2>
                        <Link to="/tournaments" className="section-link">Összes megtekintése</Link>
                    </div>

                    {userTournaments.length === 0 ? (
                        <div className="empty-section card">
                            <p>Még nem vettel részt egyetlen versenyen sem.</p>
                            <Link to="/tournaments" className="btn btn-primary">
                                Versenyek böngészése
                            </Link>
                        </div>
                    ) : (
                        <div className="tournaments-list">
                            {userTournaments.map((tournament: Tournament) => (
                                <Link key={tournament.id} to={`/tournaments/${tournament.id}`} className="tournament-mini-card card card-glow">
                                    <div className="tournament-mini-header">
                                        <h3>{tournament.name}</h3>
                                        <span className={`badge ${tournament.status === 'REGISTRATION' ? 'badge-success' :
                                            tournament.status === 'IN_PROGRESS' ? 'badge-warning' :
                                                'badge-primary'
                                            }`}>
                                            {tournament.status === 'REGISTRATION' ? 'Regisztráció' :
                                                tournament.status === 'IN_PROGRESS' ? 'Folyamatban' :
                                                    'Befejezett'}
                                        </span>
                                    </div>
                                    <div className="tournament-mini-meta">
                                        <span>
                                            <Calendar size={14} />
                                            {new Date(tournament.startDate).toLocaleDateString('hu-HU')}
                                        </span>
                                        <span>{tournament.game?.name}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
