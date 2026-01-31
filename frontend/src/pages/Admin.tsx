import { useState, useEffect, Suspense, lazy } from "react";
import { toast } from "sonner";
import {
  Users,
  Trophy,
  Calendar,
  Gamepad2,
  Settings,
  Plus,
  Shield,
  Edit2,
  Trash2,
  ArrowUpRight,
  Monitor,
  Search,
  MessageSquare,
  Bug,
  AlertTriangle,
} from "lucide-react";
import { ConfirmationModal } from "../components/common/ConfirmationModal";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { useAuth } from "../hooks/useAuth";
import { fetchGames, deleteGame } from "../store/slices/gamesSlice";
import {
  fetchTournaments,
  deleteTournament,
} from "../store/slices/tournamentsSlice";
// fetchTeams moved to TeamManagement
// import { fetchTeams } from "../store/slices/teamsSlice";

import { Link } from "react-router-dom";
import "./Admin.css";

// Lazy load components
const GameCreateModal = lazy(() =>
  import("../components/admin/GameCreateModal").then((module) => ({
    default: module.GameCreateModal,
  })),
);
const GameEditModal = lazy(() =>
  import("../components/admin/GameEditModal").then((module) => ({
    default: module.GameEditModal,
  })),
);
const GameRankModal = lazy(() =>
  import("../components/admin/GameRankModal").then((module) => ({
    default: module.GameRankModal,
  })),
);
const TournamentCreateModal = lazy(() =>
  import("../components/admin/TournamentCreateModal").then((module) => ({
    default: module.TournamentCreateModal,
  })),
);
const TournamentEditModal = lazy(() =>
  import("../components/admin/TournamentEditModal").then((module) => ({
    default: module.TournamentEditModal,
  })),
);
const TournamentStatusModal = lazy(() =>
  import("../components/admin/TournamentStatusModal").then((module) => ({
    default: module.TournamentStatusModal,
  })),
);
const BookingManagement = lazy(() =>
  import("../components/booking/BookingManagement").then((module) => ({
    default: module.BookingManagement,
  })),
);
const UserManagement = lazy(() =>
  import("../components/admin/UserManagement").then((module) => ({
    default: module.UserManagement,
  })),
);
const TeamManagement = lazy(() =>
  import("../components/admin/TeamManagement").then((module) => ({
    default: module.TeamManagement,
  })),
);
const KioskManager = lazy(() =>
  import("../components/admin/KioskManager").then((module) => ({
    default: module.KioskManager,
  })),
);
const AnnouncementManager = lazy(() =>
  import("../components/admin/AnnouncementManager").then((module) => ({
    default: module.AnnouncementManager,
  })),
);
const BugReportsAdmin = lazy(() =>
  import("../components/admin/BugReportsAdmin").then((module) => ({
    default: module.BugReportsAdmin,
  })),
);
const AdminIncidents = lazy(() =>
  import("../components/admin/AdminIncidents").then((module) => ({
    default: module.AdminIncidents,
  })),
);
import "./Admin.css";
import { authService } from "../lib/auth-service";
import type { Game, Tournament } from "../types";

