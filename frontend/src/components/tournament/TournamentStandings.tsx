import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Swords } from "lucide-react";
import type { Tournament, Match } from "../../types";

interface TournamentStandingsProps {
  tournament: Tournament;
  onMatchClick?: (match: Match) => void;
}

interface Standing {
  id: string; // Team ID or User ID
  name: string; // Team name or User Name
  avatarUrl?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
}

export function TournamentStandings({
  tournament,
  onMatchClick,
}: TournamentStandingsProps) {
  const [activeTab, setActiveTab] = useState<"standings" | "matches">(
    "standings"
  );

  // Calculate standings
  const standings = useMemo(() => {
    const stats: Record<string, Standing> = {};

    // Initialize from entries
    if (tournament.entries) {
      tournament.entries.forEach((entry) => {
        if (entry.team) {
          stats[entry.team.id] = {
            id: entry.team.id,
            name: entry.team.name,
            avatarUrl: entry.team.logoUrl,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
          };
        } else if (entry.user) {
          stats[entry.user.id] = {
            id: entry.user.id,
            name: entry.user.displayName || entry.user.username,
            avatarUrl: entry.user.avatarUrl,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
          };
        }
      });
    }

    // Process matches
    if (tournament.matches) {
      tournament.matches.forEach((match) => {
        if (match.status !== "COMPLETED") return;

        const isTeam = !!match.homeTeamId;
        const homeId = isTeam ? match.homeTeamId : match.homeUserId;
        const awayId = isTeam ? match.awayTeamId : match.awayUserId;
        const winnerId = isTeam ? match.winnerId : match.winnerUserId;

        if (!homeId || !awayId || !stats[homeId] || !stats[awayId]) return;

        stats[homeId].played++;
        stats[awayId].played++;

        if (winnerId) {
          if (winnerId === homeId) {
            stats[homeId].wins++;
            stats[homeId].points += 3;
            stats[awayId].losses++;
          } else {
            stats[awayId].wins++;
            stats[awayId].points += 3;
            stats[homeId].losses++;
          }
        } else {
          // Draw
          stats[homeId].draws++;
          stats[homeId].points += 1;
          stats[awayId].draws++;
          stats[awayId].points += 1;
        }
      });
    }

    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.played - b.played;
    });
  }, [tournament.matches, tournament.entries]);

  const getParticipantDisplay = (
    type: "home" | "away" = "home",
    match?: Match
  ) => {
    if (!match) return "Ismeretlen";

    if (match.homeTeamId) {
      // Team match
      const team = type === "home" ? match.homeTeam : match.awayTeam;
      return (
        <div className="flex items-center gap-2">
          {team?.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={team.name}
              className="h-6 w-6 rounded-sm object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-sm bg-primary/20" />
          )}
          <span
            className={
              type === "home" && match.winnerId === match.homeTeamId
                ? "font-bold text-primary"
                : type === "away" && match.winnerId === match.awayTeamId
                ? "font-bold text-primary"
                : ""
            }
          >
            {team?.name || "Ismeretlen"}
          </span>
        </div>
      );
    } else {
      // User match
      const user = type === "home" ? match.homeUser : match.awayUser;
      return (
        <div className="flex items-center gap-2">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-primary/20" />
          )}
          <span
            className={
              type === "home" && match.winnerUserId === match.homeUserId
                ? "font-bold text-primary"
                : type === "away" && match.winnerUserId === match.awayUserId
                ? "font-bold text-primary"
                : ""
            }
          >
            {user?.displayName || user?.username || "Ismeretlen"}
          </span>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Custom Tabs Implementation */}
      <div className="w-full">
        <div className="grid w-full grid-cols-2 bg-[#1a1b26] border border-white/5 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("standings")}
            className={`flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "standings"
                ? "bg-primary text-black shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="mr-2 h-4 w-4" />
            Tabella
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "matches"
                ? "bg-primary text-black shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Swords className="mr-2 h-4 w-4" />
            Mérkőzések
          </button>
        </div>

        <div className="mt-6">
          {activeTab === "standings" && (
            <Card className="border-white/5 bg-[#1a1b26] shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Bajnoki Tabella
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-white/5 hover:bg-transparent transition-colors data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-400 w-[50px]">
                          #
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-400">
                          Résztvevő
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-gray-400">
                          M
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-gray-400">
                          GY
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-gray-400">
                          D
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-gray-400">
                          V
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-bold text-primary">
                          P
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {standings.map((team, index) => (
                        <tr
                          key={team.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle font-medium text-white">
                            {index + 1}.
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-3">
                              {team.avatarUrl ? (
                                <img
                                  src={team.avatarUrl}
                                  alt={team.name}
                                  className="h-8 w-8 rounded bg-gray-800 object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">
                                  {team.name.charAt(0)}
                                </div>
                              )}
                              <span className="font-semibold text-white">
                                {team.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 align-middle text-center text-gray-300">
                            {team.played}
                          </td>
                          <td className="p-4 align-middle text-center text-green-400">
                            {team.wins}
                          </td>
                          <td className="p-4 align-middle text-center text-yellow-400">
                            {team.draws}
                          </td>
                          <td className="p-4 align-middle text-center text-red-400">
                            {team.losses}
                          </td>
                          <td className="p-4 align-middle text-center font-bold text-primary text-lg">
                            {team.points}
                          </td>
                        </tr>
                      ))}
                      {standings.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-4 align-middle h-24 text-center text-gray-400"
                          >
                            Nincsenek adatok
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "matches" && (
            <Card className="border-white/5 bg-[#1a1b26] shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" />
                  Mérkőzések
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tournament.matches && tournament.matches.length > 0 ? (
                    tournament.matches.map((match) => (
                      <div
                        key={match.id}
                        onClick={() => onMatchClick?.(match)}
                        className={`flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5 hover:border-primary/30 transition-all ${
                          onMatchClick ? "cursor-pointer hover:bg-white/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1 justify-end text-right">
                          <span
                            className={`text-white font-medium ${
                              match.winnerId === match.homeTeamId ||
                              match.winnerUserId === match.homeUserId
                                ? "text-green-400"
                                : ""
                            }`}
                          >
                            {getParticipantDisplay("home", match)}
                          </span>
                        </div>

                        <div className="flex flex-col items-center px-6 min-w-[100px]">
                          <div className="text-2xl font-bold text-white tracking-widest bg-black/40 px-3 py-1 rounded border border-white/10">
                            {match.homeScore ?? "-"} : {match.awayScore ?? "-"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                            {match.status === "COMPLETED"
                              ? "Vége"
                              : "Folyamatban"}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-1 justify-start">
                          <span
                            className={`text-white font-medium ${
                              match.winnerId === match.awayTeamId ||
                              match.winnerUserId === match.awayUserId
                                ? "text-green-400"
                                : ""
                            }`}
                          >
                            {getParticipantDisplay("away", match)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Még nincsenek generált mérkőzések.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
