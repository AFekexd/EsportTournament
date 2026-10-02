import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Medal, Users, Target, Crown } from "lucide-react";
import { API_URL } from "../config";

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
  const [activeTab, setActiveTab] = useState<"players" | "teams">("players");
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
      if (activeTab === "players") {
        const [playersRes, topRes] = await Promise.all([
          fetch(`${API_URL}/leaderboards/players?limit=50`),
          fetch(`${API_URL}/leaderboards/players/top`),
        ]);
        const [playersData, topData] = await Promise.all([playersRes.json(), topRes.json()]);
        setPlayers(playersData.data || []);
        setTopPlayers(topData.data || []);
      } else {
        const teamsRes = await fetch(`${API_URL}/leaderboards/teams?limit=50`);
        const teamsData = await teamsRes.json();
        setTeams(teamsData.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPodiumTheme = (rank: number) => {
    if (rank === 1) {
      return {
        badge: "1. HELY // ARANY",
        borderColor: "border-amber-500/60 hover:border-amber-500",
        badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        avatarBorder: "border-amber-500",
        icon: <Crown size={18} className="text-amber-400" />,
      };
    }
    if (rank === 2) {
      return {
        badge: "2. HELY // EZÜST",
        borderColor: "border-slate-400/60 hover:border-slate-300",
        badgeBg: "bg-slate-400/10 text-slate-300 border-slate-400/30",
        avatarBorder: "border-slate-400",
        icon: <Medal size={18} className="text-slate-300" />,
      };
    }
    if (rank === 3) {
      return {
        badge: "3. HELY // BRONZ",
        borderColor: "border-orange-500/60 hover:border-orange-400",
        badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/30",
        avatarBorder: "border-orange-500",
        icon: <Medal size={18} className="text-orange-400" />,
      };
    }
    return {
      badge: `${rank}. HELY`,
      borderColor: "border-border",
      badgeBg: "bg-secondary text-muted-foreground border-border",
      avatarBorder: "border-border",
      icon: null,
    };
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown size={15} className="text-amber-400" />;
    if (rank === 2) return <Medal size={15} className="text-slate-300" />;
    if (rank === 3) return <Medal size={15} className="text-orange-400" />;
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tactical Header */}
      <div className="mb-10 text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#121824] border border-border/80 rounded text-xs font-mono text-primary font-bold tracking-widest uppercase mb-3">
          <Trophy size={14} className="text-primary" />
          <span>// TELJESÍTMÉNYRANGSOR // GYŐZELMEK ÉS STATISZTIKA</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-foreground mb-3">
          Hivatalos Ranglisták
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          A Pollák EsportHub legkiemelkedőbb játékosai és csapatai a lejátszott mérkőzések és győzelmek alapján.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex p-1 bg-[#121824] rounded-lg border border-border/80 gap-1">
          <button
            className={`flex items-center gap-2 px-6 py-2 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "players"
                ? "bg-primary text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("players")}
          >
            <Users size={15} />
            Játékos Rangsor
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-2 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "teams"
                ? "bg-primary text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("teams")}
          >
            <Trophy size={15} />
            Csapat Rangsor
          </button>
        </div>
      </div>

      {/* Top 3 Podium */}
      {activeTab === "players" && topPlayers.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-2">
            <span className="font-mono text-xs font-bold tracking-widest uppercase text-muted-foreground">
              // KORÁBBI FORDULÓK LEGJOBBJAI // TOP 3
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topPlayers.map((player) => {
              const theme = getPodiumTheme(player.rank);
              return (
                <div
                  key={player.id}
                  className={`bg-[#121824] rounded-lg border ${theme.borderColor} p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl`}
                >
                  {/* Top Bar with Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase border ${theme.badgeBg}`}
                    >
                      {theme.icon}
                      {theme.badge}
                    </span>
                    <span className="font-mono text-xl font-extrabold text-foreground">
                      #{player.rank < 10 ? `0${player.rank}` : player.rank}
                    </span>
                  </div>

                  <Link
                    to={`/profile/${player.id}`}
                    className="flex flex-col items-center text-center group"
                  >
                    <div className="relative mb-3">
                      <div
                        className={`w-20 h-20 rounded border-2 ${theme.avatarBorder} bg-[#0B0F17] flex items-center justify-center overflow-hidden`}
                      >
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={player.displayName || player.username}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-display text-2xl font-bold text-foreground">
                            {(player.displayName || player.username)
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-display text-xl font-bold uppercase tracking-wide text-foreground mb-1 group-hover:text-primary transition-colors">
                      {player.displayName || player.username}
                    </h3>
                  </Link>

                  {/* Telemetry Stats */}
                  <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 bg-[#0B0F17]/60 p-2.5 rounded border border-border/40 text-center">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">Győzelmek</p>
                      <p className="font-mono text-xs font-bold text-foreground">
                        {player.matchesWon} / {player.matchesPlayed}
                      </p>
                    </div>
                    <div className="border-l border-border/50">
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">Winrate</p>
                      <p className="font-mono text-xs font-bold text-emerald-400">
                        {(player.winRate || 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-[#121824] rounded-lg border border-border/80 overflow-hidden shadow-md">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Telemetria betöltése...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0B0F17] border-b border-border/80">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Hely
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {activeTab === "players" ? "Játékos" : "Csapat"}
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Target size={14} />
                      Meccsek
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Győzelmek
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Győzelmi arány
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {activeTab === "players"
                  ? players.map((player) => (
                      <tr
                        key={player.id}
                        className="hover:bg-[#0B0F17]/50 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-foreground">
                              #{player.rank < 10 ? `0${player.rank}` : player.rank}
                            </span>
                            {getRankBadge(player.rank)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            to={`/profile/${player.id}`}
                            className="flex items-center gap-3 group"
                          >
                            <div className="w-8 h-8 rounded border border-border/80 bg-[#0B0F17] flex items-center justify-center text-foreground font-display font-bold shrink-0 overflow-hidden">
                              {player.avatarUrl ? (
                                <img
                                  src={player.avatarUrl}
                                  alt={player.displayName || player.username}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover shrink-0"
                                />
                              ) : (
                                <span>
                                  {(player.displayName || player.username)
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="font-display text-sm font-bold uppercase tracking-wide text-foreground group-hover:text-primary transition-colors">
                              {player.displayName || player.username}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                          {player.matchesPlayed}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                          {player.matchesWon}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 rounded font-mono text-xs font-semibold">
                            {(player.winRate || 0).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  : teams.map((team) => (
                      <tr
                        key={team.id}
                        className="hover:bg-[#0B0F17]/50 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-foreground">
                              #{team.rank < 10 ? `0${team.rank}` : team.rank}
                            </span>
                            {getRankBadge(team.rank)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded border border-border/80 bg-[#0B0F17] flex items-center justify-center text-foreground font-display font-bold shrink-0 overflow-hidden">
                              {team.logoUrl ? (
                                <img
                                  src={team.logoUrl}
                                  alt={team.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover shrink-0"
                                />
                              ) : (
                                <span>{team.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
                              {team.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                          {team.matchesPlayed}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                          {team.matchesWon}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 rounded font-mono text-xs font-semibold">
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
