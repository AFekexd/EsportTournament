import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Trophy, Swords, Clock, MapPin, Users } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchTournaments } from '../store/slices/tournamentsSlice';
import type { Tournament } from '../types';
import './Calendar.css';

interface CalendarEvent {
    id: string;
    title: string;
    type: 'tournament' | 'match';
    date: Date;
    tournament?: Tournament;
    location?: string;
    participants?: number;
}

export function CalendarPage() {
    const dispatch = useAppDispatch();
    const { tournaments, isLoading } = useAppSelector((state) => state.tournaments);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'list'>('list');

    useEffect(() => {
        dispatch(fetchTournaments({ page: 1 }));
    }, [dispatch]);

    // Convert tournaments to calendar events
    const events: CalendarEvent[] = tournaments.map((tournament: Tournament) => ({
        id: tournament.id,
        title: tournament.name,
        type: 'tournament' as const,
        date: new Date(tournament.startDate),
        tournament,
        participants: tournament._count?.entries || 0,
    }));

    // Group events by date
    const eventsByDate = events.reduce((acc, event) => {
        const dateKey = event.date.toISOString().split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, CalendarEvent[]>);

    // Get upcoming events (next 30 days)
    const upcomingEvents = events
        .filter(event => event.date >= new Date())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 10);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('hu-HU', {
            hour: '2-digit',
            minute: '2-digit',
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

    return (
        <div className="calendar-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Naptár</h1>
                    <p className="page-subtitle">Közelgő versenyek és mérkőzések</p>
                </div>

                <div className="view-toggle">
                    <button
                        className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setView('list')}
                    >
                        Lista
                    </button>
                    <button
                        className={`btn ${view === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setView('month')}
                    >
                        Hónap
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="events-list">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="event-card-skeleton card">
                            <div className="skeleton" style={{ height: 24, width: '60%' }} />
                            <div className="skeleton" style={{ height: 16, width: '40%', marginTop: 8 }} />
                            <div className="skeleton" style={{ height: 16, width: '80%', marginTop: 16 }} />
                        </div>
                    ))}
                </div>
            ) : upcomingEvents.length === 0 ? (
                <div className="empty-state">
                    <CalendarIcon size={48} className="empty-icon" />
                    <h3>Nincs közelgő esemény</h3>
                    <p>Jelenleg nincsenek tervezett versenyek vagy mérkőzések.</p>
                </div>
            ) : (
                <div className="events-list">
                    {upcomingEvents.map((event) => (
                        <div key={event.id} className="event-card card card-glow">
                            <div className="event-header">
                                <div className="event-type">
                                    {event.type === 'tournament' ? (
                                        <Trophy size={20} className="text-primary" />
                                    ) : (
                                        <Swords size={20} className="text-warning" />
                                    )}
                                    <span className="event-type-label">
                                        {event.type === 'tournament' ? 'Verseny' : 'Mérkőzés'}
                                    </span>
                                </div>
                                <span className="event-relative-time">{getRelativeTime(event.date)}</span>
                            </div>

                            <h3 className="event-title">{event.title}</h3>

                            <div className="event-details">
                                <div className="event-detail">
                                    <CalendarIcon size={16} />
                                    <span>{formatDate(event.date)}</span>
                                </div>
                                <div className="event-detail">
                                    <Clock size={16} />
                                    <span>{formatTime(event.date)}</span>
                                </div>
                                {event.tournament?.game && (
                                    <div className="event-detail">
                                        <MapPin size={16} />
                                        <span>{event.tournament.game.name}</span>
                                    </div>
                                )}
                                {event.participants !== undefined && (
                                    <div className="event-detail">
                                        <Users size={16} />
                                        <span>{event.participants} csapat</span>
                                    </div>
                                )}
                            </div>

                            {event.tournament && (
                                <div className="event-footer">
                                    <span className={`badge ${event.tournament.status === 'REGISTRATION' ? 'badge-success' :
                                            event.tournament.status === 'IN_PROGRESS' ? 'badge-warning' :
                                                'badge-primary'
                                        }`}>
                                        {event.tournament.status === 'REGISTRATION' ? 'Regisztráció' :
                                            event.tournament.status === 'IN_PROGRESS' ? 'Folyamatban' :
                                                'Befejezett'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
