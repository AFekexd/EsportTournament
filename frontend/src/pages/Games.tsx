import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Gamepad2, Users, Trophy, ArrowRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchGames } from "../store/slices/gamesSlice";
import { BlurImage } from "../components/common/BlurImage";
import type { Game } from "../types";

function GameCard({ game }: { game: Game }) {
  return (
    <Link
      to={`/games/${game.id}`}
      className="group relative flex flex-col bg-[#1a1b26] rounded-xl overflow-hidden border border-white/5 shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1 h-full"
    >
      {/* Image Container */}
      <div className="relative w-full aspect-video overflow-hidden">
        {game.imageUrl ? (
          <BlurImage
            src={game.imageUrl}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-110"
            containerClassName="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <Gamepad2 size={48} className="text-slate-600" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b26] via-transparent to-transparent opacity-90" />
      </div>

      {/* Content */}
      <div className="relative p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-1">
          {game.name}
        </h3>

        {game.description && (
          <p className="text-sm text-gray-400 mb-6 line-clamp-2 leading-relaxed flex-grow">
            {game.description}
          </p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5 border-t border-white/5 pt-4">
          <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-300 transition-colors">
            <Trophy size={16} className="text-yellow-500" />
            <span className="text-xs font-medium">
              {game._count?.tournaments || 0} verseny
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-300 transition-colors">
            <Users size={16} className="text-blue-400" />
            <span className="text-xs font-medium">
              {game._count?.userRanks || 0} játékos
            </span>
          </div>
        </div>

        {/* Action Link */}
        <div className="mt-auto flex items-center justify-between text-sm font-semibold text-primary">
          <span>Részletek megtekintése</span>
          <ArrowRight
            size={16}
            className="transform transition-transform group-hover:translate-x-1"
          />
        </div>
      </div>
    </Link>
  );
}

export function GamesPage() {
  const dispatch = useAppDispatch();
  const { games, isLoading } = useAppSelector((state) => state.games);

  useEffect(() => {
    dispatch(fetchGames());
  }, [dispatch]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-12 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-3xl rounded-full -z-10" />
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary-100 to-gray-400 bg-clip-text text-transparent mb-4">
          Játékok
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Válassz a támogatott esport játékok közül, és jelentkezz a legújabb
          versenyekre!
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-[#1a1b26] rounded-xl overflow-hidden border border-white/5 h-[400px] animate-pulse"
            >
              <div className="h-48 bg-white/5" />
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
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1a1b26]/50 rounded-2xl border border-white/5">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <Gamepad2 size={40} className="text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Nincs elérhető játék
          </h3>
          <p className="text-gray-400">
            Hamarosan új játékokat adunk hozzá a rendszerhez.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {games.map((game: Game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
