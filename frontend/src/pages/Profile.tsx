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
  Clock
} from "lucide-react";
import MatchHistory from "../components/profile/MatchHistory";
import MatchHistoryModal from "../components/profile/MatchHistoryModal";
import { fetchUserMatches } from "../store/slices/usersSlice";
import { DiscordConnectModal } from "../components/common/DiscordConnectModal";
import { updateUser } from "../store/slices/authSlice";
import { apiFetch } from "../lib/api-client";
import { API_URL } from "../config";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchGames } from "../store/slices/gamesSlice";
import { fetchMyTeams } from "../store/slices/teamsSlice";
import { fetchTournaments } from "../store/slices/tournamentsSlice";
import {
  fetchPublicProfile,
  clearCurrentProfile,
} from "../store/slices/usersSlice";
import type { Team, Tournament } from "../types";

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();

  const { games } = useAppSelector((state) => state.games);
  const { currentProfile, userMatches, isLoading: isProfileLoading } = useAppSelector(
    (state) => state.users
  );
  const myTeamsList = useAppSelector((state) => state.teams.myTeams);
  const [syncLoading, setSyncLoading] = useState(false);
  const [localSteamId, setLocalSteamId] = useState("");
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState(false);
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

  // Polling for Steam sync status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isOwnProfile && user?.steamSyncStatus === 'syncing') {
      interval = setInterval(async () => {
        try {
          // Refresh user data to check sync status
          const response = await apiFetch(`${API_URL}/auth/sync`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" }
          });
          const data = await response.json();

          if (data.success && data.data) {
            dispatch(updateUser(data.data));

            if (data.data.steamSyncStatus === 'complete') {
              toast.success(`Steam szinkronizáció kész! ${data.data.perfectGamesCount || 0} tökéletes játék.`);
              clearInterval(interval);
            } else if (data.data.steamSyncStatus === 'error') {
              toast.error("Hiba történt a Steam szinkronizáció közben.");
              clearInterval(interval);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOwnProfile, user?.steamSyncStatus, dispatch]);


  // Initial Data Fetching
  useEffect(() => {
    if (isAuthenticated) {
      if (!games.length) dispatch(fetchGames());

      if (isOwnProfile) {
        dispatch(fetchMyTeams());
        dispatch(fetchTournaments({ page: 1 }));
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
        toast.info("Szinkronizálás elindult a háttérben...");

        // Update basic data immediately and set status to syncing
        // This will trigger the polling effect
        dispatch(
          updateUser({
            ...user!,
            steamId: localSteamId,
            steamAvatar: data.steamAvatar,
            steamUrl: data.steamUrl,
            steamLevel: data.steamLevel,
            steamPersonaname: data.steamPersonaname,
            steamCreatedAt: data.steamCreatedAt,
            steamSyncStatus: 'syncing'
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
        return "bg-primary/20 text-primary border-primary/20";
      case "MODERATOR":
        return "bg-primary/20 text-primary border-primary/20";
      case "TEACHER":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-muted-foreground border-gray-500/20";
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
    return null;
  };

  const topGameImage = getTopGameImage();

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Profile Header & Stats Combined */}
        <div className="tactical-card relative overflow-hidden">
          {/* Banner */}
          <div
            className={`h-64 sm:h-72 md:h-80 relative group ${!topGameImage ? "bg-secondary/80 bg-grid-pattern" : ""}`}
          >
            {/* Background Image */}
            {topGameImage && (
              <img
                src={topGameImage}
                alt="Profile Banner"
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-out will-change-transform"
              />
            )}

            {!topGameImage && (
              <>
                <div className="absolute inset-0 bg-secondary/80 bg-grid-pattern"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent"></div>
                <div className="absolute top-0 right-0 w-96 h-48 bg-primary/10 blur-[80px]"></div>
              </>
            )}

            {/* Overlay */}
            <div
              className={`absolute inset-0 ${topGameImage
                ? "bg-gradient-to-t from-card via-black/40 to-black/10"
                : "bg-gradient-to-t from-card via-transparent to-transparent"
                }`}
            ></div>

            {isOwnProfile && (
              <div className="absolute top-6 right-6 flex gap-3 z-20">
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-secondary hover:border-primary/60 text-foreground font-mono text-xs uppercase tracking-wider transition-all shadow-sm"
                  title="Szerkesztés"
                >
                  <Edit size={14} />
                  <span>Szerkesztés</span>
                </Link>
              </div>
            )}
          </div>

          <div className="px-6 sm:px-8 pb-8">
            <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end -mt-16 sm:-mt-20">
              {/* Avatar */}
              <div className="relative shrink-0 mx-auto md:mx-0 z-10">
                <div
                  className="w-32 h-32 md:w-36 md:h-36 rounded-lg p-1 bg-secondary border border-border shadow-xl relative cursor-pointer group/avatar overflow-hidden"
                  onClick={() => setIsAvatarOpen(true)}
                >
                  <div className="w-full h-full rounded bg-card overflow-hidden flex items-center justify-center relative z-10">
                    {profileUser?.avatarUrl ? (
                      <img
                        src={profileUser.avatarUrl}
                        alt={profileUser.displayName || profileUser.username}
                        className="w-full h-full object-cover transform transition-transform group-hover/avatar:scale-105 duration-300"
                      />
                    ) : (
                      <span className="font-display text-4xl font-bold text-foreground">
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

                  {/* Zoom hint overlay */}
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity z-20 pointer-events-none">
                    <span className="text-foreground text-[10px] font-mono font-bold uppercase tracking-widest">Nagyítás</span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute -bottom-1 -right-1 z-20">
                  <div
                    className={`w-7 h-7 rounded border border-border flex items-center justify-center ${profileUser?.role === "ADMIN"
                      ? "bg-red-500 text-foreground"
                      : profileUser?.role === "ORGANIZER"
                        ? "bg-primary text-foreground"
                        : profileUser?.role === "MODERATOR"
                          ? "bg-accent text-foreground"
                          : "bg-secondary text-muted-foreground"
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
                  <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight text-foreground flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-3">
                    {profileUser?.displayName || profileUser?.username}
                    <span
                      className={`tactical-badge text-[11px] font-mono ${getRoleBadgeStyle(
                        profileUser?.role
                      )}`}
                    >
                      {getRoleLabel(profileUser?.role)}
                    </span>
                  </h1>

                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-4 text-muted-foreground text-xs font-mono">
                    {profileUser?.displayName && (
                      <span className="font-medium text-primary">
                        {profileUser?.username?.includes('@') ? profileUser?.username : `@${profileUser?.username}`}
                      </span>
                    )}

                    <span className="hidden sm:inline text-border">/</span>

                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-muted-foreground" />
                      <span>
                        CSATLAKOZVA: {new Date(
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
                        <span className="hidden sm:inline text-border">/</span>
                        <div className="flex items-center gap-1.5">
                          <FileText size={13} className="text-muted-foreground" />
                          <span>
                            OM: <span className="text-foreground">{user.omId}</span>
                          </span>
                        </div>
                      </>
                    )}

                    <span className="hidden sm:inline text-border">/</span>
                    <div className="flex items-center gap-1.5">
                      <Gamepad2 size={13} className={profileUser?.discordId ? "text-primary" : "text-muted-foreground"} />
                      <span>
                        {profileUser?.discordId ? (
                          <span className="text-primary font-medium">DISCORD: ÖSSZEKÖTVE</span>
                        ) : (
                          isOwnProfile ? (
                            <button
                              onClick={() => setIsDiscordModalOpen(true)}
                              className="hover:text-primary hover:underline transition-colors uppercase"
                            >
                              DISCORD: CSATLAKOZÁS
                            </button>
                          ) : (
                            <span>DISCORD: NINCS</span>
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full pt-1">
                  <div className="tactical-card p-3 sm:p-4 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Csapatok
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                      {effectiveTeams.length}
                    </div>
                  </div>

                  <div className="tactical-card p-3 sm:p-4 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Versenyek
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                      {effectiveTournaments.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Match History Section */}
        <div className="tactical-card overflow-hidden mb-6">
          <div className="p-4 md:p-5 border-b border-border flex justify-between items-center bg-secondary/60">
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Gamepad2 size={20} className="text-primary" />
              Mérkőzés Előzmények
            </h2>
            {userMatches && userMatches.length > 5 && (
              <button
                onClick={() => setIsMatchHistoryOpen(true)}
                className="font-mono text-xs font-bold text-primary hover:text-foreground transition-colors flex items-center gap-1 uppercase tracking-wider"
              >
                Összes
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="p-4 md:p-6 overflow-x-auto custom-scrollbar">
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

            {/* Teams Section */}
            <div className="tactical-card overflow-hidden">
              <div className="p-4 md:p-5 border-b border-border flex justify-between items-center bg-secondary/60">
                <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Users size={20} className="text-primary" />
                  Csapatok
                </h2>
                {isOwnProfile && effectiveTeams.length > 0 && (
                  <Link
                    to="/teams"
                    className="font-mono text-xs font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                  >
                    Összes
                  </Link>
                )}
              </div>

              <div className="p-4 md:p-6">
                {effectiveTeams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-secondary/30 rounded border border-dashed border-border">
                    <Users size={36} className="mb-3 opacity-20" />
                    <p className="text-sm font-mono">Nincs csapat tagság</p>
                    {isOwnProfile && (
                      <Link to="/teams" className="mt-4 px-3 py-1.5 rounded border border-border bg-secondary hover:border-primary/60 text-foreground font-mono text-xs uppercase tracking-wider transition-all">
                        Csapatok keresése
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {effectiveTeams.map((team: Team) => (
                      <Link
                        key={team.id}
                        to={`/teams/${team.id}`}
                        className="group bg-secondary/40 border border-border rounded p-3.5 flex items-center gap-3.5 hover:border-primary/50 hover:bg-secondary/60 transition-all"
                      >
                        <div className="w-11 h-11 rounded bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform text-foreground">
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt={team.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-display font-bold">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="overflow-hidden min-w-0">
                          <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors text-sm">
                            {team.name}
                          </h3>
                          <div className="font-mono text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span>{team.members?.length || 0} TAG</span>
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

              <div className="p-4 md:p-6 border-b border-border flex justify-between items-center bg-[#171a21] relative z-10">
                <h2 className="text-xl font-bold text-[#c7d5e0] flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center  rounded-lg shadow-inner">
                    <img src="/steam.png" alt="" className="w-full h-full object-cover " />
                  </div>
                  Steam Profil
                </h2>
                {isOwnProfile && (
                  <button
                    onClick={handleSteamSync}
                    disabled={syncLoading || !user?.steamId}
                    className="p-2 bg-[#2a475e] hover:bg-[#66c0f4] text-foreground rounded-lg transition-all shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Adatok Szinkronizálása"
                  >
                    <RefreshCw
                      size={18}
                      className={syncLoading ? "animate-spin" : ""}
                    />
                  </button>
                )}
              </div>

              <div className="p-4 md:p-6 relative z-10">
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
                        <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full border-4 border-[#171a21] bg-[#1b2838] flex items-center justify-center text-foreground font-bold text-sm shadow-xl z-20">
                          {isOwnProfile
                            ? user?.steamLevel || "0"
                            : (profileUser as any)?.steamLevel || "0"}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-foreground tracking-tight">
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
                        <div className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-1 rounded inline-block">
                          ID:{" "}
                          {isOwnProfile
                            ? user?.steamId
                            : (profileUser as any)?.steamId}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                      {/* Perfect Games Stat */}
                      <div className="bg-gradient-to-br from-[#1b2838] to-[#171a21] p-4 rounded-xl border border-border relative overflow-hidden group/stat">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/stat:opacity-20 transition-opacity">
                          <Trophy size={40} />
                        </div>
                        <div className="text-[#66c0f4] text-[10px] font-bold uppercase tracking-widest mb-1">
                          Tökéletes
                        </div>
                        <div className="text-2xl font-black text-foreground flex items-center gap-2">
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
                        <div className="text-[10px] text-muted-foreground mt-1">
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
                      <div className="bg-gradient-to-br from-[#1b2838] to-[#171a21] p-4 rounded-xl border border-border relative overflow-hidden group/stat">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/stat:opacity-20 transition-opacity">
                          <Gamepad2 size={40} />
                        </div>
                        <div className="text-[#66c0f4] text-[10px] font-bold uppercase tracking-widest mb-1">
                          Összes Játék
                        </div>
                        <div className="text-2xl font-black text-foreground">
                          {isOwnProfile
                            ? (user as any)?.steamTotalGames || "-"
                            : (profileUser as any)?.steamTotalGames || "-"}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          A könyvtárban
                        </div>
                      </div>

                      {/* Total Playtime Stat */}
                      <div className="bg-gradient-to-br from-[#1b2838] to-[#171a21] p-4 rounded-xl border border-border relative overflow-hidden group/stat">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/stat:opacity-20 transition-opacity">
                          <Clock size={40} />
                        </div>
                        <div className="text-[#66c0f4] text-[10px] font-bold uppercase tracking-widest mb-1">
                          Játékidő
                        </div>
                        <div className="text-2xl font-black text-foreground">
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
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Óra összesen
                        </div>
                      </div>

                      {/* Account Age Stat */}
                      <div className="bg-gradient-to-br from-[#1b2838] to-[#171a21] p-4 rounded-xl border border-border relative overflow-hidden group/stat">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/stat:opacity-20 transition-opacity">
                          <Calendar size={40} />
                        </div>
                        <div className="text-[#66c0f4] text-[10px] font-bold uppercase tracking-widest mb-1">
                          Fiók Kora
                        </div>
                        <div className="text-2xl font-black text-foreground">
                          {(() => {
                            const created = isOwnProfile
                              ? user?.steamCreatedAt
                              : (profileUser as any)?.steamCreatedAt;
                            if (!created) return "-";
                            const years = Math.floor((Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24 * 365));
                            return `${years}`;
                          })()}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
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
                                className="group/game flex items-center gap-2 bg-[#1b2838] hover:bg-[#2a475e] px-3 py-2 rounded-lg border border-border transition-all"
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
                                  <div className="text-foreground text-xs font-medium truncate group-hover/game:text-[#66c0f4] transition-colors">
                                    {game.name}
                                  </div>
                                  <div className="text-muted-foreground text-[10px]">
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
                                className="group/game flex items-center gap-2 bg-[#1b2838] hover:bg-[#2a475e] px-3 py-2 rounded-lg border border-border transition-all relative"
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
                                  <div className="text-foreground text-xs font-medium truncate group-hover/game:text-[#66c0f4] transition-colors">
                                    {game.name}
                                  </div>
                                  <div className="text-muted-foreground text-[10px]">
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
                    <h3 className="text-foreground font-bold text-lg mb-2">
                      Még nincs összekapcsolva
                    </h3>
                    <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
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
                          className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#66c0f4] transition-colors w-full text-center font-mono"
                        />
                        <button
                          onClick={handleSteamSync}
                          disabled={!localSteamId || syncLoading}
                          className="w-full py-3 bg-gradient-to-r from-[#2a475e] to-[#66c0f4] hover:from-[#1b2838] hover:to-[#2a475e] text-foreground rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <div className="tactical-card overflow-hidden h-full">
              <div className="p-4 md:p-5 border-b border-border flex justify-between items-center bg-secondary/60">
                <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Trophy size={20} className="text-primary" />
                  Versenyek
                </h2>
                {isOwnProfile && effectiveTournaments.length > 0 && (
                  <Link
                    to="/tournaments"
                    className="font-mono text-xs font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                  >
                    Összes
                  </Link>
                )}
              </div>

              <div className="p-4 space-y-3">
                {effectiveTournaments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-secondary/30 rounded border border-dashed border-border">
                    <Trophy size={36} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-mono">Nincs aktív verseny</p>
                  </div>
                ) : (
                  effectiveTournaments.map((tournament: Tournament) => (
                    <Link
                      key={tournament.id}
                      to={`/tournaments/${tournament.id}`}
                      className="block bg-secondary/40 border border-border rounded p-3.5 hover:border-primary/50 hover:bg-secondary/60 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {tournament.name}
                        </h3>
                        <span
                          className={`tactical-badge text-[10px] ${tournament.status === "REGISTRATION"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : tournament.status === "IN_PROGRESS"
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                              : "bg-primary/20 text-primary border-primary/20"
                            }`}
                        >
                          {tournament.status === "REGISTRATION"
                            ? "Nevezés"
                            : tournament.status === "IN_PROGRESS"
                              ? "Zajlik"
                              : "Vége"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                        <div className="flex items-center gap-1.5 bg-secondary px-2 py-0.5 rounded">
                          <Calendar size={11} />
                          <span>
                            {new Date(tournament.startDate).toLocaleDateString(
                              "hu-HU"
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                          <span className="truncate">{tournament.game?.name}</span>
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
            className="absolute top-6 right-6 p-3 bg-secondary/80 hover:bg-white/20 rounded-full text-foreground transition-all hover:scale-110 hover:rotate-90 duration-300 z-10"
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
            <p className="text-foreground font-bold text-lg">{profileUser.displayName || profileUser.username}</p>
            {profileUser.displayName && (
              <p className="text-muted-foreground text-sm">
                {profileUser.username?.includes('@') ? profileUser.username : `@${profileUser.username}`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
