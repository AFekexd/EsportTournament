import { useMemo } from 'react';
import { Calendar, Check } from 'lucide-react';
import { format } from 'date-fns';
import type { Booking, BookingSchedule } from '../../store/slices/bookingsSlice';

interface DayCalendarStripProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  bookings: Booking[];
  schedules: BookingSchedule[];
  computersCount: number;
}

type SaturationLevel = 'free' | 'limited' | 'full' | 'supervisor_only' | 'closed';

interface DayInfo {
  date: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  isSelected: boolean;
  saturation: SaturationLevel;
  saturationPercent: number;
}

export function DayCalendarStrip({
  selectedDate,
  onSelectDate,
  bookings,
  schedules,
  computersCount,
}: DayCalendarStripProps) {
  const dayNames = ['Vas', 'Hét', 'Kedd', 'Sze', 'Csüt', 'Pén', 'Szo'];
  const monthNames = ['jan', 'feb', 'már', 'ápr', 'máj', 'jún', 'júl', 'aug', 'szep', 'okt', 'nov', 'dec'];

  const days = useMemo((): DayInfo[] => {
    const result: DayInfo[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = date.getDay();

      // Find schedule for this day
      const specificSchedule = schedules.find(s => s.specificDate && s.specificDate.startsWith(dateStr) && s.isActive);
      const daySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek && s.isActive);
      const schedule = specificSchedule || daySchedule;

      // Calculate saturation - need to fetch bookings for each day
      let saturation: SaturationLevel = 'closed';
      let saturationPercent = 0;

      if (schedule && computersCount > 0) {
        const totalSlots = (schedule.endHour - schedule.startHour) * computersCount;

        // Filter bookings for this specific date
        const dayBookings = bookings.filter(b => {
          const bookingDate = b.date || format(new Date(b.startTime), 'yyyy-MM-dd');
          return bookingDate === dateStr;
        });

        // Count booked slot-hours
        let bookedSlots = 0;
        dayBookings.forEach(booking => {
          const start = new Date(booking.startTime);
          const end = new Date(booking.endTime);
          const hours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
          bookedSlots += hours;
        });

        saturationPercent = totalSlots > 0 ? Math.min(100, (bookedSlots / totalSlots) * 100) : 0;

        if (!schedule.isOpenForBooking) {
          saturation = 'supervisor_only';
        } else if (saturationPercent >= 80) {
          saturation = 'full';
        } else if (saturationPercent >= 50) {
          saturation = 'limited';
        } else {
          saturation = 'free';
        }
      }

      result.push({
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        dayNumber: date.getDate(),
        monthName: monthNames[date.getMonth()],
        isToday: i === 0,
        isSelected: dateStr === selectedDate,
        saturation,
        saturationPercent,
      });
    }

    return result;
  }, [selectedDate, bookings, schedules, computersCount, dayNames, monthNames]);

  const getSaturationStyles = (saturation: SaturationLevel, isSelected: boolean) => {
    const base = {
      free: {
        bg: isSelected ? 'bg-green-500/30' : 'bg-green-500/10',
        border: isSelected ? 'border-green-400' : 'border-green-500/30',
        text: 'text-green-400',
        label: 'Szabad',
      },
      limited: {
        bg: isSelected ? 'bg-yellow-500/30' : 'bg-yellow-500/10',
        border: isSelected ? 'border-yellow-400' : 'border-yellow-500/30',
        text: 'text-yellow-400',
        label: 'Korlátozott',
      },
      full: {
        bg: isSelected ? 'bg-red-500/30' : 'bg-red-500/10',
        border: isSelected ? 'border-red-400' : 'border-red-500/30',
        text: 'text-red-400',
        label: 'Tele',
      },
      supervisor_only: {
        bg: isSelected ? 'bg-indigo-500/30' : 'bg-indigo-500/10',
        border: isSelected ? 'border-indigo-400' : 'border-indigo-500/30',
        text: 'text-indigo-400',
        label: 'Ügyelet',
      },
      closed: {
        bg: 'bg-gray-800/50',
        border: 'border-gray-700/30',
        text: 'text-muted-foreground',
        label: 'Zárva',
      },
    };
    return base[saturation];
  };

  return (
    <div className="tactical-card rounded-lg border border-border p-5">
      {/* Header with legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
            <Calendar size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-foreground">Válassz napot</h3>
            <p className="text-xs font-mono text-muted-foreground">Következő 14 nap</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-400 font-semibold">Szabad</span>
          </span>
          <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-amber-400 font-semibold">Korlátozott</span>
          </span>
          <span className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-indigo-400 font-semibold">Csak Ügyelet</span>
          </span>
          <span className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 px-2.5 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-destructive font-semibold">Tele</span>
          </span>
        </div>
      </div>

      {/* Day cards */}
      <div className="flex gap-2.5 overflow-x-auto touch-pan-x touch-pan-y pb-2 -mx-1 px-1 pt-3">
        {days.map((day) => {
          const styles = getSaturationStyles(day.saturation, day.isSelected);
          const isDisabled = day.saturation === 'closed';

          return (
            <button
              key={day.date}
              onClick={() => !isDisabled && onSelectDate(day.date)}
              disabled={isDisabled}
              className={`
                relative flex-shrink-0 w-[70px] p-2.5 rounded border transition-all duration-200 font-mono
                ${styles.bg} ${styles.border}
                ${day.isSelected
                  ? 'border-primary bg-primary/20 shadow-lg shadow-primary/10 scale-105'
                  : isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:border-primary/50 cursor-pointer'
                }
              `}
            >
              {/* Today indicator */}
              {day.isToday && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-primary text-[9px] font-bold text-primary-foreground rounded uppercase tracking-wider">
                  Ma
                </div>
              )}

              {/* Selected checkmark */}
              {day.isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-md">
                  <Check size={10} className="text-primary-foreground" />
                </div>
              )}

              {/* Day name */}
              <div className={`text-[11px] font-bold uppercase mb-0.5 ${day.isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                {day.dayName}
              </div>

              {/* Day number */}
              <div className={`text-xl font-display font-bold ${day.isSelected ? 'text-foreground' : 'text-gray-200'}`}>
                {day.dayNumber}
              </div>

              {/* Month */}
              <div className={`text-[9px] uppercase tracking-wider mb-1 ${day.isSelected ? 'text-primary/80' : 'text-muted-foreground'}`}>
                {day.monthName}
              </div>

              {/* Status dot */}
              <div className={`w-1.5 h-1.5 rounded-full mx-auto ${day.saturation === 'free' ? 'bg-emerald-500' :
                day.saturation === 'limited' ? 'bg-amber-500' :
                  day.saturation === 'full' ? 'bg-destructive' :
                    day.saturation === 'supervisor_only' ? 'bg-indigo-500' :
                      'bg-muted-foreground'
                }`} title={styles.label} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
