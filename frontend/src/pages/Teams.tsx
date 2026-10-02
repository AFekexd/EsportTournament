import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
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
      className="group relative flex flex-col bg-[#121824] rounded-lg overflow-hidden border border-border/80 shadow-md transition-all duration-200 hover:border-primary/60 hover:shadow-xl hover:-translate-y-0.5 p-4"
    >
      {/* Header with Logo & Name */}
      <div className="flex items-center gap-3.5 mb-4">
        <div className="w-13 h-13 rounded bg-[#0B0F17] p-1 border border-border/80 shrink-0 group-hover:border-primary/50 transition-colors">
          <LazyImage
            src={team.logoUrl || ""}
            alt={team.name}
            fallbackText={team.name.charAt(0).toUpperCase()}
            className="w-full h-full rounded object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-bold tracking-wide uppercase text-foreground mb-0.5 group-hover:text-primary transition-colors truncate">
            {team.name}
          </h3>
          {team.description ? (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {team.description}
            </p>
          ) : (
            <p className="text-[11px] font-mono text-muted-foreground/60 uppercase">Nincs leírás</p>
          )}
        </div>
      </div>

      {/* Stats HUD */}
      <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded bg-[#0B0F17]/60 border border-border/60">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="font-mono text-sm font-bold text-foreground leading-none">
            {team.members?.length || 0}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
            Tagok
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5 text-center border-l border-border/50">
          <span className="font-mono text-sm font-bold text-foreground leading-none">
            {team._count?.tournamentEntries || 0}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
            Verseny
          </span>
        </div>
      </div>

      {/* Member Avatars & Action */}
      <div className="mt-auto pt-3 border-t border-border/60 flex items-center justify-between gap-3">
        <div className="flex -space-x-1.5">
          {team.members?.slice(0, 4).map((member: TeamMember) => (
            <div
              key={member.id}
              className="w-7 h-7 rounded border border-border/80 bg-[#0B0F17] overflow-hidden"
              title={member.user?.displayName || member.user?.username}
            >
              <LazyImage
                src={member.user?.avatarUrl || ""}
                alt={member.user?.username || "?"}
                fallbackText={(member.user?.username || "?").charAt(0).toUpperCase()}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {team.members && team.members.length > 4 && (
            <div className="w-7 h-7 rounded bg-[#0B0F17] border border-border/80 flex items-center justify-center font-mono text-[10px] font-bold text-muted-foreground">
              +{team.members.length - 4}
            </div>
          )}
        </div>

        <div className="font-mono text-xs font-bold uppercase tracking-wider text-primary group-hover:text-primary-hover flex items-center gap-1">
          Megnyitás
          <ArrowRight size={13} className="transform transition-transform group-hover:translate-x-1" />
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
      {/* Tactical Header */}
      <div className="mb-10 text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#121824] border border-border/80 rounded text-xs font-mono text-primary font-bold tracking-widest uppercase mb-3">
          <Users size={14} className="text-primary" />
          <span>// CSAPATRENDSZER // SQUAD KÖZPONT</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-foreground mb-3">
          Regisztrált Csapatok
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-2">
          Hozd létre saját esport alakulatodat, szervezz edzéseket és versenyezzetek a bajnokságokon.
        </p>
        <p className="text-xs font-mono text-muted-foreground/80 max-w-xl mx-auto mb-6">
          [SZABÁLYZAT] Egy játékos több csapatnak is tagja lehet, de ugyanazon a tornán csak egy csapat színeiben indulhat.
        </p>

        {isAuthenticated && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded font-mono text-xs font-semibold uppercase tracking-wider transition-all border ${
                filterMyTeams
                  ? "bg-primary text-foreground border-primary"
                  : "bg-[#121824] text-muted-foreground hover:text-foreground border-border/80"
              }`}
              onClick={() => setFilterMyTeams(!filterMyTeams)}
            >
              <Users size={15} />
              Saját csapataim
            </button>
            <button
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#121824] hover:bg-[#121824]/80 border border-border/80 text-foreground rounded font-mono text-xs font-semibold uppercase tracking-wider transition-all"
              onClick={() => setShowJoinModal(true)}
            >
              <UserPlus size={15} />
              Csatlakozás kóddal
            </button>
            <Link
              to="/teams/create"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-foreground rounded font-mono text-xs font-semibold uppercase tracking-wider transition-all border border-primary"
            >
              <Plus size={15} />
              Új csapat alapítása
            </Link>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-md mx-auto flex items-center">
          <Search
            size={16}
            className="absolute left-3.5 text-muted-foreground pointer-events-none z-10"
          />
          <input
            type="text"
            placeholder="Csapat keresése név alapján..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#121824] border border-border/80 rounded font-mono text-sm text-foreground placeholder:text-muted-foreground placeholder:font-sans focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-[#121824] rounded-lg overflow-hidden border border-border/60 h-[240px] animate-pulse p-5"
            >
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-13 h-13 rounded bg-[#0B0F17]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 bg-secondary rounded" />
                  <div className="h-3 w-full bg-secondary rounded" />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="h-10 bg-[#0B0F17] rounded" />
                <div className="h-8 bg-secondary rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#121824] rounded-lg border border-border/80">
          <div className="w-16 h-16 bg-[#0B0F17] rounded border border-border flex items-center justify-center mb-4">
            <Users size={32} className="text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-bold uppercase tracking-wider text-foreground mb-2">
            Nincs megjeleníthető csapat
          </h3>
          <p className="text-xs text-muted-foreground">
            {filterMyTeams
              ? "Még nem vagy tagja egyetlen csapatnak sem."
              : "Próbálj más keresési feltételt, vagy hozz létre egy új csapatot."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              className={`px-4 py-2 rounded font-mono text-xs font-semibold transition-all ${
                pagination.page === i + 1
                  ? "bg-primary text-foreground border border-primary shadow-sm"
                  : "bg-[#121824] text-muted-foreground hover:text-foreground border border-border/80"
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
          className="fixed inset-0 bg-[#0B0F17]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="bg-[#121824] rounded-lg p-6 w-full max-w-md border border-border/80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#0B0F17] border border-border/80 rounded text-[11px] font-mono text-primary font-bold uppercase mb-3">
              <span>// CSATLAKOZÁS</span>
            </div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground mb-2">
              Csatlakozás Meghívókóddal
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Add meg a csapatkapitánytól kapott egyedi meghívókódot a csatlakozáshoz.
            </p>
            <input
              type="text"
              placeholder="PL: ABC12345"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 bg-[#0B0F17] border border-border/80 rounded font-mono text-center tracking-widest text-foreground text-sm uppercase placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors mb-4"
            />
            {joinError && (
              <p className="font-mono text-xs text-red-400 mb-4">{joinError}</p>
            )}
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 bg-[#0B0F17] hover:bg-[#0B0F17]/80 border border-border/80 text-foreground rounded font-mono text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                onClick={() => setShowJoinModal(false)}
                disabled={isJoining}
              >
                Mégse
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-foreground rounded font-mono text-xs font-semibold uppercase tracking-wider transition-all border border-primary disabled:opacity-50"
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
