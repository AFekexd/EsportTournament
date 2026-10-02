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
import { BlurImage } from "../components/common/BlurImage";
import type { Tournament, Game } from "../types";

const statusLabels: Record<string, { label: string; colors: string; dot: string }> = {
  DRAFT: {
    label: "TERVEZET",
    colors: "bg-slate-900/90 text-slate-300 border-slate-700/60",
    dot: "bg-slate-400",
  },
  REGISTRATION: {
    label: "REGISZTRÁCIÓ NYITVA",
    colors: "bg-emerald-950/80 text-emerald-400 border-emerald-500/40",
    dot: "bg-emerald-400 animate-pulse",
  },
  IN_PROGRESS: {
    label: "ÉLŐBEN FOLYIK",
    colors: "bg-amber-950/80 text-amber-300 border-amber-500/40",
    dot: "bg-amber-400 animate-ping",
  },
  COMPLETED: {
    label: "LEZÁRULT",
    colors: "bg-blue-950/80 text-blue-300 border-blue-500/40",
    dot: "bg-blue-400",
  },
  CANCELLED: {
    label: "TÖRÖLVE",
    colors: "bg-red-950/80 text-red-400 border-red-500/40",
    dot: "bg-red-400",
  },
};

const formatLabels: Record<string, string> = {
  SINGLE_ELIMINATION: "Single Elimination",
  DOUBLE_ELIMINATION: "Double Elimination",
  ROUND_ROBIN: "Körmérkőzés",
  SWISS: "Svájci Rendszer",
};

