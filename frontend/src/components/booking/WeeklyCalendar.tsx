import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Monitor, Clock, Filter } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
  setSelectedWeekStart,
  fetchWeeklyBookings,
  type Booking,
  type Computer,
  type BookingSupervisor,
} from "../../store/slices/bookingsSlice";
import { useAuth } from "../../hooks/useAuth";
import { format } from "date-fns";
import "./WeeklyCalendar.css";
import { assignSupervisor } from "../../store/slices/bookingsSlice";
import { toast } from "sonner";

interface WeeklyCalendarProps {
  onSlotClick?: (
    computer: Computer,
    date: string,
    hour: number,
    minute: number
  ) => void;
  onBookingClick?: (booking: Booking) => void;
  supervisors?: BookingSupervisor[];
}

export function WeeklyCalendar({
  onSlotClick,
  onBookingClick,
}: WeeklyCalendarProps) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { computers, weeklyBookings, schedules, supervisors, selectedWeekStart, isLoading } =
    useAppSelector((state) => state.bookings);

  const [selectedComputerId, setSelectedComputerId] = useState<string>("all");

  // Reset selection if computers change significantly or on mount if needed
  useEffect(() => {
    if (computers.length > 0 && selectedComputerId === "all" && computers.length > 5) {
      // Optional: Default to first computer if many? 
      // For now keeping "all" as default option but user can switch.
    }
  }, [computers.length]);

  const filteredComputers = useMemo(() => {
    if (selectedComputerId === "all") return computers;
    return computers.filter((c) => c.id === selectedComputerId);
  }, [computers, selectedComputerId]);

  const weekDays = useMemo(() => {
    const days: { date: Date; dateStr: string; dayName: string }[] = [];
    const start = new Date(selectedWeekStart);
    const dayNames = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({
        date: d,
        dateStr: format(d, "yyyy-MM-dd"),
        dayName: dayNames[d.getDay()],
      });
    }
    return days;
  }, [selectedWeekStart]);

  const timeSlots = useMemo(() => {
    const slots: number[] = [];
    let minHour = 24;
    let maxHour = 0;

    schedules.forEach((s) => {
      if (s.isActive) {
        minHour = Math.min(minHour, s.startHour);
        maxHour = Math.max(maxHour, s.endHour);
      }
    });

    if (minHour < maxHour) {
      for (let h = minHour; h < maxHour; h++) {
        slots.push(h);
      }
    }
    return slots;
  }, [schedules]);

  const getBookingForSlot = (
    computerId: string,
    dateStr: string,
    hour: number,
    minute: number
  ): Booking | undefined => {
    return weeklyBookings.find((b) => {
      if (b.computerId !== computerId) return false;
      const bookingDateStr = new Date(b.date).toISOString().split("T")[0];
      if (bookingDateStr !== dateStr) return false;

      const start = new Date(b.startTime);
      const end = new Date(b.endTime);

      const slotStart = new Date(dateStr);
      slotStart.setHours(hour, minute, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotStart.getMinutes() + 30);

      // Check strictly if booking COVERS this slot
      // We accept if BookingStart <= SlotStart AND BookingEnd > SlotStart (meaning it covers at least some of it, but usually fully)
      // Actually, since we want 30min slots:
      // If booking is 16:00-17:00.
      // Slot 16:00-16:30 -> Covered.
      // Slot 16:30-17:00 -> Covered.

      return start < slotEnd && end > slotStart;
    });
  };

  const isScheduleActive = (
    dayOfWeek: number,
    hour: number,
    minute: number
  ): boolean => {
    return schedules.some(
      (s) =>
        s.isActive &&
        s.dayOfWeek === dayOfWeek &&
        // Check if the slot (hour:minute) is within [startHour:00, endHour:00)
        // Usually schedules are hourly based (e.g., 8-20).
        // So 8:00 is fine. 19:30 is fine. 20:00 is NOT fine.
        (hour > s.startHour || (hour === s.startHour && minute >= 0)) &&
        hour < s.endHour
    );
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const current = new Date(selectedWeekStart);
    const days = direction === "next" ? 7 : -7;
    current.setUTCDate(current.getUTCDate() + days);
    const newStart = current.toISOString().split("T")[0];
    dispatch(setSelectedWeekStart(newStart));
    dispatch(fetchWeeklyBookings(newStart));
  };

  const formatWeekRange = () => {
    const start = new Date(selectedWeekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return `${start.toLocaleDateString("hu-HU", {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString("hu-HU", {
      month: "short",
      day: "numeric",
    })}`;
  };

  if (isLoading) {
    return (
      <div className="weekly-calendar-loading">
        <div className="spinner" />
        <p>Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="weekly-calendar">
      <div className="weekly-calendar-header">
        <div className="flex items-center gap-2">
          <button className="nav-btn" onClick={() => navigateWeek("prev")}>
            <ChevronLeft size={20} />
          </button>
          <span className="week-range">{formatWeekRange()}</span>
          <button className="nav-btn" onClick={() => navigateWeek("next")}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Filter size={16} className="text-muted-foreground" />
          <select
            className="bg-[#121A22] border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
            value={selectedComputerId}
            onChange={(e) => setSelectedComputerId(e.target.value)}
          >
            <option value="all">Összes gép ({computers.length})</option>
            {computers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="weekly-calendar-grid">
        {/* Header Row - Days */}
        <div className="grid-header">
          <div className="grid-cell header-cell time-cell">
            <Clock size={16} />
          </div>
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className="grid-cell header-cell day-cell border border-gray-500"
            >
              <span className="day-name">{day.dayName}</span>
              <span className="day-date">{day.date.getDate()}</span>
            </div>
          ))}
        </div>

        {/* Supervisor Row */}
        <div className="computer-section supervisor-section">
          <div className="computer-label text-yellow-500">
            <Monitor size={14} className="text-yellow-500" />
            <span>Felelős</span>
          </div>

          {timeSlots.map((hour) => (
            <div key={`sup-hour-${hour}`} className="contents">
              <div className="time-row">
                <div className="grid-cell time-cell bg-yellow-500/10 text-yellow-500">{hour}:00</div>
                {weekDays.map((day) => {
                  const isActive = isScheduleActive(day.date.getDay(), hour, 0);
                  const supervisor = supervisors.find(s => {
                    return new Date(s.date).toDateString() === new Date(day.dateStr).toDateString() && s.hour === hour;
                  });

                  // Parse date string in local timezone
                  const [year, month, d] = day.dateStr.split('-').map(Number);
                  const slotTime = new Date();
                  slotTime.setFullYear(year, month - 1, d);
                  slotTime.setHours(hour, 0, 0, 0);
                  const now = new Date();
                  const isPast = slotTime < now;

                  const canSupervise = isActive && !isPast && !supervisor;
                  const isMySupervision = user && supervisor?.userId === user.id;

                  return (
                    <div
                      key={`sup-${day.dateStr}-${hour}`}
                      className={`grid-cell slot-cell h-8 border-b-0 flex items-center justify-center
                        ${!isActive ? 'inactive' : isPast ? 'past inactive' : ''}
                        ${isMySupervision ? 'bg-yellow-500/20 text-yellow-500' : supervisor ? 'bg-card/50 text-muted-foreground' : ''}
                      `}
                    >
                      {supervisor ? (
                        <span className="text-xs font-medium px-1 truncate w-full text-center" title={supervisor.user?.displayName || supervisor.user?.username}>
                          {isMySupervision ? "Én" : (supervisor.user?.displayName || supervisor.user?.username)}
                        </span>
                      ) : (canSupervise && user && user.role !== "ADMIN") ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch(assignSupervisor({
                              date: day.dateStr,
                              hour: hour
                            }))
                              .unwrap()
                              .then(() => toast.success("Sikeresen vállaltad a felelősséget!"))
                              .catch((err) => toast.error(err.message || "Hiba történt a felelősség vállalásakor"));
                          }}
                          className="w-full h-full text-[10px] font-bold text-yellow-500/70 hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors uppercase tracking-wider"
                        >
                          Jelentkezem
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {/* Visual filler for the :30 half-hour row so the grid aligns */}
              <div className="time-row">
                <div className="grid-cell time-cell bg-yellow-500/10 border-t border-border/50"></div>
                {weekDays.map(day => (
                  <div key={`sup-filler-${day.dateStr}-${hour}`} className="grid-cell slot-cell h-8 border-t border-border/50 bg-card/20 pointer-events-none"></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Computer Rows */}
        {
          filteredComputers.map((computer) => (
            <div key={computer.id} className="computer-section">
              <div className="computer-label">
                <Monitor size={14} />
                <span>{computer.name}</span>
              </div>

              {timeSlots.map((hour) => (
                <div key={hour} className="contents">
                  {/*  Render :00 slot */}
                  <div className="time-row">
                    <div className="grid-cell time-cell">{hour}:00</div>
                    {weekDays.map((day) => {
                      const booking = getBookingForSlot(
                        computer.id,
                        day.dateStr,
                        hour,
                        0
                      );
                      const isActive = isScheduleActive(
                        day.date.getDay(),
                        hour,
                        0
                      );
                      const slotTime = new Date(day.dateStr);
                      slotTime.setHours(hour, 0, 0, 0);
                      const now = new Date();
                      const isPast = slotTime < now && !booking;
                      const isOwn = booking?.userId === user?.id;

                      // Supervisor check
                      const supervisor = supervisors.find(s => {
                        return new Date(s.date).toDateString() === new Date(day.dateStr).toDateString() && s.hour === hour;
                      });
                      const needsSupervisor = !supervisor;
                      const isMySupervision = supervisor && user && supervisor.userId === user.id;

                      let cellClass = "grid-cell slot-cell h-8"; // Reduced height for granular view
                      if (!isActive) cellClass += " inactive";
                      else if (booking)
                        cellClass += isOwn ? " own-booking" : " booked";
                      else if (isPast) cellClass += " past inactive";
                      else {
                        cellClass += " available";
                        if (needsSupervisor) cellClass += " opacity-60";
                        else if (isMySupervision) cellClass += " opacity-60";
                      }

                      return (
                        <div
                          key={`${day.dateStr}-${hour}-00`}
                          className={cellClass}
                          onClick={() => {
                            if (booking && onBookingClick) {
                              onBookingClick(booking);
                            } else if (
                              !booking &&
                              isActive &&
                              !isPast &&
                              onSlotClick
                            ) {
                              onSlotClick(computer, day.dateStr, hour, 0);
                            }
                          }}
                          title={
                            booking
                              ? `Foglalta: ${booking.user?.displayName ||
                              booking.user?.username
                              }`
                              : !isActive
                                ? "Nem elérhető"
                                : isPast
                                  ? "Múltbeli időpont"
                                  : needsSupervisor
                                    ? "Nincs jelen felelős"
                                    : isMySupervision
                                      ? "Te vagy a felelős, nem foglalhatsz"
                                      : "Szabad (1. félidő)"
                          }
                        >
                          {booking && (
                            <span className="booking-indicator text-xs">
                              {isOwn ? "✓" : "●"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Render :30 slot */}
                  <div className="time-row">
                    <div className="grid-cell time-cell text-xs text-muted-foreground">
                      {hour}:30
                    </div>
                    {weekDays.map((day) => {
                      const booking = getBookingForSlot(
                        computer.id,
                        day.dateStr,
                        hour,
                        30
                      );
                      const isActive = isScheduleActive(
                        day.date.getDay(),
                        hour,
                        30
                      );
                      const slotTime = new Date(day.dateStr);
                      slotTime.setHours(hour, 30, 0, 0);
                      const now = new Date();
                      const isPast = slotTime < now && !booking;
                      const isOwn = booking?.userId === user?.id;

                      // Supervisor check (supervisors apply per hour)
                      const supervisor = supervisors.find(s => {
                        return new Date(s.date).toDateString() === new Date(day.dateStr).toDateString() && s.hour === hour;
                      });
                      const needsSupervisor = !supervisor;
                      const isMySupervision = supervisor && user && supervisor.userId === user.id;

                      let cellClass =
                        "grid-cell slot-cell h-8 border-t border-border"; // subtle border
                      if (!isActive) cellClass += " inactive";
                      else if (booking)
                        cellClass += isOwn ? " own-booking" : " booked";
                      else if (isPast) cellClass += " past inactive";
                      else {
                        cellClass += " available";
                        if (needsSupervisor) cellClass += " opacity-60";
                        else if (isMySupervision) cellClass += " opacity-60";
                      }

                      return (
                        <div
                          key={`${day.dateStr}-${hour}-30`}
                          className={cellClass}
                          onClick={() => {
                            if (booking && onBookingClick) {
                              onBookingClick(booking);
                            } else if (
                              !booking &&
                              isActive &&
                              !isPast &&
                              onSlotClick
                            ) {
                              onSlotClick(computer, day.dateStr, hour, 30);
                            }
                          }}
                          title={
                            booking
                              ? `Foglalta: ${booking.user?.displayName ||
                              booking.user?.username
                              }`
                              : !isActive
                                ? "Nem elérhető"
                                : isPast
                                  ? "Múltbeli időpont"
                                  : needsSupervisor
                                    ? "Nincs jelen felelős"
                                    : isMySupervision
                                      ? "Te vagy a felelős, nem foglalhatsz"
                                      : "Szabad (2. félidő)"
                          }
                        >
                          {booking && (
                            <span className="booking-indicator text-xs">
                              {isOwn ? "✓" : "●"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))
        }
      </div >

      <div className="flex gap-2 w-full p-2 justify-evenly ">
        <div className="legend-item">
          <span className="booking-indicator available text-green-500">●</span>
          <span>Szabad</span>
        </div>
        <div className="legend-item">
          <span className="booking-indicator booked text-red-500">●</span>
          <span>Foglalt</span>
        </div>
        <div className="legend-item">
          <span className="booking-indicator inactive text-muted-foreground">●</span>
          <span>Nem elérhető</span>
        </div>
      </div>
    </div >
  );
}
