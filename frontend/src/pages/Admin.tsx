import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { useAuth } from "../hooks/useAuth";
import { fetchGames, deleteGame } from "../store/slices/gamesSlice";
import {
  fetchTournaments,
  deleteTournament,
} from "../store/slices/tournamentsSlice";
import { fetchTeams } from "../store/slices/teamsSlice";
import { fetchSchedules, fetchComputers } from "../store/slices/bookingsSlice";
import { GameCreateModal } from "../components/admin/GameCreateModal";
import { GameEditModal } from "../components/admin/GameEditModal";
import { GameRankModal } from "../components/admin/GameRankModal";
import { TournamentCreateModal } from "../components/admin/TournamentCreateModal";
import { TournamentEditModal } from "../components/admin/TournamentEditModal";
import { TournamentStatusModal } from "../components/admin/TournamentStatusModal";
import { BookingManagement } from "../components/booking/BookingManagement";
import { UserManagement } from "../components/admin/UserManagement";
import { KioskManager } from "../components/admin/KioskManager";
import { Link } from "react-router-dom";
import "./Admin.css";
import { authService } from "../lib/auth-service";
import type { Game, Tournament } from "../types";

export function AdminPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { games } = useAppSelector((state) => state.games);
  const { tournaments } = useAppSelector((state) => state.tournaments);

  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "tournaments" | "games" | "bookings" | "kiosk"
  >("overview");
  const [stats, setStats] = useState({
    activeTournaments: 0,
    registeredUsers: 0,
    createdTeams: 0,
    playedMatches: 0,
  });
  const [showGameModal, setShowGameModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(
    null
  );
  const [statusTournament, setStatusTournament] = useState<Tournament | null>(
    null
  );
  const [editingGameRanks, setEditingGameRanks] = useState<Game | null>(null);

  useEffect(() => {
    dispatch(fetchGames());
    dispatch(fetchTournaments({}));
    dispatch(fetchTeams({ page: 1 }));
    dispatch(fetchSchedules());
    dispatch(fetchComputers());

    // Fetch stats
    const fetchStats = async () => {
      try {
        const token = authService.keycloak?.token;
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL || "http://localhost:3000/api"
          }/stats`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (data) {
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    if (user) fetchStats();
  }, [dispatch, user]);

  const handleDeleteGame = async (gameId: string) => {
    if (
      confirm(
        "Biztosan törölni szeretnéd ezt a játékot? Ez a művelet nem visszavonható!"
      )
    ) {
      try {
        await dispatch(deleteGame(gameId)).unwrap();
        toast.success("Játék sikeresen törölve");
      } catch (error) {
        console.error("Failed to delete game:", error);
        toast.error(
          "Nem sikerült törölni a játékot. Ellenőrizd, hogy nincsenek-e hozzárendelt versenyek."
        );
      }
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (
      confirm(
        "Biztosan törölni szeretnéd ezt a versenyt? Ez a művelet nem visszavonható, és minden hozzá tartozó adat (meccsek, eredmények) törlődni fog!"
      )
    ) {
      try {
        await dispatch(deleteTournament(tournamentId)).unwrap();
        toast.success("Verseny sikeresen törölve");
      } catch (error) {
        console.error("Failed to delete tournament:", error);
        toast.error("Nem sikerült törölni a versenyt");
      }
    }
  };

  if (!user || (user.role !== "ADMIN" && user.role !== "ORGANIZER")) {
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
    (t) => t.status === "IN_PROGRESS"
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

  const tabs = [
    { id: "overview", label: "Áttekintés", icon: Settings },
    { id: "users", label: "Felhasználók", icon: Users },
    { id: "tournaments", label: "Versenyek", icon: Trophy },
    { id: "games", label: "Játékok", icon: Gamepad2 },
    { id: "bookings", label: "Gépfoglalás", icon: Calendar },
    { id: "kiosk", label: "Gépterem", icon: Monitor },
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
          <div className="relative flex justify-between items-start">
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
          <div className="relative flex justify-between items-start">
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
          <div className="relative flex justify-between items-start">
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
          <div className="relative flex justify-between items-start">
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
        {activeTab === "overview" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="text-primary" size={24} />
              Áttekintés
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/5 bg-black/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Legutóbbi regisztrációk
                </h3>
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-white/5 rounded-lg border border-white/5 border-dashed">
                  <Users size={32} className="mb-2 opacity-50" />
                  <p>Hamarosan...</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Aktív versenyek
                </h3>
                {activeTournaments > 0 ? (
                  <div className="space-y-3">
                    {tournaments
                      .filter((t) => t.status === "IN_PROGRESS")
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="font-medium text-white">
                              {t.name}
                            </span>
                          </div>
                          <Link
                            to={`/tournaments/${t.id}`}
                            className="p-2 rounded-lg hover:bg-white/10 text-primary transition-colors"
                          >
                            <ArrowUpRight size={18} />
                          </Link>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-white/5 rounded-lg border border-white/5 border-dashed">
                    <Trophy size={32} className="mb-2 opacity-50" />
                    <p>Nincs aktív verseny</p>
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

                      {/* Team Size Badge */}
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                        {game.teamSize} vs {game.teamSize}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="text-lg font-bold text-white mb-2 truncate">
                        {game.name}
                      </h3>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[2.5em]">
                        {game.description || "Nincs leírás megadva a játékhoz."}
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

        {activeTab === "tournaments" && (
          <div className="animate-fade-in">
            <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="text-yellow-500" size={24} />
                  Verseny kezelés
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Versenyek létrehozása és szerkesztése
                </p>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
                onClick={() => setShowTournamentModal(true)}
              >
                <Plus size={18} />
                <span>Új verseny</span>
              </button>
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
                      <th className="p-4 font-semibold text-center">Létszám</th>
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
                            {tournament.format === "SINGLE_ELIMINATION" &&
                              "Egyenes kiesés"}
                            {tournament.format === "DOUBLE_ELIMINATION" &&
                              "Dupla ágrajz"}
                            {tournament.format === "ROUND_ROBIN" &&
                              "Körmérkőzés"}
                            {tournament.format === "SWISS" && "Svájci rendszer"}
                          </td>
                          <td className="p-4">
                            {getStatusBadge(tournament.status)}
                          </td>
                          <td className="p-4 text-sm text-center font-mono bg-black/20 rounded">
                            {tournament._count?.entries || 0} /{" "}
                            {tournament.maxTeams}
                          </td>
                          <td className="p-4 text-sm text-gray-400 font-mono">
                            {new Date(tournament.startDate).toLocaleDateString(
                              "hu-HU",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
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
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
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
        <TournamentCreateModal onClose={() => setShowTournamentModal(false)} />
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
    </div>
  );
}
