import { useEffect, useState } from 'react';
import { Trophy, Medal, TrendingUp, Users, Target, Crown } from 'lucide-react';
import { API_URL } from '../config';

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

    const getPodiumColors = (rank: number) => {
        if (rank === 1) return 'from-yellow-500 to-yellow-600';
        if (rank === 2) return 'from-gray-400 to-gray-500';
        if (rank === 3) return 'from-orange-600 to-orange-700';
        return 'from-gray-700 to-gray-800';
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) return <Crown size={16} className="text-yellow-500" />;
        if (rank === 2) return <Medal size={16} className="text-gray-400" />;
        if (rank === 3) return <Medal size={16} className="text-orange-600" />;
        return null;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Modern Header with Gradient */}
            <div className="mb-12 text-center relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-3xl rounded-full -z-10" />
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary-100 to-gray-400 bg-clip-text text-transparent mb-4">
                    Ranglisták
                </h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                    A legjobb játékosok és csapatok ELO alapján rangsorolva
                </p>
            </div>

            {/* Tabs */}
            <div className="mb-8 border-b border-white/10">
                <div className="flex gap-8 justify-center">
                    <button
                        className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium transition-colors relative ${activeTab === 'players'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                        onClick={() => setActiveTab('players')}
                    >
                        <Users size={18} />
                        Játékosok
                    </button>
                    <button
                        className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium transition-colors relative ${activeTab === 'teams'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                        onClick={() => setActiveTab('teams')}
                    >
                        <Trophy size={18} />
                        Csapatok
                    </button>
                </div>
            </div>

            {/* Top 3 Podium */}
            {activeTab === 'players' && topPlayers.length > 0 && (
                <div className="mb-12 bg-[#1a1b26] rounded-2xl border border-white/5 p-8 shadow-lg">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center flex items-center justify-center gap-2">
                        <Trophy className="text-yellow-500" size={28} />
                        Top 3 Játékosok
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {topPlayers.map((player) => (
                            <div
                                key={player.id}
                                className={`relative bg-gradient-to-br ${getPodiumColors(player.rank)} p-[2px] rounded-xl overflow-hidden`}
                            >
                                <div className="bg-[#0f1015] rounded-xl p-6 text-center">
                                    <div className="absolute top-4 right-4">
                                        {getRankBadge(player.rank)}
                                    </div>
                                    <div className="mb-4 flex justify-center">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                            {player.avatarUrl ? (
                                                <img
                                                    src={player.avatarUrl}
                                                    alt={player.displayName || player.username}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <span>{(player.displayName || player.username).charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {player.displayName || player.username}
                                    </h3>
                                    <div className="text-3xl font-bold text-primary mb-4">{player.elo} ELO</div>
                                    <div className="text-sm text-gray-400">
                                        {player.matchesWon}/{player.matchesPlayed} győzelem ({(player.winRate || 0).toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-[#1a1b26] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400">Betöltés...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0f1015] border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Helyezés</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                                        {activeTab === 'players' ? 'Játékos' : 'Csapat'}
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={16} />
                                            ELO
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <Target size={16} />
                                            Meccsek
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Győzelmek</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Győzelmi arány</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeTab === 'players'
                                    ? players.map((player) => (
                                        <tr
                                            key={player.id}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-white">{player.rank}</span>
                                                    {getRankBadge(player.rank)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white text-sm font-bold">
                                                        {player.avatarUrl ? (
                                                            <img
                                                                src={player.avatarUrl}
                                                                alt={player.displayName || player.username}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <span>{(player.displayName || player.username).charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-white">
                                                        {player.displayName || player.username}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-primary font-bold">{player.elo}</td>
                                            <td className="px-6 py-4 text-gray-300">{player.matchesPlayed}</td>
                                            <td className="px-6 py-4 text-gray-300">{player.matchesWon}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-medium">
                                                    {(player.winRate || 0).toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                    : teams.map((team) => (
                                        <tr
                                            key={team.id}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-white">{team.rank}</span>
                                                    {getRankBadge(team.rank)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                                        {team.logoUrl ? (
                                                            <img
                                                                src={team.logoUrl}
                                                                alt={team.name}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <span>{team.name.charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-white">{team.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-primary font-bold">{team.elo}</td>
                                            <td className="px-6 py-4 text-gray-300">{team.matchesPlayed}</td>
                                            <td className="px-6 py-4 text-gray-300">{team.matchesWon}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-medium">
                                                    {(team.winRate || 0).toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
