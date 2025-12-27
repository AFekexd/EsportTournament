import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchTournaments } from "../store/slices/tournamentsSlice";
import { fetchStats } from "../store/slices/statsSlice";
import { Trophy, Calendar, Users, Crown } from "lucide-react";
import { API_URL } from "../config";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

type SlideType = "TOURNAMENTS" | "LEADERBOARDS" | "TEAMS" | "PROMO";

interface LeaderboardPlayer {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  elo: number;
  rank: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
}

interface LeaderboardTeam {
  id: string;
  name: string;
  logoUrl: string | null;
  elo: number;
  rank: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
}

/* -------------------------------------------------------------------------- */
/*                                SUB-COMPONENTS                              */
/* -------------------------------------------------------------------------- */

const statusLabels: Record<string, { label: string; colors: string }> = {
  DRAFT: {
    label: "Tervezet",
    colors: "bg-gray-500/80 text-white border-gray-500/20",
  },
  REGISTRATION: {
    label: "Regisztráció",
    colors: "bg-green-600/90 text-white border-green-500/20",
  },
  IN_PROGRESS: {
    label: "Folyamatban",
    colors: "bg-yellow-500/90 text-white border-yellow-500/20",
  },
  COMPLETED: {
    label: "Befejezett",
    colors: "bg-primary/90 text-white border-primary/20",
  },
  CANCELLED: {
    label: "Törölve",
    colors: "bg-red-600/90 text-white border-red-500/20",
  },
};

