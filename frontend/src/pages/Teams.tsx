import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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

function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      to={`/teams/${team.id}`}
      className="group relative flex flex-col bg-[#1a1b26] rounded-xl overflow-hidden border border-white/5 shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1 p-6"
    >
      {/* Team Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0">
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={team.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{team.name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors line-clamp-1">
            {team.name}
          </h3>
          {team.description && (
            <p className="text-sm text-gray-400 line-clamp-1 break-words max-w-[150px]">
              {team.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-white/5">
        <div className="flex flex-col items-center gap-1 text-center">
          <Users size={16} className="text-blue-400" />
          <span className="text-xs text-gray-400">
            {team.members?.length || 0} tag
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <Trophy size={16} className="text-yellow-500" />
          <span className="text-xs text-gray-400">
            {team._count?.tournamentEntries || 0} verseny
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-lg font-bold text-primary">{team.elo}</span>
          <span className="text-xs text-gray-400">ELO</span>
        </div>
      </div>

      {/* Members Preview */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex -space-x-2">
          {team.members?.slice(0, 5).map((member: TeamMember) => (
            <Link
              key={member.id}
              to={`/profile/${member.userId}`}
              className="w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-[#1a1b26] flex items-center justify-center text-white text-xs font-semibold hover:border-primary transition-colors cursor-pointer shrink-0"
              title={member.user?.displayName || member.user?.username}
              onClick={(e) => e.stopPropagation()} // Prevent card click
            >
              {member.user?.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt={member.user.displayName || member.user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>
                  {(member.user?.displayName || member.user?.username || "?")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </Link>
          ))}
          {team.members && team.members.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-[#1a1b26] flex items-center justify-center text-primary text-xs font-bold">
              +{team.members.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Action Link */}
      <div className="mt-auto flex items-center justify-between text-sm font-semibold text-primary">
        <span>Csapat megtekintése</span>
        <ArrowRight
          size={16}
          className="transform transition-transform group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

export function TeamsPage() {
  const dispatch = useAppDispatch();
  const { teams, isLoading, pagination } = useAppSelector(
    (state) => state.teams
  );
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [filterMyTeams, setFilterMyTeams] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    dispatch(
      fetchTeams({ page: 1, search: search || undefined, my: filterMyTeams })
    );
  }, [dispatch, search, filterMyTeams]);

  useEffect(() => {
    const code = searchParams.get("joinCode");
    if (code) {
      setJoinCode(code);
      setShowJoinModal(true);
    }
  }, [searchParams]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;

    try {
      await dispatch(joinTeam(joinCode)).unwrap();
      setShowJoinModal(false);
      setJoinCode("");
      setJoinError("");
    } catch (error: unknown) {
      const err = error as { message?: string };
      setJoinError(err.message || "Hibás kód");
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
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
          Böngészd a csapatokat vagy hozz létre sajátot és versenyezz együtt!
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
                  })
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
                className="flex-1 px-6 py-3 bg-[#0f1015] hover:bg-[#1a1b26] border border-white/10 text-white rounded-xl font-semibold transition-all"
                onClick={() => setShowJoinModal(false)}
              >
                Mégse
              </button>
              <button
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20"
                onClick={handleJoin}
              >
                Csatlakozás
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
