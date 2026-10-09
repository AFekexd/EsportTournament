import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Users,
  Award,
  UserPlus,
  Maximize,
  Minimize,
  Shield,
  Clock,
  Edit2,
  Check,
  Share2,
  Trash2,
  X,
  LogOut,
  ScrollText,
  ArrowRight,
  Info,
  Tv,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { useAuth } from "../hooks/useAuth";
import {
  fetchTournament,
  clearCurrentTournament,
  registerForTournament,
  unregisterFromTournament, // Imported
  generateBracket,
  updateMatch,
  resetMatch,
  deleteMatch,
  updateEntryStats,
  deleteTournament,
  deleteBracket,
} from "../store/slices/tournamentsSlice";
import { fetchMyTeams, fetchTeams } from "../store/slices/teamsSlice";
import { searchUsers } from "../store/slices/usersSlice";
import { TournamentStatusModal, TournamentEditModal } from "../components/admin";
import { TournamentBracket, MatchEditModal } from "../components/tournament";
import type { Match } from "../types";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "../components/common/ConfirmationModal";
import { RuleAcceptanceModal } from "../components/common/RuleAcceptanceModal";

const statusLabels: Record<
  string,
  { label: string; class: string; icon: any }
> = {
  DRAFT: {
    label: "Tervezet",
    class: "bg-gray-500/20 text-muted-foreground border-gray-500/50",
    icon: Clock,
  },
  REGISTRATION: {
    label: "Regisztráció nyitva",
    class: "bg-green-500/20 text-green-400 border-green-500/50",
    icon: UserPlus,
  },
  IN_PROGRESS: {
    label: "Folyamatban",
    class: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    icon: Clock,
  },
  COMPLETED: {
    label: "Befejezett",
    class: "bg-primary/30 text-primary border-blue-500/50",
    icon: Trophy,
  },
  CANCELLED: {
    label: "Törölve",
    class: "bg-red-500/20 text-red-400 border-red-500/50",
    icon: Shield,
  },
};

interface StreamEmbedInfo {
  platform: "twitch" | "youtube" | "tiktok" | "other";
  title: string;
  channelOrId: string;
  embedUrl: string | null;
  directUrl: string;
}

