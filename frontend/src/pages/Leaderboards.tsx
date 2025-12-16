import { useEffect, useState } from 'react';
import { Trophy, Medal, TrendingUp, Users, Target } from 'lucide-react';
import { API_URL } from '../config';
import './Leaderboards.css';

interface LeaderboardPlayer {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    elo: number;
    rank: number;
    matchesPlayed: number;
    matchesWon: number;
    winRate: number;
}

interface LeaderboardTeam {
    id: string;
    name: string;
    logoUrl: string | null;
    elo: number;
    rank: number;
    matchesPlayed: number;
    matchesWon: number;
    winRate: number;
}

export function LeaderboardsPage() {
    const [activeTab, setActiveTab] = useState<'players' | 'teams'>('players');
    const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
    const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
    const [topPlayers, setTopPlayers] = useState<LeaderboardPlayer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboards();
    }, [activeTab]);

    const fetchLeaderboards = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'players') {
                const [playersRes, topRes] = await Promise.all([
                    fetch(`${API_URL}/leaderboards/players?limit=50`),
                    fetch(`${API_URL}/leaderboards/players/top`),
                ]);
                const playersData = await playersRes.json();
                const topData = await topRes.json();
                setPlayers(playersData.data || []);
                setTopPlayers(topData.data || []);
            } else {
                const teamsRes = await fetch(`${API_URL}/leaderboards/teams?limit=50`);
                const teamsData = await teamsRes.json();
                setTeams(teamsData.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboards:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getPodiumClass = (rank: number) => {
        if (rank === 1) return 'podium-gold';
        if (rank === 2) return 'podium-silver';
        if (rank === 3) return 'podium-bronze';
        return '';
    };

    return (
        <div className="leaderboards-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Ranglisták</h1>
                    <p className="page-subtitle">A legjobb játékosok és csapatok ELO alapján</p>
                </div>
            </div>

            <div className="leaderboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                    onClick={() => setActiveTab('players')}
                >
                    <Users size={18} />
                    Játékosok
                </button>
                <button
                    className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                    onClick={() => setActiveTab('teams')}
                >
                    <Trophy size={18} />
                    Csapatok
                </button>
            </div>

            {activeTab === 'players' && topPlayers.length > 0 && (
                <div className="podium-section card">
                    <h2 className="section-title">🏆 Top 3</h2>
                    <div className="podium">
                        {topPlayers.map((player) => (
                            <div key={player.id} className={`podium-item ${getPodiumClass(player.rank)}`}>
                                <div className="podium-rank">{player.rank}</div>
                                <div className="podium-avatar">
                                    {player.avatarUrl ? (
                                        <img src={player.avatarUrl} alt={player.displayName || player.username} />
                                    ) : (
                                        <span>{(player.displayName || player.username).charAt(0).toUpperCase()}</span>
                                    )}
                                    <Medal className="podium-medal" size={24} />
                                </div>
                                <h3 className="podium-name">{player.displayName || player.username}</h3>
                                <div className="podium-elo">{player.elo} ELO</div>
                                <div className="podium-stats">
                                    {player.matchesWon}/{player.matchesPlayed} győzelem
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="leaderboard-table card">
                {isLoading ? (
                    <div className="loading-container">
                        <div className="spinner-large" />
                        <p>Betöltés...</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Helyezés</th>
                                <th>{activeTab === 'players' ? 'Játékos' : 'Csapat'}</th>
                                <th>
                                    <TrendingUp size={16} /> ELO
                                </th>
                                <th>
                                    <Target size={16} /> Meccsek
                                </th>
                                <th>Győzelmek</th>
                                <th>Győzelmi arány</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeTab === 'players'
                                ? players.map((player) => (
                                    <tr key={player.id} className={getPodiumClass(player.rank)}>
                                        <td className="rank-cell">
                                            <span className="rank-number">{player.rank}</span>
                                        </td>
                                        <td className="player-cell">
                                            <div className="player-info">
                                                <div className="player-avatar">
                                                    {player.avatarUrl ? (
                                                        <img src={player.avatarUrl} alt={player.displayName || player.username} />
                                                    ) : (
                                                        <span>{(player.displayName || player.username).charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <span className="player-name">{player.displayName || player.username}</span>
                                            </div>
                                        </td>
                                        <td className="elo-cell">{player.elo}</td>
                                        <td>{player.matchesPlayed}</td>
                                        <td>{player.matchesWon}</td>
                                        <td className="winrate-cell">{player.winRate.toFixed(1)}%</td>
                                    </tr>
                                ))
                                : teams.map((team) => (
                                    <tr key={team.id} className={getPodiumClass(team.rank)}>
                                        <td className="rank-cell">
                                            <span className="rank-number">{team.rank}</span>
                                        </td>
                                        <td className="player-cell">
                                            <div className="player-info">
                                                <div className="player-avatar">
                                                    {team.logoUrl ? (
                                                        <img src={team.logoUrl} alt={team.name} />
                                                    ) : (
                                                        <span>{team.name.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <span className="player-name">{team.name}</span>
                                            </div>
                                        </td>
                                        <td className="elo-cell">{team.elo}</td>
                                        <td>{team.matchesPlayed}</td>
                                        <td>{team.matchesWon}</td>
                                        <td className="winrate-cell">{team.winRate.toFixed(1)}%</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
