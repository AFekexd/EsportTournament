import { useEffect, useState } from "react";
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
  GraduationCap,
  RefreshCw,
  FileText,
  X,
  Gamepad2,
  ChevronRight,
  Plus,
  Trash2,
  Star,
  Clock
} from "lucide-react";
import MatchHistory from "../components/profile/MatchHistory";
import MatchHistoryModal from "../components/profile/MatchHistoryModal";
import { fetchUserMatches } from "../store/slices/usersSlice";
import { RankSelector } from "../components/profile/RankSelector";
import { DiscordConnectModal } from "../components/common/DiscordConnectModal";
import { updateUser } from "../store/slices/authSlice";
import { apiFetch } from "../lib/api-client";
import { API_URL } from "../config";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import {
  fetchGames,
  fetchUserRanks,
  setUserRank,
  deleteUserRank,
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

  const { games, gameRanks, userRanks } = useAppSelector(
    (state) => state.games
  );
  const { currentProfile, userMatches, isLoading: isProfileLoading } = useAppSelector(
    (state) => state.users
  );
  const myTeamsList = useAppSelector((state) => state.teams.myTeams);
  const [syncLoading, setSyncLoading] = useState(false);
  const [localSteamId, setLocalSteamId] = useState("");
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState(false);
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  // Track games that are temporarily visible (user added them but hasn't selected a rank yet)
  // Persist in localStorage to survive page refresh
  const [visibleGameIds, setVisibleGameIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('profile_visible_games');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist visibleGameIds to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('profile_visible_games', JSON.stringify(visibleGameIds));
    } catch {
      // Ignore localStorage errors
    }
  }, [visibleGameIds]);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);

  // ESC kezelés az Avatar Lightbox-hoz
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAvatarOpen(false);
    };
    if (isAvatarOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isAvatarOpen]);

  useEffect(() => {
    if (user?.steamId) {
      setLocalSteamId(user.steamId);
    }
  }, [user?.steamId]);

  const isOwnProfile = !id || (user && user.id === id);

  // Initial Data Fetching
  useEffect(() => {
    if (isAuthenticated) {
      if (!games.length) dispatch(fetchGames());

      if (isOwnProfile) {
        dispatch(fetchMyTeams());
        dispatch(fetchTournaments({ page: 1 })); // Ideally should capture my tournaments
        dispatch(fetchUserRanks());
      }
    }

    // Fetch matches for own profile too if visiting /me or root
    if (isOwnProfile && user?.id) {
      dispatch(fetchUserMatches(user.id));
    }
    if (id && !isOwnProfile) {
      dispatch(fetchPublicProfile(id));
      dispatch(fetchUserMatches(id));
    }

    return () => {
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
    if (!isOwnProfile) return;
    try {
      if (!rankId) {
        // Remove rank
        await dispatch(deleteUserRank(gameId)).unwrap();

        // Remove from visible set if cleared
        setVisibleGameIds(prev => prev.filter(id => id !== gameId));

        toast.success("Rang törölve");
      } else {
        // Set rank
        await dispatch(setUserRank({ gameId, rankId })).unwrap();
        toast.success("Rang frissítve");
      }
    } catch (error) {
      console.error("Failed to update rank", error);
      toast.error("Hiba történt a rang frissítésekor");
    }
  };

  const toggleGameVisibility = (gameId: string) => {
    setVisibleGameIds(prev => prev.includes(gameId) ? prev : [...prev, gameId]);
  }

  // Determine which games to display
  // Show games that:
  // 1. Have a userRank (isOwnProfile ? userRanks : currentProfile?.ranks)
  // 2. OR are in visibleGameIds (only relevant for own profile)
  const displayedGames = games.filter(game => {
    if (isOwnProfile) {
      const hasRank = userRanks.some(ur => ur.gameId === game.id);
      const isVisible = visibleGameIds.includes(game.id);
      const isFavorite = user?.favoriteGameId === game.id;
      return hasRank || isVisible || isFavorite;
    } else {
      // Public profile: only show ranked games
      // Note: currentProfile.ranks structure is slightly different in filtered games?
      // publicProfile returns ranks array
      return currentProfile?.ranks?.some(r => r.gameId === game.id);
    }
  });

  const handleSteamSync = async () => {
    if (!localSteamId) return;
    setSyncLoading(true);
    try {
      // First save the Steam ID if it changed
      if (localSteamId !== user?.steamId) {
        await apiFetch(`${API_URL}/users/${user?.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steamId: localSteamId }),
        });
        dispatch(updateUser({ ...user!, steamId: localSteamId }));
      }

      const response = await apiFetch(`${API_URL}/steam/sync`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`Sikeres szinkronizálás! ${data.count} tökéletes játék.`);
        dispatch(
          updateUser({
            ...user!,
            steamId: localSteamId,
            perfectGamesCount: data.count,
            steamAvatar: data.steamAvatar,
            steamUrl: data.steamUrl,
            steamLevel: data.steamLevel,
            steamPersonaname: data.steamPersonaname,
            steamCreatedAt: data.steamCreatedAt,
          })
        );
      } else {
        toast.error(data.message || "Hiba a szinkronizáláskor");
      }
    } catch (e) {
      console.error(e);
      toast.error("Hiba történt");
    } finally {
      setSyncLoading(false);
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
  // We derive tournaments from user matches to ensure we show what they actually participated in
  const derivedTournaments =
    userMatches?.reduce((acc: any[], match) => {
      if (!acc.find((t) => t.id === match.tournament.id)) {
        acc.push(match.tournament);
      }
      return acc;
    }, []) || [];

  const effectiveTournaments = derivedTournaments.slice(0, 3);

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
    // 1. Check favorite game - use favoriteGameId to find game from games array
    // This is more reliable than relying on favoriteGame object which may not be populated
    if (isOwnProfile && user?.favoriteGameId) {
      const favoriteGame = games.find(g => g.id === user.favoriteGameId);
      if (favoriteGame?.imageUrl) {
        return favoriteGame.imageUrl;
      }
    }
    if (!isOwnProfile && (currentProfile as any)?.favoriteGameId) {
      const favoriteGame = games.find(g => g.id === (currentProfile as any).favoriteGameId);
      if (favoriteGame?.imageUrl) {
        return favoriteGame.imageUrl;
      }
    }

    // 2. Fallback to ranks
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
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    return `${isNegative ? "-" : ""}${hours}h ${minutes}m`;
  };

  const topGameImage = getTopGameImage();

  return (
    <div className="min-h-screen bg-[#0f1015] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Profile Header & Stats Combined */}
        <div className="relative overflow-hidden rounded-2xl bg-[#1a1b26] border border-white/5 shadow-2xl">
          {/* Banner */}
          <div
            className={`h-72 md:h-80 relative group ${!topGameImage ? "bg-[#0f1015]" : ""}`}
          >
            {/* Background Image */}
            {topGameImage && (
              <img
                src={topGameImage}
                alt="Profile Banner"
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-out will-change-transform "
              />
            )}

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

            {/* Overlay */}
            <div
              className={`absolute inset-0 ${topGameImage
                ? "bg-gradient-to-t from-[#1a1b26] via-black/30 to-black/10"
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
                <div
                  className="w-36 h-36 md:w-44 md:h-44 rounded-full p-1.5 bg-[#1a1b26] shadow-2xl relative cursor-pointer group/avatar"
                  onClick={() => setIsAvatarOpen(true)}
                >
                  <div className="w-full h-full rounded-full p-1 bg-gradient-to-br from-primary to-purple-600 group-hover/avatar:scale-[1.02] transition-transform">
                    <div className="w-full h-full rounded-full bg-[#0f1015] overflow-hidden flex items-center justify-center relative z-10">
                      {profileUser?.avatarUrl ? (
                        <img
                          src={profileUser.avatarUrl}
                          alt={profileUser.displayName || profileUser.username}
                          className="w-full h-full object-cover transform transition-transform group-hover/avatar:scale-110 duration-500"
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

                  {/* Zoom hint overlay */}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity z-20 pointer-events-none">
                    <span className="text-white text-xs font-bold uppercase tracking-widest">Nagyítás</span>
                  </div>
                </div>
                {/* Status Indicator */}
                <div className="absolute bottom-3 right-3 md:bottom-5 md:right-5 z-20">
                  <div
                    className={`w-8 h-8 rounded-full border-[4px] border-[#1a1b26] flex items-center justify-center ${profileUser?.role === "ADMIN"
                      ? "bg-red-500 text-white"
                      : profileUser?.role === "ORGANIZER"
                        ? "bg-purple-500 text-white"
                        : profileUser?.role === "MODERATOR"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-600 text-gray-200"
                      }`}
                    title={getRoleLabel(profileUser?.role)}
                  >
                    {profileUser?.role === "ADMIN" ? (
                      <Shield size={14} className="fill-current" />
                    ) : profileUser?.role === "ORGANIZER" ? (
                      <Trophy size={14} className="fill-current" />
                    ) : profileUser?.role === "MODERATOR" ? (
                      <Shield size={14} />
                    ) : (
                      <GraduationCap size={14} />
                    )}
                  </div>
                </div>
              </div>

              {/* Info & Stats Wrapper */}
              <div className="flex-1 flex flex-col items-center md:items-start w-full gap-4">
                {/* Info */}
                <div className="text-center md:text-left space-y-2 w-full">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-3">
                    {profileUser?.displayName || profileUser?.username}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-widest ${getRoleBadgeStyle(
                        profileUser?.role
                      )}`}
                    >
                      {getRoleLabel(profileUser?.role)}
                    </span>
                  </h1>

                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-4 text-gray-400 text-sm">
                    {profileUser?.displayName && (
                      <span className="font-medium text-primary">
                        {profileUser?.username?.includes('@') ? profileUser?.username : `@${profileUser?.username}`}
                      </span>
                    )}

                    <div className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></div>

                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span className="whitespace-nowrap">
                        {new Date(
                          profileUser?.createdAt || Date.now()
                        ).toLocaleDateString("hu-HU", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {isOwnProfile && user?.omId && (
                      <>
                        <div className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <FileText size={14} />
                          <span className="whitespace-nowrap">
                            OM: <span className="text-white font-mono">{user.omId}</span>
                          </span>
                        </div>
                      </>
                    )}

                    <div className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></div>
                    <div className="flex items-center gap-2">
                      {/* Generic Discord/Gamepad Icon acting as Discord indicator */}
                      <Gamepad2 size={14} className={profileUser?.discordId ? "text-[#5865F2]" : "text-gray-500"} />
                      <span className={`whitespace-nowrap ${profileUser?.discordId ? "text-[#5865F2] font-medium" : "text-gray-500"}`}>
                        {profileUser?.discordId ? (
                          "Discord: Összekötve"
                        ) : (
                          isOwnProfile ? (
                            <button
                              onClick={() => setIsDiscordModalOpen(true)}
                              className="hover:text-[#5865F2] hover:underline transition-colors"
                            >
                              Discord: Csatlakozás
                            </button>
                          ) : (
                            "Discord: Nincs összekötve"
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                  <div className="bg-[#0f1015] rounded-xl p-3 sm:p-4 border border-white/5 text-center hover:border-primary/50 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1 group-hover:text-primary transition-colors">
                        Csapat
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white">
                        {effectiveTeams.length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0f1015] rounded-xl p-3 sm:p-4 border border-white/5 text-center hover:border-purple-500/50 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1 group-hover:text-purple-400 transition-colors">
                        Verseny
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white">
                        {effectiveTournaments.length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0f1015] rounded-xl p-3 sm:p-4 border border-white/5 text-center hover:border-blue-500/50 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1 group-hover:text-blue-400 transition-colors">
                        ELO
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white">
                        {isOwnProfile
                          ? user?.elo || 1000
                          : (currentProfile as any)?.elo || 1000}
                      </div>
                    </div>
                  </div>

                  {isOwnProfile && (
                    <div className="bg-[#0f1015] rounded-xl p-3 sm:p-4 border border-white/5 text-center hover:border-green-500/50 transition-all group relative overflow-hidden">
                      <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors"></div>
                      <div className="relative z-10">
                        <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1 group-hover:text-green-400 transition-colors">
                          Időegyenleg
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-white">
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

        {/* Match History Section */}
        <div className="bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden mb-6">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Gamepad2 size={20} className="text-primary" />
              Mérkőzés Előzmények
            </h2>
            {userMatches && userMatches.length > 5 && (
              <button
                onClick={() => setIsMatchHistoryOpen(true)}
                className="text-xs font-bold text-primary hover:text-white transition-colors flex items-center gap-1 uppercase tracking-wider"
              >
                Összes
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="p-6">
            <MatchHistory
              matches={(userMatches || []).slice(0, 5)}
              currentUserId={isOwnProfile ? user?.id || '' : (profileUser as any)?.id || ''}
              isAdmin={user?.role === 'ADMIN'}
            />
          </div>
        </div>

        {/* Match History Modal */}
        <MatchHistoryModal
          isOpen={isMatchHistoryOpen}
          onClose={() => setIsMatchHistoryOpen(false)}
          matches={userMatches || []}
          currentUserId={isOwnProfile ? user?.id || '' : (profileUser as any)?.id || ''}
          isAdmin={user?.role === 'ADMIN'}
        />

        <DiscordConnectModal
          isOpen={isDiscordModalOpen}
          onClose={() => setIsDiscordModalOpen(false)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skill Levels Section */}
            <div className="bg-[#1a1b26] rounded-xl border border-white/5 overflow-visible">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield size={20} className="text-primary" />
                  Játék Skillek
                </h2>
                {isOwnProfile && (
                  <button
                    onClick={() => setIsAddGameModalOpen(true)}
                    className="text-xs font-bold text-primary hover:text-white transition-colors flex items-center gap-1 uppercase tracking-wider"
                  >
                    <Plus size={14} /> Játék hozzáadása
                  </button>
                )}
              </div>

              <div className="p-6">
                {games.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Még nincsenek játékok a rendszerben.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedGames.map((game) => {
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
                          className="bg-[#0f1015]/50 border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            {/* Left Side: Game Info */}
                            <div className="w-12 h-12 rounded-lg bg-[#1a1b26] border border-white/10 flex items-center justify-center shadow-lg overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
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
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-white group-hover:text-primary transition-colors truncate">
                                {game.name}
                              </h3>
                              <div className="text-sm text-gray-400 mt-0.5">
                                {userRank?.rank ? (
                                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
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

                          {/* Actions Row - Separate row below game info */}
                          {/* Actions Row - Separate row below game info */}
                          {isOwnProfile && (
                            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                              {/* Favorite Toggle - Always visible */}
                              <button
                                onClick={async () => {
                                  const isFavorite = user?.favoriteGameId === game.id;
                                  try {
                                    const newFavoriteId = isFavorite ? null : game.id;

                                    // Optimistic update
                                    dispatch(updateUser({ ...user!, favoriteGameId: newFavoriteId, favoriteGame: newFavoriteId ? { id: game.id, imageUrl: game.imageUrl || '' } : undefined }));

                                    await apiFetch(`${API_URL}/users/${user?.id}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ favoriteGameId: newFavoriteId }),
                                    });
                                    toast.success(isFavorite ? "Kedvenc játék eltávolítva" : "Kedvenc játék beállítva");
                                  } catch (e) {
                                    console.error(e);
                                    toast.error("Hiba történt");
                                  }
                                }}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all shrink-0 ${user?.favoriteGameId === game.id
                                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                  : "bg-[#1a1b26] text-gray-400 border-white/10 hover:text-yellow-500 hover:border-yellow-500/50"
                                  }`}
                                title={user?.favoriteGameId === game.id ? "Kedvenc játék eltávolítása" : "Beállítás kedvencként"}
                              >
                                <Star size={18} fill={user?.favoriteGameId === game.id ? "currentColor" : "none"} />
                              </button>

                              {ranks.length > 0 ? (
                                <>
                                  <div className="shrink-0">
                                    <RankSelector
                                      gameId={game.id}
                                      currentRankId={currentRankId}
                                      ranks={ranks}
                                      onSelect={(gId, rId) => handleRankChange(gId, rId)}
                                    />
                                  </div>

                                  <button
                                    onClick={() => handleRankChange(game.id, "")}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] shrink-0"
                                    title="Játék eltávolítása"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    // Just remove from visible list if no ranks
                                    setVisibleGameIds(prev => prev.filter(id => id !== game.id));
                                    toast.success("Játék eltávolítva a nézetből");
                                  }}
                                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] shrink-0 ml-auto"
                                  title="Játék eltávolítása"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {displayedGames.length === 0 && (
                      <div className="col-span-1 md:col-span-2 text-center py-8 border-2 border-dashed border-white/5 rounded-xl">
                        <p className="text-gray-500">Nincs beállított rang egy játéknál sem.</p>
                        {isOwnProfile && (
                          <button
                            onClick={() => setIsAddGameModalOpen(true)}
                            className="mt-2 text-primary hover:underline font-medium"
                          >
                            Játék hozzáadása
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Add Game Modal */}
            {isAddGameModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-[#1a1b26] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Játék hozzáadása</h2>
                    <button
                      onClick={() => setIsAddGameModalOpen(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                      {games.filter(g => !userRanks.find(ur => ur.gameId === g.id)).length === 0 ? (
                        <p className="text-center text-gray-500 py-4">Már minden játékot hozzáadtál.</p>
                      ) : (
                        games.filter(g => !userRanks.find(ur => ur.gameId === g.id)).map(game => (
                          <button
                            key={game.id}
                            onClick={() => {
                              toggleGameVisibility(game.id);
                              setIsAddGameModalOpen(false);
                            }}
                            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group text-left"
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#0f1015] flex items-center justify-center overflow-hidden border border-white/5">
                              {game.imageUrl ? (
                                <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-gray-500">{game.name.charAt(0)}</span>
                              )}
                            </div>
                            <span className="font-medium text-white group-hover:text-primary transition-colors">{game.name}</span>
                            <Plus size={16} className="ml-auto text-gray-500 group-hover:text-primary" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
            {/* Steam Integration Card - Redesigned */}
            <div className="bg-[#171a21] rounded-xl border border-[#1b2838] overflow-hidden shadow-2xl relative group">
              {/* Background decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#66c0f4] rounded-full filter blur-[100px] opacity-[0.05] group-hover:opacity-[0.1] transition-opacity"></div>

              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#171a21] relative z-10">
                <h2 className="text-xl font-bold text-[#c7d5e0] flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center  rounded-lg shadow-inner">
                    <img src="/steam.png" className="w-full h-full object-cover " />
                  </div>
                  Steam Profil
                </h2>
                {isOwnProfile && (
                  <button
                    onClick={handleSteamSync}
                    disabled={syncLoading || !user?.steamId}
                    className="p-2 bg-[#2a475e] hover:bg-[#66c0f4] text-white rounded-lg transition-all shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Adatok Szinkronizálása"
                  >
                    <RefreshCw
                      size={18}
                      className={syncLoading ? "animate-spin" : ""}
                    />
                  </button>
                )}
              </div>

              <div className="p-6 relative z-10">
                {(
                  isOwnProfile ? user?.steamId : (profileUser as any)?.steamId
                ) ? (
                  <div className="space-y-6">
                    {/* Header with Avatar and Basic Info */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-lg p-1 bg-gradient-to-br from-[#66c0f4] to-[#1b2838] shadow-2xl">
                          <img
                            src={
                              isOwnProfile
                                ? user?.steamAvatar ||
                                "https://avatars.akamai.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg"
                                : (profileUser as any)?.steamAvatar ||
                                "https://avatars.akamai.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg"
                            }
                            alt="Steam Avatar"
                            className="w-full h-full rounded bg-black object-cover"
                          />
                        </div>
                        {/* Level Badge */}
                        <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full border-4 border-[#171a21] bg-[#1b2838] flex items-center justify-center text-white font-bold text-sm shadow-xl z-20">
                          {isOwnProfile
                            ? user?.steamLevel || "0"
                            : (profileUser as any)?.steamLevel || "0"}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-white tracking-tight">
                          {isOwnProfile
                            ? user?.steamPersonaname || user?.username
                            : (profileUser as any)?.steamPersonaname ||
                            (profileUser as any)?.username}
                        </div>
                        <a
                          href={
                            isOwnProfile
                              ? user?.steamUrl || "#"
                              : (profileUser as any)?.steamUrl || "#"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#66c0f4] text-sm hover:underline flex items-center justify-center sm:justify-start gap-1"
                        >
                          Steam Profil Megtekintése
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </a>
                        <div className="text-xs text-gray-500 font-mono bg-[#0f1015] px-2 py-1 rounded inline-block">
                          ID:{" "}
                          {isOwnProfile
                            ? user?.steamId
                            : (profileUser as any)?.steamId}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                      {/* Perfect Games Stat */}
                      <div className="bg-gradient-to-br from-[#1b2838] to-[#171a21] p-4 rounded-xl border border-white/5 relative overflow-hidden group/stat">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/stat:opacity-20 transition-opacity">
                          <Trophy size={40} />
                        </div>
                        <div className="text-[#66c0f4] text-[10px] font-bold uppercase tracking-widest mb-1">
                          Tökéletes
                        </div>
                        <div className="text-2xl font-black text-white flex items-center gap-2">
                          {isOwnProfile
                            ? user?.perfectGamesCount || 0
                            : (profileUser as any)?.perfectGamesCount || 0}
                          {(() => {
                            const syncStatus = isOwnProfile
                              ? (user as any)?.steamSyncStatus
                              : (profileUser as any)?.steamSyncStatus;
                            if (syncStatus === 'syncing') {
                              return <Loader2 size={16} className="animate-spin text-[#66c0f4]" />;
                            }
                            return null;
                          })()}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {(() => {
                            const syncStatus = isOwnProfile
                              ? (user as any)?.steamSyncStatus
                              : (profileUser as any)?.steamSyncStatus;
                            if (syncStatus === 'syncing') {
                              return <span className="text-[#66c0f4]">Számolás...</span>;
                            }
                            return '100% Achievement';
                          })()}
                        </div>
                      </div>

                      {/* Total Games Stat */}
                      <div className="bg-gradient-to-br from-[#1b2838] to-[#171a21] p-4 rounded-xl border border-white/5 relative overflow-hidden group/stat">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/stat:opacity-20 transition-opacity">
                          <Gamepad2 size={40} />
                        </div>
                        <div className="text-[#66c0f4] text-[10px] font-bold uppercase tracking-widest mb-1">
                          Összes Játék
                        </div>
                        <div className="text-2xl font-black text-white">
                          {isOwnProfile
                            ? (user as any)?.steamTotalGames || "-"
                            : (profileUser as any)?.steamTotalGames || "-"}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          A könyvtárban
                        </div>
                      </div>

                      {/* Total Playtime Stat */}
                      <div className="bg-gradient-to-br from-[#1b2838] to-[#171a21] p-4 rounded-xl border border-white/5 relative overflow-hidden group/stat">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/stat:opacity-20 transition-opacity">
                          <Clock size={40} />
                        </div>
                        <div className="text-[#66c0f4] text-[10px] font-bold uppercase tracking-widest mb-1">
                          Játékidő
                        </div>
                        <div className="text-2xl font-black text-white">
                          {(() => {
                            const minutes = isOwnProfile
                              ? (user as any)?.steamTotalPlaytime
                              : (profileUser as any)?.steamTotalPlaytime;
                            if (!minutes) return "-";
                            const hours = Math.floor(minutes / 60);
                            if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k`;
                            return hours;
                          })()}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          Óra összesen
                        </div>
                      </div>

                      {/* Account Age Stat */}
                      <div className="bg-gradient-to-br from-[#1b2838] to-[#171a21] p-4 rounded-xl border border-white/5 relative overflow-hidden group/stat">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/stat:opacity-20 transition-opacity">
                          <Calendar size={40} />
                        </div>
                        <div className="text-[#66c0f4] text-[10px] font-bold uppercase tracking-widest mb-1">
                          Fiók Kora
                        </div>
                        <div className="text-2xl font-black text-white">
                          {(() => {
                            const created = isOwnProfile
                              ? user?.steamCreatedAt
                              : (profileUser as any)?.steamCreatedAt;
                            if (!created) return "-";
                            const years = Math.floor((Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24 * 365));
                            return `${years}`;
                          })()}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {isOwnProfile && user?.steamCreatedAt
                            ? `${new Date(user.steamCreatedAt).getFullYear()} óta`
                            : "Év"}
                        </div>
                      </div>
                    </div>

                    {/* Recently Played Games */}
                    {(() => {
                      const recentGames = isOwnProfile
                        ? (user as any)?.steamRecentGames
                        : (profileUser as any)?.steamRecentGames;
                      if (!recentGames || recentGames.length === 0) return null;
                      return (
                        <div className="mt-6">
                          <div className="text-[#66c0f4] text-xs font-bold uppercase tracking-widest mb-3">
                            Legutóbb Játszott
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {recentGames.slice(0, 5).map((game: any) => (
                              <a
                                key={game.appid}
                                href={`https://store.steampowered.com/app/${game.appid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/game flex items-center gap-2 bg-[#1b2838] hover:bg-[#2a475e] px-3 py-2 rounded-lg border border-white/5 transition-all"
                                title={`${game.name} - ${Math.floor(game.playtime2weeks / 60)}h az elmúlt 2 hétben`}
                              >
                                <img
                                  src={game.iconUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                                  alt={game.name}
                                  className="w-8 h-8 rounded object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`;
                                  }}
                                />
                                <div className="max-w-[120px]">
                                  <div className="text-white text-xs font-medium truncate group-hover/game:text-[#66c0f4] transition-colors">
                                    {game.name}
                                  </div>
                                  <div className="text-gray-500 text-[10px]">
                                    {Math.floor(game.playtime2weeks / 60)}h /2hét
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Most Played Games */}
                    {(() => {
                      const topGames = isOwnProfile
                        ? (user as any)?.steamTopGames
                        : (profileUser as any)?.steamTopGames;
                      if (!topGames || topGames.length === 0) return null;
                      return (
                        <div className="mt-6">
                          <div className="text-[#66c0f4] text-xs font-bold uppercase tracking-widest mb-3">
                            Legtöbbet Játszott
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {topGames.slice(0, 5).map((game: any, idx: number) => (
                              <a
                                key={game.appid}
                                href={`https://store.steampowered.com/app/${game.appid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/game flex items-center gap-2 bg-[#1b2838] hover:bg-[#2a475e] px-3 py-2 rounded-lg border border-white/5 transition-all relative"
                                title={`${game.name} - ${game.playtimeHours} óra összesen`}
                              >
                                {idx === 0 && (
                                  <div className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black shadow-lg">
                                    👑
                                  </div>
                                )}
                                <img
                                  src={game.iconUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                                  alt={game.name}
                                  className="w-8 h-8 rounded object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`;
                                  }}
                                />
                                <div className="max-w-[120px]">
                                  <div className="text-white text-xs font-medium truncate group-hover/game:text-[#66c0f4] transition-colors">
                                    {game.name}
                                  </div>
                                  <div className="text-gray-500 text-[10px]">
                                    {game.playtimeHours}h összesen
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-[#1b2838] rounded-full flex items-center justify-center mx-auto mb-4 text-[#66c0f4] shadow-lg animate-pulse">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-8 h-8"
                      >
                        <path d="M11.979 0C5.362 0 0 5.383 0 11.971c0 3.256 1.3 6.22 3.42 8.353l3.65-5.32c-.522-.728-.84-1.61-.84-2.583 0-2.482 1.992-4.482 4.473-4.482 2.474 0 4.474 2.008 4.474 4.482 0 2.482-2.008 4.49-4.474 4.49-.66 0-1.282-.136-1.848-.375L5.753 21.61c1.864 1.488 4.212 2.39 6.758 2.39 6.632 0 12-5.375 12-12.029C23.987 5.375 18.611 0 11.979 0zM8.336 12.42c0-1.12.92-2.032 2.04-2.032 1.128 0 2.04.912 2.04 2.032 0 1.12-.912 2.04-2.04 2.04-1.12 0-2.04-.92-2.04-2.04zm6.04-3.64c0 .6.471 1.087 1.054 1.087.6 0 1.063-.487 1.063-1.087 0-.608-.471-1.095-1.063-1.095-.575 0-1.054.487-1.054 1.095z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">
                      Még nincs összekapcsolva
                    </h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                      {isOwnProfile
                        ? "Kapcsold össze Steam fiókodat, hogy megjelenjenek a statisztikáid és jelvényeid."
                        : "Ez a felhasználó még nem aktiválta a Steam integrációt."}
                    </p>

                    {isOwnProfile && (
                      <div className="flex flex-col gap-3">
                        <input
                          type="text"
                          value={localSteamId}
                          onChange={(e) => setLocalSteamId(e.target.value)}
                          placeholder="Steam ID64 beillesztése..."
                          className="bg-[#0f1015] border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#66c0f4] transition-colors w-full text-center"
                        />
                        <button
                          onClick={handleSteamSync}
                          disabled={!localSteamId || syncLoading}
                          className="w-full py-3 bg-gradient-to-r from-[#2a475e] to-[#66c0f4] hover:from-[#1b2838] hover:to-[#2a475e] text-white rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {syncLoading ? (
                            <>
                              <RefreshCw size={18} className="animate-spin" />{" "}
                              Szinkronizálás...
                            </>
                          ) : (
                            <>
                              <span className="uppercase tracking-wide text-xs">
                                Fiók Csatolása
                              </span>
                            </>
                          )}
                        </button>
                        <a
                          href="https://steamid.io/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#66c0f4] text-xs opacity-60 hover:opacity-100 hover:underline"
                        >
                          Mi az a Steam ID64?
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
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
                          className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wide font-bold ${tournament.status === "REGISTRATION"
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

          {/* Match History Section */}

        </div>
      </div>
      {/* Avatar Lightbox */}
      {isAvatarOpen && profileUser?.avatarUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setIsAvatarOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:scale-110 hover:rotate-90 duration-300 z-10"
            onClick={() => setIsAvatarOpen(false)}
          >
            <X size={24} />
          </button>

          {/* Image container with frame */}
          <div
            className="relative p-1 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-2xl shadow-[0_0_100px_rgba(124,58,237,0.3)] animate-in zoom-in-75 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={profileUser.avatarUrl}
              alt={profileUser.displayName || "Avatar"}
              className="min-w-[300px] min-h-[300px] sm:min-w-[400px] sm:min-h-[400px] md:min-w-[500px] md:min-h-[500px] max-w-[90vw] max-h-[85vh] w-auto h-auto object-cover rounded-xl"
            />
          </div>

          {/* Username below image */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white font-bold text-lg">{profileUser.displayName || profileUser.username}</p>
            {profileUser.displayName && (
              <p className="text-gray-400 text-sm">
                {profileUser.username?.includes('@') ? profileUser.username : `@${profileUser.username}`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
