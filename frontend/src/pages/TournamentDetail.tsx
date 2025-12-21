import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Calendar, Users, Award, UserPlus, Maximize, Minimize, Shield, Clock, Edit2, Check, X, Share2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { useAuth } from '../hooks/useAuth';
import {
    fetchTournament,
    clearCurrentTournament,
    registerForTournament,
    generateBracket,
    updateMatch,
    updateEntryStats,
} from '../store/slices/tournamentsSlice';
import { fetchMyTeams } from '../store/slices/teamsSlice';
import { TournamentStatusModal } from '../components/admin';
import { TournamentBracket, MatchEditModal } from '../components/tournament';
import type { Match } from '../types';

const statusLabels: Record<string, { label: string; class: string; icon: any }> = {
    DRAFT: { label: 'Tervezet', class: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: Clock },
    REGISTRATION: { label: 'Regisztráció nyitva', class: 'bg-green-500/20 text-green-400 border-green-500/50', icon: UserPlus },
    IN_PROGRESS: { label: 'Folyamatban', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock },
    COMPLETED: { label: 'Befejezett', class: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Trophy },
    CANCELLED: { label: 'Törölve', class: 'bg-red-500/20 text-red-400 border-red-500/50', icon: Shield },
};

export function TournamentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAuth();
    const { currentTournament, isLoading } = useAppSelector((state) => state.tournaments);
    const { myTeams } = useAppSelector((state) => state.teams);

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'bracket' | 'qualifier'>('info');
    const [isFullscreen, setIsFullscreen] = useState(false);



    // Qualifier editing state
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ matches: 0, points: 0 });

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handleEditEntry = (entry: any) => {
        setEditingEntryId(entry.id);
        setEditForm({
            matches: entry.matchesPlayed || 0,
            points: entry.qualifierPoints || 0
        });
    };

    const saveEntryStats = async () => {
        if (!editingEntryId || !currentTournament) return;
        try {
            await dispatch(updateEntryStats({
                tournamentId: currentTournament.id,
                entryId: editingEntryId,
                data: { matchesPlayed: editForm.matches, qualifierPoints: editForm.points }
            })).unwrap();
            setEditingEntryId(null);
        } catch (err) {
            console.error(err);
            toast.error('Hiba történt a mentés során');
        }
    };

    useEffect(() => {
        if (id) {
            dispatch(fetchTournament(id));
        }
        if (isAuthenticated) {
            dispatch(fetchMyTeams());
        }


        return () => {
            dispatch(clearCurrentTournament());
        };
    }, [id, dispatch, isAuthenticated]);

    const handleRegister = async () => {
        if (!selectedTeamId || !currentTournament) return;

        try {
            await dispatch(registerForTournament({
                tournamentId: currentTournament.id,
                teamId: selectedTeamId,
            })).unwrap();

            setShowRegisterModal(false);
            dispatch(fetchTournament(currentTournament.id));
        } catch (err) {
            console.error('Failed to register:', err);
        }
    };

    const handleGenerateBracket = async () => {
        if (!currentTournament) return;

        try {
            await dispatch(generateBracket(currentTournament.id)).unwrap();
            dispatch(fetchTournament(currentTournament.id));
        } catch (err) {
            console.error('Failed to generate bracket:', err);
        }
    };

    const handleMatchClick = (match: Match) => {
        if (user?.role === 'ADMIN' || user?.role === 'ORGANIZER') {
            setSelectedMatch(match);
            setShowMatchModal(true);
        }
    };

    const handleMatchUpdate = async (data: { homeScore?: number; awayScore?: number; winnerId?: string }) => {
        if (!selectedMatch) return;

        try {
            await dispatch(updateMatch({ matchId: selectedMatch.id, data })).unwrap();
            setShowMatchModal(false);
            setSelectedMatch(null);
        } catch (err) {
            console.error('Failed to update match:', err);
        }
    };

    if (isLoading || !currentTournament) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-400 animate-pulse">Betöltés...</p>
            </div>
        );
    }

    const startDate = new Date(currentTournament.startDate);
    const regDeadline = new Date(currentTournament.registrationDeadline);
    const isRegistrationOpen = currentTournament.status === 'REGISTRATION'; // && new Date() < regDeadline;
    const userTeamIds = myTeams.map(t => t.id);
    const isAlreadyRegistered = currentTournament.entries?.some(e => e.teamId && userTeamIds.includes(e.teamId));
    const StatusIcon = statusLabels[currentTournament.status]?.icon || Shield;

    return (
        <div className="min-h-screen pb-12">
            {/* Hero Section */}
            <div className="relative h-[400px] w-full mb-8 group">
                <div className="absolute inset-0 overflow-hidden">
                    {currentTournament.game?.imageUrl ? (
                        <img
                            src={currentTournament.game.imageUrl}
                            alt={currentTournament.game.name}
                            className="w-full h-full object-cover filter brightness-[0.3] group-hover:brightness-[0.4] transition-all duration-700"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1016] via-[#0f1016]/80 to-transparent" />
                </div>

                <div className="container mx-auto px-4 h-full relative flex flex-col justify-end pb-12">
                    <button
                        className="absolute top-8 left-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-black/30 hover:bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5"
                        onClick={() => navigate('/tournaments')}
                    >
                        <ArrowLeft size={18} />
                        Vissza
                    </button>

                    <button
                        className="absolute top-8 right-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-black/30 hover:bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5"
                        onClick={() => {
                            // Use backend URL for sharing to get Open Graph tags
                            // Assuming backend is on port 3000 locally or api domain in prod
                            // We can construct this based on current origin if mapped, or hardcode/config
                            const shareUrl = `${window.location.protocol}//${window.location.hostname}/share/tournaments/${currentTournament.id}`;
                            navigator.clipboard.writeText(shareUrl);
                            toast.success('Megosztási link másolva a vágólapra!');
                        }}
                        title="Megosztás Discordra"
                    >
                        <Share2 size={18} />
                        Megosztás
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end gap-8">
                        <div className="flex-grow space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${statusLabels[currentTournament.status]?.class || 'bg-gray-500/20 text-gray-400 border-gray-500/50'}`}>
                                    <StatusIcon size={14} />
                                    {statusLabels[currentTournament.status]?.label || currentTournament.status}
                                </span>
                                {currentTournament.game && (
                                    <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/10 backdrop-blur-md">
                                        {currentTournament.game.name}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                                {currentTournament.name}
                            </h1>

                            {currentTournament.description && (
                                <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
                                    {currentTournament.description}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-6 text-sm text-gray-300 pt-2">
                                <div className="flex items-center gap-2">
                                    <Calendar size={18} className="text-primary" />
                                    <span>{startDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users size={18} className="text-primary" />
                                    <span>{currentTournament._count?.entries || 0} / {currentTournament.maxTeams} résztvevő</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px] mb-5">
                            {isRegistrationOpen && isAuthenticated && !isAlreadyRegistered && (
                                <button
                                    className="btn btn-primary w-full shadow-lg shadow-primary/20"
                                    onClick={() => setShowRegisterModal(true)}
                                >
                                    <UserPlus size={18} />
                                    Regisztráció
                                </button>
                            )}

                            {user?.role === 'ADMIN' && (
                                <button
                                    className="btn btn-secondary w-full bg-white/10 hover:bg-white/20 border-white/10"
                                    onClick={() => setShowStatusModal(true)}
                                >
                                    Státusz módosítása
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-[#1a1b26] p-6 rounded-xl border border-white/5 shadow-lg flex items-center gap-4 hover:border-primary/30 transition-colors group">
                        <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                            <Trophy size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Formátum</p>
                            <p className="text-lg font-bold text-white">
                                {currentTournament.format === 'SINGLE_ELIMINATION' ? 'Egyenes kieséses' :
                                    currentTournament.format === 'DOUBLE_ELIMINATION' ? 'Dupla kieséses' :
                                        currentTournament.format === 'ROUND_ROBIN' ? 'Körmérkőzés' : currentTournament.format}
                            </p>
                        </div>
                    </div>

                    <div className="bg-[#1a1b26] p-6 rounded-xl border border-white/5 shadow-lg flex items-center gap-4 hover:border-primary/30 transition-colors group">
                        <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Jelentkezési határidő</p>
                            <p className="text-lg font-bold text-white">
                                {regDeadline.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {(currentTournament as any).prizePool && (
                        <div className="bg-[#1a1b26] p-6 rounded-xl border border-white/5 shadow-lg flex items-center gap-4 hover:border-primary/30 transition-colors group">
                            <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                                <Award size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Díjazás</p>
                                <p className="text-lg font-bold text-white">{(currentTournament as any).prizePool}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="bg-[#1a1b26] p-1 rounded-full border border-white/5 inline-flex">
                        <button
                            className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'info' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setActiveTab('info')}
                        >
                            Információk
                        </button>
                        {currentTournament.hasQualifier && (
                            <button
                                className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'qualifier' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                onClick={() => setActiveTab('qualifier')}
                            >
                                Selejtező
                            </button>
                        )}
                        <button
                            className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'bracket' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setActiveTab('bracket')}
                        >
                            Bracket
                        </button>
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'info' && (
                    <div className="space-y-8">
                        {/* Participants Section */}
                        <div className="bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Users size={20} className="text-primary" />
                                    {currentTournament.game?.teamSize === 1 ? 'Regisztrált játékosok' : 'Regisztrált résztvevők'}
                                </h2>
                                <span className="bg-white/5 text-gray-400 text-xs px-2 py-1 rounded">
                                    {currentTournament.entries?.length || 0} résztvevő
                                </span>
                            </div>

                            <div className="p-6">
                                {currentTournament.entries && currentTournament.entries.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {currentTournament.entries.map((entry) => {
                                            if (entry.user && !entry.team) {
                                                // Solo Player Card
                                                return (
                                                    <div key={entry.id} className="relative group overflow-hidden rounded-xl border border-white/10 bg-[#252632] hover:border-primary/50 transition-all duration-300">
                                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                        <div className="relative p-4 flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-lg bg-black/30 flex items-center justify-center border border-white/5 overflow-hidden text-primary">
                                                                {entry.user.avatarUrl ? (
                                                                    <img src={entry.user.avatarUrl} alt={entry.user.displayName} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xl font-bold">
                                                                        {(entry.user.displayName || entry.user.username).charAt(0).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex-grow">
                                                                <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">
                                                                    {entry.user.displayName || entry.user.username}
                                                                </h3>
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <span className="text-gray-400">ELO: <span className="text-white">{entry.user.elo || 1000}</span></span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Kiemelés</span>
                                                                <span className="font-mono text-xl font-bold text-white/20 group-hover:text-primary/50 transition-colors">
                                                                    #{entry.seed}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            } else if (entry.team) {
                                                // Team Card
                                                return (
                                                    <Link key={entry.id} to={`/teams/${entry.team.id}`} className="relative group overflow-hidden rounded-xl border border-white/10 bg-[#252632] hover:border-primary/50 transition-all duration-300 block">
                                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                        <div className="relative p-4 flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-lg bg-black/30 flex items-center justify-center border border-white/5 overflow-hidden text-primary">
                                                                {entry.team.logoUrl ? (
                                                                    <img src={entry.team.logoUrl} alt={entry.team.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Users size={24} />
                                                                )}
                                                            </div>

                                                            <div className="flex-grow">
                                                                <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">
                                                                    {entry.team.name}
                                                                </h3>
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <span className="text-gray-400">ELO: <span className="text-white">{entry.team.elo}</span></span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Kiemelés</span>
                                                                <span className="font-mono text-xl font-bold text-white/20 group-hover:text-primary/50 transition-colors">
                                                                    #{entry.seed}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                        <Users size={48} className="mb-4 opacity-50" />
                                        <p>Még nincsenek regisztrált résztvevők</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'qualifier' && currentTournament.hasQualifier && (
                    <div className="space-y-8">
                        {/* Qualifier Settings */}
                        <div className="bg-[#1a1b26] p-6 rounded-xl border border-white/5 shadow-lg flex items-center gap-4 hover:border-primary/30 transition-colors group">
                            <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                                <Shield size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Selejtező</p>
                                <p className="text-lg font-bold text-white">
                                    {currentTournament.qualifierMatches} meccs / min. {currentTournament.qualifierMinPoints} pont
                                </p>
                            </div>
                        </div>

                        {/* Qualifier Results */}
                        <div className="bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Award size={20} className="text-primary" />
                                    Eredmények
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
                                            <th className="px-6 py-4 font-medium">Kiemelés</th>
                                            <th className="px-6 py-4 font-medium">Résztvevő</th>
                                            <th className="px-6 py-4 font-medium">Mérkőzések</th>
                                            <th className="px-6 py-4 font-medium">Pontszám</th>
                                            <th className="px-6 py-4 font-medium text-right">Kezelés</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {[...(currentTournament.entries || [])]
                                            .sort((a, b) => (b.qualifierPoints || 0) - (a.qualifierPoints || 0))
                                            .map((entry) => {
                                                const isEditing = editingEntryId === entry.id;
                                                const targetMatches = currentTournament.qualifierMatches || 0;
                                                const targetPoints = currentTournament.qualifierMinPoints || 0;
                                                const currentMatches = entry.matchesPlayed || 0;
                                                const currentPoints = entry.qualifierPoints || 0;

                                                const isQualified = currentMatches >= targetMatches && currentPoints >= targetPoints;
                                                const isFailed = currentMatches >= targetMatches && currentPoints < targetPoints;

                                                const name = entry.user ? (entry.user.displayName || entry.user.username) : entry.team?.name;
                                                const avatar = entry.user?.avatarUrl || entry.team?.logoUrl;

                                                let rowClass = 'hover:bg-white/5';
                                                if (isQualified) rowClass = 'bg-green-500/10 hover:bg-green-500/20 border-l-2 border-l-green-500';
                                                if (isFailed) rowClass = 'bg-red-500/10 hover:bg-red-500/20 border-l-2 border-l-red-500';

                                                return (
                                                    <tr key={entry.id} className={`group transition-colors ${rowClass}`}>
                                                        <td className="px-6 py-4">
                                                            <span className="font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">#{entry.seed}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center border border-white/10 overflow-hidden text-xs font-bold text-gray-400">
                                                                    {avatar ? (
                                                                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        name?.charAt(0).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <span className="font-medium text-white">{name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.matches}
                                                                    onChange={e => setEditForm({ ...editForm, matches: parseInt(e.target.value) })}
                                                                    className="bg-black/50 border border-white/20 rounded px-3 py-1 text-white text-sm w-20 focus:outline-none focus:border-primary"
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <span className={currentMatches >= targetMatches ? "text-green-400 font-bold" : "text-gray-400"}>
                                                                    {currentMatches} <span className="text-gray-600 text-xs font-normal">/ {targetMatches}</span>
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.points}
                                                                    onChange={e => setEditForm({ ...editForm, points: parseInt(e.target.value) })}
                                                                    className="bg-black/50 border border-white/20 rounded px-3 py-1 text-white text-sm w-20 focus:outline-none focus:border-primary"
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <span className={isQualified ? "text-green-400 font-bold" : (isFailed ? "text-red-400 font-bold" : "text-gray-400")}>
                                                                    {currentPoints} <span className="text-gray-600 text-xs font-normal">/ {targetPoints}</span>
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {(user?.role === 'ADMIN' || user?.role === 'ORGANIZER') && (
                                                                isEditing ? (
                                                                    <button
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveEntryStats(); }}
                                                                        className="p-2 bg-primary text-black rounded hover:bg-primary/90 transition-colors inline-flex"
                                                                        title="Mentés"
                                                                    >
                                                                        <Check size={16} />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditEntry(entry); }}
                                                                        className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors inline-flex opacity-0 group-hover:opacity-100"
                                                                        title="Szerkesztés"
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                )
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bracket' && (
                    <div className={`bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden shadow-2xl ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'relative'}`}>
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Trophy size={18} className="text-primary" />
                                Bracket
                            </h2>
                            <div className="flex gap-2">
                                {(user?.role === 'ADMIN' || user?.role === 'ORGANIZER') && (
                                    <>
                                        {!currentTournament.matches?.length ? (
                                            <button className="btn btn-primary btn-sm" onClick={handleGenerateBracket}>
                                                Bracket generálása
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-warning btn-sm"
                                                onClick={() => {
                                                    if (window.confirm('Biztosan újra akarod generálni a bracketet? Ez törli az összes jelenlegi meccset és eredményt!')) {
                                                        handleGenerateBracket();
                                                    }
                                                }}
                                            >
                                                Újragenerálás
                                            </button>
                                        )}
                                    </>
                                )}
                                <button
                                    className="btn btn-ghost btn-sm text-gray-400 hover:text-white"
                                    onClick={toggleFullscreen}
                                    title={isFullscreen ? 'Kilépés' : 'Teljes képernyő'}
                                >
                                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className={`overflow-auto flex flex-col ${isFullscreen ? 'h-[calc(100vh-60px)]' : 'min-h-[600px] max-h-[800px]'}`}>
                            <TournamentBracket
                                tournament={currentTournament}
                                onMatchClick={handleMatchClick}
                            />
                        </div>

                    </div>
                )}
            </div>
            {
                showRegisterModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowRegisterModal(false)}>
                        <div className="bg-[#1a1b26] rounded-xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">Csapat regisztrálása</h2>
                                <button className="text-gray-400 hover:text-white" onClick={() => setShowRegisterModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-300 mb-4">Válaszd ki a csapatot, amellyel regisztrálni szeretnél:</p>
                                <select
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                                    value={selectedTeamId}
                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                >
                                    <option value="">Válassz csapatot...</option>
                                    {myTeams
                                        .filter(team => team.ownerId === user?.id)
                                        .map((team) => (
                                            <option key={team.id} value={team.id}>
                                                {team.name} ({team.elo} ELO)
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                                <button className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>
                                    Mégse
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleRegister}
                                    disabled={!selectedTeamId}
                                >
                                    Regisztráció
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {
                showStatusModal && currentTournament && (
                    <TournamentStatusModal
                        tournamentId={currentTournament.id}
                        currentStatus={currentTournament.status}
                        currentNotifyUsers={currentTournament.notifyUsers}
                        currentNotifyDiscord={currentTournament.notifyDiscord}
                        currentDiscordChannel={currentTournament.discordChannelId}
                        onClose={() => setShowStatusModal(false)}
                    />
                )
            }

            {/* Match Edit Modal */}
            {
                showMatchModal && selectedMatch && (
                    <MatchEditModal
                        match={selectedMatch}
                        onClose={() => {
                            setShowMatchModal(false);
                            setSelectedMatch(null);
                        }}
                        onSave={handleMatchUpdate}
                        isLoading={isLoading}
                    />
                )
            }
        </div >
    );
}

