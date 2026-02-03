import { useMemo } from 'react';
import { Calendar, Check } from 'lucide-react';
import type { Booking, BookingSchedule } from '../../store/slices/bookingsSlice';

interface DayCalendarStripProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  bookings: Booking[];
  schedules: BookingSchedule[];
  computersCount: number;
}

type SaturationLevel = 'free' | 'limited' | 'full' | 'closed';

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
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      // Find schedule for this day
      const schedule = schedules.find(s => s.dayOfWeek === dayOfWeek && s.isActive);

      // Calculate saturation - need to fetch bookings for each day
      let saturation: SaturationLevel = 'closed';
      let saturationPercent = 0;

      if (schedule && computersCount > 0) {
        const totalSlots = (schedule.endHour - schedule.startHour) * computersCount;

        // Filter bookings for this specific date
        const dayBookings = bookings.filter(b => {
          const bookingDate = b.date || new Date(b.startTime).toISOString().split('T')[0];
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

        if (saturationPercent >= 80) {
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
      closed: {
        bg: 'bg-gray-800/50',
        border: 'border-gray-700/30',
        text: 'text-gray-500',
        label: 'Zárva',
      },
    };
    return base[saturation];
  };

  return (
    <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-5">
      {/* Header with legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Calendar size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Válassz napot</h3>
            <p className="text-xs text-gray-500">Következő 14 nap</p>
          </div>
        </div>

        {/* Legend - bigger and more readable */}
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-green-400 font-medium">Szabad</span>
          </span>
          <span className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-yellow-400 font-medium">Korlátozott</span>
          </span>
          <span className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-red-400 font-medium">Tele</span>
          </span>
        </div>
      </div>

      {/* Day cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 pt-3">
        {days.map((day) => {
          const styles = getSaturationStyles(day.saturation, day.isSelected);
          const isDisabled = day.saturation === 'closed';

          return (
            <button
              key={day.date}
              onClick={() => !isDisabled && onSelectDate(day.date)}
              disabled={isDisabled}
              className={`
                relative flex-shrink-0 w-[72px] p-3 rounded-xl border-2 transition-all duration-200
                ${styles.bg} ${styles.border}
                ${day.isSelected
                  ? 'ring-2 ring-primary/50 shadow-lg shadow-primary/10 scale-105'
                  : isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:scale-102 hover:shadow-md cursor-pointer'
                }
              `}
            >
              {/* Today indicator */}
              {day.isToday && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-[9px] font-bold text-white rounded-full uppercase tracking-wide">
                  Ma
                </div>
              )}

              {/* Selected checkmark */}
              {day.isSelected && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <Check size={12} className="text-white" />
                </div>
              )}

              {/* Day name */}
              <div className={`text-xs font-medium mb-0.5 ${day.isSelected ? 'text-white' : 'text-gray-400'}`}>
                {day.dayName}
              </div>

              {/* Day number */}
              <div className={`text-2xl font-bold ${day.isSelected ? 'text-white' : 'text-gray-200'}`}>
                {day.dayNumber}
              </div>

              {/* Month */}
              <div className={`text-[10px] uppercase tracking-wider mb-1 ${day.isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                {day.monthName}
              </div>

              {/* Status dot */}
              <div className={`w-2 h-2 rounded-full mx-auto ${day.saturation === 'free' ? 'bg-green-500' :
                day.saturation === 'limited' ? 'bg-yellow-500' :
                  day.saturation === 'full' ? 'bg-red-500' :
                    'bg-gray-600'
                }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
