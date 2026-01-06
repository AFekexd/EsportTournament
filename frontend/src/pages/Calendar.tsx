import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Trophy,
  Clock,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List as ListIcon,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchTournaments } from "../store/slices/tournamentsSlice";
import type { Tournament } from "../types";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  tournament?: Tournament;
}

// ... imports remain the same

export function CalendarPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tournaments, isLoading } = useAppSelector(
    (state) => state.tournaments
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<"month" | "list">("month");

  useEffect(() => {
    dispatch(fetchTournaments({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Convert tournaments to calendar events
  const events: CalendarEvent[] = tournaments.map((tournament: Tournament) => ({
    id: tournament.id,
    title: tournament.name,
    date: new Date(tournament.startDate),
    tournament,
  }));

  const upcomingEvents = events
    .filter((event) => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 10);

  const selectedDayEvents = events.filter(
    (event) => event.date.toDateString() === selectedDate.toDateString()
  );

  const monthName = new Intl.DateTimeFormat("hu-HU", {
    month: "long",
    year: "numeric",
  }).format(currentDate);

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Ma";
    if (days === 1) return "Holnap";
    if (days < 7) return `${days} nap múlva`;
    if (days < 30) return `${Math.floor(days / 7)} hét múlva`;
    return `${Math.floor(days / 30)} hónap múlva`;
  };

  const statusColors: Record<string, string> = {
    REGISTRATION: "bg-green-500/10 text-green-400 border-green-500/20",
    IN_PROGRESS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    COMPLETED: "bg-primary/10 text-primary border-primary/20",
  };

  const statusLabels: Record<string, string> = {
    REGISTRATION: "Regisztráció",
    IN_PROGRESS: "Folyamatban",
    COMPLETED: "Befejezett",
  };

  // Calendar Grid Logic
  const getDaysInMonth = (year: number, month: number) => {
    const days = [];

    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    // Adjust for Monday start (0 = Sunday, 1 = Monday ...)
    // We want Monday = 0, Sunday = 6
    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    // Previous month's padding days
    const prevMonthPath = new Date(year, month, 0).getDate();
    for (let i = 0; i < startingDay; i++) {
      days.push({
        date: new Date(year, month - 1, prevMonthPath - startingDay + i + 1),
        isCurrentMonth: false,
        events: [] as CalendarEvent[],
      });
    }

    // Current month's days
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDayDate = new Date(year, month, i);
      const dayEvents = events.filter(
        (e) =>
          e.date.getDate() === i &&
          e.date.getMonth() === month &&
          e.date.getFullYear() === year
      );

      days.push({
        date: currentDayDate,
        isCurrentMonth: true,
        events: dayEvents,
      });
    }

    // Next month's padding days to complete the grid (up to 42 cells is standard max for 6 rows)
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        events: [] as CalendarEvent[],
      });
    }

    return days;
  };

  const calendarDays = getDaysInMonth(
    currentDate.getFullYear(),
    currentDate.getMonth()
  );
  const weekDays = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    if (event.tournament) {
      navigate(`/tournaments/${event.tournament.id}`);
    }
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
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
              view === "month"
                ? "bg-[#0f1015] text-white shadow-lg"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setView("month")}
          >
            <CalendarDays size={16} />
            Hónap
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
              view === "list"
                ? "bg-[#0f1015] text-white shadow-lg"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setView("list")}
          >
            <ListIcon size={16} />
            Lista
          </button>
        </div>
      </div>

      {view === "month" ? (
        <div className="flex flex-col gap-6">
          <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-4 md:p-6 shadow-lg">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                className="p-3 md:p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5 hover:border-white/10"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft size={20} className="text-gray-400" />
              </button>
              <h2 className="text-xl md:text-2xl font-bold text-white capitalize">
                {monthName}
              </h2>
              <button
                className="p-3 md:p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5 hover:border-white/10"
                onClick={goToNextMonth}
              >
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 gap-px bg-white/5 rounded-lg overflow-hidden border border-white/5">
              {/* Weekday Headers */}
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="bg-[#0f1015] p-2 md:p-4 text-center text-xs md:text-sm font-medium text-gray-400"
                >
                  {day}
                </div>
              ))}

              {/* Days */}
              {calendarDays.map((day, index) => {
                const isToday =
                  new Date().toDateString() === day.date.toDateString();
                const isSelected =
                  selectedDate.toDateString() === day.date.toDateString();

                return (
                  <div
                    key={index}
                    className={`
                      h-8 md:h-auto md:min-h-[120px] p-1 md:p-2 transition-colors relative group
                      flex flex-col items-center justify-center md:items-start md:justify-start
                      ${
                        !day.isCurrentMonth
                          ? "bg-[#15161c] text-gray-700"
                          : "bg-[#1a1b26] text-white"
                      }
                      ${isToday ? "bg-primary/5" : ""}
                      ${
                        isSelected ? "ring-1 ring-primary/50 bg-primary/10" : ""
                      }
                      hover:bg-[#202230] cursor-pointer
                    `}
                    onClick={() => {
                      setSelectedDate(day.date);
                    }}
                  >
                    <div className="flex justify-between items-start w-full mb-1">
                      <span
                        className={`
                            w-8 h-8 md:w-7 md:h-7 flex items-center justify-center rounded-full text-sm
                            ${isToday ? "bg-primary text-black font-bold" : ""}
                        `}
                      >
                        {day.date.getDate()}
                      </span>
                      {/* Desktop Event Count */}
                      {day.events.length > 0 && (
                        <span className="hidden md:flex text-xs font-medium text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                          {day.events.length}
                        </span>
                      )}
                    </div>

                    {/* Mobile Dots */}
                    <div className="flex gap-1 hidden sm:flex mt-1">
                      {day.events.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 h-1 rounded-full bg-primary"
                        />
                      ))}
                      {day.events.length > 3 && (
                        <div className="w-1 h-1 rounded-full bg-gray-600" />
                      )}
                    </div>

                    {/* Desktop Event Titles */}
                    <div className="hidden md:block w-full space-y-1 mt-1">
                      {day.events.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded bg-primary/10 border border-primary/20 text-primary-200 truncate cursor-pointer hover:bg-primary/20 hover:border-primary/40 transition-colors"
                          title={event.title}
                          onClick={(e) => handleEventClick(e, event)}
                        >
                          {event.title}
                        </div>
                      ))}
                      {day.events.length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{day.events.length - 3} további
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Events (Mobile/Tablet Friendly) */}
          {selectedDayEvents.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="h-px bg-white/10 flex-1"></div>
                <h3 className="text-lg font-bold text-white whitespace-nowrap">
                  {new Intl.DateTimeFormat("hu-HU", {
                    month: "long",
                    day: "numeric",
                  }).format(selectedDate)}{" "}
                  eseményei
                </h3>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              <div className="grid gap-4">
                {selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="group bg-[#1a1b26] rounded-xl border border-white/5 p-4 md:p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-xl cursor-pointer"
                    onClick={(e) => handleEventClick(e, event)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                          <Trophy
                            size={20}
                            className="text-primary md:w-6 md:h-6"
                          />
                        </div>
                        <div>
                          <h3 className="text-base md:text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400 mt-1">
                            <Clock size={14} />
                            <span>{formatDate(event.date)}</span>
                          </div>
                        </div>
                      </div>
                      {event.tournament && (
                        <span
                          className={`shrink-0 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold border ${
                            statusColors[event.tournament.status] ||
                            statusColors.COMPLETED
                          }`}
                        >
                          {statusLabels[event.tournament.status] ||
                            "Ismeretlen"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDayEvents.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nincs esemény ezen a napon:{" "}
              {new Intl.DateTimeFormat("hu-HU", {
                month: "short",
                day: "numeric",
              }).format(selectedDate)}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* List View Implementation (unchanged mostly, but ensured consistent wrapper) */}
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
              <h3 className="text-xl font-bold text-white mb-2">
                Nincs közelgő esemény
              </h3>
              <p className="text-gray-400">
                Jelenleg nincsenek tervezett versenyek vagy mérkőzések.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="group bg-[#1a1b26] rounded-xl border border-white/5 p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-xl cursor-pointer"
                  onClick={(e) => handleEventClick(e, event)}
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
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              statusColors[event.tournament.status] ||
                              statusColors.COMPLETED
                            }`}
                          >
                            {statusLabels[event.tournament.status] ||
                              "Ismeretlen"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {event.tournament?.game && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 pt-4 border-t border-white/5">
                      <span>Játék:</span>
                      <span className="text-white font-medium">
                        {event.tournament.game.name}
                      </span>
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