export function AdminPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { games } = useAppSelector((state) => state.games);

  const { tournaments, pagination: tournamentPagination } = useAppSelector(
    (state) => state.tournaments,
  );

  const [tournamentSearch, setTournamentSearch] = useState("");
  const [debouncedTournamentSearch, setDebouncedTournamentSearch] =
    useState("");
  const [tournamentPage, setTournamentPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTournamentSearch(tournamentSearch);
      setTournamentPage(1); // Reset page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [tournamentSearch]);

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "users"
    | "teams"
    | "tournaments"
    | "games"
    | "bookings"
    | "kiosk"
    | "announcements"
    | "bugreports"
    | "incidents"
  >("overview");
  const [stats, setStats] = useState({
    activeTournaments: 0,
    registeredUsers: 0,
    createdTeams: 0,
    playedMatches: 0,
    recentRegistrations: [] as any[],
  });
  const [showGameModal, setShowGameModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(
    null,
  );
  const [statusTournament, setStatusTournament] = useState<Tournament | null>(
    null,
  );
  const [editingGameRanks, setEditingGameRanks] = useState<Game | null>(null);

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

  useEffect(() => {
    const loadData = async () => {
      dispatch(fetchGames());
      dispatch(
        fetchTournaments({
          page: tournamentPage,
          search: debouncedTournamentSearch,
        }),
      );
      // fetchTeams is handled in TeamManagement component
      // Booking and Computer fetching moved to BookingManagement component

      if (user) {
        try {
          const token = authService.keycloak?.token;
          const response = await fetch(
            `${
              import.meta.env.VITE_API_URL || "http://localhost:3000/api"
            }/stats`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const data = await response.json();
          if (data) {
            setStats(data);
          }
        } catch (error) {
          console.error("Failed to fetch stats:", error);
        }
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, [dispatch, user, tournamentPage, debouncedTournamentSearch]);

  const handleDeleteGame = (gameId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Játék törlése",
      message:
        "Biztosan törölni szeretnéd ezt a játékot? Ez a művelet nem visszavonható!",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        try {
          await dispatch(deleteGame(gameId)).unwrap();
          toast.success("Játék sikeresen törölve");
        } catch (error) {
          console.error("Failed to delete game:", error);
          toast.error(
            "Nem sikerült törölni a játékot. Ellenőrizd, hogy nincsenek-e hozzárendelt versenyek.",
          );
        }
      },
    });
  };

  const handleDeleteTournament = (tournamentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Verseny törlése",
      message:
        "Biztosan törölni szeretnéd ezt a versenyt? Ez a művelet nem visszavonható, és minden hozzá tartozó adat (meccsek, eredmények) törlődni fog!",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        try {
          await dispatch(deleteTournament(tournamentId)).unwrap();
          toast.success("Verseny sikeresen törölve");
        } catch (error) {
          console.error("Failed to delete tournament:", error);
          toast.error("Nem sikerült törölni a versenyt");
        }
      },
    });
  };

  if (
    !user ||
    (user.role !== "ADMIN" &&
      user.role !== "ORGANIZER" &&
      user.role !== "TEACHER")
  ) {
    return (
      <div className="container py-5">
        <div className="alert alert-error">
          Nincs jogosultságod az admin felület megtekintéséhez.
        </div>
      </div>
    );
  }

  const totalUsers = stats.registeredUsers;
  const totalTournaments = stats.activeTournaments;
  const activeTournaments = tournaments.filter(
    (t) => t.status === "IN_PROGRESS",
  ).length;
  const totalTeams = stats.createdTeams;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { class: string; label: string }> = {
      DRAFT: {
        class: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        label: "Piszkozat",
      },
      REGISTRATION: {
        class: "bg-green-500/10 text-green-500 border-green-500/20",
        label: "Regisztráció",
      },
      IN_PROGRESS: {
        class: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        label: "Folyamatban",
      },
      COMPLETED: {
        class: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        label: "Befejezett",
      },
      CANCELLED: {
        class: "bg-red-500/10 text-red-500 border-red-500/20",
        label: "Törölve",
      },
    };
    const config = statusConfig[status] || {
      class: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      label: status,
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium border ${config.class}`}
      >
        {config.label}
      </span>
    );
  };

  const canManageComputers = user?.role === "ADMIN" || user?.role === "TEACHER";

  const tabs = [
    { id: "overview", label: "Áttekintés", icon: Settings },
    { id: "users", label: "Felhasználók", icon: Users },
    { id: "teams", label: "Csapatok", icon: Shield },
    { id: "tournaments", label: "Versenyek", icon: Trophy },
    { id: "games", label: "Játékok", icon: Gamepad2 },
    { id: "announcements", label: "Bejelentések", icon: MessageSquare },
    { id: "bugreports", label: "Hibajelentések", icon: Bug },
    { id: "incidents", label: "Incidensek", icon: AlertTriangle },
    ...(canManageComputers
      ? [
          { id: "bookings", label: "Gépfoglalás", icon: Calendar },
          { id: "kiosk", label: "Gépterem", icon: Monitor },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen animate-fade-in pb-20">
      {/* Header Section */}
      <div className="mb-0">
        <h1 className="text-3xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-2">
          Menedzsment Dashboard
        </h1>
        <p className="text-muted-foreground">
          Rendszer kezelés és statisztikák áttekintése
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
        <div className="relative group overflow-hidden rounded-2xl bg-[#0f1016] border border-white/5 p-6 hover:border-primary/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col md:flex-row justify-between items-center md:items-start text-center md:text-left gap-4 md:gap-0">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">
                Felhasználók
              </p>
              <h3 className="text-3xl font-bold text-white">{totalUsers}</h3>
            </div>
            <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="relative group overflow-hidden rounded-2xl bg-[#0f1016] border border-white/5 p-6 hover:border-blue-500/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col md:flex-row justify-between items-center md:items-start text-center md:text-left gap-4 md:gap-0">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">
                Versenyek
              </p>
              <h3 className="text-3xl font-bold text-white">
                {totalTournaments}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
              <Trophy size={24} />
            </div>
          </div>
        </div>

        <div className="relative group overflow-hidden rounded-2xl bg-[#0f1016] border border-white/5 p-6 hover:border-emerald-500/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col md:flex-row justify-between items-center md:items-start text-center md:text-left gap-4 md:gap-0">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">
                Csapatok
              </p>
              <h3 className="text-3xl font-bold text-white">{totalTeams}</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="relative group overflow-hidden rounded-2xl bg-[#0f1016] border border-white/5 p-6 hover:border-pink-500/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col md:flex-row justify-between items-center md:items-start text-center md:text-left gap-4 md:gap-0">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">
                Játékok
              </p>
              <h3 className="text-3xl font-bold text-white">{games.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400">
              <Gamepad2 size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Tabs Navigation */}
      <div className="flex overflow-x-auto pb-4 mb-6 gap-2 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap
                                ${
                                  isActive
                                    ? "bg-primary text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                                    : "bg-[#0f1016] border border-white/5 text-muted-foreground hover:text-white hover:bg-white/5"
                                }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="bg-[#0f1016] border border-white/5 rounded-2xl p-6 min-h-[500px]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-[400px]">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          {activeTab === "overview" && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings className="text-primary" size={24} />
                Áttekintés
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Registrations */}
                <div className="rounded-xl border border-white/5 bg-[#161722] p-6 flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Users size={18} />
                    </span>
                    Legutóbbi verseny regisztrációk
                  </h3>
                  <div className="flex-1">
                    {(() => {
                      const recentEntries = stats.recentRegistrations || [];

                      if (recentEntries.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center py-12 text-muted-foreground bg-white/5 rounded-lg border border-white/5 border-dashed">
                            <Users size={32} className="mb-2 opacity-30" />
                            <p className="text-sm">
                              Még nincs regisztrált versenyző
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {recentEntries.map((entry) => {
                            const isSolo = !!entry.user;
                            const name = isSolo
                              ? entry.user?.displayName || entry.user?.username
                              : entry.team?.name;
                            const avatar = isSolo
                              ? entry.user?.avatarUrl
                              : entry.team?.logoUrl;

                            const tournamentName =
                              entry.tournament?.name || "Ismeretlen verseny";
                            const gameName = entry.tournament?.game?.name;

                            return (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center overflow-hidden border border-white/10">
                                    {avatar ? (
                                      <img
                                        src={avatar}
                                        alt={name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-xs font-bold text-gray-500">
                                        {name?.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                                      {name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {tournamentName}
                                      {gameName && (
                                        <span className="opacity-50">
                                          {" "}
                                          • {gameName}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-gray-400 font-mono">
                                    {new Date(
                                      entry.registeredAt,
                                    ).toLocaleDateString("hu-HU", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Active Tournaments */}
                <div className="rounded-xl border border-white/5 bg-[#161722] p-6 flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                      <Trophy size={18} />
                    </span>
                    Aktív versenyek
                  </h3>
                  {activeTournaments > 0 ? (
                    <div className="space-y-3">
                      {tournaments
                        .filter((t) => t.status === "IN_PROGRESS")
                        .map((t) => {
                          const filled =
                            t.participantsCount || t._count?.entries || 0;
                          const max = t.maxTeams || 16;
                          const progress = Math.min((filled / max) * 100, 100);

                          return (
                            <div
                              key={t.id}
                              className="flex flex-col gap-3 p-4 rounded-lg bg-white/5 border border-white/5 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all group"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                                  <div>
                                    <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                                      {t.name}
                                    </h4>
                                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                                      <Gamepad2 size={12} />
                                      {t.game?.name}
                                    </span>
                                  </div>
                                </div>
                                <Link
                                  to={`/tournaments/${t.id}`}
                                  className="p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors"
                                >
                                  <ArrowUpRight size={18} />
                                </Link>
                              </div>

                              {/* Progress & Info */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Résztvevők</span>
                                  <span className="text-white font-mono">
                                    {filled} / {max}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-muted-foreground bg-white/5 rounded-lg border border-white/5 border-dashed">
                      <Trophy size={32} className="mb-2 opacity-30" />
                      <p className="text-sm">Nincs aktív verseny</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "games" && (
            <div className="animate-fade-in">
              <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Gamepad2 className="text-pink-500" size={24} />
                    Játék kezelés
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Játékok és rangok kezelése
                  </p>
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
                  onClick={() => setShowGameModal(true)}
                >
                  <Plus size={18} />
                  <span>Új játék hozzáadása</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {games.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/5 rounded-xl border border-white/10 border-dashed">
                    <Gamepad2 size={48} className="text-gray-500 mb-4" />
                    <p className="text-muted-foreground text-lg mb-6">
                      Még nincs játék létrehozva
                    </p>
                    <button
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                      onClick={() => setShowGameModal(true)}
                    >
                      Játék létrehozása
                    </button>
                  </div>
                ) : (
                  games.map((game) => (
                    <div
                      key={game.id}
                      className="group flex flex-col bg-[#161722] rounded-2xl overflow-hidden border border-white/5 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all duration-300"
                    >
                      {/* Image & Overlay */}
                      <div className="relative w-full aspect-video overflow-hidden bg-gray-900">
                        {game.imageUrl ? (
                          <img
                            src={game.imageUrl}
                            alt={game.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Gamepad2 size={40} className="text-gray-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                      </div>

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-grow">
                        <h3 className="text-lg font-bold text-white mb-2 truncate">
                          {game.name}
                        </h3>
                        <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[2.5em]">
                          {game.description ||
                            "Nincs leírás megadva a játékhoz."}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-6 mt-auto">
                          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5">
                            <Trophy size={12} className="text-yellow-500" />
                            {game._count?.tournaments || 0} verseny
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-2 mt-auto">
                          <button
                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all gap-1 border border-transparent hover:border-white/10"
                            onClick={() => setEditingGameRanks(game)}
                            title="Rangok kezelése"
                          >
                            <Shield size={16} />
                            <span className="text-[10px] font-medium">
                              Rangok
                            </span>
                          </button>
                          <button
                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-primary/10 text-gray-400 hover:text-primary transition-all gap-1 border border-transparent hover:border-primary/20"
                            onClick={() => setEditingGame(game)}
                            title="Szerkesztés"
                          >
                            <Edit2 size={16} />
                            <span className="text-[10px] font-medium">
                              Szerk.
                            </span>
                          </button>
                          <button
                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all gap-1 border border-transparent hover:border-red-500/20"
                            onClick={() => handleDeleteGame(game.id)}
                            title="Törlés"
                          >
                            <Trash2 size={16} />
                            <span className="text-[10px] font-medium">
                              Törlés
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "bookings" && (
            <div className="animate-fade-in">
              <BookingManagement />
            </div>
          )}

          {activeTab === "kiosk" && (
            <div className="animate-fade-in">
              <KioskManager />
            </div>
          )}

          {activeTab === "users" && (
            <div className="animate-fade-in">
              <UserManagement />
            </div>
          )}

          {activeTab === "teams" && (
            <div className="animate-fade-in">
              <TeamManagement />
            </div>
          )}

          {activeTab === "announcements" && (
            <div className="animate-fade-in">
              <AnnouncementManager />
            </div>
          )}

          {activeTab === "bugreports" && (
            <div className="animate-fade-in">
              <BugReportsAdmin />
            </div>
          )}

          {activeTab === "incidents" && (
            <div className="animate-fade-in">
              <AdminIncidents />
            </div>
          )}

          {activeTab === "tournaments" && (
            <div className="animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={24} />
                    Verseny kezelés
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Versenyek létrehozása és szerkesztése
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <input
                      type="text"
                      placeholder="Keresés..."
                      value={tournamentSearch}
                      onChange={(e) => setTournamentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#0f1015] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                    />
                  </div>
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 whitespace-nowrap"
                    onClick={() => setShowTournamentModal(true)}
                  >
                    <Plus size={18} />
                    <span>Új verseny</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 overflow-hidden bg-[#161722]/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold">Név</th>
                        <th className="p-4 font-semibold">Játék</th>
                        <th className="p-4 font-semibold">Formátum</th>
                        <th className="p-4 font-semibold">Státusz</th>
                        <th className="p-4 font-semibold text-center">
                          Létszám
                        </th>
                        <th className="p-4 font-semibold">Kezdés</th>
                        <th className="p-4 font-semibold text-right">
                          Műveletek
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tournaments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center p-12 text-muted-foreground"
                          >
                            <Trophy
                              size={32}
                              className="mx-auto mb-3 opacity-20"
                            />
                            Még nincs verseny létrehozva
                          </td>
                        </tr>
                      ) : (
                        tournaments.map((tournament) => (
                          <tr
                            key={tournament.id}
                            className="group hover:bg-white/5 transition-colors"
                          >
                            <td className="p-4 font-medium text-white group-hover:text-primary transition-colors">
                              {tournament.name}
                            </td>
                            <td className="p-4 text-gray-300">
                              {tournament.game?.name || "-"}
                            </td>
                            <td className="p-4 text-sm text-gray-400">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-xs mr-2">
                                {(tournament.teamSize ||
                                  tournament.game?.teamSize ||
                                  1) +
                                  "v" +
                                  (tournament.teamSize ||
                                    tournament.game?.teamSize ||
                                    1)}
                              </span>
                              {tournament.format === "SINGLE_ELIMINATION" &&
                                "Egyenes kiesés"}
                              {tournament.format === "DOUBLE_ELIMINATION" &&
                                "Dupla ágrajz"}
                              {tournament.format === "ROUND_ROBIN" &&
                                "Körmérkőzés"}
                              {tournament.format === "SWISS" &&
                                "Svájci rendszer"}
                            </td>
                            <td className="p-4">
                              {getStatusBadge(tournament.status)}
                            </td>
                            <td className="p-4 text-sm text-center font-mono bg-black/20 rounded">
                              {tournament._count?.entries || 0} /{" "}
                              {tournament.maxTeams}
                            </td>
                            <td className="p-4 text-sm text-gray-400 font-mono">
                              {new Date(
                                tournament.startDate,
                              ).toLocaleDateString("hu-HU", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="p-4 text-right flex gap-2 justify-end">
                              <button
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                onClick={() => setStatusTournament(tournament)}
                                title="Státusz módosítása"
                              >
                                <Settings size={18} />
                              </button>
                              <button
                                className="p-2 rounded-lg bg-white/5 hover:bg-primary/10 text-gray-400 hover:text-primary transition-colors"
                                onClick={() => setEditingTournament(tournament)}
                                title="Szerkesztés"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                onClick={() =>
                                  handleDeleteTournament(tournament.id)
                                }
                                title="Törlés"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {tournamentPagination && tournamentPagination.pages > 1 && (
                  <div className="flex justify-center p-4 border-t border-white/5 gap-2 bg-[#161722]">
                    {Array.from(
                      { length: tournamentPagination.pages },
                      (_, i) => i + 1,
                    ).map((page) => (
                      <button
                        key={page}
                        onClick={() => setTournamentPage(page)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          tournamentPagination.page === page
                            ? "bg-primary text-white"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Suspense>
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        {showGameModal && (
          <GameCreateModal onClose={() => setShowGameModal(false)} />
        )}

        {editingGame && (
          <GameEditModal
            game={editingGame}
            onClose={() => setEditingGame(null)}
          />
        )}

        {editingGameRanks && (
          <GameRankModal
            game={editingGameRanks}
            onClose={() => setEditingGameRanks(null)}
          />
        )}

        {showTournamentModal && (
          <TournamentCreateModal
            onClose={() => setShowTournamentModal(false)}
          />
        )}

        {editingTournament && (
          <TournamentEditModal
            tournament={editingTournament}
            onClose={() => setEditingTournament(null)}
          />
        )}

        {statusTournament && (
          <TournamentStatusModal
            tournamentId={statusTournament.id}
            currentStatus={statusTournament.status}
            currentNotifyUsers={statusTournament.notifyUsers}
            currentNotifyDiscord={statusTournament.notifyDiscord}
            currentDiscordChannel={statusTournament.discordChannelId}
            onClose={() => setStatusTournament(null)}
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
      </Suspense>
    </div>
  );
}
