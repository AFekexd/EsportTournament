import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, Trophy, ChevronRight, UserPlus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { useAuth } from '../hooks/useAuth';
import { fetchTeams, joinTeam } from '../store/slices/teamsSlice';
import type { Team, TeamMember } from '../types';
import './Teams.css';

function TeamCard({ team }: { team: Team }) {
    return (
        <Link to={`/teams/${team.id}`} className="team-card card card-glow">
            <div className="team-avatar">
                {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} />
                ) : (
                    <span>{team.name.charAt(0).toUpperCase()}</span>
                )}
            </div>

            <div className="team-info">
                <h3 className="team-name">{team.name}</h3>
                {team.description && (
                    <p className="team-description">{team.description}</p>
                )}
            </div>

            <div className="team-stats">
                <div className="stat">
                    <Users size={16} />
                    <span>{team.members?.length || 0} tag</span>
                </div>
                <div className="stat">
                    <Trophy size={16} />
                    <span>{team._count?.tournamentEntries || 0} verseny</span>
                </div>
                <div className="stat elo">
                    <span>{team.elo} ELO</span>
                </div>
            </div>

            <div className="team-members-preview">
                {team.members?.slice(0, 5).map((member: TeamMember) => (
                    <div key={member.id} className="member-avatar" title={member.user?.displayName || member.user?.username}>
                        {member.user?.avatarUrl ? (
                            <img src={member.user.avatarUrl} alt={member.user.displayName || member.user.username} />
                        ) : (
                            <span>{(member.user?.displayName || member.user?.username || '?').charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                ))}
                {team.members && team.members.length > 5 && (
                    <div className="member-avatar more">+{team.members.length - 5}</div>
                )}
            </div>

            <div className="team-action">
                <span>Megtekintés</span>
                <ChevronRight size={16} />
            </div>
        </Link>
    );
}

export function TeamsPage() {
    const dispatch = useAppDispatch();
    const { teams, isLoading, pagination } = useAppSelector((state) => state.teams);
    const { isAuthenticated } = useAuth();

    const [search, setSearch] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinError, setJoinError] = useState('');

    useEffect(() => {
        dispatch(fetchTeams({ page: 1, search: search || undefined }));
    }, [dispatch, search]);

    const handleJoin = async () => {
        if (!joinCode.trim()) return;

        try {
            await dispatch(joinTeam(joinCode)).unwrap();
            setShowJoinModal(false);
            setJoinCode('');
            setJoinError('');
        } catch (error: unknown) {
            const err = error as { message?: string };
            setJoinError(err.message || 'Hibás kód');
        }
    };

    return (
        <div className="teams-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Csapatok</h1>
                    <p className="page-subtitle">Böngészd a csapatokat vagy hozz létre sajátot</p>
                </div>

                {isAuthenticated && (
                    <div className="page-actions">
                        <button className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>
                            <UserPlus size={18} />
                            Csatlakozás kóddal
                        </button>
                        <Link to="/teams/create" className="btn btn-primary">
                            <Plus size={18} />
                            Új csapat
                        </Link>
                    </div>
                )}
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Csapat keresése..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="teams-grid">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="team-card-skeleton card">
                            <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
                            <div className="skeleton" style={{ height: 24, width: '60%', marginTop: 16 }} />
                            <div className="skeleton" style={{ height: 16, width: '80%', marginTop: 8 }} />
                        </div>
                    ))}
                </div>
            ) : teams.length === 0 ? (
                <div className="empty-state">
                    <Users size={48} className="empty-icon" />
                    <h3>Nincs találat</h3>
                    <p>Próbálj más keresési feltételeket vagy hozz létre új csapatot.</p>
                </div>
            ) : (
                <div className="teams-grid">
                    {teams.map((team: Team) => (
                        <TeamCard key={team.id} team={team} />
                    ))}
                </div>
            )}

            {pagination && pagination.pages > 1 && (
                <div className="pagination">
                    {[...Array(pagination.pages)].map((_, i) => (
                        <button
                            key={i}
                            className={`pagination-btn ${pagination.page === i + 1 ? 'active' : ''}`}
                            onClick={() => dispatch(fetchTeams({ page: i + 1, search: search || undefined }))}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}

            {/* Join Modal */}
            {showJoinModal && (
                <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Csatlakozás kóddal</h2>
                        <p className="modal-description">
                            Add meg a csapat meghívó kódját a csatlakozáshoz.
                        </p>
                        <input
                            type="text"
                            placeholder="Pl: ABC12345"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            className="input"
                            style={{ marginTop: 16 }}
                        />
                        {joinError && <p className="error-text">{joinError}</p>}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                                Mégse
                            </button>
                            <button className="btn btn-primary" onClick={handleJoin}>
                                Csatlakozás
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
