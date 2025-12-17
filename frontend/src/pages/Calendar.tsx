import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Trophy, Clock, ChevronLeft, ChevronRight, CalendarDays, List as ListIcon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchTournaments } from '../store/slices/tournamentsSlice';
import type { Tournament } from '../types';

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    tournament?: Tournament;
}

export function CalendarPage() {
    const dispatch = useAppDispatch();
    const { tournaments, isLoading } = useAppSelector((state) => state.tournaments);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'list'>('month');

    useEffect(() => {
        dispatch(fetchTournaments({ page: 1 }));
    }, [dispatch]);

    // Convert tournaments to calendar events
    const events: CalendarEvent[] = tournaments.map((tournament: Tournament) => ({
        id: tournament.id,
        title: tournament.name,
        date: new Date(tournament.startDate),
        tournament,
    }));

    const upcomingEvents = events
        .filter(event => event.date >= new Date())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 10);

    const monthName = new Intl.DateTimeFormat('hu-HU', { month: 'long', year: 'numeric' }).format(currentDate);

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    };

    const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Ma';
        if (days === 1) return 'Holnap';
        if (days < 7) return `${days} nap múlva`;
        if (days < 30) return `${Math.floor(days / 7)} hét múlva`;
        return `${Math.floor(days / 30)} hónap múlva`;
    };

    const statusColors: Record<string, string> = {
        REGISTRATION: 'bg-green-500/10 text-green-400 border-green-500/20',
        IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        COMPLETED: 'bg-primary/10 text-primary border-primary/20',
    };

    const statusLabels: Record<string, string> = {
        REGISTRATION: 'Regisztráció',
        IN_PROGRESS: 'Folyamatban',
        COMPLETED: 'Befejezett',
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Modern Header with Gradient */}
            <div className="mb-12 text-center relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-3xl rounded-full -z-10" />
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary-100 to-gray-400 bg-clip-text text-transparent mb-4">
                    Naptár
                </h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                    Közelgő versenyek és mérkőzések áttekintése
                </p>
            </div>

            {/* View Toggle */}
            <div className="mb-8 flex justify-center">
                <div className="flex bg-[#1a1b26] p-1 rounded-xl border border-white/5">
                    <button
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${view === 'month'
                                ? 'bg-[#0f1015] text-white shadow-lg'
                                : 'text-gray-400 hover:text-gray-300'
                            }`}
                        onClick={() => setView('month')}
                    >
                        <CalendarDays size={16} />
                        Hónap
                    </button>
                    <button
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${view === 'list'
                                ? 'bg-[#0f1015] text-white shadow-lg'
                                : 'text-gray-400 hover:text-gray-300'
                            }`}
                        onClick={() => setView('list')}
                    >
                        <ListIcon size={16} />
                        Lista
                    </button>
                </div>
            </div>

            {view === 'month' ? (
                <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-6 shadow-lg">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            onClick={goToPreviousMonth}
                        >
                            <ChevronLeft size={20} className="text-gray-400" />
                        </button>
                        <h2 className="text-2xl font-bold text-white capitalize">{monthName}</h2>
                        <button
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            onClick={goToNextMonth}
                        >
                            <ChevronRight size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Calendar Info */}
                    <div className="text-center text-gray-400 py-12">
                        <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Naptár nézet fejlesztés alatt</p>
                        <p className="text-sm mt-2">Használd a Lista nézetet az események megtekintéséhez</p>
                    </div>
                </div>
            ) : (
                <>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-400">Betöltés...</p>
                        </div>
                    ) : upcomingEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-[#1a1b26]/50 rounded-2xl border border-white/5">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                <CalendarIcon size={40} className="text-gray-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Nincs közelgő esemény</h3>
                            <p className="text-gray-400">Jelenleg nincsenek tervezett versenyek vagy mérkőzések.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {upcomingEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className="group bg-[#1a1b26] rounded-xl border border-white/5 p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-xl"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                                                <Trophy size={24} className="text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                                    {event.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                                    <Clock size={14} />
                                                    <span>{formatDate(event.date)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-medium text-primary">
                                                {getRelativeTime(event.date)}
                                            </span>
                                            {event.tournament && (
                                                <div className="mt-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[event.tournament.status] || statusColors.COMPLETED
                                                        }`}>
                                                        {statusLabels[event.tournament.status] || 'Ismeretlen'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {event.tournament?.game && (
                                        <div className="flex items-center gap-2 text-sm text-gray-400 pt-4 border-t border-white/5">
                                            <span>Játék:</span>
                                            <span className="text-white font-medium">{event.tournament.game.name}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
