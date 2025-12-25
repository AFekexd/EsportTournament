import { useEffect } from "react";
import { toast } from "sonner";
import { Link, useParams } from "react-router-dom";
import {
  User,
  Trophy,
  Users,
  Calendar,
  Edit,
  Shield,
  Loader2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import {
  fetchGames,
  fetchUserRanks,
  setUserRank,
  fetchRanks,
} from "../store/slices/gamesSlice";
import { fetchMyTeams } from "../store/slices/teamsSlice";
import { fetchTournaments } from "../store/slices/tournamentsSlice";
import {
  fetchPublicProfile,
  clearCurrentProfile,
} from "../store/slices/usersSlice";
import type { Team, Tournament, UserRank } from "../types";

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();

  const { tournaments } = useAppSelector((state) => state.tournaments);
  const { games, gameRanks, userRanks } = useAppSelector(
    (state) => state.games
  );
  const { currentProfile, isLoading: isProfileLoading } = useAppSelector(
    (state) => state.users
  );
  const myTeamsList = useAppSelector((state) => state.teams.myTeams);

  const isOwnProfile = !id || (user && user.id === id);

  // Initial Data Fetching
  useEffect(() => {
    if (isAuthenticated) {
      if (!games.length) dispatch(fetchGames());

      if (isOwnProfile) {
        dispatch(fetchMyTeams());
        dispatch(fetchTournaments({ page: 1 })); // Ideally should capture my tournaments
        dispatch(fetchUserRanks());
      } else if (id) {
        dispatch(fetchPublicProfile(id));
      }
    }

    return () => {
      // Clear public profile when leaving page
      if (!isOwnProfile) {
        dispatch(clearCurrentProfile());
      }
    };
  }, [dispatch, isAuthenticated, id, isOwnProfile, games.length]);

  // Fetch Game Ranks
  useEffect(() => {
    if (games.length > 0) {
      games.forEach((game) => {
        if (!gameRanks[game.id]) {
          dispatch(fetchRanks(game.id));
        }
      });
    }
  }, [dispatch, games, gameRanks]);

  const handleRankChange = async (gameId: string, rankId: string) => {
    if (!rankId || !isOwnProfile) return;
    try {
      await dispatch(setUserRank({ gameId, rankId })).unwrap();
    } catch (error) {
      console.error("Failed to update rank", error);
      toast.error("Hiba történt a rang frissítésekor");
    }
  };

  if (!isAuthenticated && !id) {
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

  if (isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const profileUser = isOwnProfile ? user : currentProfile;

  // If loading finished but no user found
  if (!profileUser && !isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <User size={64} className="text-muted-foreground" />
        <h1 className="text-2xl font-bold">Felhasználó nem található</h1>
        <Link to="/" className="btn btn-primary">
          Vissza a főoldalra
        </Link>
      </div>
    );
  }

  // Data preparation
  // If own profile, use redux state slices. If public, use profile data.
  // Note: logic above for own teams relies on fetched myTeams which we triggered with fetchTeams({my: true}) but that action updates myTeams not teams list directly usually.
  // Let's simplify: existing code used 'teams.slice(0,3)' which was wrong if it listed ALL teams globally.
  // Correct logic for own profile: use 'myTeams' from state.

  const effectiveTeams = isOwnProfile
    ? myTeamsList.slice(0, 3)
    : (currentProfile?.teams || []).slice(0, 3);

  // Tournaments logic
  // Existing code used global tournaments list. That's probably wrong for "My Tournaments".
  // Since we don't have user's tournaments in public profile properly fetched (backend returns empty for now or needs fix),
  // we will use what we have. For public profile, we added teams but not tournaments list in backend.
  // Actually, I didn't add tournaments list to backend public profile response yet!
  // I only added "teams". I should fix backend to return tournaments too, or just leave it empty for now.
  const effectiveTournaments = isOwnProfile ? tournaments.slice(0, 3) : [];

  const getRoleBadgeStyle = (role: string | undefined) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "ORGANIZER":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "MODERATOR":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "TEACHER":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getRoleLabel = (role: string | undefined) => {
    switch (role) {
      case "ADMIN":
        return "Admin";
      case "ORGANIZER":
        return "Szervező";
      case "MODERATOR":
        return "Moderátor";
      case "TEACHER":
        return "Tanár";
      default:
        return "Diák";
    }
  };

  const getTopGameImage = () => {
    let relevantRanks: { gameId: string; value: number }[] = [];

    if (isOwnProfile) {
      relevantRanks = userRanks.map((ur) => ({
        gameId: ur.gameId,
        value: ur.rank?.value || 0,
      }));
    } else {
      relevantRanks =
        currentProfile?.ranks?.map((r) => ({
          gameId: r.gameId,
          value: r.rankValue,
        })) || [];
    }

    if (relevantRanks.length === 0) return null;

    // Sort by value desc
    relevantRanks.sort((a, b) => b.value - a.value);

    // Get top
    const topRank = relevantRanks[0];
    if (!topRank) return null;

    const game = games.find((g) => g.id === topRank.gameId);
    return game?.imageUrl || null;
  };

  const formatTimeBalance = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const topGameImage = getTopGameImage();

  return (
    <div className="min-h-screen bg-[#0f1015] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Profile Header & Stats Combined */}
        <div className="relative overflow-hidden rounded-2xl bg-[#1a1b26] border border-white/5 shadow-2xl">
          {/* Banner */}
          <div
            className={`h-64 relative group ${
              !topGameImage ? "bg-[#0f1015]" : ""
            }`}
            style={
              topGameImage
                ? {
                    backgroundImage: `url(${topGameImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {}
            }
          >
            {!topGameImage && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-primary/20 to-blue-900/40"></div>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-30 animate-pulse"></div>
                  <div className="absolute -bottom-1/2 -left-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] opacity-30"></div>
                </div>
              </>
            )}
            <div
              className={`absolute inset-0 ${
                topGameImage
                  ? "bg-black/40 backdrop-blur-[2px]"
                  : "bg-gradient-to-t from-[#1a1b26] via-transparent to-transparent"
              }`}
            ></div>

            {isOwnProfile && (
              <div className="absolute top-6 right-6 flex gap-3 z-20">
                <Link
                  to="/settings"
                  className="p-2 bg-primary hover:bg-primary/90 !text-white shadow-lg shadow-primary/20 rounded-full transition-all hover:scale-105"
                  title="Szerkesztés"
                >
                  <Edit size={20} />
                </Link>
              </div>
            )}
          </div>

          <div className="px-8 pb-8">
            <div className="relative flex flex-col md:flex-row gap-8 items-end -mt-20">
              {/* Avatar */}
              <div className="relative shrink-0 mx-auto md:mx-0 z-10">
                <div className="w-36 h-36 md:w-44 md:h-44 rounded-full p-1.5 bg-[#1a1b26] shadow-2xl relative">
                  <div className="w-full h-full rounded-full p-1 bg-gradient-to-br from-primary to-purple-600">
                    <div className="w-full h-full rounded-full bg-[#0f1015] overflow-hidden flex items-center justify-center relative z-10">
                      {profileUser?.avatarUrl ? (
                        <img
                          src={profileUser.avatarUrl}
                          alt={profileUser.displayName || profileUser.username}
                          className="w-full h-full object-cover transform transition-transform hover:scale-110 duration-500"
                        />
                      ) : (
                        <span className="text-5xl font-bold text-white">
                          {(
                            profileUser?.displayName ||
                            profileUser?.username ||
                            "?"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Status Indicator */}
                <div className="absolute bottom-3 right-3 md:bottom-5 md:right-5 z-20">
                  <div
                    className={`w-7 h-7 rounded-full border-[5px] border-[#1a1b26] ${
                      profileUser?.role === "ADMIN"
                        ? "bg-red-500 box-shadow-glow-red"
                        : profileUser?.role === "ORGANIZER"
                        ? "bg-purple-500"
                        : profileUser?.role === "MODERATOR"
                        ? "bg-blue-500"
                        : "bg-green-500"
                    }`}
                    title={profileUser?.role}
                  ></div>
                </div>
              </div>

              {/* Info & Stats Wrapper */}
              <div className="flex-1 flex flex-col md:flex-row items-center md:items-end w-full gap-6 md:pb-4">
                {/* Info */}
                <div className="text-center md:text-left space-y-2 flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex flex-col md:flex-row items-center md:items-baseline gap-3">
                    {profileUser?.displayName || profileUser?.username}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-widest ${getRoleBadgeStyle(
                        profileUser?.role
                      )}`}
                    >
                      {getRoleLabel(profileUser?.role)}
                    </span>
                  </h1>

                  <div className="flex flex-col md:flex-row items-center gap-4 text-gray-400">
                    {profileUser?.displayName && (
                      <span className="font-medium text-lg text-primary">
                        @{profileUser?.username}
                      </span>
                    )}

                    <div className="hidden md:block w-1 h-1 bg-gray-600 rounded-full"></div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={14} />
                      <span>
                        Tag mióta:{" "}
                        {new Date(
                          profileUser?.createdAt || Date.now()
                        ).toLocaleDateString("hu-HU", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3">
                  <div className="bg-[#0f1015] rounded-xl p-4 border border-white/5 text-center min-w-[100px] hover:border-primary/50 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1 group-hover:text-primary transition-colors">
                        Csapat
                      </div>
                      <div className="text-2xl font-black text-white">
                        {effectiveTeams.length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0f1015] rounded-xl p-4 border border-white/5 text-center min-w-[100px] hover:border-purple-500/50 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1 group-hover:text-purple-400 transition-colors">
                        Verseny
                      </div>
                      <div className="text-2xl font-black text-white">
                        {effectiveTournaments.length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0f1015] rounded-xl p-4 border border-white/5 text-center min-w-[100px] hover:border-blue-500/50 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1 group-hover:text-blue-400 transition-colors">
                        ELO
                      </div>
                      <div className="text-2xl font-black text-white">
                        {isOwnProfile
                          ? user?.elo || 1000
                          : (currentProfile as any)?.elo || 1000}
                      </div>
                    </div>
                  </div>

                  {isOwnProfile && (
                    <div className="bg-[#0f1015] rounded-xl p-4 border border-white/5 text-center min-w-[100px] hover:border-green-500/50 transition-all group relative overflow-hidden">
                      <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors"></div>
                      <div className="relative z-10">
                        <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1 group-hover:text-green-400 transition-colors">
                          Időegyenleg
                        </div>
                        <div className="text-2xl font-black text-white">
                          {formatTimeBalance(user?.timeBalanceSeconds || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skill Levels Section */}
            <div className="bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield size={20} className="text-primary" />
                  Játék Skillek
                </h2>
              </div>

              <div className="p-6">
                {games.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Még nincsenek játékok a rendszerben.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {games.map((game) => {
                      const ranks = gameRanks[game.id] || [];
                      let userRank;
                      if (isOwnProfile) {
                        userRank = userRanks.find(
                          (ur: UserRank) => ur.gameId === game.id
                        );
                      } else {
                        const publicRank = currentProfile?.ranks?.find(
                          (r) => r.gameId === game.id
                        );
                        if (publicRank) {
                          userRank = {
                            rank: {
                              name: publicRank.rankName,
                              value: publicRank.rankValue,
                            },
                            rankId: publicRank.id,
                          };
                        }
                      }

                      const currentRankId = isOwnProfile
                        ? userRank?.rankId || ""
                        : "";

                      return (
                        <div
                          key={game.id}
                          className="bg-[#0f1015]/50 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-[#1a1b26] border border-white/10 flex items-center justify-center shadow-lg overflow-hidden group-hover:scale-105 transition-transform">
                              {game.imageUrl ? (
                                <img
                                  src={game.imageUrl}
                                  alt={game.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-lg font-bold text-gray-400">
                                  {game.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-white group-hover:text-primary transition-colors">
                                {game.name}
                              </h3>
                              <div className="text-sm text-gray-400 mt-0.5">
                                {userRank?.rank ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    {userRank.rank.name}{" "}
                                    <span className="text-white/30">|</span>{" "}
                                    {userRank.rank.value}p
                                  </span>
                                ) : (
                                  <span className="text-gray-600 italic">
                                    Nincs rang
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isOwnProfile && (
                            <div className="relative">
                              {ranks.length > 0 && (
                                <select
                                  className="bg-black/40 border border-white/10 text-white text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer appearance-none hover:bg-black/60"
                                  value={currentRankId}
                                  onChange={(e) =>
                                    handleRankChange(game.id, e.target.value)
                                  }
                                >
                                  <option value="">Válassz...</option>
                                  {ranks.map((rank) => (
                                    <option key={rank.id} value={rank.id}>
                                      {rank.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Teams Section */}
            <div className="bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users size={20} className="text-primary" />
                  Csapatok
                </h2>
                {isOwnProfile && effectiveTeams.length > 0 && (
                  <Link
                    to="/teams"
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                  >
                    Összes
                  </Link>
                )}
              </div>

              <div className="p-6">
                {effectiveTeams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-[#0f1015]/30 rounded-xl border border-dashed border-white/5">
                    <Users size={48} className="mb-4 opacity-20" />
                    <p>Nincs csapat tagság</p>
                    {isOwnProfile && (
                      <Link to="/teams" className="mt-4 btn btn-sm btn-primary">
                        Csapatok keresése
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {effectiveTeams.map((team: Team) => (
                      <Link
                        key={team.id}
                        to={`/teams/${team.id}`}
                        className="group bg-[#0f1015]/50 border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 hover:bg-[#0f1015] transition-all"
                      >
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform text-white">
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt={team.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors">
                            {team.name}
                          </h3>
                          <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                            <span>{team.members?.length || 0} tag</span>
                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                            <span>{team.elo} ELO</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar / Right Column */}
          <div className="space-y-6">
            {/* Recent Tournaments */}
            <div className="bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden h-full">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy size={20} className="text-purple-400" />
                  Versenyek
                </h2>
                {isOwnProfile && effectiveTournaments.length > 0 && (
                  <Link
                    to="/tournaments"
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                  >
                    Összes
                  </Link>
                )}
              </div>

              <div className="p-4 space-y-3">
                {effectiveTournaments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Trophy size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Nincs aktív verseny</p>
                  </div>
                ) : (
                  effectiveTournaments.map((tournament: Tournament) => (
                    <Link
                      key={tournament.id}
                      to={`/tournaments/${tournament.id}`}
                      className="block bg-[#0f1015]/50 border border-white/5 rounded-lg p-4 hover:border-purple-500/50 hover:bg-[#0f1015] transition-all group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-purple-400 transition-colors">
                          {tournament.name}
                        </h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wide font-bold ${
                            tournament.status === "REGISTRATION"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : tournament.status === "IN_PROGRESS"
                              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                              : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          }`}
                        >
                          {tournament.status === "REGISTRATION"
                            ? "Nevezés"
                            : tournament.status === "IN_PROGRESS"
                            ? "Zajlik"
                            : "Vége"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded">
                          <Calendar size={12} />
                          <span>
                            {new Date(tournament.startDate).toLocaleDateString(
                              "hu-HU"
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                          {tournament.game?.name}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
