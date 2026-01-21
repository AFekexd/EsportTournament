import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {

    User as UserIcon,
    Trash2,
    X,
    Check,
    Trophy
} from 'lucide-react';
import { deleteMatch } from '../../store/slices/tournamentsSlice';
import type { AppDispatch } from '../../store';
import type { Match } from '../../store/slices/usersSlice';

interface MatchHistoryProps {
    matches: Match[];
    currentUserId: string;
    isAdmin: boolean;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, currentUserId, isAdmin }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleDelete = async (matchId: string) => {
        try {
            await dispatch(deleteMatch(matchId)).unwrap();
            setDeleteId(null);
        } catch (error) {
            console.error('Failed to delete match:', error);
            alert('Hiba történt a törlés során');
        }
    };

    if (matches.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 bg-[#0f1015]/30 rounded-xl border border-dashed border-white/5">
                <Trophy size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Még nincsenek lejátszott meccsek.</p>
            </div>
        );
    }

    const getOpponent = (match: Match) => {
        const isHome = match.homeUserId === currentUserId;
        if (isHome) {
            return match.awayUser || match.awayTeam || { name: '?' };
        }
        return match.homeUser || match.homeTeam || { name: '?' };
    };

    const getResult = (match: Match) => {
        if (match.status !== 'COMPLETED') return 'pending';
        if (match.winnerUserId === currentUserId) return 'win';
        if (match.winnerUserId && match.winnerUserId !== currentUserId) return 'loss';
        return 'draw';
    };

    return (
        <div className="flex flex-col gap-2">
            {matches.map((match) => {
                const opponent = getOpponent(match);
                const result = getResult(match);
                const isConfirmingDelete = deleteId === match.id;
                const isHome = match.homeUserId === currentUserId;
                const myScore = isHome ? match.homeScore : match.awayScore;
                const oppScore = isHome ? match.awayScore : match.homeScore;

                // Format colors based on result
                const statusColor =
                    result === 'win' ? 'text-green-500' :
                        result === 'loss' ? 'text-red-500' :
                            'text-gray-400';

                const borderColor =
                    result === 'win' ? 'border-l-green-500' :
                        result === 'loss' ? 'border-l-red-500' :
                            'border-l-gray-600';

                const bgHover =
                    result === 'win' ? 'hover:bg-green-500/5' :
                        result === 'loss' ? 'hover:bg-red-500/5' :
                            'hover:bg-white/5';

                return (
                    <div
                        key={match.id}
                        className={`
                            relative flex items-center justify-between p-3 
                            bg-[#0f1015]/30 border-y border-r border-l-4 border-white/5 
                            rounded-r-lg rounded-l-[2px] transition-all duration-200 group
                            ${borderColor} ${bgHover}
                        `}
                    >
                        {/* Game & Date - Compact */}
                        <div className="flex items-center gap-3 w-1/3 min-w-[140px]">
                            <div className="w-10 h-10 rounded bg-[#1a1b26] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                {match.tournament.game?.imageUrl ? (
                                    <img
                                        src={match.tournament.game.imageUrl}
                                        alt={match.tournament.game.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xs font-bold text-gray-500">
                                        {match.tournament.game?.name?.charAt(0) || 'G'}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <Link
                                    to={`/tournaments/${match.tournament.id}`}
                                    className="font-bold text-sm text-white hover:text-primary transition-colors truncate"
                                    title={match.tournament.name}
                                >
                                    {match.tournament.name}
                                </Link>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                    <span className="uppercase tracking-wide">
                                        {match.playedAt ? new Date(match.playedAt).toLocaleDateString('hu-HU') : 'TBD'}
                                    </span>
                                    {match.round > 0 && (
                                        <>
                                            <span className="w-0.5 h-0.5 rounded-full bg-gray-600"></span>
                                            <span>{match.round}. Kör</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Score - Center Piece */}
                        <div className="flex items-center justify-center gap-3 sm:gap-6 flex-1">
                            <div className={`text-lg font-black ${statusColor} text-right w-8`}>
                                {myScore ?? '-'}
                            </div>
                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest bg-[#1a1b26] px-1.5 py-0.5 rounded">
                                VS
                            </div>
                            <div className={`text-lg font-black ${result === 'win' ? 'text-red-500' : result === 'loss' ? 'text-green-500' : 'text-gray-400'} text-left w-8`}>
                                {oppScore ?? '-'}
                            </div>
                        </div>

                        {/* Opponent & Actions */}
                        <div className="flex items-center justify-end gap-3 w-1/3 min-w-[140px]">
                            {/* Opponent Name & Avatar */}
                            <div className="flex items-center gap-2 text-right">
                                <span className="text-sm font-semibold text-gray-300 truncate max-w-[100px] sm:max-w-[150px]">
                                    {(opponent as any).displayName || (opponent as any).username || (opponent as any).name || '?'}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-[#1a1b26] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                    {(opponent as any).avatarUrl ? (
                                        <img src={(opponent as any).avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon size={14} className="text-gray-500" />
                                    )}
                                </div>
                            </div>

                            {/* Delete Action (Admin Only) */}
                            {isAdmin && (
                                <div className="ml-2 pl-2 border-l border-white/10 flex items-center">
                                    {isConfirmingDelete ? (
                                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                                            <button
                                                onClick={() => handleDelete(match.id)}
                                                className="p-1.5 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(null)}
                                                className="p-1.5 bg-gray-700/50 text-gray-400 hover:bg-gray-600 hover:text-white rounded transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteId(match.id)}
                                            className="p-1.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Meccs törlése"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MatchHistory;
