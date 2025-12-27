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
  updateEntryStats,
  deleteTournament,
} from "../store/slices/tournamentsSlice";
import { fetchMyTeams, fetchTeams } from "../store/slices/teamsSlice";
import { searchUsers } from "../store/slices/usersSlice";
import { TournamentStatusModal } from "../components/admin";
import { TournamentBracket, MatchEditModal } from "../components/tournament";
import type { Match } from "../types";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "../components/common/ConfirmationModal";

const statusLabels: Record<
  string,
  { label: string; class: string; icon: any }
> = {
  DRAFT: {
    label: "Tervezet",
    class: "bg-gray-500/20 text-gray-400 border-gray-500/50",
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
    class: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    icon: Trophy,
  },
  CANCELLED: {
    label: "Törölve",
    class: "bg-red-500/20 text-red-400 border-red-500/50",
    icon: Shield,
  },
};

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  const { currentTournament, isLoading } = useAppSelector(
    (state) => state.tournaments
  );
  const { myTeams, teams: searchedTeams } = useAppSelector(
    (state) => state.teams
  );

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  // User Search State for Admin 1v1
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"info" | "bracket" | "qualifier">(
    "info"
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
    onConfirm: () => {},
    variant: "primary",
  });

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
        })
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

  useEffect(() => {
    setSelectedMemberIds([]);
  }, [selectedTeamId]);

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
                (r) => r.gameId === currentTournament.gameId
              );
              if (!hasRank) {
                membersWithoutRank.push(
                  member.user.displayName || member.user.username
                );
              }
            }
          });
          if (membersWithoutRank.length > 0) {
            toast.error(
              `A következő tagoknak nincs rangja: ${membersWithoutRank.join(
                ", "
              )}`
            );
            return;
          }
        }
      }

      if (requiredTeamSize === 1) {
        await dispatch(
          registerForTournament({
            tournamentId: currentTournament.id,
            userId: targetUserId || undefined,
            // No teamId
          })
        ).unwrap();
      } else {
        // Team Registration
        if (!selectedTeamId) {
          toast.error("Válassz csapatot!");
          return;
        }
        if (selectedMemberIds.length !== requiredTeamSize) {
          toast.error(`Válassz ki pontosan ${requiredTeamSize} tagot!`);
          return;
        }

        await dispatch(
          registerForTournament({
            tournamentId: currentTournament.id,
            teamId: selectedTeamId,
            memberIds: selectedMemberIds,
          })
        ).unwrap();
      }

      toast.success("Sikeres regisztráció!");
      setShowRegisterModal(false);
      dispatch(fetchTournament(currentTournament.id));
    } catch (error: any) {
      console.error("Failed to register:", error);
      toast.error(error.message || "Hiba történt a regisztráció során");
    }
  };

  const handleUnregister = (entry: any) => {
    if (!currentTournament) return;

    const targetId = entry.teamId || entry.userId;
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
            })
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
  }) => {
    if (!selectedMatch) return;

    try {
      await dispatch(updateMatch({ matchId: selectedMatch.id, data })).unwrap();
      setShowMatchModal(false);
      setSelectedMatch(null);
    } catch (err) {
      console.error("Failed to update match:", err);
    }
  };

  if (isLoading || !currentTournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 animate-pulse">Betöltés...</p>
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
      (e.userId && e.userId === user?.id)
  );

  const myEntry = currentTournament.entries?.find(
    (e) =>
      (e.teamId && userTeamIds.includes(e.teamId)) ||
      (e.userId && e.userId === user?.id)
  );
  const StatusIcon = statusLabels[currentTournament.status]?.icon || Shield;

  const requiredTeamSize =
    currentTournament.teamSize || currentTournament.game?.teamSize || 1;

  const isQualifierFinished =
    !currentTournament.hasQualifier ||
    (currentTournament.entries?.every(
      (e) => (e.matchesPlayed || 0) >= (currentTournament.qualifierMatches || 0)
    ) ??
      true);

  return (
    <div className="min-h-screen pb-12">
      {/* Hero Section */}
      <div className="relative h-[400px] w-full mb-8 group">
        <div className="absolute inset-0 overflow-hidden">
          {currentTournament.imageUrl ? (
            <img
              src={currentTournament.imageUrl}
              alt={currentTournament.name}
              className="w-full h-full object-cover filter brightness-[0.3] group-hover:brightness-[0.4] transition-all duration-700"
            />
          ) : currentTournament.game?.imageUrl ? (
            <img
              src={currentTournament.game.imageUrl}
              alt={currentTournament.game.name}
              className="w-full h-full object-cover filter brightness-[0.3] group-hover:brightness-[0.4] transition-all duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1016] via-[#0f1016]/80 to-transparent" />
        </div>

        <div className="container mx-auto px-4 h-full relative flex flex-col justify-end pb-12">
          {/* Badges - Moved to bottom left */}
          <div className="absolute bottom-8 left-4 flex flex-wrap items-center gap-3 z-10">
            <span
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${
                statusLabels[currentTournament.status]?.class ||
                "bg-gray-500/20 text-gray-400 border-gray-500/50"
              }`}
            >
              <StatusIcon size={14} />
              {statusLabels[currentTournament.status]?.label ||
                currentTournament.status}
            </span>
            {currentTournament.game && (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/10 backdrop-blur-md">
                {currentTournament.game.name}
              </span>
            )}
          </div>
          <button
            className="absolute top-8 left-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-black/30 hover:bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5"
            onClick={() => navigate("/tournaments")}
          >
            <ArrowLeft size={18} />
            Vissza
          </button>

          <div className="flex flex-col md:flex-row md:items-end gap-8">
            <div className="flex-grow space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                {currentTournament.name}
              </h1>

              {currentTournament.description && (
                <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
                  {currentTournament.description}
                </p>
              )}

              <div className="flex flex-wrap gap-6 text-sm text-gray-300 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-primary" />
                  <span>
                    {startDate.toLocaleDateString("hu-HU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  <span>
                    {currentTournament.participantsCount ??
                      (currentTournament._count?.entries || 0)}{" "}
                    / {currentTournament.maxTeams} résztvevő
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-[200px] mb-5">
              {isRegistrationOpen &&
                isAuthenticated &&
                !isAlreadyRegistered && (
                  <Button
                    onClick={() => setShowRegisterModal(true)}
                    className="w-full bg-primary hover:bg-primary/80 text-white"
                  >
                    <UserPlus size={18} />
                    Regisztráció
                  </Button>
                )}

              {isRegistrationOpen &&
                isAuthenticated &&
                isAlreadyRegistered &&
                myEntry && (
                  <Button
                    onClick={() => handleUnregister(myEntry)}
                    className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                  >
                    <LogOut size={18} />
                    Leiratkozás
                  </Button>
                )}

              {user?.role === "ADMIN" && (
                <Button
                  onClick={() => setShowStatusModal(true)}
                  className="w-full bg-white/10 hover:bg-white/20 border-white/10"
                >
                  Státusz módosítása
                </Button>
              )}

              <Button
                onClick={() => {
                  const shareUrl = `${window.location.protocol}//${window.location.hostname}/share/tournaments/${currentTournament.id}`;
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Megosztási link másolva a vágólapra!");
                }}
                className="w-full bg-white/10 hover:bg-white/20 border-white/10"
              >
                <Share2 size={18} />
                Megosztás
              </Button>

              {(user?.role === "ADMIN" || user?.role === "ORGANIZER") && (
                <Button
                  className="btn btn-secondary w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border-red-500/20"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: "Verseny törlése",
                      message:
                        "Biztosan törölni szeretnéd ezt a versenyt? Ez a művelet nem visszavonható, és minden hozzá tartozó adat (meccsek, eredmények) törlődni fog!",
                      variant: "danger",
                      confirmLabel: "Törlés véglegesen",
                      onConfirm: async () => {
                        try {
                          await dispatch(
                            deleteTournament(currentTournament.id)
                          ).unwrap();
                          toast.success("Verseny sikeresen törölve");
                          navigate("/tournaments");
                        } catch (error) {
                          console.error("Failed to delete tournament:", error);
                          toast.error("Nem sikerült törölni a versenyt");
                        }
                      },
                    });
                  }}
                >
                  <Trash2 size={18} />
                  Verseny törlése
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* Stats Grid */}
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-[#1a1b26] p-6 rounded-xl border border-white/5 shadow-lg flex items-center gap-4 hover:border-primary/30 transition-colors group">
            <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                Formátum
              </p>
              <p className="text-lg font-bold text-white">
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

          <div className="bg-[#1a1b26] p-6 rounded-xl border border-white/5 shadow-lg flex items-center gap-4 hover:border-primary/30 transition-colors group">
            <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                Jelentkezési határidő
              </p>
              <p className="text-lg font-bold text-white">
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
            <div className="bg-[#1a1b26] p-6 rounded-xl border border-white/5 shadow-lg flex items-center gap-4 hover:border-primary/30 transition-colors group">
              <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                  Befejezés
                </p>
                <p className="text-lg font-bold text-white">
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
            <div className="bg-[#1a1b26] p-6 rounded-xl border border-white/5 shadow-lg flex items-center gap-4 hover:border-primary/30 transition-colors group">
              <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                <Award size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                  Díjazás
                </p>
                <p className="text-lg font-bold text-white">
                  {(currentTournament as any).prizePool}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#1a1b26] p-1 rounded-full border border-white/5 inline-flex">
            <button
              className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === "info"
                  ? "bg-primary text-black shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("info")}
            >
              Információk
            </button>
            {currentTournament.hasQualifier && (
              <button
                className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "qualifier"
                    ? "bg-primary text-black shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setActiveTab("qualifier")}
              >
                Selejtező
              </button>
            )}
            <button
              className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === "bracket"
                  ? "bg-primary text-black shadow-lg"
                  : "text-gray-400 hover:text-white"
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
            {/* Participants Section */}
            <div className="bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users size={20} className="text-primary" />
                  {currentTournament.game?.teamSize === 1
                    ? "Regisztrált játékosok"
                    : "Regisztrált résztvevők"}
                </h2>
                <span className="bg-white/5 text-gray-400 text-xs px-2 py-1 rounded">
                  {currentTournament.entries?.length || 0} résztvevő
                </span>
              </div>

              <div className="overflow-x-auto">
                {currentTournament.entries &&
                currentTournament.entries.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium w-20">#</th>
                        <th className="px-6 py-4 font-medium">Résztvevő</th>
                        <th className="px-6 py-4 font-medium">ELO</th>
                        {(user?.role === "ADMIN" ||
                          user?.role === "ORGANIZER") && (
                          <th className="px-6 py-4 font-medium text-right">
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
                        const elo = isSolo
                          ? entry.user!.elo || 1000
                          : entry.team!.elo || 1000;
                        const link = isSolo
                          ? `/profile/${entry.user!.id}`
                          : `/teams/${entry.team!.id}`;

                        return (
                          <tr
                            key={entry.id}
                            className="group hover:bg-white/5 transition-colors"
                          >
                            <td className="px-6 py-4 text-gray-500 font-mono text-sm">
                              #{index + 1}
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                to={link}
                                className="flex items-center gap-3 group/link"
                              >
                                <div className="w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center border border-white/5 overflow-hidden text-primary group-hover/link:border-primary/30 transition-colors">
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
                                <span className="font-medium text-white group-hover/link:text-primary transition-colors">
                                  {name}
                                </span>
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-gray-400 font-mono">
                              {elo}
                            </td>
                            {(user?.role === "ADMIN" ||
                              user?.role === "ORGANIZER") && (
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleUnregister(entry);
                                  }}
                                  className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Users size={48} className="mb-4 opacity-50" />
                    <p>Még nincsenek regisztrált résztvevők</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "qualifier" && currentTournament.hasQualifier && (
          <div className="space-y-8">
            {/* Qualifier Settings */}
            <div className="bg-[#1a1b26] p-6 rounded-xl border border-white/5 shadow-lg flex items-center gap-4 hover:border-primary/30 transition-colors group">
              <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                <Shield size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                  Selejtező
                </p>
                <p className="text-lg font-bold text-white">
                  {currentTournament.qualifierMatches} meccs / min.{" "}
                  {currentTournament.qualifierMinPoints} pont
                </p>
              </div>
            </div>

            {/* Qualifier Results */}
            <div className="bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award size={20} className="text-primary" />
                  Eredmények
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4 font-medium">Kiemelés</th>
                      <th className="px-6 py-4 font-medium">Résztvevő</th>
                      <th className="px-6 py-4 font-medium">Mérkőzések</th>
                      <th className="px-6 py-4 font-medium">Pontszám</th>
                      <th className="px-6 py-4 font-medium text-right">
                        Kezelés
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[...(currentTournament.entries || [])]
                      .sort(
                        (a, b) =>
                          (b.qualifierPoints || 0) - (a.qualifierPoints || 0)
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

                        let rowClass = "hover:bg-white/5";
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
                            <td className="px-6 py-4">
                              <span className="font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">
                                #{entry.seed}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center border border-white/10 overflow-hidden text-xs font-bold text-gray-400">
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
                                    className="font-medium text-white hover:text-primary transition-colors"
                                  >
                                    {name}
                                  </Link>
                                ) : (
                                  <span className="font-medium text-white">
                                    {name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
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
                                  className="bg-black/50 border border-white/20 rounded px-3 py-1 text-white text-sm w-20 focus:outline-none focus:border-primary"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span
                                  className={
                                    currentMatches >= targetMatches
                                      ? "text-green-400 font-bold"
                                      : "text-gray-400"
                                  }
                                >
                                  {currentMatches}{" "}
                                  <span className="text-gray-600 text-xs font-normal">
                                    / {targetMatches}
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
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
                                  className="bg-black/50 border border-white/20 rounded px-3 py-1 text-white text-sm w-20 focus:outline-none focus:border-primary"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span
                                  className={
                                    isQualified
                                      ? "text-green-400 font-bold"
                                      : isFailed
                                      ? "text-red-400 font-bold"
                                      : "text-gray-400"
                                  }
                                >
                                  {currentPoints}{" "}
                                  <span className="text-gray-600 text-xs font-normal">
                                    / {targetPoints}
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
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
                                    className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors inline-flex opacity-0 group-hover:opacity-100"
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
            className={`bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden shadow-2xl ${
              isFullscreen ? "fixed inset-0 z-50 rounded-none" : "relative"
            }`}
          >
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy size={18} className="text-primary" />
                Bracket
              </h2>
              <div className="flex gap-2">
                {(user?.role === "ADMIN" || user?.role === "ORGANIZER") && (
                  <>
                    {!currentTournament.matches?.length ? (
                      <button
                        className={`btn btn-primary btn-sm ${
                          !isQualifierFinished
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
                    )}
                  </>
                )}
                <button
                  className="btn btn-ghost btn-sm text-gray-400 hover:text-white"
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
              className={`overflow-auto flex flex-col ${
                isFullscreen
                  ? "h-[calc(100vh-60px)]"
                  : "min-h-[600px] max-h-[800px]"
              }`}
            >
              <TournamentBracket
                tournament={currentTournament}
                onMatchClick={handleMatchClick}
              />
            </div>
          </div>
        )}
      </div>

      {showRegisterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowRegisterModal(false)}
        >
          <div
            className="bg-[#0f1016]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_50px_-12px_rgba(124,58,237,0.25)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <UserPlus className="text-primary" size={24} />
                Csapat regisztrálása
              </h2>
              <button
                className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                onClick={() => setShowRegisterModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {(user?.role === "ADMIN" || user?.role === "ORGANIZER") && (
                <div className="mb-6 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className="text-blue-400" />
                    <span className="text-sm font-bold text-blue-400">
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
                          className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white/90 text-sm focus:outline-none focus:border-blue-500/50"
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
                                  searchUsers(val)
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
                            <div className="max-h-40 overflow-y-auto bg-black/40 rounded border border-white/5">
                              {searchedUsers.map((u: any) => (
                                <div
                                  key={u.id}
                                  onClick={() => {
                                    setTargetUserId(u.id);
                                    setUserSearchQuery(
                                      u.displayName || u.username
                                    );
                                    setSearchedUsers([]);
                                  }}
                                  className={`p-2 hover:bg-white/5 cursor-pointer flex items-center justify-between text-sm ${
                                    targetUserId === u.id
                                      ? "bg-blue-500/20 text-blue-200"
                                      : "text-gray-300"
                                  }`}
                                >
                                  <span>{u.displayName || u.username}</span>
                                  <span className="text-xs text-gray-500">
                                    {u.username}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        {targetUserId && (
                          <div className="text-xs text-blue-300 mt-1 flex items-center gap-2">
                            Kiválasztva:{" "}
                            <span className="font-bold">{userSearchQuery}</span>
                            <button
                              onClick={() => {
                                setTargetUserId(null);
                                setUserSearchQuery("");
                              }}
                              className="hover:text-white"
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
                          className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white/90 text-sm focus:outline-none focus:border-blue-500/50"
                          value={teamSearchQuery}
                          onChange={(e) => {
                            setTeamSearchQuery(e.target.value);
                            if (e.target.value.length >= 2) {
                              dispatch(fetchTeams({ search: e.target.value }));
                            }
                          }}
                        />
                        {searchedTeams.length > 0 &&
                          teamSearchQuery.length >= 2 && (
                            <div className="max-h-40 overflow-y-auto bg-black/40 rounded border border-white/5">
                              {searchedTeams.map((team) => (
                                <div
                                  key={team.id}
                                  onClick={() => {
                                    setSelectedTeamId(team.id);
                                    setTeamSearchQuery(""); // Hide results but keep selection
                                  }}
                                  className={`p-2 hover:bg-white/5 cursor-pointer flex items-center justify-between text-sm ${
                                    selectedTeamId === team.id
                                      ? "bg-blue-500/20 text-blue-200"
                                      : "text-gray-300"
                                  }`}
                                >
                                  <span>{team.name}</span>
                                  <span className="text-xs text-gray-500">
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
                  <h3 className="text-xl font-bold text-white mb-2">
                    {targetUserId
                      ? "Versenyző regisztrálása"
                      : "Regisztráció egyéni versenyzőként"}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {targetUserId
                      ? `A kiválasztott felhasználó: ${userSearchQuery}`
                      : "Mivel ez egy 1v1 verseny, a saját felhasználóddal fogsz regisztrálni:"}
                  </p>

                  {!targetUserId && (
                    <div className="bg-[#1a1b26] p-4 rounded-xl border border-white/10 flex items-center gap-4 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-lg bg-black/30 border border-white/5 overflow-hidden">
                        {user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-500">
                            {user?.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-white font-bold">
                          {user?.displayName || user?.username}
                        </p>
                        <p className="text-gray-500 text-sm">
                          ELO: {user?.elo || 1000}
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
                    className="w-full bg-[#1a1b26] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner transition-all appearance-none cursor-pointer hover:border-white/20"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    <option value="" className="bg-[#1a1b26]">
                      Válassz csapatot...
                    </option>
                    {myTeams
                      .filter((team) => team.ownerId === user?.id)
                      .map((team) => (
                        <option
                          key={team.id}
                          value={team.id}
                          className="bg-[#1a1b26]"
                        >
                          {team.name} ({team.elo} ELO)
                        </option>
                      ))}
                  </select>

                  {selectedTeam && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 mt-6">
                      {/* ... members selection ... */}
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium text-gray-400">
                          Válaszd ki a versenyzőket
                        </label>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            selectedMemberIds.length === requiredTeamSize
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
                            member.user.id
                          );
                          const isFull =
                            selectedMemberIds.length >= requiredTeamSize;

                          return (
                            <div
                              key={member.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedMemberIds((prev) =>
                                    prev.filter((id) => id !== member.user!.id)
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
                                  ${
                                    isSelected
                                      ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"
                                      : "bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5"
                                  }
                                  ${
                                    !isSelected && isFull
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
                                  ${
                                    isSelected
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
                                className={`relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 transition-transform duration-300 flex-shrink-0 ${
                                  isSelected ? "ring-2 ring-primary/50" : ""
                                }`}
                              >
                                {member.user.avatarUrl ? (
                                  <img
                                    src={member.user.avatarUrl}
                                    alt={member.user.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-400">
                                    {member.user.username
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <div className="overflow-hidden z-10">
                                <p
                                  className={`text-sm font-bold truncate transition-colors ${
                                    isSelected
                                      ? "text-white"
                                      : "text-gray-300 group-hover:text-white"
                                  }`}
                                >
                                  {member.user.displayName ||
                                    member.user.username}
                                </p>
                                <p className="text-xs text-gray-500 truncate font-mono">
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
            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0f1016]/50 backdrop-blur-sm">
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setShowRegisterModal(false)}
              >
                Mégse
              </button>
              <button
                className={`
                    group relative px-8 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-300
                    ${
                      (requiredTeamSize > 1 &&
                        (!selectedTeamId ||
                          selectedMemberIds.length !== requiredTeamSize)) ||
                      (requiredTeamSize === 1 &&
                        targetUserId &&
                        !userSearchQuery)
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-primary to-purple-600 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5"
                    }
                `}
                onClick={handleRegister}
                disabled={
                  (requiredTeamSize > 1 &&
                    (!selectedTeamId ||
                      selectedMemberIds.length !== requiredTeamSize)) ||
                  (requiredTeamSize === 1 && !!targetUserId && !userSearchQuery)
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

      {/* Match Edit Modal */}
      {showMatchModal && selectedMatch && (
        <MatchEditModal
          match={selectedMatch}
          onClose={() => {
            setShowMatchModal(false);
            setSelectedMatch(null);
          }}
          onSave={handleMatchUpdate}
          isLoading={isLoading}
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
    </div>
  );
}
