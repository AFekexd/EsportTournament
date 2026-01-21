import { useState } from "react";
import { X, Save, RotateCcw, Trash2, AlertTriangle, Trophy, Swords } from "lucide-react";
import type { Match } from "../../types";

interface MatchEditModalProps {
  match: Match;
  onClose: () => void;
  onSave: (data: {
    homeScore?: number;
    awayScore?: number;
    winnerId?: string;
    winnerUserId?: string;
  }) => void;
  onReset?: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
  isAdmin?: boolean;
}

// Helper to get participant name (team or user)
function getParticipantName(match: Match, side: "home" | "away"): string {
  if (side === "home") {
    if (match.homeUser) {
      return match.homeUser.displayName || match.homeUser.username;
    }
    return match.homeTeam?.name || "TBD";
  } else {
    if (match.awayUser) {
      return match.awayUser.displayName || match.awayUser.username;
    }
    return match.awayTeam?.name || "TBD";
  }
}

// Check if this is a solo (1v1) match
function isSoloMatch(match: Match): boolean {
  return !!(
    match.homeUserId ||
    match.awayUserId ||
    match.homeUser ||
    match.awayUser
  );
}

export function MatchEditModal({
  match,
  onClose,
  onSave,
  onReset,
  onDelete,
  isLoading,
  isAdmin = false,
}: MatchEditModalProps) {
  const [homeScore, setHomeScore] = useState<string>(
    match.homeScore?.toString() || ""
  );
  const [awayScore, setAwayScore] = useState<string>(
    match.awayScore?.toString() || ""
  );
  const [winnerId, setWinnerId] = useState<string>(
    match.winnerId || match.winnerUserId || ""
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const solo = isSoloMatch(match);
  const homeName = getParticipantName(match, "home");
  const awayName = getParticipantName(match, "away");
  const hasResult = match.status === "COMPLETED";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: {
      homeScore?: number;
      awayScore?: number;
      winnerId?: string;
      winnerUserId?: string;
    } = {};

    if (homeScore !== "") {
      data.homeScore = parseInt(homeScore, 10);
    }
    if (awayScore !== "") {
      data.awayScore = parseInt(awayScore, 10);
    }

    if (winnerId && winnerId !== "") {
      if (solo) {
        data.winnerUserId = winnerId;
      } else {
        data.winnerId = winnerId;
      }
    }

    onSave(data);
  };

  const homeId = solo
    ? match.homeUserId || match.homeUser?.id
    : match.homeTeamId;
  const awayId = solo
    ? match.awayUserId || match.awayUser?.id
    : match.awayTeamId;

  const getBracketLabel = () => {
    if (!match.bracketType) return null;
    const labels: Record<string, string> = {
      'UPPER': 'Felső ág',
      'LOWER': 'Alsó ág',
      'GRAND_FINAL': 'Nagydöntő',
    };
    return labels[match.bracketType] || match.bracketType;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-gradient-to-b from-[#1a1b26] to-[#13141c] rounded-2xl border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="relative px-6 py-5 border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent" />
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

          <div className="relative flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Swords className="text-primary" size={22} />
                Mérkőzés szerkesztése
              </h2>
              {getBracketLabel() && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full border border-primary/30">
                    {getBracketLabel()}
                  </span>
                  <span className="text-gray-500 text-xs">
                    Kör {match.round} • Pozíció {match.position}
                  </span>
                </div>
              )}
            </div>
            <button
              className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all duration-200 hover:rotate-90"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="p-4 bg-gradient-to-r from-red-500/10 to-transparent border-b border-red-500/20 animate-in slide-in-from-top duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="text-red-400" size={18} />
              </div>
              <div className="flex-grow">
                <p className="text-red-300 font-semibold text-sm">Biztosan törölni szeretnéd?</p>
                <p className="text-gray-500 text-xs mt-0.5">Ez a művelet nem visszavonható.</p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    onClick={() => {
                      onDelete?.();
                      setShowDeleteConfirm(false);
                    }}
                    disabled={isLoading}
                  >
                    <Trash2 size={12} />
                    Törlés
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold rounded-lg transition-colors"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Mégse
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Confirmation */}
        {showResetConfirm && (
          <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-yellow-500/20 animate-in slide-in-from-top duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="text-yellow-400" size={18} />
              </div>
              <div className="flex-grow">
                <p className="text-yellow-300 font-semibold text-sm">Visszaállítod a meccset?</p>
                <p className="text-gray-500 text-xs mt-0.5">Az eredmény törlődik és a meccs újra függőben lesz.</p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    onClick={() => {
                      onReset?.();
                      setShowResetConfirm(false);
                    }}
                    disabled={isLoading}
                  >
                    <RotateCcw size={12} />
                    Visszaállítás
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold rounded-lg transition-colors"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Mégse
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* VS Display */}
          <div className="px-6 py-6">
            <div className="relative bg-gradient-to-r from-primary/5 via-white/5 to-purple-500/5 rounded-xl p-4 border border-white/5">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.1),transparent_70%)]" />
              <div className="relative flex items-center justify-between">
                <div className="flex-1 text-center">
                  <p className="text-white font-bold text-lg truncate px-2">{homeName}</p>
                </div>
                <div className="flex-shrink-0 mx-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="text-white font-bold text-sm">VS</span>
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-white font-bold text-lg truncate px-2">{awayName}</p>

                </div>
              </div>
            </div>
          </div>

          {/* Score Inputs */}
          <div className="px-6 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {homeName} pontszám
                </label>
                <input
                  type="number"
                  className="w-full bg-black/30 border-2 border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-bold focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-600"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {awayName} pontszám
                </label>
                <input
                  type="number"
                  className="w-full bg-black/30 border-2 border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-bold focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-600"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Winner Select */}
          <div className="px-6 pb-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Trophy size={14} className="text-yellow-500" />
                Győztes
              </label>
              <select
                className="w-full bg-black/30 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                value={winnerId}
                onChange={(e) => setWinnerId(e.target.value)}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '20px',
                }}
              >
                <option value="">Automatikus (pontszám alapján)</option>
                {homeId && <option value={homeId}>{homeName}</option>}
                {awayId && <option value={awayId}>{awayName}</option>}
              </select>
              <p className="text-xs text-gray-500">
                Ha üresen hagyod, a győztest a pontszám alapján határozza meg a rendszer
              </p>
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="px-6 pb-6">
              <div className="border-t border-white/5 pt-4">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                  <span className="w-4 h-px bg-gray-700" />
                  Adminisztrátori műveletek
                  <span className="flex-grow h-px bg-gray-700/50" />
                </p>
                <div className="flex gap-2">
                  {hasResult && onReset && (
                    <button
                      type="button"
                      className="group px-4 py-2 bg-yellow-500/5 hover:bg-yellow-500/15 text-yellow-400 text-xs font-semibold rounded-lg border border-yellow-500/20 hover:border-yellow-500/40 flex items-center gap-2 transition-all duration-200"
                      onClick={() => setShowResetConfirm(true)}
                      disabled={isLoading}
                    >
                      <RotateCcw size={14} className="group-hover:rotate-[-360deg] transition-transform duration-500" />
                      Eredmény törlése
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="group px-4 py-2 bg-red-500/5 hover:bg-red-500/15 text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 hover:border-red-500/40 flex items-center gap-2 transition-all duration-200"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isLoading}
                    >
                      <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                      Meccs törlése
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex justify-end gap-3">
            <button
              type="button"
              className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 text-sm font-semibold rounded-xl transition-all duration-200"
              onClick={onClose}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="group relative px-6 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mentés...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Mentés
                  <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
