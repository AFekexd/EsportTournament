import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { fetchTeam, clearCurrentTeam } from "../../store/slices/teamsSlice";
import { Users, Trophy } from "lucide-react";
import type { TeamMember } from "../../types";

export function TeamEmbedPage() {
    const { id } = useParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const { currentTeam, isLoading, error } = useAppSelector(
        (state) => state.teams
    );

    useEffect(() => {
        if (id) {
            dispatch(fetchTeam(id));
        }

        return () => {
            dispatch(clearCurrentTeam());
        };
    }, [id, dispatch]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1016]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            </div>
        );
    }

    if (error || !currentTeam) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1016] text-white p-4 text-center">
                <h2 className="text-xl font-bold mb-2">Hiba történt</h2>
                <p className="text-gray-400">
                    {error || "A csapat nem található."}
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1016] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1a1b26] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                {/* Banner/Background Effect */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent" />

                <div className="relative p-8 flex flex-col items-center text-center">
                    {/* Logo */}
                    <div className="w-32 h-32 rounded-full bg-[#0f1016] p-2 mb-6 border-4 border-[#1a1b26] shadow-xl relative z-10">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center overflow-hidden">
                            {currentTeam.logoUrl ? (
                                <img
                                    src={currentTeam.logoUrl}
                                    alt={currentTeam.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-4xl font-bold text-white">
                                    {currentTeam.name.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Team Name */}
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                        {currentTeam.name}
                    </h1>

                    {/* ELO Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-mono font-bold text-primary">{currentTeam.elo} ELO</span>
                    </div>

                    {/* Description */}
                    {currentTeam.description && (
                        <p className="text-gray-400 text-sm mb-8 line-clamp-3">
                            {currentTeam.description}
                        </p>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full mb-8">
                        <div className="bg-[#0f1016] p-3 rounded-xl border border-white/5">
                            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">
                                <Users size={14} />
                                Tagok
                            </div>
                            <div className="text-xl font-bold text-white">
                                {currentTeam.members?.length || 0}
                            </div>
                        </div>
                        <div className="bg-[#0f1016] p-3 rounded-xl border border-white/5">
                            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">
                                <Trophy size={14} />
                                Versenyek
                            </div>
                            <div className="text-xl font-bold text-white">
                                {currentTeam._count?.tournamentEntries || 0}
                            </div>
                        </div>
                    </div>

                    {/* Members Preview */}
                    <div className="flex justify-center -space-x-3 mb-6">
                        {currentTeam.members?.slice(0, 5).map((member: TeamMember) => (
                            <div
                                key={member.id}
                                className="w-10 h-10 rounded-full border-2 border-[#1a1b26] bg-[#0f1016] flex items-center justify-center overflow-hidden"
                                title={member.user?.displayName}
                            >
                                {member.user?.avatarUrl ? (
                                    <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs text-white font-bold">
                                        {(member.user?.displayName || "?").charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                        ))}
                        {currentTeam.members && currentTeam.members.length > 5 && (
                            <div className="w-10 h-10 rounded-full border-2 border-[#1a1b26] bg-[#2a2b36] flex items-center justify-center text-xs font-bold text-white">
                                +{currentTeam.members.length - 5}
                            </div>
                        )}
                    </div>

                    {/* CTA Button */}
                    <a
                        href={`${window.location.origin}/teams/${currentTeam.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        Csapat megtekintése
                        <Users size={18} />
                    </a>
                </div>
            </div>
        </div>
    );
}