function getStreamEmbedInfo(urlInput?: string | null): StreamEmbedInfo | null {
  if (!urlInput || typeof urlInput !== "string") return null;
  const clean = urlInput.trim();
  if (!clean) return null;

  const directUrl = clean.startsWith("http://") || clean.startsWith("https://")
    ? clean
    : `https://${clean}`;

  const currentHost =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "localhost";

  // 1. Twitch
  if (clean.includes("twitch.tv")) {
    try {
      const urlObj = new URL(directUrl);
      const segments = urlObj.pathname.split("/").filter(Boolean);
      if (segments.length > 0) {
        if (segments[0] === "videos" && segments[1]) {
          const videoId = segments[1];
          return {
            platform: "twitch",
            title: "Twitch Videó",
            channelOrId: videoId,
            embedUrl: `https://player.twitch.tv/?video=${videoId}&parent=${currentHost}&autoplay=false`,
            directUrl,
          };
        }
        const channel = segments[segments.length - 1];
        return {
          platform: "twitch",
          title: "Twitch Közvetítés",
          channelOrId: channel,
          embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${currentHost}&autoplay=false`,
          directUrl,
        };
      }
    } catch {
      const match = clean.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
      const channel = match ? match[1] : "stream";
      return {
        platform: "twitch",
        title: "Twitch Közvetítés",
        channelOrId: channel,
        embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${currentHost}&autoplay=false`,
        directUrl,
      };
    }
  }

  // 2. YouTube
  if (clean.includes("youtube.com") || clean.includes("youtu.be")) {
    try {
      let videoId = "";
      if (clean.includes("youtu.be/")) {
        videoId = clean.split("youtu.be/")[1]?.split("?")[0] || "";
      } else if (clean.includes("watch?v=")) {
        videoId = clean.split("watch?v=")[1]?.split("&")[0] || "";
      } else if (clean.includes("/embed/")) {
        videoId = clean.split("/embed/")[1]?.split("?")[0] || "";
      } else if (clean.includes("/live/")) {
        videoId = clean.split("/live/")[1]?.split("?")[0] || "";
      }

      if (videoId) {
        return {
          platform: "youtube",
          title: "YouTube Közvetítés",
          channelOrId: videoId,
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0`,
          directUrl,
        };
      }
    } catch {
      // fallback
    }
    return {
      platform: "youtube",
      title: "YouTube Közvetítés",
      channelOrId: "",
      embedUrl: null,
      directUrl,
    };
  }

  // 3. TikTok
  if (clean.includes("tiktok.com")) {
    const match = clean.match(/\/video\/(\d+)/);
    const videoId = match ? match[1] : "";
    return {
      platform: "tiktok",
      title: "TikTok Közvetítés",
      channelOrId: videoId,
      embedUrl: videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null,
      directUrl,
    };
  }

  return {
    platform: "other",
    title: "Élő Közvetítés",
    channelOrId: "",
    embedUrl: null,
    directUrl,
  };
}

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  const { currentTournament, isLoading, updateLoading } = useAppSelector(
    (state) => state.tournaments,
  );
  const { myTeams, teams: searchedTeams } = useAppSelector(
    (state) => state.teams,
  );

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isStreamExpanded, setIsStreamExpanded] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  // User Search State for Admin 1v1
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"info" | "bracket" | "qualifier">(
    "info",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Qualifier editing state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "warning" | "info" | "primary";
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    variant: "primary",
  });

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showViewRulesModal, setShowViewRulesModal] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<{
    userId?: string;
    teamId?: string;
    memberIds?: string[];
  } | null>(null);

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  const [editForm, setEditForm] = useState({ matches: 0, points: 0 });

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntryId(entry.id);
    setEditForm({
      matches: entry.matchesPlayed || 0,
      points: entry.qualifierPoints || 0,
    });
  };

  const saveEntryStats = async () => {
    if (!editingEntryId || !currentTournament) return;
    try {
      await dispatch(
        updateEntryStats({
          tournamentId: currentTournament.id,
          entryId: editingEntryId,
          data: {
            matchesPlayed: editForm.matches,
            qualifierPoints: editForm.points,
          },
        }),
      ).unwrap();
      setEditingEntryId(null);
    } catch (err) {
      console.error(err);
      toast.error("Hiba történt a mentés során");
    }
  };

  useEffect(() => {
    if (id) {
      dispatch(fetchTournament(id));

      // Poll for updates every 15 seconds
      const interval = setInterval(() => {
        dispatch(fetchTournament(id));
      }, 15000);

      return () => {
        clearInterval(interval);
        dispatch(clearCurrentTournament());
      };
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyTeams());
    }
  }, [isAuthenticated, dispatch]);

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!showRegisterModal) {
      setSelectedTeamId("");
      setSelectedMemberIds([]);
    }
  }, [showRegisterModal]);


  const selectedTeam =
    myTeams.find((t) => t.id === selectedTeamId) ||
    searchedTeams.find((t) => t.id === selectedTeamId);

  const handleRegister = async () => {
    if (!currentTournament) return;

    const requiredTeamSize =
      currentTournament.teamSize || currentTournament.game?.teamSize || 1;

    try {
      if (currentTournament.requireRank && currentTournament.gameId) {
        // Rank checks are technically handled by backend too, but good to have UI feedback.
        // For 1v1 admin search, we might not have rank loaded in searchedUsers list easily.
        // So we rely on backend error message for 1v1 admin registration rank check (it throws 400).

        // For Team registration, we can check myTeams.
        if (requiredTeamSize > 1) {
          const membersWithoutRank: string[] = [];
          // ... existing check logic ...
          selectedTeam?.members?.forEach((member) => {
            if (selectedMemberIds.includes(member.userId) && member.user) {
              const hasRank = member.user.ranks?.some(
                (r) => r.gameId === currentTournament.gameId,
              );
              if (!hasRank) {
                membersWithoutRank.push(
                  member.user.displayName || member.user.username,
                );
              }
            }
          });
          if (membersWithoutRank.length > 0) {
            toast.error(
              `A következő tagoknak nincs rangja: ${membersWithoutRank.join(
                ", ",
              )}`,
            );
            return;
          }
        }
      }

      const registrationData = {
        userId: requiredTeamSize === 1 ? targetUserId || undefined : undefined,
        teamId: requiredTeamSize > 1 ? selectedTeamId : undefined,
        memberIds: requiredTeamSize > 1 ? selectedMemberIds : undefined,
      };

      if (
        currentTournament.game?.rules ||
        currentTournament.game?.rulesPdfUrl
      ) {
        setPendingRegistration(registrationData);
        setShowRulesModal(true);
        return;
      }

      await executeRegistration(registrationData);
    } catch (error: any) {
      console.error("Failed to register:", error);
      toast.error(error.message || "Hiba történt a regisztráció során");
    }
  };

  const executeRegistration = async (data: {
    userId?: string;
    teamId?: string;
    memberIds?: string[];
  }) => {
    if (!currentTournament) return;

    try {
      await dispatch(
        registerForTournament({
          tournamentId: currentTournament.id,
          ...data,
        }),
      ).unwrap();

      toast.success("Sikeres regisztráció!");
      setShowRegisterModal(false);
      setShowRulesModal(false);
      setPendingRegistration(null);
      dispatch(fetchTournament(currentTournament.id));
    } catch (error: any) {
      console.error("Failed to register:", error);
      toast.error(error.message || "Hiba történt a regisztráció során");
    }
  };

  const handleRuleAcceptance = async () => {
    if (pendingRegistration) {
      await executeRegistration(pendingRegistration);
    }
  };

  const handleUnregister = (entry: any) => {
    if (!currentTournament) return;

    const targetId = entry.id;
    if (!targetId) return;

    setConfirmModal({
      isOpen: true,
      title: "Verseny leiratkozás",
      message: "Biztosan le szeretnél iratkozni a versenyről?",
      variant: "danger",
      confirmLabel: "Leiratkozás",
      onConfirm: async () => {
        try {
          await dispatch(
            unregisterFromTournament({
              tournamentId: currentTournament.id,
              targetId,
            }),
          ).unwrap();

          toast.success("Sikeres leiratkozás");
          dispatch(fetchTournament(currentTournament.id));
        } catch (err: any) {
          toast.error(err?.message || "Hiba történt a leiratkozás során");
        }
      },
    });
  };

  const handleGenerateBracket = async () => {
    if (!currentTournament) return;

    try {
      await dispatch(generateBracket(currentTournament.id)).unwrap();
      dispatch(fetchTournament(currentTournament.id));
    } catch (err) {
      console.error("Failed to generate bracket:", err);
    }
  };

  const handleDeleteBracket = async () => {
    if (!currentTournament) return;

    setConfirmModal({
      isOpen: true,
      title: "Ágrajz törlése",
      message:
        "Biztosan törölni szeretnéd az ágrajzot? Minden meccs és eredmény elvész.",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        try {
          // Import deleteBracket action needs to be added to imports if not already
          // But I can't see imports here. I need to make sure deleteBracket is imported.
          // I'll add it to the import list in a separate step if needed, but I can't see checking imports now.
          // Wait, I should assume I need to import it.
          // Let's blindly use it here and fix imports in next step or use previous view to check.
          // Previous view showed imports up to line 35. deleteBracket was NOT imported.
          // So I will need to add it to imports.

          await dispatch(deleteBracket(currentTournament.id)).unwrap();
          toast.success("Ágrajz sikeresen törölve");
          dispatch(fetchTournament(currentTournament.id));
        } catch (err: any) {
          toast.error(err?.message || "Nem sikerült törölni az ágrajzot");
        }
      },
    });
  };

  const handleMatchClick = (match: Match) => {
    if (user?.role === "ADMIN" || user?.role === "ORGANIZER") {
      setSelectedMatch(match);
      setShowMatchModal(true);
    }
  };

  const handleMatchUpdate = async (data: {
    homeScore?: number;
    awayScore?: number;
    winnerId?: string;
    winnerUserId?: string;
    proof?: File;
  }) => {
    if (!selectedMatch) return;

    setUploadProgress(0);
    try {
      await dispatch(
        updateMatch({
          matchId: selectedMatch.id,
          data,
          onUploadProgress: (progress) => setUploadProgress(progress),
        }),
      ).unwrap();
      setShowMatchModal(false);
      setSelectedMatch(null);
      setUploadProgress(0);
      // Refresh tournament to get updated bracket
      if (currentTournament) {
        dispatch(fetchTournament(currentTournament.id));
      }
    } catch (err) {
      console.error("Failed to update match:", err);
      // Keep modal open on error so user can retry, but maybe reset progress?
      setUploadProgress(0);
    }
  };

  const handleMatchReset = async () => {
    if (!selectedMatch) return;

    try {
      await dispatch(resetMatch(selectedMatch.id)).unwrap();
      setShowMatchModal(false);
      setSelectedMatch(null);
      // Refresh tournament to get updated bracket
      if (currentTournament) {
        dispatch(fetchTournament(currentTournament.id));
      }
    } catch (err) {
      console.error("Failed to reset match:", err);
    }
  };

  const handleMatchDelete = async () => {
    if (!selectedMatch) return;

    try {
      await dispatch(deleteMatch(selectedMatch.id)).unwrap();
      setShowMatchModal(false);
      setSelectedMatch(null);
      // Refresh tournament to get updated bracket
      if (currentTournament) {
        dispatch(fetchTournament(currentTournament.id));
      }
    } catch (err) {
      console.error("Failed to delete match:", err);
    }
  };

  if (isLoading || !currentTournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Betöltés...</p>
      </div>
    );
  }

  const startDate = new Date(currentTournament.startDate);
  const regDeadline = new Date(currentTournament.registrationDeadline);
  const isRegistrationOpen = currentTournament.status === "REGISTRATION"; // && new Date() < regDeadline;
  const userTeamIds = myTeams.map((t) => t.id);
  const isAlreadyRegistered = currentTournament.entries?.some(
    (e) =>
      (e.teamId && userTeamIds.includes(e.teamId)) ||
      (e.userId && e.userId === user?.id),
  );

  const myEntry = currentTournament.entries?.find(
    (e) =>
      (e.teamId && userTeamIds.includes(e.teamId)) ||
      (e.userId && e.userId === user?.id),
  );
  const StatusIcon = statusLabels[currentTournament.status]?.icon || Shield;

  const requiredTeamSize =
    currentTournament.teamSize || currentTournament.game?.teamSize || 1;

  const isQualifierFinished =
    !currentTournament.hasQualifier ||
    (currentTournament.entries?.every(
      (e) =>
        (e.matchesPlayed || 0) >= (currentTournament.qualifierMatches || 0),
    ) ??
      true);

  return (
    <div className="min-h-screen pb-12">
      <div className="relative min-h-[350px] md:min-h-[450px] w-full mb-8 group">
        <div className="absolute inset-0 overflow-hidden rounded-b-3xl">
          {currentTournament.imageUrl ? (
            <img
              src={currentTournament.imageUrl}
              alt={currentTournament.name}
              className="w-full h-full object-cover filter brightness-[0.4] group-hover:brightness-[0.45] transition-all duration-700"
            />
          ) : currentTournament.game?.imageUrl ? (
            <img
              src={currentTournament.game.imageUrl}
              alt={currentTournament.game.name}
              className="w-full h-full object-cover filter brightness-[0.4] group-hover:brightness-[0.45] transition-all duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-card to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-background to-transparent" />
        </div>

        <div className="container mx-auto px-4 h-full relative flex flex-col justify-end pb-8">
          <Link
            to="/tournaments"
            className="absolute top-8 left-4 md:left-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground bg-[#121824]/90 backdrop-blur-md px-3 py-1.5 rounded border border-border/80 transition-all font-mono text-xs uppercase tracking-wider z-20"
          >
            <ArrowLeft size={14} />
            <span className="hidden md:inline">Vissza a versenyekhez</span>
            <span className="md:hidden">Vissza</span>
          </Link>

          {/* Top Right Actions */}
          <div className="absolute top-8 right-4 md:right-4 flex items-center gap-2 z-20">
            {(user?.role === "ADMIN" || user?.role === "ORGANIZER") && (
              <>
                <Button
                  onClick={() => setShowEditModal(true)}
                  className="bg-[#121824]/90 hover:bg-[#121824] border border-border/80 text-foreground h-9 w-9 p-0 rounded backdrop-blur-md transition-all"
                  title="Verseny szerkesztése"
                >
                  <Edit2 size={15} />
                </Button>
                <Button
                  onClick={() => setShowStatusModal(true)}
                  className="bg-[#121824]/90 hover:bg-[#121824] border border-border/80 text-foreground h-9 w-9 p-0 rounded backdrop-blur-md transition-all"
                  title="Státusz módosítása"
                >
                  <Clock size={15} />
                </Button>
              </>
            )}

            <Button
              onClick={() => {
                const shareUrl = `${window.location.protocol}//${window.location.hostname}/share/tournaments/${currentTournament.id}`;
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link másolva!");
              }}
              className="bg-[#121824]/90 hover:bg-[#121824] border border-border/80 text-foreground h-9 w-9 p-0 rounded backdrop-blur-md transition-all"
              title="Megosztás"
            >
              <Share2 size={15} />
            </Button>

            {(user?.role === "ADMIN" || user?.role === "ORGANIZER") && (
              <Button
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 h-9 w-9 p-0 rounded backdrop-blur-md transition-all"
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: "Verseny törlése",
                    message: "Biztosan törölni szeretnéd ezt a versenyt?",
                    variant: "danger",
                    confirmLabel: "Törlés",
                    onConfirm: async () => {
                      try {
                        await dispatch(
                          deleteTournament(currentTournament.id),
                        ).unwrap();
                        toast.success("Törölve");
                        navigate("/tournaments");
                      } catch (error) {
                        toast.error("Hiba a törléskor");
                      }
                    },
                  });
                }}
                title="Törlés"
              >
                <Trash2 size={15} />
              </Button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-6 mt-20">
            {/* Left Content */}
            <div className="flex-grow space-y-4">
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs font-bold uppercase tracking-wider border backdrop-blur-md ${statusLabels[currentTournament.status]?.class ||
                    "bg-[#121824] text-muted-foreground border-border/80"
                    }`}
                >
                  <StatusIcon size={13} />
                  {statusLabels[currentTournament.status]?.label ||
                    currentTournament.status}
                </span>

                {currentTournament.game && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs font-bold uppercase tracking-wide text-cyan-400 bg-[#0B0F17]/90 border border-border/80 backdrop-blur-md">
                    {currentTournament.game.name}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs font-bold uppercase tracking-wider bg-[#121824] text-foreground border border-border/80 backdrop-blur-md">
                  <Users size={13} className="text-primary" />
                  {requiredTeamSize === 1
                    ? "1v1 EGYÉNI"
                    : `${requiredTeamSize}v${requiredTeamSize} CSAPAT`}{" "}
                  FORMÁTUM
                </span>

                {currentTournament.requireRank && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 backdrop-blur-md"
                    title="Kötelező rangot beállítani a profilban"
                  >
                    <Shield size={13} />
                    Rang-Hitelesített
                  </span>
                )}
              </div>

              <div>
                <h1 className="font-display text-3xl md:text-6xl font-extrabold uppercase tracking-wide text-foreground leading-tight drop-shadow-md">
                  {currentTournament.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                {/* Date & Participants */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs md:text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-primary" />
                    <span>
                      {startDate.toLocaleDateString("hu-HU", {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-primary" />
                    <span>
                      {currentTournament.participantsCount ??
                        (currentTournament._count?.entries || 0)}{" "}
                      / {currentTournament.maxTeams}{" "}
                      {requiredTeamSize === 1 ? "JÁTÉKOS" : "CSAPAT"}
                    </span>
                  </div>
                </div>

                {/* CTA Buttons */}
                {isRegistrationOpen &&
                  isAuthenticated &&
                  !isAlreadyRegistered && (
                    <Button
                      onClick={() => setShowRegisterModal(true)}
                      className="bg-primary hover:bg-primary-hover text-foreground font-mono text-xs font-bold uppercase tracking-wider px-6 py-2 rounded border border-primary transition-all w-full sm:w-auto"
                    >
                      <UserPlus size={16} className="mr-2" />
                      Nevezés a Tornára
                    </Button>
                  )}

                {isRegistrationOpen &&
                  isAuthenticated &&
                  isAlreadyRegistered &&
                  myEntry && (
                    <Button
                      onClick={() => handleUnregister(myEntry)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-mono text-xs font-bold uppercase tracking-wider px-6 py-2 rounded transition-all"
                    >
                      <LogOut size={16} className="mr-2" />
                      Nevezés Visszavonása
                    </Button>
                  )}
              </div>
            </div>

            {/* Empty Right Column (used to be buttons) - kept for flex spacing if needed, or removed */}
            <div className="hidden lg:block w-0"></div>
          </div>
        </div>
      </div>

      {/* Stream Section - Broadcast Theatre */}
      {currentTournament.streamUrl && (() => {
        const streamInfo = getStreamEmbedInfo(currentTournament.streamUrl);
        if (!streamInfo) return null;
        return (
          <div className="container mx-auto px-4 mb-8 animate-fade-in-up">
            <div className="bg-card/90 backdrop-blur-md rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl shadow-purple-950/20">
              {/* Header Bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-purple-950/40 via-card to-card border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Élő Adás
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
                    <Tv className="w-4 h-4 text-purple-400" />
                    <span>{streamInfo.title}</span>
                    {streamInfo.channelOrId && (
                      <span className="text-muted-foreground font-mono text-xs sm:text-sm">
                        (@{streamInfo.channelOrId})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={streamInfo.directUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-medium transition-colors"
                  >
                    <span>Megnyitás</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsStreamExpanded(!isStreamExpanded)}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    title={isStreamExpanded ? "Összecsukás" : "Kinyitás"}
                  >
                    {isStreamExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Stream Player Content */}
              {isStreamExpanded && (
                <div className="p-2 sm:p-4 bg-black/40">
                  {streamInfo.embedUrl ? (
                    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner border border-white/5">
                      <iframe
                        src={streamInfo.embedUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        title={streamInfo.title}
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                      <Tv className="w-12 h-12 text-muted-foreground/40" />
                      <p className="text-muted-foreground text-sm">
                        Ehhez a közvetítéshez nincs közvetlen beágyazó lejátszó.
                      </p>
                      <a
                        href={streamInfo.directUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-colors shadow-lg shadow-purple-600/20"
                      >
                        Megnyitás új lapon
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="container mx-auto px-4">
        {/* Stats Grid */}
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="tactical-card p-6 rounded-lg border border-border shadow-lg flex items-center gap-4 hover:border-primary/50 transition-colors group">
            <div className="bg-primary/10 border border-primary/30 p-3 rounded text-primary group-hover:bg-primary/20 transition-colors">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider font-semibold mb-1">
                Formátum
              </p>
              <p className="text-lg font-display font-bold uppercase tracking-wider text-foreground">
                {currentTournament.format === "SINGLE_ELIMINATION"
                  ? "Egyenes kieséses"
                  : currentTournament.format === "DOUBLE_ELIMINATION"
                    ? "Dupla kieséses"
                    : currentTournament.format === "ROUND_ROBIN"
                      ? "Körmérkőzés"
                      : currentTournament.format}
              </p>
            </div>
          </div>

          <div className="tactical-card p-6 rounded-lg border border-border shadow-lg flex items-center gap-4 hover:border-primary/50 transition-colors group">
            <div className="bg-primary/10 border border-primary/30 p-3 rounded text-primary group-hover:bg-primary/20 transition-colors">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider font-semibold mb-1">
                Jelentkezési határidő
              </p>
              <p className="text-lg font-display font-bold uppercase tracking-wider text-foreground">
                {regDeadline.toLocaleString("hu-HU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {currentTournament.endDate && (
            <div className="tactical-card p-6 rounded-lg border border-border shadow-lg flex items-center gap-4 hover:border-primary/50 transition-colors group">
              <div className="bg-primary/10 border border-primary/30 p-3 rounded text-primary group-hover:bg-primary/20 transition-colors">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider font-semibold mb-1">
                  Befejezés
                </p>
                <p className="text-lg font-display font-bold uppercase tracking-wider text-foreground">
                  {new Date(currentTournament.endDate).toLocaleString("hu-HU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          )}

          {(currentTournament as any).prizePool && (
            <div className="tactical-card p-6 rounded-lg border border-border shadow-lg flex items-center gap-4 hover:border-primary/50 transition-colors group">
              <div className="bg-primary/10 border border-primary/30 p-3 rounded text-primary group-hover:bg-primary/20 transition-colors">
                <Award size={24} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider font-semibold mb-1">
                  Díjazás
                </p>
                <p className="text-lg font-display font-bold uppercase tracking-wider text-foreground">
                  {(currentTournament as any).prizePool}
                </p>
              </div>
            </div>
          )}

          {/* Rules Card */}
          {(currentTournament.game?.rules ||
            currentTournament.game?.rulesPdfUrl) && (
              <div
                className={`tactical-card p-6 rounded-lg border border-border shadow-lg flex items-center gap-4 hover:border-primary/50 transition-colors group cursor-pointer`}
                onClick={() => setShowViewRulesModal(true)}
              >
                <div className="bg-primary/10 border border-primary/30 p-3 rounded text-primary group-hover:bg-primary/20 transition-colors">
                  <ScrollText size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider font-semibold mb-1">
                    Szabályzat
                  </p>
                  <p className="text-lg font-display font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    Megtekintés
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </p>
                </div>
              </div>
            )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-secondary/80 p-1 rounded border border-border inline-flex overflow-x-auto max-w-full font-mono">
            <button
              className={`px-4 md:px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "info"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setActiveTab("info")}
            >
              Információk
            </button>
            {currentTournament.hasQualifier && (
              <button
                className={`px-4 md:px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "qualifier"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
                onClick={() => setActiveTab("qualifier")}
              >
                Selejtező
              </button>
            )}
            <button
              className={`px-4 md:px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "bracket"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setActiveTab("bracket")}
            >
              Bracket
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "info" && (
          <div className="space-y-8">
            {/* Description Section */}
            {currentTournament.description && (
              <div className="tactical-card p-6 rounded-lg border border-border shadow-lg">
                <h2 className="text-lg font-display font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                  <Info size={18} className="text-primary" />
                  Leírás
                </h2>
                <div className="prose prose-invert max-w-none text-foreground/80 font-mono text-sm leading-relaxed">
                  <p className="whitespace-pre-wrap">
                    {currentTournament.description}
                  </p>
                </div>
              </div>
            )}
            {/* Participants Section */}
            <div className="tactical-card rounded-lg border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center bg-card/90">
                <h2 className="text-lg font-display font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  {requiredTeamSize === 1
                    ? "Regisztrált játékosok"
                    : "Regisztrált csapatok"}
                </h2>
                <span className="bg-secondary/80 border border-border text-muted-foreground font-mono text-xs px-2.5 py-1 rounded">
                  {currentTournament.participantsCount ??
                    currentTournament.entries?.length ??
                    0}{" "}
                  {requiredTeamSize === 1 ? "játékos" : "csapat"}
                </span>
              </div>

              <div className="overflow-x-auto">
                {currentTournament.entries &&
                  currentTournament.entries.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-secondary border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 md:px-6 py-4 font-medium w-20">#</th>
                        <th className="px-4 md:px-6 py-4 font-medium">
                          {requiredTeamSize === 1 ? "Játékos" : "Csapat"}
                        </th>
                        {(user?.role === "ADMIN" ||
                          user?.role === "ORGANIZER") && (
                            <th className="px-4 md:px-6 py-4 font-medium text-right">
                              Műveletek
                            </th>
                          )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {currentTournament.entries.map((entry, index) => {
                        const isSolo = !!entry.user;
                        const name = isSolo
                          ? entry.user!.displayName || entry.user!.username
                          : entry.team!.name;
                        const avatar = isSolo
                          ? entry.user!.avatarUrl
                          : entry.team!.logoUrl;

                        const link = isSolo
                          ? `/profile/${entry.user!.id}`
                          : `/teams/${entry.team!.id}`;

                        return (
                          <tr
                            key={entry.id}
                            className="group hover:bg-secondary transition-colors"
                          >
                            <td className="px-4 md:px-6 py-4 text-muted-foreground font-mono text-sm">
                              #{index + 1}
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <Link
                                to={link}
                                className="flex items-center gap-3 group/link"
                              >
                                <div className="w-10 h-10 shrink-0 rounded-lg bg-secondary flex items-center justify-center border border-border overflow-hidden text-primary group-hover/link:border-primary/30 transition-colors">
                                  {avatar ? (
                                    <img
                                      src={avatar}
                                      alt={name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="font-bold">
                                      {name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className="font-medium text-foreground group-hover/link:text-primary transition-colors">
                                  {name}
                                </span>
                              </Link>
                            </td>

                            {(user?.role === "ADMIN" ||
                              user?.role === "ORGANIZER") && (
                                <td className="px-4 md:px-6 py-4 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleUnregister(entry);
                                    }}
                                    className="p-2 bg-secondary hover:bg-red-500/20 text-muted-foreground hover:text-red-400 rounded-lg transition-colors md:opacity-0 group-hover:md:opacity-100"
                                    title="Regisztráció törlése"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users size={48} className="mb-4 opacity-50" />
                    <p>Még nincsenek regisztrált {requiredTeamSize === 1 ? "játékosok" : "csapatok"}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "qualifier" && currentTournament.hasQualifier && (
          <div className="space-y-8">
            {/* Qualifier Settings */}
            <div className="tactical-card p-6 rounded-lg border border-border shadow-lg flex items-center gap-4 hover:border-primary/50 transition-colors group">
              <div className="bg-primary/10 border border-primary/30 p-3 rounded text-primary group-hover:bg-primary/20 transition-colors">
                <Shield size={24} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider font-semibold mb-1">
                  Selejtező
                </p>
                <p className="text-lg font-display font-bold uppercase tracking-wider text-foreground">
                  {currentTournament.qualifierMatches} meccs / min.{" "}
                  {currentTournament.qualifierMinPoints} pont
                </p>
              </div>
            </div>

            {/* Qualifier Results */}
            <div className="tactical-card rounded-lg border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center bg-card/90">
                <h2 className="text-lg font-display font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Award size={18} className="text-primary" />
                  Eredmények
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 md:px-6 py-4 font-medium">Kiemelés</th>
                      <th className="px-4 md:px-6 py-4 font-medium">Résztvevő</th>
                      <th className="px-4 md:px-6 py-4 font-medium">Mérkőzések</th>
                      <th className="px-4 md:px-6 py-4 font-medium">Pontszám</th>
                      <th className="px-4 md:px-6 py-4 font-medium text-right">
                        Kezelés
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[...(currentTournament.entries || [])]
                      .sort(
                        (a, b) =>
                          (b.qualifierPoints || 0) - (a.qualifierPoints || 0),
                      )
                      .map((entry) => {
                        const isEditing = editingEntryId === entry.id;
                        const targetMatches =
                          currentTournament.qualifierMatches || 0;
                        const targetPoints =
                          currentTournament.qualifierMinPoints || 0;
                        const currentMatches = entry.matchesPlayed || 0;
                        const currentPoints = entry.qualifierPoints || 0;

                        const isQualified =
                          currentMatches >= targetMatches &&
                          currentPoints >= targetPoints;
                        const isFailed =
                          currentMatches >= targetMatches &&
                          currentPoints < targetPoints;

                        const name = entry.user
                          ? entry.user.displayName || entry.user.username
                          : entry.team?.name;
                        const avatar =
                          entry.user?.avatarUrl || entry.team?.logoUrl;

                        let rowClass = "hover:bg-secondary";
                        if (isQualified)
                          rowClass =
                            "bg-green-500/10 hover:bg-green-500/20 border-l-2 border-l-green-500";
                        if (isFailed)
                          rowClass =
                            "bg-red-500/10 hover:bg-red-500/20 border-l-2 border-l-red-500";

                        return (
                          <tr
                            key={entry.id}
                            className={`group transition-colors ${rowClass}`}
                          >
                            <td className="px-4 md:px-6 py-4">
                              <span className="font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">
                                #{entry.seed}
                              </span>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 shrink-0 rounded bg-gray-800 flex items-center justify-center border border-border overflow-hidden text-xs font-bold text-muted-foreground">
                                  {avatar ? (
                                    <img
                                      src={avatar}
                                      alt={name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    name?.charAt(0).toUpperCase()
                                  )}
                                </div>
                                {entry.user ? (
                                  <Link
                                    to={`/profile/${entry.user.id}`}
                                    className="font-medium text-foreground hover:text-primary transition-colors"
                                  >
                                    {name}
                                  </Link>
                                ) : (
                                  <span className="font-medium text-foreground">
                                    {name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editForm.matches}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      matches: parseInt(e.target.value),
                                    })
                                  }
                                  className="bg-secondary border border-border rounded px-3 py-1 text-foreground text-sm w-20 focus:outline-none focus:border-primary"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span
                                  className={
                                    currentMatches >= targetMatches
                                      ? "text-green-400 font-bold"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {currentMatches}{" "}
                                  <span className="text-muted-foreground text-xs font-normal">
                                    / {targetMatches}
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editForm.points}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      points: parseInt(e.target.value),
                                    })
                                  }
                                  className="bg-secondary border border-border rounded px-3 py-1 text-foreground text-sm w-20 focus:outline-none focus:border-primary"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span
                                  className={
                                    isQualified
                                      ? "text-green-400 font-bold"
                                      : isFailed
                                        ? "text-red-400 font-bold"
                                        : "text-muted-foreground"
                                  }
                                >
                                  {currentPoints}{" "}
                                  <span className="text-muted-foreground text-xs font-normal">
                                    / {targetPoints}
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 md:px-6 py-4 text-right">
                              {(user?.role === "ADMIN" ||
                                user?.role === "ORGANIZER") &&
                                (isEditing ? (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      saveEntryStats();
                                    }}
                                    className="p-2 bg-primary text-black rounded hover:bg-primary/90 transition-colors inline-flex"
                                    title="Mentés"
                                  >
                                    <Check size={16} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleEditEntry(entry);
                                    }}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded transition-colors inline-flex opacity-0 group-hover:opacity-100"
                                    title="Szerkesztés"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                ))}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "bracket" && (
          <div
            className={`tactical-card rounded-lg border border-border overflow-hidden shadow-2xl ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : "relative"
              }`}
          >
            <div className="p-4 border-b border-border flex justify-between items-center bg-card/90">
              <h2 className="text-base font-display font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Trophy size={18} className="text-primary" />
                Bracket
              </h2>
              <div className="flex gap-2">
                {(user?.role === "ADMIN" || user?.role === "ORGANIZER") && (
                  <>
                    {!currentTournament.matches?.length ? (
                      <button
                        className={`btn btn-primary btn-sm ${!isQualifierFinished
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                          }`}
                        onClick={
                          isQualifierFinished
                            ? handleGenerateBracket
                            : undefined
                        }
                        disabled={!isQualifierFinished}
                        title={
                          !isQualifierFinished
                            ? "A selejtező még nem fejeződött be. Minden résztvevőnek le kell játszania a kötelező meccsszámot."
                            : "Automatikusan generálja a bracketet a résztvevők alapján"
                        }
                      >
                        Bracket generálása
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: "Bracket újragenerálása",
                              message:
                                "Biztosan újra akarod generálni a bracketet? Ez törli az összes jelenlegi meccset és eredményt!",
                              variant: "warning",
                              confirmLabel: "Újragenerálás",
                              onConfirm: () => handleGenerateBracket(),
                            });
                          }}
                        >
                          Újragenerálás
                        </button>
                        <button
                          className="btn btn-error btn-sm text-foreground"
                          onClick={handleDeleteBracket}
                          title="Ágrajz törlése"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </>
                )}
                <button
                  className="btn btn-ghost btn-sm text-muted-foreground hover:text-foreground"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Kilépés" : "Teljes képernyő"}
                >
                  {isFullscreen ? (
                    <Minimize size={18} />
                  ) : (
                    <Maximize size={18} />
                  )}
                </button>
              </div>
            </div>
            <div
              className={`overflow-auto flex flex-col relative ${isFullscreen
                ? "h-[calc(100vh-60px)]"
                : "min-h-[600px] max-h-[800px]"
                }`}
            >
              {/* Loading Overlay */}
              {updateLoading && (
                <div className="absolute inset-0 bg-secondary backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-foreground font-semibold text-lg">
                    Frissítés...
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Kérjük várjon, a bracket frissül
                  </p>
                </div>
              )}
              <TournamentBracket
                tournament={currentTournament}
                onMatchClick={handleMatchClick}
              />
            </div>
          </div>
        )}

        {showRegisterModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setShowRegisterModal(false)}
          >
            <div
              className="bg-[#121A22]/95 backdrop-blur-xl rounded-2xl border border-border shadow-[0_0_50px_-12px_rgba(124,58,237,0.25)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                  <UserPlus className="text-primary" size={24} />
                  Csapat regisztrálása
                </h2>
                <button
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary/80 p-2 rounded-full transition-colors"
                  onClick={() => setShowRegisterModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {(user?.role === "ADMIN" || user?.role === "ORGANIZER") && (
                  <div className="mb-6 bg-primary/20 border border-primary/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={16} className="text-primary" />
                      <span className="text-sm font-bold text-primary">
                        Adminisztrátori mód
                      </span>
                    </div>
                    <div className="space-y-3">
                      {requiredTeamSize === 1 ? (
                        // User Search for 1v1
                        <>
                          <input
                            type="text"
                            placeholder="Felhasználó keresése..."
                            className="w-full bg-secondary border border-border rounded px-3 py-2 text-white/90 text-sm focus:outline-none focus:border-blue-500/50"
                            value={userSearchQuery}
                            onChange={async (e) => {
                              const val = e.target.value;
                              setUserSearchQuery(val);
                              if (val.length >= 2) {
                                // Dynamically importing or assuming it's available?
                                // I will need to update imports.
                                // For now, let's use a quick fetch here or assume dispatch action works if imported.
                                // I will fix imports in next step.
                                try {
                                  const result = await dispatch(
                                    searchUsers(val),
                                  ).unwrap();
                                  setSearchedUsers(result);
                                } catch (err) {
                                  console.error(err);
                                }
                              } else {
                                setSearchedUsers([]);
                              }
                            }}
                          />
                          {searchedUsers.length > 0 &&
                            userSearchQuery.length >= 2 && (
                              <div className="max-h-40 overflow-y-auto bg-secondary rounded border border-border">
                                {searchedUsers.map((u: any) => (
                                  <div
                                    key={u.id}
                                    onClick={() => {
                                      setTargetUserId(u.id);
                                      setUserSearchQuery(
                                        u.displayName || u.username,
                                      );
                                      setSearchedUsers([]);
                                    }}
                                    className={`p-2 hover:bg-secondary cursor-pointer flex items-center justify-between text-sm ${targetUserId === u.id
                                      ? "bg-primary/30 text-blue-200"
                                      : "text-gray-300"
                                      }`}
                                  >
                                    <span>{u.displayName || u.username}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {u.username}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          {targetUserId && (
                            <div className="text-xs text-blue-300 mt-1 flex items-center gap-2">
                              Kiválasztva:{" "}
                              <span className="font-bold">
                                {userSearchQuery}
                              </span>
                              <button
                                onClick={() => {
                                  setTargetUserId(null);
                                  setUserSearchQuery("");
                                }}
                                className="hover:text-foreground"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        // Team Search for >1
                        <>
                          <input
                            type="text"
                            placeholder="Csapat keresése név alapján..."
                            className="w-full bg-secondary border border-border rounded px-3 py-2 text-white/90 text-sm focus:outline-none focus:border-blue-500/50"
                            value={teamSearchQuery}
                            onChange={(e) => {
                              setTeamSearchQuery(e.target.value);
                              if (e.target.value.length >= 2) {
                                dispatch(
                                  fetchTeams({ search: e.target.value }),
                                );
                              }
                            }}
                          />
                          {searchedTeams.length > 0 &&
                            teamSearchQuery.length >= 2 && (
                              <div className="max-h-40 overflow-y-auto bg-secondary rounded border border-border">
                                {searchedTeams.map((team) => (
                                  <div
                                    key={team.id}
                                    onClick={() => {
                                      setSelectedTeamId(team.id);
                                      setSelectedMemberIds([]);
                                      setTeamSearchQuery(""); // Hide results but keep selection
                                    }}
                                    className={`p-2 hover:bg-secondary cursor-pointer flex items-center justify-between text-sm ${selectedTeamId === team.id
                                      ? "bg-primary/30 text-blue-200"
                                      : "text-gray-300"
                                      }`}
                                  >
                                    <span>{team.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {team.members?.length} tag
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {requiredTeamSize === 1 ? (
                  <div className="text-center py-6">
                    {/* ... existing 1v1 UI ... */}
                    {/* If admin selected someone, show THAT user instead of 'user' */}
                    {/* We can fetch that user details? Or just use the search result data? 
                      Ideally we want to show who we are registering. 
                      For simplicity, I will show a generic message if targetUserId is set.
                  */}

                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                      <UserPlus size={32} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {targetUserId
                        ? "Versenyző regisztrálása"
                        : "Regisztráció egyéni versenyzőként"}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {targetUserId
                        ? `A kiválasztott felhasználó: ${userSearchQuery}`
                        : "Mivel ez egy 1v1 verseny, a saját felhasználóddal fogsz regisztrálni:"}
                    </p>

                    {!targetUserId && (
                      <div className="bg-[#121A22] p-4 rounded-xl border border-border flex items-center gap-4 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-lg bg-secondary border border-border overflow-hidden">
                          {user?.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                              {user?.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-foreground font-bold">
                            {user?.displayName || user?.username}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            Egyéni versenyző
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-gray-300 mb-4">
                      Válaszd ki a csapatot, amellyel regisztrálni szeretnél:
                    </p>
                    {/* ... existing team select ... */}
                    <select
                      className="w-full bg-[#121A22] border border-border rounded-xl px-4 py-3.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner transition-all appearance-none cursor-pointer hover:border-border"
                      value={selectedTeamId}
                      onChange={(e) => { setSelectedTeamId(e.target.value); setSelectedMemberIds([]); }}
                    >
                      <option value="" className="bg-[#121A22]">
                        Válassz csapatot...
                      </option>
                      {myTeams
                        .filter((team) => team.ownerId === user?.id)
                        .map((team) => (
                          <option
                            key={team.id}
                            value={team.id}
                            className="bg-[#121A22]"
                          >
                            {team.name}
                          </option>
                        ))}
                    </select>

                    {selectedTeam && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-300 mt-6">
                        {/* ... members selection ... */}
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-medium text-muted-foreground">
                            Válaszd ki a versenyzőket
                          </label>
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded ${selectedMemberIds.length === requiredTeamSize
                              ? "bg-green-500/20 text-green-400"
                              : "bg-primary/20 text-primary"
                              }`}
                          >
                            Kiválasztva: {selectedMemberIds.length} /{" "}
                            {requiredTeamSize}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedTeam.members?.map((member) => {
                            if (!member.user) return null;
                            const isSelected = selectedMemberIds.includes(
                              member.user.id,
                            );
                            const isFull =
                              selectedMemberIds.length >= requiredTeamSize;

                            return (
                              <div
                                key={member.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedMemberIds((prev) =>
                                      prev.filter(
                                        (id) => id !== member.user!.id,
                                      ),
                                    );
                                  } else if (!isFull) {
                                    setSelectedMemberIds((prev) => [
                                      ...prev,
                                      member.user!.id,
                                    ]);
                                  }
                                }}
                                className={`
                                  relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 flex items-center gap-4 group overflow-hidden
                                  ${isSelected
                                    ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"
                                    : "bg-secondary border-border hover:border-border hover:bg-secondary"
                                  }
                                  ${!isSelected && isFull
                                    ? "opacity-30 grayscale cursor-not-allowed border-transparent"
                                    : ""
                                  }
                            `}
                              >
                                {/* Selection Indicator Glow */}
                                {isSelected && (
                                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                                )}

                                <div
                                  className={`
                                  relative w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 flex-shrink-0
                                  ${isSelected
                                      ? "bg-primary border-primary scale-110"
                                      : "border-gray-600 bg-transparent group-hover:border-gray-400"
                                    }
                              `}
                                >
                                  {isSelected && (
                                    <Check
                                      size={12}
                                      className="text-black stroke-[3]"
                                    />
                                  )}
                                </div>

                                <div
                                  className={`relative w-10 h-10 rounded-lg overflow-hidden border border-border transition-transform duration-300 flex-shrink-0 ${isSelected ? "ring-2 ring-primary/50" : ""
                                    }`}
                                >
                                  {member.user.avatarUrl ? (
                                    <img
                                      src={member.user.avatarUrl}
                                      alt={member.user.username}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-sm font-bold text-muted-foreground">
                                      {member.user.username
                                        .charAt(0)
                                        .toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                <div className="overflow-hidden z-10">
                                  <p
                                    className={`text-sm font-bold truncate transition-colors ${isSelected
                                      ? "text-foreground"
                                      : "text-gray-300 group-hover:text-foreground"
                                      }`}
                                  >
                                    {member.user.displayName ||
                                      member.user.username}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate font-mono">
                                    @{member.user.username}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-[#121A22]/50 backdrop-blur-sm">
                <button
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Mégse
                </button>
                <button
                  className={`
                    group relative px-8 py-2.5 rounded-xl text-sm font-bold text-foreground shadow-lg transition-all duration-300
                    ${(requiredTeamSize > 1 &&
                      (!selectedTeamId ||
                        selectedMemberIds.length !== requiredTeamSize)) ||
                      (requiredTeamSize === 1 &&
                        targetUserId &&
                        !userSearchQuery)
                      ? "bg-gray-800 text-muted-foreground cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-primary to-purple-600 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5"
                    }
                `}
                  onClick={handleRegister}
                  disabled={
                    (requiredTeamSize > 1 &&
                      (!selectedTeamId ||
                        selectedMemberIds.length !== requiredTeamSize)) ||
                    (requiredTeamSize === 1 &&
                      !!targetUserId &&
                      !userSearchQuery)
                  }
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Regisztráció
                    <ArrowLeft className="rotate-180 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

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

        {showEditModal && currentTournament && (
          <TournamentEditModal
            tournament={currentTournament}
            onClose={() => setShowEditModal(false)}
          />
        )}

        {/* Match Edit Modal */}
        {showMatchModal && selectedMatch && (
          <MatchEditModal
            match={selectedMatch}
            onClose={() => {
              setShowMatchModal(false);
              setSelectedMatch(null);
              setUploadProgress(0);
            }}
            onSave={handleMatchUpdate}
            onReset={handleMatchReset}
            onDelete={handleMatchDelete}
            isLoading={updateLoading}
            uploadProgress={uploadProgress}
            isAdmin={user?.role === "ADMIN"}
          />
        )}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={closeConfirmModal}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          confirmLabel={confirmModal.confirmLabel}
        />

        {showRulesModal &&
          (currentTournament?.game?.rules ||
            currentTournament?.game?.rulesPdfUrl) && (
            <RuleAcceptanceModal
              rules={currentTournament.game.rules || ""}
              rulesPdfUrl={currentTournament.game.rulesPdfUrl || undefined}
              gameName={currentTournament.game.name}
              onClose={() => {
                setShowRulesModal(false);
                setPendingRegistration(null);
              }}
              onAccept={handleRuleAcceptance}
            />
          )}

        {showViewRulesModal &&
          (currentTournament?.game?.rules ||
            currentTournament?.game?.rulesPdfUrl) && (
            <RuleAcceptanceModal
              rules={currentTournament.game.rules || ""}
              rulesPdfUrl={currentTournament.game.rulesPdfUrl || undefined}
              gameName={currentTournament.game.name}
              onClose={() => setShowViewRulesModal(false)}
              viewOnly={true}
            />
          )}
      </div>
    </div>
  );
}