function TournamentsSlide({ tournaments }: { tournaments: any[] }) {
  // Show only top 3 upcoming/active
  const displayTournaments = tournaments.slice(0, 3);

  return (
    <div className="flex h-full flex-col px-12 pt-12 pb-32 animate-in slide-in-from-right duration-700">
      <div className="mb-12 flex items-center gap-6">
        <Trophy className="h-16 w-16 text-primary" />
        <h2 className="text-6xl font-black uppercase tracking-tight text-white">
          Aktuális Versenyek
        </h2>
      </div>

      <div className="grid flex-1 grid-cols-3 gap-8">
        {displayTournaments.map((t, i) => {
          const statusInfo = statusLabels[t.status] || statusLabels.DRAFT;

          return (
            <div
              key={t.id}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              {/* Full Background Image */}
              <div className="absolute inset-0 bg-gray-900">
                {t.imageUrl || t.game?.imageUrl ? (
                  <img
                    src={t.imageUrl || t.game?.imageUrl}
                    alt={t.name}
                    className="h-full w-full object-cover opacity-90"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-gray-900 to-[#1a1b26] flex items-center justify-center">
                    <Trophy size={120} className="text-white/5" />
                  </div>
                )}
              </div>

              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent/20" />

              {/* Status Badge - Top Left */}
              <div className="absolute top-6 left-6 z-20">
                <span
                  className={`px-6 py-2 rounded-full text-xl font-bold shadow-lg backdrop-blur-md border ${statusInfo.colors}`}
                >
                  {statusInfo.label}
                </span>
              </div>

              {/* Game Badge - Top Right */}
              <div className="absolute top-6 right-6 z-20">
                <span className="bg-primary/90 px-6 py-2 rounded-full text-xl font-bold text-white shadow-lg backdrop-blur-md border border-white/10 shadow-primary/20">
                  {t.game?.name}
                </span>
              </div>

              {/* Content Container */}
              <div className="relative flex flex-1 flex-col justify-end p-8 z-10">
                <h3 className="mb-8 text-4xl font-black text-white leading-tight drop-shadow-xl">
                  {t.name}
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 backdrop-blur-md border border-white/5 hover:bg-white/10 transition-colors">
                    <Calendar className="h-8 w-8 text-primary shrink-0" />
                    <span className="text-2xl font-bold text-gray-100">
                      {new Date(t.startDate).toLocaleDateString("hu-HU")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 backdrop-blur-md border border-white/5 hover:bg-white/10 transition-colors">
                    <Users className="h-8 w-8 text-blue-400 shrink-0" />
                    <span className="text-2xl font-bold text-gray-100">
                      {t._count?.entries || 0} Nevező
                    </span>
                  </div>
                </div>
              </div>

              {/* Decorative Border */}
              <div className="absolute inset-0 border border-white/10 rounded-3xl pointer-events-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeaderboardsSlide() {
  const [topPlayers, setTopPlayers] = useState<LeaderboardPlayer[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/leaderboards/players/top`)
      .then((res) => res.json())
      .then((data) => setTopPlayers(data.data || []))
      .catch(console.error);
  }, []);

  const getRankStyle = (rank: number) => {
    if (rank === 1)
      return {
        bg: "bg-gradient-to-r from-yellow-500/20 to-yellow-600/5",
        border: "border-yellow-500/50",
        text: "text-yellow-400",
        shadow: "shadow-[0_0_30px_rgba(234,179,8,0.2)]",
      };
    if (rank === 2)
      return {
        bg: "bg-gradient-to-r from-gray-400/20 to-gray-500/5",
        border: "border-gray-400/50",
        text: "text-gray-300",
        shadow: "shadow-[0_0_30px_rgba(156,163,175,0.2)]",
      };
    if (rank === 3)
      return {
        bg: "bg-gradient-to-r from-orange-500/20 to-orange-600/5",
        border: "border-orange-500/50",
        text: "text-orange-400",
        shadow: "shadow-[0_0_30px_rgba(249,115,22,0.2)]",
      };
    return {
      bg: "bg-[#1a1b26]/80",
      border: "border-white/5",
      text: "text-white",
      shadow: "shadow-xl",
    };
  };

  return (
    <div className="flex h-full flex-col px-12 pt-12 pb-32 animate-in slide-in-from-bottom duration-700">
      <div className="mb-12 flex items-center gap-6">
        <Crown className="h-16 w-16 text-yellow-500" />
        <h2 className="text-6xl font-black uppercase tracking-tight text-white">
          Top Játékosok
        </h2>
      </div>

      <div className="flex flex-col gap-6 flex-1 justify-center">
        {topPlayers.slice(0, 3).map((player) => {
          const style = getRankStyle(player.rank);

          return (
            <div
              key={player.id}
              className={`flex items-center gap-8 rounded-3xl p-8 backdrop-blur-md border transition-all duration-500 ${style.bg} ${style.border} ${style.shadow}`}
            >
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-full text-5xl font-black ${style.text} bg-black/40 border border-white/10`}
              >
                #{player.rank}
              </div>

              <div className="h-28 w-28 rounded-full bg-gray-700 overflow-hidden border-4 border-white/10 shadow-2xl">
                {player.avatarUrl ? (
                  <img
                    src={player.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-gray-700 to-gray-800">
                    {(player.displayName || player.username)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className={`text-5xl font-black mb-3 ${style.text}`}>
                  {player.displayName || player.username}
                </h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">
                      {player.matchesWon}
                    </span>
                    <span className="text-xl text-gray-400">GYŐZELEM</span>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-gray-600" />
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">
                      {player.matchesPlayed}
                    </span>
                    <span className="text-xl text-gray-400">MECCS</span>
                  </div>

                  {/* Win Rate Badge */}
                  <div className="ml-4 px-4 py-1 rounded-full bg-white/5 border border-white/10">
                    <span
                      className={`text-xl font-bold ${
                        player.winRate >= 50
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {player.winRate.toFixed(0)}% Win Rate
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right px-8">
                <div className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  {player.elo}
                </div>
                <div className="text-lg font-bold uppercase tracking-[0.2em] text-primary">
                  ELO PONT
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamsSlide() {
  const [topTeams, setTopTeams] = useState<LeaderboardTeam[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/leaderboards/teams?limit=3`)
      .then((res) => res.json())
      .then((data) => setTopTeams(data.data || []))
      .catch(console.error);
  }, []);

  const getRankStyle = (rank: number) => {
    if (rank === 1)
      return {
        bg: "bg-gradient-to-r from-yellow-500/20 to-yellow-600/5",
        border: "border-yellow-500/50",
        text: "text-yellow-400",
        shadow: "shadow-[0_0_30px_rgba(234,179,8,0.2)]",
      };
    if (rank === 2)
      return {
        bg: "bg-gradient-to-r from-gray-400/20 to-gray-500/5",
        border: "border-gray-400/50",
        text: "text-gray-300",
        shadow: "shadow-[0_0_30px_rgba(156,163,175,0.2)]",
      };
    if (rank === 3)
      return {
        bg: "bg-gradient-to-r from-orange-500/20 to-orange-600/5",
        border: "border-orange-500/50",
        text: "text-orange-400",
        shadow: "shadow-[0_0_30px_rgba(249,115,22,0.2)]",
      };
    return {
      bg: "bg-[#1a1b26]/80",
      border: "border-white/5",
      text: "text-white",
      shadow: "shadow-xl",
    };
  };

  return (
    <div className="flex h-full flex-col px-12 pt-12 pb-32 animate-in slide-in-from-bottom duration-700">
      <div className="mb-12 flex items-center gap-6">
        <Trophy className="h-16 w-16 text-primary" />
        <h2 className="text-6xl font-black uppercase tracking-tight text-white">
          Top Csapatok
        </h2>
      </div>

      <div className="flex flex-col gap-6 flex-1 justify-center">
        {topTeams.slice(0, 3).map((team) => {
          const style = getRankStyle(team.rank);

          return (
            <div
              key={team.id}
              className={`flex items-center gap-8 rounded-3xl p-8 backdrop-blur-md border transition-all duration-500 ${style.bg} ${style.border} ${style.shadow}`}
            >
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-full text-5xl font-black ${style.text} bg-black/40 border border-white/10`}
              >
                #{team.rank}
              </div>

              <div className="h-28 w-28 rounded-full bg-gray-700 overflow-hidden border-4 border-white/10 shadow-2xl">
                {team.logoUrl ? (
                  <img
                    src={team.logoUrl}
                    alt={team.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-primary to-purple-600">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className={`text-5xl font-black mb-3 ${style.text}`}>
                  {team.name}
                </h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">
                      {team.matchesWon}
                    </span>
                    <span className="text-xl text-gray-400">GYŐZELEM</span>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-gray-600" />
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">
                      {team.matchesPlayed}
                    </span>
                    <span className="text-xl text-gray-400">MECCS</span>
                  </div>

                  <div className="ml-4 px-4 py-1 rounded-full bg-white/5 border border-white/10">
                    <span
                      className={`text-xl font-bold ${
                        team.winRate >= 50
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {team.winRate.toFixed(0)}% Win Rate
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right px-8">
                <div className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  {team.elo}
                </div>
                <div className="text-lg font-bold uppercase tracking-[0.2em] text-primary">
                  ELO PONT
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PromoSlide() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-12 pt-12 pb-32 text-center animate-in fade-in duration-1000">
      <h2 className="mb-16 text-7xl font-black text-white uppercase tracking-tight">
        Csatlakozz a Közösséghez!
      </h2>

      <div className="flex w-full max-w-6xl justify-center gap-20">
        {/* Website QR */}
        <div className="flex flex-1 flex-col items-center rounded-3xl bg-[#1a1b26]/80 p-12 border border-white/10 shadow-2xl backdrop-blur-md">
          <div className="mb-8 rounded-2xl bg-white p-4 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
            {/* Generate a QR code for the website using an external service or placeholder */}
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://esport.pollak.info&color=000000&bgcolor=ffffff"
              alt="Website QR"
              className="h-64 w-64"
            />
          </div>
          <h3 className="mb-4 text-4xl font-bold text-white">Weboldal</h3>
          <p className="text-2xl text-primary font-bold tracking-wide">
            esport.pollak.info
          </p>
        </div>

        {/* Discord QR */}
        <div className="flex flex-1 flex-col items-center rounded-3xl bg-[#5865F2]/20 p-12 border border-[#5865F2]/50 shadow-2xl backdrop-blur-md">
          <div className="mb-8 rounded-2xl bg-white p-4 shadow-[0_0_50px_rgba(88,101,242,0.3)]">
            {/* Generate a QR code for Discord */}
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://discord.gg/HWB2bAMUNP&color=000000&bgcolor=ffffff"
              alt="Discord QR"
              className="h-64 w-64"
            />
          </div>
          <h3 className="mb-4 text-4xl font-bold text-white">Discord</h3>
          <p className="text-2xl text-[#5865F2] font-bold tracking-wide">
            discord.gg/pollak
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

export function TVDisplayPage() {
  const dispatch = useAppDispatch();
  const { tournaments } = useAppSelector((state) => state.tournaments);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slides: SlideType[] = ["TOURNAMENTS", "LEADERBOARDS", "TEAMS", "PROMO"];

  // Data fetching
  useEffect(() => {
    dispatch(fetchTournaments({ page: 1, limit: 10 }));
    dispatch(fetchStats());

    // Refresh data every 5 minutes
    const dataInterval = setInterval(() => {
      dispatch(fetchTournaments({ page: 1, limit: 10 }));
      dispatch(fetchStats());
    }, 5 * 60 * 1000);

    return () => clearInterval(dataInterval);
  }, [dispatch]);

  // Slide rotation
  useEffect(() => {
    const slideDuration = 10000; // 10 seconds per slide
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, slideDuration);

    return () => clearInterval(interval);
  }, [slides.length]);

  const CurrentSlideComponent = () => {
    switch (slides[currentSlideIndex]) {
      case "TOURNAMENTS":
        return <TournamentsSlide tournaments={tournaments} />;
      case "LEADERBOARDS":
        return <LeaderboardsSlide />;
      case "TEAMS":
        return <TeamsSlide />;
      case "PROMO":
        return <PromoSlide />;
      default:
        return <TournamentsSlide tournaments={tournaments} />;
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050505] font-sans selection:bg-purple-500/30">
      {/* Dynamic Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0f0f15] via-[#050505] to-[#1a1025]" />
      <div className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] rounded-full bg-purple-900/10 blur-[150px] animate-pulse" />
      <div className="absolute -bottom-[20%] -right-[10%] h-[70%] w-[70%] rounded-full bg-indigo-900/10 blur-[150px] animate-pulse delay-1000" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* Main Content Area */}
      <div className="relative z-10 h-full w-full">
        {/* Progress Bar (Optional, for visual timing) */}
        <div className="absolute top-0 left-0 h-2 bg-primary/30 w-full">
          <div
            key={currentSlideIndex} // Reset animation on slide change
            className="h-full bg-primary animate-[progress_10s_linear]"
          />
        </div>

        {CurrentSlideComponent()}
      </div>

      {/* Footer / Status Bar - Optional */}
      <div className="absolute bottom-8 left-12 right-12 flex justify-between items-end border-t border-white/10 pt-6 z-50">
        <div className="flex gap-4">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === currentSlideIndex ? "w-16 bg-primary" : "w-4 bg-white/20"
              }`}
            />
          ))}
        </div>
        <div className="text-right">
          <h4 className="text-xl font-bold text-white tracking-wider">
            POLLÁK ESPORT
          </h4>
          <p className="text-sm text-gray-400">Hivatalos Versenyplatform</p>
        </div>
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