const teamSizeLabels: Record<number, string> = {
  1: "1v1 PÁRBAJ",
  2: "2v2 DUÓ",
  3: "3v3 TRIÓ",
  5: "5v5 CSAPAT",
};

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const startDate = new Date(tournament.startDate);
  const regDeadline = new Date(tournament.registrationDeadline);
  const statusInfo = statusLabels[tournament.status] || statusLabels.DRAFT;
  const teamSize = tournament.teamSize || tournament.game?.teamSize || 1;

  return (
    <Link
      to={`/tournaments/${tournament.id}`}
      className="group relative flex flex-col bg-[#121824] rounded-lg overflow-hidden border border-border/80 shadow-md transition-all duration-200 hover:border-primary/60 hover:shadow-xl hover:-translate-y-0.5"
    >
      {/* Game Image Header */}
      <div className="relative w-full h-44 overflow-hidden bg-[#0B0F17]">
        {tournament.imageUrl || tournament.game?.imageUrl ? (
          <BlurImage
            src={tournament.imageUrl || tournament.game?.imageUrl}
            alt={tournament.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            containerClassName="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-[#0B0F17] flex items-center justify-center">
            <Trophy size={40} className="text-slate-700" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121824] via-[#121824]/40 to-transparent" />

        {/* Team Size Badge */}
        <div className="absolute top-3 left-3 bg-[#0B0F17]/90 px-2.5 py-1 rounded border border-border/80 z-10">
          <span className="font-mono text-[11px] font-bold text-foreground tracking-wider flex items-center gap-1.5 uppercase">
            <Users size={12} className="text-primary" />
            {teamSizeLabels[teamSize] || `${teamSize}v${teamSize}`}
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] font-bold tracking-wider border ${statusInfo.colors}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
            {statusInfo.label}
          </span>
        </div>

        {/* Game Name Badge */}
        {tournament.game?.name && (
          <div className="absolute bottom-2.5 left-3 bg-[#0B0F17]/95 px-2.5 py-1 rounded border border-border/70 z-10">
            <span className="font-mono text-xs font-semibold text-cyan-400 tracking-wide uppercase">
              {tournament.game.name}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative p-5 flex flex-col flex-grow">
        <h3 className="font-display text-xl font-bold tracking-wide uppercase text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
          {tournament.name}
        </h3>

        {tournament.description && (
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
            {tournament.description}
          </p>
        )}

        {/* Meta Info HUD */}
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-[#0B0F17]/60 rounded border border-border/60">
          <div className="flex items-center gap-2.5">
            <Calendar size={15} className="text-primary shrink-0" />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Kezdés</p>
              <p className="font-mono text-xs font-semibold text-foreground">
                {startDate.toLocaleDateString("hu-HU")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 border-l border-border/50 pl-3">
            <Users size={15} className="text-primary shrink-0" />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {teamSize === 1 ? "Játékosok" : "Csapatok"}
              </p>
              <p className="font-mono text-xs font-semibold text-foreground">
                {tournament._count?.entries || 0} / {tournament.maxTeams}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-mono text-[11px] uppercase px-2 py-0.5 bg-secondary/80 rounded border border-border/60 text-muted-foreground font-semibold">
              {formatLabels[tournament.format] || tournament.format}
            </span>
            {tournament.status === "REGISTRATION" && (
              <span className="font-mono text-xs text-emerald-400 font-semibold flex items-center gap-1">
                Határidő: {regDeadline.toLocaleDateString("hu-HU")}
              </span>
            )}
          </div>

          {/* Action Link */}
          <div className="flex items-center justify-between text-xs font-bold font-mono uppercase tracking-wider text-primary group-hover:text-primary-hover pt-2 border-t border-border/60">
            <span>Versenyrészletek</span>
            <ArrowRight
              size={14}
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
    (state) => state.tournaments,
  );
  const { games } = useAppSelector((state) => state.games);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [gameFilter, setGameFilter] = useState<string>("");
  const [teamSizeFilter, setTeamSizeFilter] = useState<string>("");

  useEffect(() => {
    dispatch(
      fetchTournaments({ page: 1, status: statusFilter, gameId: gameFilter }),
    );
    dispatch(fetchGames());
  }, [dispatch, statusFilter, gameFilter]);

  const filteredTournaments = tournaments.filter((t: Tournament) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const size = t.teamSize || t.game?.teamSize || 1;
    const matchesTeamSize =
      teamSizeFilter === "" || size.toString() === teamSizeFilter;
    return matchesSearch && matchesTeamSize;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tactical Header */}
      <div className="mb-10 text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#121824] border border-border/80 rounded text-xs font-mono text-primary font-bold tracking-widest uppercase mb-3">
          <Trophy size={14} className="text-primary" />
          <span>// VERSENYRENDSZER // BAJNOKSÁGOK</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-foreground mb-3">
          Hivatalos Bajnokságok
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          Csatlakozz a kiírt versenyekhez csapatoddal vagy egyénileg, küzdj meg az ELO-ért és a díjakért.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="mb-8 flex flex-col md:flex-row gap-3">
        {/* Search Box */}
        <div className="flex-1">
          <div className="relative flex items-center">
            <Search
              size={16}
              className="absolute left-3.5 text-muted-foreground pointer-events-none z-10"
            />
            <input
              type="text"
              placeholder="Verseny nevének keresése..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#121824] border border-border/80 rounded font-mono text-sm text-foreground placeholder:text-muted-foreground placeholder:font-sans focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Filter Group */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Filter
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto pl-3.5 pr-8 py-2.5 bg-[#121824] border border-border/80 rounded font-mono text-xs text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="">ÖSSZES STÁTUSZ</option>
              <option value="REGISTRATION">REGISZTRÁCIÓ</option>
              <option value="IN_PROGRESS">FOLYAMATBAN</option>
              <option value="COMPLETED">BEFEJEZETT</option>
            </select>
          </div>

          <select
            value={teamSizeFilter}
            onChange={(e) => setTeamSizeFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-[#121824] border border-border/80 rounded font-mono text-xs text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
          >
            <option value="">ÖSSZES MÉRET</option>
            <option value="1">1v1</option>
            <option value="2">2v2</option>
            <option value="3">3v3</option>
            <option value="5">5v5</option>
          </select>

          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-[#121824] border border-border/80 rounded font-mono text-xs text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
          >
            <option value="">ÖSSZES JÁTÉK</option>
            {games.map((game: Game) => (
              <option key={game.id} value={game.id}>
                {game.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-[#121824] rounded-lg overflow-hidden border border-border/60 h-[340px] animate-pulse"
            >
              <div className="h-44 bg-[#0B0F17]" />
              <div className="p-5 space-y-4">
                <div className="h-6 w-2/3 bg-secondary rounded" />
                <div className="h-4 w-full bg-secondary rounded" />
                <div className="h-10 w-full bg-secondary rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#121824] rounded-lg border border-border/80">
          <div className="w-16 h-16 bg-[#0B0F17] rounded border border-border flex items-center justify-center mb-4">
            <Trophy size={32} className="text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-bold uppercase tracking-wider text-foreground mb-2">
            Nincs aktív verseny a megadott szűrőkkel
          </h3>
          <p className="text-xs text-muted-foreground">
            Módosítsd a szűrőket vagy a keresési kifejezést.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              className={`px-4 py-2 rounded font-mono text-xs font-semibold transition-all ${
                pagination.page === i + 1
                  ? "bg-primary text-foreground border border-primary shadow-sm"
                  : "bg-[#121824] text-muted-foreground hover:text-foreground border border-border/80"
              }`}
              onClick={() =>
                dispatch(
                  fetchTournaments({
                    page: i + 1,
                    status: statusFilter,
                    gameId: gameFilter,
                  }),
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
