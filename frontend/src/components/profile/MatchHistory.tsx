import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
    Trophy,
    Calendar,
    User as UserIcon,
    Trash2,
    X,
    Check
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
            <div className="text-center py-12 text-gray-500 bg-[#1a1b26] rounded-xl border border-white/5">
                <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                <p>Még nincsenek lejátszott meccsek.</p>
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
        // Draw or unknown
        return 'draw';
    };

    return (
        <div className="space-y-4">
            {matches.map((match) => {
                const opponent = getOpponent(match);
                const result = getResult(match);
                const isConfirmingDelete = deleteId === match.id;

                return (
                    <div
                        key={match.id}
                        className={`
              relative overflow-hidden rounded-xl border transition-all duration-300
              ${result === 'win' ? 'bg-green-500/5 border-green-500/10 hover:border-green-500/30' :
                                result === 'loss' ? 'bg-red-500/5 border-red-500/10 hover:border-red-500/30' :
                                    'bg-[#1a1b26] border-white/5 hover:border-white/10'}
            `}
                    >
                        <div className="p-4 flex flex-col md:flex-row items-center gap-4 md:gap-8">
                            {/* Game & Tournament Info */}
                            <div className="flex-1 text-center md:text-left min-w-[200px]">
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                    {match.tournament.game?.imageUrl && (
                                        <img
                                            src={match.tournament.game.imageUrl}
                                            alt={match.tournament.game.name}
                                            className="w-4 h-4 rounded-sm object-cover"
                                        />
                                    )}
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                        {match.tournament.game?.name || 'Játék'}
                                    </span>
                                </div>
                                <Link
                                    to={`/tournaments/${match.tournament.id}`}
                                    className="font-bold text-white hover:text-primary transition-colors line-clamp-1"
                                >
                                    {match.tournament.name}
                                </Link>
                                <div className="text-xs text-gray-500 mt-1 flex items-center justify-center md:justify-start gap-2">
                                    <Calendar size={12} />
                                    <span>
                                        {match.playedAt ? new Date(match.playedAt).toLocaleDateString('hu-HU') : 'Tervezett'}
                                    </span>
                                    {match.round > 0 && (
                                        <>
                                            <span>•</span>
                                            <span>{match.round}. Kör</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Score Board */}
                            <div className="flex items-center gap-6">
                                <div className={`text-2xl font-black ${result === 'win' ? 'text-green-500' : result === 'loss' ? 'text-red-500' : 'text-gray-400'}`}>
                                    {match.homeUserId === currentUserId ? match.homeScore ?? '-' : match.awayScore ?? '-'}
                                </div>
                                <div className="text-gray-600 font-bold text-xs uppercase tracking-widest">VS</div>
                                <div className={`text-2xl font-black ${result === 'loss' ? 'text-green-500' : result === 'win' ? 'text-red-500' : 'text-gray-400'}`}>
                                    {match.homeUserId === currentUserId ? match.awayScore ?? '-' : match.homeScore ?? '-'}
                                </div>
                            </div>

                            {/* Opponent Info */}
                            <div className="flex-1 text-center md:text-right min-w-[200px] flex flex-col items-center md:items-end">
                                <div className="text-xs text-gray-500 mb-1">Ellenfél</div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-white">
                                        {(opponent as any).displayName || (opponent as any).username || (opponent as any).name || '?'}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-[#0f1015] border border-white/10 flex items-center justify-center overflow-hidden">
                                        {(opponent as any).avatarUrl ? (
                                            <img src={(opponent as any).avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={14} className="text-gray-400" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="w-24 flex justify-center">
                                <div className={`
                    px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider
                    ${result === 'win' ? 'bg-green-500/20 text-green-500 border-green-500/20' :
                                        result === 'loss' ? 'bg-red-500/20 text-red-500 border-red-500/20' :
                                            'bg-gray-500/20 text-gray-400 border-gray-500/20'}
                `}>
                                    {result === 'win' ? 'Győzelem' : result === 'loss' ? 'Vereség' : 'Függőben'}
                                </div>
                            </div>

                            {/* Admin Actions */}
                            {isAdmin && (
                                <div className="flex items-center justify-center pl-4 border-l border-white/5">
                                    {isConfirmingDelete ? (
                                        <div className="flex gap-2 animate-in fade-in zoom-in slide-in-from-right-4 duration-200">
                                            <button
                                                onClick={() => handleDelete(match.id)}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg hover:shadow-red-500/20 transition-all"
                                                title="Megerősítés"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(null)}
                                                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
                                                title="Mégse"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteId(match.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Meccs törlése"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Decoration for status */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${result === 'win' ? 'bg-green-500' :
                            result === 'loss' ? 'bg-red-500' :
                                'bg-gray-600'
                            }`}></div>
                    </div>
                );
            })}
        </div>
    );
};

export default MatchHistory;
