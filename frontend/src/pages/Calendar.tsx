import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Trophy, Swords, Clock, MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: CalendarEvent[];
}

export function CalendarPage() {
    const dispatch = useAppDispatch();
    const { tournaments, isLoading } = useAppSelector((state) => state.tournaments);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [view, setView] = useState<'month' | 'list'>('month');
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

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

    // Generate calendar days for the current month
    const generateCalendarDays = (): CalendarDay[] => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Get the day of week (0 = Sunday, 1 = Monday, etc.)
        // Adjust so Monday is first (0)
        let firstDayOfWeek = firstDay.getDay() - 1;
        if (firstDayOfWeek === -1) firstDayOfWeek = 6;

        const days: CalendarDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Add days from previous month
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({
                date,
                isCurrentMonth: false,
                isToday: date.getTime() === today.getTime(),
                events: getEventsForDate(date),
            });
        }

        // Add days of current month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            days.push({
                date,
                isCurrentMonth: true,
                isToday: date.getTime() === today.getTime(),
                events: getEventsForDate(date),
            });
        }

        // Add days from next month to complete the grid
        const remainingDays = 42 - days.length; // 6 weeks * 7 days
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(year, month + 1, day);
            days.push({
                date,
                isCurrentMonth: false,
                isToday: date.getTime() === today.getTime(),
                events: getEventsForDate(date),
            });
        }

        return days;
    };

    const getEventsForDate = (date: Date): CalendarEvent[] => {
        const dateStr = date.toISOString().split('T')[0];
        return events.filter(event => {
            const eventDateStr = event.date.toISOString().split('T')[0];
            return eventDateStr === dateStr;
        });
    };

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

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    const handleDayClick = (day: CalendarDay) => {
        setSelectedDate(day.date);
        if (day.events.length === 1) {
            setSelectedEvent(day.events[0]);
        }
    };

    const calendarDays = generateCalendarDays();
    const monthName = new Intl.DateTimeFormat('hu-HU', { month: 'long', year: 'numeric' }).format(currentDate);
    const weekDays = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

    const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    return (
        <div className="calendar-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Naptár</h1>
                    <p className="page-subtitle">Közelgő versenyek és mérkőzések</p>
                </div>

                <div className="view-toggle">
                    <button
                        className={`btn ${view === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setView('month')}
                    >
                        Hónap
                    </button>
                    <button
                        className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setView('list')}
                    >
                        Lista
                    </button>
                </div>
            </div>

            {view === 'month' ? (
                <div className="calendar-container">
                    <div className="calendar-header">
                        <button className="btn btn-secondary" onClick={goToPreviousMonth}>
                            <ChevronLeft size={20} />
                        </button>
                        <h2 className="calendar-month-title">{monthName}</h2>
                        <button className="btn btn-secondary" onClick={goToNextMonth}>
                            <ChevronRight size={20} />
                        </button>
                        <button className="btn btn-primary" onClick={goToToday}>
                            Ma
                        </button>
                    </div>

                    <div className="calendar-grid">
                        {weekDays.map((day) => (
                            <div key={day} className="calendar-weekday">
                                {day}
                            </div>
                        ))}

                        {calendarDays.map((day, index) => (
                            <div
                                key={index}
                                className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''
                                    } ${selectedDate?.toDateString() === day.date.toDateString() ? 'selected' : ''} ${day.events.length > 0 ? 'has-events' : ''
                                    }`}
                                onClick={() => handleDayClick(day)}
                            >
                                <span className="calendar-day-number">{day.date.getDate()}</span>
                                {day.events.length > 0 && (
                                    <div className="calendar-day-events">
                                        {day.events.slice(0, 3).map((event) => (
                                            <div
                                                key={event.id}
                                                className={`event-dot ${event.tournament?.status === 'REGISTRATION' ? 'status-registration' :
                                                    event.tournament?.status === 'IN_PROGRESS' ? 'status-in-progress' :
                                                        'status-completed'
                                                    }`}
                                                title={event.title}
                                            />
                                        ))}
                                        {day.events.length > 3 && (
                                            <span className="event-more">+{day.events.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {selectedDayEvents.length > 0 && (
                        <div className="selected-day-events">
                            <h3 className="selected-day-title">
                                {formatDate(selectedDate!)}
                            </h3>
                            <div className="events-list-compact">
                                {selectedDayEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className="event-card-compact card card-glow"
                                        onClick={() => setSelectedEvent(event)}
                                    >
                                        <div className="event-compact-header">
                                            {event.type === 'tournament' ? (
                                                <Trophy size={16} className="text-primary" />
                                            ) : (
                                                <Swords size={16} className="text-warning" />
                                            )}
                                            <span className="event-compact-title">{event.title}</span>
                                        </div>
                                        <div className="event-compact-details">
                                            <span className="event-compact-time">
                                                <Clock size={14} />
                                                {formatTime(event.date)}
                                            </span>
                                            {event.tournament && (
                                                <span className={`badge ${event.tournament.status === 'REGISTRATION' ? 'badge-success' :
                                                    event.tournament.status === 'IN_PROGRESS' ? 'badge-warning' :
                                                        'badge-primary'
                                                    }`}>
                                                    {event.tournament.status === 'REGISTRATION' ? 'Regisztráció' :
                                                        event.tournament.status === 'IN_PROGRESS' ? 'Folyamatban' :
                                                            'Befejezett'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <>
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
                </>
            )}

            {selectedEvent && (
                <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
                    <div className="event-modal card" onClick={(e) => e.stopPropagation()}>
                        <div className="event-modal-header">
                            <h2>{selectedEvent.title}</h2>
                            <button className="btn-close" onClick={() => setSelectedEvent(null)}>×</button>
                        </div>
                        <div className="event-modal-body">
                            <div className="event-modal-detail">
                                <CalendarIcon size={20} />
                                <div>
                                    <strong>Dátum</strong>
                                    <p>{formatDate(selectedEvent.date)}</p>
                                </div>
                            </div>
                            <div className="event-modal-detail">
                                <Clock size={20} />
                                <div>
                                    <strong>Időpont</strong>
                                    <p>{formatTime(selectedEvent.date)}</p>
                                </div>
                            </div>
                            {selectedEvent.tournament?.game && (
                                <div className="event-modal-detail">
                                    <MapPin size={20} />
                                    <div>
                                        <strong>Játék</strong>
                                        <p>{selectedEvent.tournament.game.name}</p>
                                    </div>
                                </div>
                            )}
                            {selectedEvent.participants !== undefined && (
                                <div className="event-modal-detail">
                                    <Users size={20} />
                                    <div>
                                        <strong>Résztvevők</strong>
                                        <p>{selectedEvent.participants} csapat</p>
                                    </div>
                                </div>
                            )}
                            {selectedEvent.tournament && (
                                <div className="event-modal-detail">
                                    <Trophy size={20} />
                                    <div>
                                        <strong>Státusz</strong>
                                        <p>
                                            <span className={`badge ${selectedEvent.tournament.status === 'REGISTRATION' ? 'badge-success' :
                                                selectedEvent.tournament.status === 'IN_PROGRESS' ? 'badge-warning' :
                                                    'badge-primary'
                                                }`}>
                                                {selectedEvent.tournament.status === 'REGISTRATION' ? 'Regisztráció' :
                                                    selectedEvent.tournament.status === 'IN_PROGRESS' ? 'Folyamatban' :
                                                        'Befejezett'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="event-modal-footer">
                            <button className="btn btn-primary" onClick={() => {
                                window.location.href = `/tournaments/${selectedEvent.id}`;
                            }}>
                                Részletek megtekintése
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
