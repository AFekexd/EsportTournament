import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Calendar,
  Users,
  Filter,
  Search,
  ArrowRight,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchTournaments } from "../store/slices/tournamentsSlice";
import { fetchGames } from "../store/slices/gamesSlice";
import type { Tournament, Game } from "../types";

const statusLabels: Record<string, { label: string; colors: string }> = {
  DRAFT: {
    label: "Tervezet",
    colors: "bg-gray-500/60 text-gray-400 border-gray-500/20 !text-white",
  },
  REGISTRATION: {
    label: "Regisztráció",
    colors: "bg-green-500/60 text-green-400 border-green-500/20 !text-white",
  },
  IN_PROGRESS: {
    label: "Folyamatban",
    colors:
      "bg-yellow-500/50 text-yellow-400 border-yellow-500/20 !text-yellow-300",
  },
  COMPLETED: {
    label: "Befejezett",
    colors: "bg-primary/80 text-primary border-primary/20 !text-white",
  },
  CANCELLED: {
    label: "Törölve",
    colors: "bg-red-500/60 text-red-400 border-red-500/20 !text-white",
  },
};

const formatLabels: Record<string, string> = {
  SINGLE_ELIMINATION: "Single Elim.",
  DOUBLE_ELIMINATION: "Double Elim.",
  ROUND_ROBIN: "Körmérkőzés",
  SWISS: "Svájci",
};

const teamSizeLabels: Record<number, string> = {
  1: "1v1",
  2: "2v2",
  3: "3v3",
  5: "5v5",
};

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const startDate = new Date(tournament.startDate);
  const regDeadline = new Date(tournament.registrationDeadline);
  const statusInfo = statusLabels[tournament.status] || statusLabels.DRAFT;
  const teamSize = tournament.teamSize || tournament.game?.teamSize || 1;

  return (
    <Link
      to={`/tournaments/${tournament.id}`}
      className="group relative flex flex-col bg-[#1a1b26] rounded-xl overflow-hidden border border-white/5 shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1"
    >
      {/* Game Image Header */}
      <div className="relative w-full h-48 overflow-hidden bg-[#0f1015]">
        {tournament.imageUrl || tournament.game?.imageUrl ? (
          <img
            src={tournament.imageUrl || tournament.game?.imageUrl}
            alt={tournament.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <Trophy size={48} className="text-slate-600" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b26] via-transparent to-transparent opacity-90" />

        {/* Team Size Badge */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg z-10">
          <span className="text-xs font-bold text-white tracking-wider flex items-center gap-1">
            <Users size={12} className="text-primary" />
            {teamSizeLabels[teamSize] || `${teamSize}v${teamSize}`}
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${statusInfo.colors}`}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Game Name Badge */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs font-bold text-white">
            {tournament.game?.name}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-1">
          {tournament.name}
        </h3>

        {tournament.description && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">
            {tournament.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <div>
              <p className="text-xs text-gray-500">Kezdés</p>
              <p className="text-xs font-medium text-white">
                {startDate.toLocaleDateString("hu-HU")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            <div>
              <p className="text-xs text-gray-500">
                {teamSize === 1 ? "Játékosok" : "Csapatok"}
              </p>
              <p className="text-xs font-medium text-white">
                {tournament._count?.entries || 0} / {tournament.maxTeams}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="px-2 py-1 bg-white/5 rounded text-gray-400 font-medium">
              {formatLabels[tournament.format]}
            </span>
            {tournament.status === "REGISTRATION" && (
              <span className="text-green-400 font-medium">
                Reg: {regDeadline.toLocaleDateString("hu-HU")}
              </span>
            )}
          </div>

          {/* Action Link */}
          <div className="flex items-center justify-between text-sm font-semibold text-primary mt-2">
            <span>Részletek megtekintése</span>
            <ArrowRight
              size={16}
              className="transform transition-transform group-hover:translate-x-1"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function TournamentsPage() {
  const dispatch = useAppDispatch();
  const { tournaments, isLoading, pagination } = useAppSelector(
    (state) => state.tournaments
  );
  const { games } = useAppSelector((state) => state.games);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [gameFilter, setGameFilter] = useState<string>("");

  useEffect(() => {
    dispatch(
      fetchTournaments({ page: 1, status: statusFilter, gameId: gameFilter })
    );
    dispatch(fetchGames());
  }, [dispatch, statusFilter, gameFilter]);

  const filteredTournaments = tournaments.filter((t: Tournament) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Modern Header with Gradient */}
      <div className="mb-12 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-3xl rounded-full -z-10" />
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary-100 to-gray-400 bg-clip-text text-transparent mb-4">
          Versenyek
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Böngészd a közelgő és folyamatban lévő versenyeket, és mutasd meg a
          tudásod!
        </p>
      </div>

      {/* Filters Bar */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        {/* Search Box */}
        <div className="flex-1">
          <div className="relative flex items-center">
            <Search
              size={18}
              className="absolute right-4 text-gray-500 pointer-events-none z-10"
            />
            <input
              type="text"
              placeholder="Keresés versenyek között..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#1a1b26] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Filter Group */}
        <div className="flex gap-3">
          <div className="relative">
            <Filter
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-4 pr-10 py-3 bg-[#1a1b26] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer min-w-[180px]"
            >
              <option value="">Minden státusz</option>
              <option value="REGISTRATION">Regisztráció</option>
              <option value="IN_PROGRESS">Folyamatban</option>
              <option value="COMPLETED">Befejezett</option>
            </select>
          </div>

          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="px-4 py-3 bg-[#1a1b26] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="">Minden játék</option>
            {games.map((game: Game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-[#1a1b26] rounded-xl overflow-hidden border border-white/5 h-[320px] animate-pulse"
            >
              <div className="h-16 bg-white/5" />
              <div className="p-6 space-y-4">
                <div className="h-6 w-2/3 bg-white/5 rounded" />
                <div className="h-4 w-full bg-white/5 rounded" />
                <div className="h-4 w-5/6 bg-white/5 rounded" />
                <div className="pt-4 flex gap-4">
                  <div className="h-10 w-full bg-white/5 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1a1b26]/50 rounded-2xl border border-white/5">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <Trophy size={40} className="text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nincs találat</h3>
          <p className="text-gray-400">
            Próbálj más szűrőket vagy keresési feltételeket.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredTournaments.map((tournament: Tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          {[...Array(pagination.pages)].map((_, i) => (
            <button
              key={i}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pagination.page === i + 1
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-[#1a1b26] text-gray-400 hover:bg-[#0f1015] hover:text-white border border-white/10"
              }`}
              onClick={() =>
                dispatch(
                  fetchTournaments({
                    page: i + 1,
                    status: statusFilter,
                    gameId: gameFilter,
                  })
                )
              }
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
