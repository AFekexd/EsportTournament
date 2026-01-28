import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  Trophy,
  ArrowRight,
  UserPlus,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { useAuth } from "../hooks/useAuth";
import { fetchTeams, joinTeam } from "../store/slices/teamsSlice";
import type { Team, TeamMember } from "../types";

import { LazyImage } from "../components/common/LazyImage";

function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      to={`/teams/${team.id}`}
      className="group relative flex flex-col bg-[#1a1b26]/60 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/5 transition-all duration-500 hover:shadow-[0_0_40px_rgba(124,58,237,0.15)] hover:border-primary/50 hover:-translate-y-2 p-1"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative bg-[#0f1015]/80 rounded-xl p-5 h-full flex flex-col">
        {/* Header with Logo & Name */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1b26] p-1 border border-white/10 shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-300">
            <LazyImage
              src={team.logoUrl || ""}
              alt={team.name}
              fallbackText={team.name.charAt(0).toUpperCase()}
              className="w-full h-full rounded-xl"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors truncate">
              {team.name}
            </h3>
            {team.description ? (
              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                {team.description}
              </p>
            ) : (
              <p className="text-xs text-gray-600 italic">Nincs leírás</p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6 p-3 rounded-lg bg-white/5 border border-white/5">
          <div className="flex flex-col items-center gap-1 text-center">
            <Users size={14} className="text-blue-400" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white leading-none">{team.members?.length || 0}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">tag</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center border-l border-white/5">
            <Trophy size={14} className="text-yellow-500" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white leading-none">{team._count?.tournamentEntries || 0}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">verseny</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center border-l border-white/5">
            <div className="text-primary font-black text-lg leading-none">{team.elo}</div>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">ELO</span>
          </div>
        </div>

        {/* Member Avatars */}
        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-4">
          <div className="flex -space-x-2 pl-1">
            {team.members?.slice(0, 4).map((member: TeamMember) => (
              <div
                key={member.id}
                className="w-8 h-8 rounded-full border-2 border-[#0f1015] bg-[#1a1b26] relative z-0 hover:z-10 hover:scale-110 transition-all duration-300 shadow-md"
                title={member.user?.displayName || member.user?.username}
              >
                <LazyImage
                  src={member.user?.avatarUrl || ""}
                  alt={member.user?.username || "?"}
                  fallbackText={(member.user?.username || "?").charAt(0).toUpperCase()}
                  className="w-full h-full rounded-full"
                />
              </div>
            ))}
            {team.members && team.members.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-[#1a1b26] border-2 border-[#0f1015] flex items-center justify-center text-[10px] font-bold text-white z-0 hover:z-10 relative">
                +{team.members.length - 4}
              </div>
            )}
          </div>

          <div className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1 whitespace-nowrap">
            Megtekintés
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function TeamsPage() {
  const dispatch = useAppDispatch();
  const { teams, isLoading, pagination } = useAppSelector(
    (state) => state.teams,
  );
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [filterMyTeams, setFilterMyTeams] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    dispatch(
      fetchTeams({ page: 1, search: search || undefined, my: filterMyTeams }),
    );
  }, [dispatch, search, filterMyTeams]);

  useEffect(() => {
    const code = searchParams.get("joinCode");
    if (code) {
      setJoinCode(code);
      setShowJoinModal(true);
    }
  }, [searchParams]);

  // ESC kezelés a Join Modal-hoz
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowJoinModal(false);
    };
    if (showJoinModal) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [showJoinModal]);

  const handleJoin = async () => {
    if (!joinCode.trim() || isJoining) return;

    setIsJoining(true);
    setJoinError("");

    try {
      await dispatch(joinTeam(joinCode)).unwrap();
      toast.success("Sikeresen csatlakoztál a csapathoz!");
      setShowJoinModal(false);
      setJoinCode("");
    } catch (error: unknown) {
      const err = error as { message?: string };
      setJoinError(err.message || "Hibás kód");
      toast.error(err.message || "Hiba történt a csatlakozáskor");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Modern Header with Gradient */}
      <div className="mb-12 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-3xl rounded-full -z-10" />
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary-100 to-gray-400 bg-clip-text text-transparent mb-4">
          Csapatok
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-1">
          Böngészd a csapatokat vagy hozz létre sajátot és versenyezz együtt!
        </p>
        <p className="text-sm text-gray-400 max-w-2xl mx-auto mb-6">
          <span className="font-bold">Note:</span> Egynél több csapatot is
          létrehozhatsz és szerepelhetsz is bennük, de{" "}
          <span className="font-bold">
            egy versenyben csak egy csapatban versenyezhetsz.
          </span>
        </p>

        {isAuthenticated && (
          <div className="flex flex-wrap justify-center gap-4">
            <button
              className={`flex items-center gap-2 px-6 py-3 border rounded-xl font-semibold transition-all ${filterMyTeams
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                : "bg-[#1a1b26] text-gray-400 hover:bg-[#0f1015] hover:text-white border-white/10"
                }`}
              onClick={() => setFilterMyTeams(!filterMyTeams)}
            >
              <Users size={18} />
              Saját csapataim
            </button>
            <button
              className="flex items-center gap-2 px-6 py-3 bg-[#1a1b26] hover:bg-[#0f1015] border border-white/10 text-white rounded-xl font-semibold transition-all"
              onClick={() => setShowJoinModal(true)}
            >
              <UserPlus size={18} />
              Csatlakozás kóddal
            </button>
            <Link
              to="/teams/create"
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20"
              style={{ color: "white" }}
            >
              <Plus size={18} />
              Új csapat
            </Link>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-xl mx-auto flex items-center">
          <Search
            size={18}
            className="absolute right-4 text-gray-500 pointer-events-none z-10"
          />
          <input
            type="text"
            placeholder="Csapat keresése..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#1a1b26] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-[#1a1b26] rounded-xl overflow-hidden border border-white/5 h-[280px] animate-pulse p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-2/3 bg-white/5 rounded" />
                  <div className="h-4 w-full bg-white/5 rounded" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-12 bg-white/5 rounded" />
                <div className="h-8 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1a1b26]/50 rounded-2xl border border-white/5">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <Users size={40} className="text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nincs találat</h3>
          <p className="text-gray-400">
            {filterMyTeams
              ? "Még nem vagy tagja egy csapatnak sem."
              : "Próbálj más keresési feltételeket vagy hozz létre új csapatot."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {teams.map((team: Team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          {[...Array(pagination.pages)].map((_, i) => (
            <button
              key={i}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${pagination.page === i + 1
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-[#1a1b26] text-gray-400 hover:bg-[#0f1015] hover:text-white border border-white/10"
                }`}
              onClick={() =>
                dispatch(
                  fetchTeams({
                    page: i + 1,
                    search: search || undefined,
                    my: filterMyTeams,
                  }),
                )
              }
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="bg-[#1a1b26] rounded-2xl p-8 w-full max-w-md border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-2">
              Csatlakozás kóddal
            </h2>
            <p className="text-gray-400 mb-6">
              Add meg a csapat meghívó kódját a csatlakozáshoz.
            </p>
            <input
              type="text"
              placeholder="Pl: ABC12345"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors mb-4"
            />
            {joinError && (
              <p className="text-red-400 text-sm mb-4">{joinError}</p>
            )}
            <div className="flex gap-4">
              <button
                className="flex-1 px-6 py-3 bg-[#0f1015] hover:bg-[#1a1b26] border border-white/10 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowJoinModal(false)}
                disabled={isJoining}
              >
                Mégse
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Csatlakozás"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
