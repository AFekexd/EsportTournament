import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Monitor, Clock } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
  setSelectedWeekStart,
  fetchWeeklyBookings,
  type Booking,
  type Computer,
} from "../../store/slices/bookingsSlice";
import { useAuth } from "../../hooks/useAuth";
import "./WeeklyCalendar.css";

interface WeeklyCalendarProps {
  onSlotClick?: (computer: Computer, date: string, hour: number) => void;
  onBookingClick?: (booking: Booking) => void;
}

export function WeeklyCalendar({
  onSlotClick,
  onBookingClick,
}: WeeklyCalendarProps) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { computers, weeklyBookings, schedules, selectedWeekStart, isLoading } =
    useAppSelector((state) => state.bookings);

  const weekDays = useMemo(() => {
    const days: { date: Date; dateStr: string; dayName: string }[] = [];
    const start = new Date(selectedWeekStart);
    const dayNames = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push({
        date: d,
        dateStr: d.toISOString().split("T")[0],
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
    hour: number
  ): Booking | undefined => {
    return weeklyBookings.find((b) => {
      if (b.computerId !== computerId) return false;
      const bookingDate = new Date(b.date).toISOString().split("T")[0];
      if (bookingDate !== dateStr) return false;

      const startHour = new Date(b.startTime).getHours();
      const endHour = new Date(b.endTime).getHours();
      return hour >= startHour && hour < endHour;
    });
  };

  const isScheduleActive = (dayOfWeek: number, hour: number): boolean => {
    return schedules.some(
      (s) =>
        s.isActive &&
        s.dayOfWeek === dayOfWeek &&
        hour >= s.startHour &&
        hour < s.endHour
    );
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const current = new Date(selectedWeekStart);
    const days = direction === "next" ? 7 : -7;
    current.setDate(current.getDate() + days);
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
        <button className="nav-btn" onClick={() => navigateWeek("prev")}>
          <ChevronLeft size={20} />
        </button>
        <span className="week-range">{formatWeekRange()}</span>
        <button className="nav-btn" onClick={() => navigateWeek("next")}>
          <ChevronRight size={20} />
        </button>
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

        {/* Computer Rows */}
        {computers.slice(0, 5).map((computer) => (
          <div key={computer.id} className="computer-section">
            <div className="computer-label">
              <Monitor size={14} />
              <span>{computer.name}</span>
            </div>

            {timeSlots.map((hour) => (
              <div key={hour} className="time-row">
                <div className="grid-cell time-cell">{hour}:00</div>
                {weekDays.map((day) => {
                  const booking = getBookingForSlot(
                    computer.id,
                    day.dateStr,
                    hour
                  );
                  const isActive = isScheduleActive(day.date.getDay(), hour);

                  // Check if slot is in the past
                  const now = new Date();
                  const slotTime = new Date(day.dateStr);
                  slotTime.setHours(hour + 1, 0, 0, 0); // Allow booking for current hour until it fully passes? Or strictly future?
                  // Let's say we prevent booking for passed hours.
                  // If it's 14:30, can I book 14:00-15:00? Maybe not.
                  // Let's set slotTime to the START of the slot.
                  slotTime.setHours(hour, 0, 0, 0);

                  // Actually, better user experience: if we are IN the hour (14:30),
                  // we might still allow booking if policy allows. But usually "past" means start time < now.
                  const isPast = slotTime < now && !booking; // Only disable empty past slots. Existing bookings should remain visible.

                  const isOwn = booking?.userId === user?.id;

                  let cellClass = "grid-cell slot-cell";
                  if (!isActive) cellClass += " inactive";
                  else if (booking)
                    cellClass += isOwn ? " own-booking" : " booked";
                  else if (isPast)
                    cellClass +=
                      " past inactive"; // Add 'past' class for specific styling if needed, or reuse 'inactive'
                  else cellClass += " available";

                  return (
                    <div
                      key={day.dateStr}
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
                          onSlotClick(computer, day.dateStr, hour);
                        }
                      }}
                      title={
                        booking
                          ? `Foglalta: ${
                              booking.user?.displayName ||
                              booking.user?.username
                            }`
                          : !isActive
                          ? "Nem elérhető"
                          : isPast
                          ? "Múltbeli időpont"
                          : "Szabad"
                      }
                    >
                      {booking && (
                        <span className="booking-indicator">
                          {isOwn ? "✓" : "●"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="weekly-legend">
        <div className="legend-item">
          <span className="booking-indicator available text-green-500">●</span>
          <span>Szabad</span>
        </div>
        <div className="legend-item">
          <span className="booking-indicator booked text-red-500">●</span>
          <span>Foglalt</span>
        </div>
        <div className="legend-item">
          <span className="booking-indicator inactive text-gray-500">●</span>
          <span>Nem elérhető</span>
        </div>
      </div>
    </div>
  );
}
