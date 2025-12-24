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
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { useAuth } from "../hooks/useAuth";
import {
  fetchTournament,
  clearCurrentTournament,
  registerForTournament,
  generateBracket,
  updateMatch,
  updateEntryStats,
  deleteTournament,
} from "../store/slices/tournamentsSlice";
import { fetchMyTeams, fetchTeams } from "../store/slices/teamsSlice";
import { TournamentStatusModal } from "../components/admin";
import { TournamentBracket, MatchEditModal } from "../components/tournament";
import type { Match } from "../types";
import { Button } from "@/components/ui/button";

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
  const [activeTab, setActiveTab] = useState<"info" | "bracket" | "qualifier">(
    "info"
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Qualifier editing state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
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
    }
    if (isAuthenticated) {
      dispatch(fetchMyTeams());
    }

    return () => {
      dispatch(clearCurrentTournament());
    };
  }, [id, dispatch, isAuthenticated]);

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

  const handleRegister = async () => {
    if (!selectedTeamId || !currentTournament) return;

    // Validation for team size
    const requiredTeamSize =
      currentTournament.teamSize || currentTournament.game?.teamSize || 1;
    if (requiredTeamSize > 1 && selectedMemberIds.length !== requiredTeamSize) {
      toast.error(`Kérlek válassz ki pontosan ${requiredTeamSize} tagot!`);
      return;
    }

    try {
      if (currentTournament.requireRank && currentTournament.gameId) {
        // Identify members without a rank for this game
        const membersWithoutRank: string[] = [];

        if (requiredTeamSize > 1) {
          selectedTeam?.members?.forEach((member) => {
            if (selectedMemberIds.includes(member.userId) && member.user) {
              // Check if user has a rank for this game
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
        } else if (user) {
          // Solo tournament, check current user
          // NOTE: We need to ensure 'user' from auth context has 'ranks' loaded.
          // If not, we might be blocked. Ideally user object should have it, or we rely on backend check.
          // However, for now, let's trust the 'myTeams' data which definitely has it.
          // But wait, for solo, 'user' comes from auth hook which might NOT have ranks deep loaded.
          // Let's rely on backend for solo or try to check if we have it.
          // Actually, let's skip frontend check for solo for now unless we are sure we have the data,
          // to avoid false positives blocking legitimate users.
          // Backend will catch it anyway.
        }

        if (membersWithoutRank.length > 0) {
          toast.error(
            `A következő tagoknak nincs rangja: ${membersWithoutRank.join(
              ", "
            )}`
          );
          return;
        }
      }

      await dispatch(
        registerForTournament({
          tournamentId: currentTournament.id,
          teamId: selectedTeamId,
          memberIds: requiredTeamSize > 1 ? selectedMemberIds : undefined,
        })
      ).unwrap();

      setShowRegisterModal(false);
      dispatch(fetchTournament(currentTournament.id));
      toast.success("Sikeres regisztráció!");
    } catch (err: any) {
      console.error("Failed to register:", err);
      toast.error(err?.message || "Nem sikerült regisztrálni a versenyre");
    }
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
    (e) => e.teamId && userTeamIds.includes(e.teamId)
  );
  const StatusIcon = statusLabels[currentTournament.status]?.icon || Shield;

  const requiredTeamSize =
    currentTournament.teamSize || currentTournament.game?.teamSize || 1;
  const selectedTeam =
    myTeams.find((t) => t.id === selectedTeamId) ||
    searchedTeams.find((t) => t.id === selectedTeamId);

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
                    {currentTournament._count?.entries || 0} /{" "}
                    {currentTournament.maxTeams} résztvevő
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
                  onClick={async () => {
                    if (
                      confirm(
                        "Biztosan törölni szeretnéd ezt a versenyt? Ez a művelet nem visszavonható, és minden hozzá tartozó adat (meccsek, eredmények) törlődni fog!"
                      )
                    ) {
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
                    }
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

              <div className="p-6">
                {currentTournament.entries &&
                currentTournament.entries.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentTournament.entries.map((entry) => {
                      if (entry.user && !entry.team) {
                        // Solo Player Card
                        return (
                          <Link
                            key={entry.id}
                            to={`/profile/${entry.user.id}`}
                            className="relative group overflow-hidden rounded-xl border border-white/10 bg-[#252632] hover:border-primary/50 transition-all duration-300 block"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative p-4 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-black/30 flex items-center justify-center border border-white/5 overflow-hidden text-primary">
                                {entry.user.avatarUrl ? (
                                  <img
                                    src={entry.user.avatarUrl}
                                    alt={
                                      entry.user.displayName ||
                                      entry.user.username
                                    }
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xl font-bold">
                                    {(
                                      entry.user.displayName ||
                                      entry.user.username
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div className="flex-grow">
                                <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">
                                  {entry.user.displayName ||
                                    entry.user.username}
                                </h3>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-400">
                                    ELO:{" "}
                                    <span className="text-white">
                                      {entry.user.elo || 1000}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end">
                                <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                  Kiemelés
                                </span>
                                <span className="font-mono text-xl font-bold text-white/20 group-hover:text-primary/50 transition-colors">
                                  #{entry.seed}
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      } else if (entry.team) {
                        // Team Card
                        return (
                          <Link
                            key={entry.id}
                            to={`/teams/${entry.team.id}`}
                            className="relative group overflow-hidden rounded-xl border border-white/10 bg-[#252632] hover:border-primary/50 transition-all duration-300 block"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative p-4 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-black/30 flex items-center justify-center border border-white/5 overflow-hidden text-primary">
                                {entry.team.logoUrl ? (
                                  <img
                                    src={entry.team.logoUrl}
                                    alt={entry.team.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Users size={24} />
                                )}
                              </div>

                              <div className="flex-grow">
                                <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">
                                  {entry.team.name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-400">
                                    ELO:{" "}
                                    <span className="text-white">
                                      {entry.team.elo}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end">
                                <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                  Kiemelés
                                </span>
                                <span className="font-mono text-xl font-bold text-white/20 group-hover:text-primary/50 transition-colors">
                                  #{entry.seed}
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      }
                      return null;
                    })}
                  </div>
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
                        className="btn btn-primary btn-sm"
                        onClick={handleGenerateBracket}
                      >
                        Bracket generálása
                      </button>
                    ) : (
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Biztosan újra akarod generálni a bracketet? Ez törli az összes jelenlegi meccset és eredményt!"
                            )
                          ) {
                            handleGenerateBracket();
                          }
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
                  </div>
                </div>
              )}

              <p className="text-gray-300 mb-4">
                Válaszd ki a csapatot, amellyel regisztrálni szeretnél:
              </p>
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

              {selectedTeam && requiredTeamSize > 1 && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
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
                                {member.user.username.charAt(0).toUpperCase()}
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
                              {member.user.displayName || member.user.username}
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
                      !selectedTeamId ||
                      (requiredTeamSize > 1 &&
                        selectedMemberIds.length !== requiredTeamSize)
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-primary to-purple-600 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5"
                    }
                `}
                onClick={handleRegister}
                disabled={
                  !selectedTeamId ||
                  (requiredTeamSize > 1 &&
                    selectedMemberIds.length !== requiredTeamSize)
                }
              >
                <span className="relative z-10 flex items-center gap-2">
                  Regisztráció
                  <ArrowLeft
                    size={16}
                    className="rotate-180 group-hover:translate-x-1 transition-transform"
                  />
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
    </div>
  );
}
