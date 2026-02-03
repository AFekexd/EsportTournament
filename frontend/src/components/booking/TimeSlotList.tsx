import { useMemo } from 'react';
import { Clock, Users, ChevronRight, AlertCircle } from 'lucide-react';
import type { Computer, Booking, BookingSchedule } from '../../store/slices/bookingsSlice';

interface TimeSlotListProps {
    selectedDate: string;
    selectedHour: number | null;
    onSelectHour: (hour: number) => void;
    bookings: Booking[];
    schedules: BookingSchedule[];
    computers: Computer[];
}

interface TimeSlotInfo {
    hour: number;
    freeCount: number;
    totalCount: number;
    isPast: boolean;
    isSelected: boolean;
}

export function TimeSlotList({
    selectedDate,
    selectedHour,
    onSelectHour,
    bookings,
    schedules,
    computers,
}: TimeSlotListProps) {
    const dayOfWeek = new Date(selectedDate).getDay();
    const todaySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek && s.isActive);

    const timeSlots = useMemo((): TimeSlotInfo[] => {
        if (!todaySchedule) return [];

        const now = new Date();
        const selectedDateObj = new Date(selectedDate);
        const isToday = now.toDateString() === selectedDateObj.toDateString();

        const slots: TimeSlotInfo[] = [];
        const availableComputers = computers.filter(c =>
            c.status === 'AVAILABLE' && c.isActive && !c.isCompetitionMode
        );

        for (let hour = todaySchedule.startHour; hour < todaySchedule.endHour; hour++) {
            // Only check isPast for today
            let isPast = false;
            if (isToday) {
                const slotEndTime = new Date(selectedDate);
                slotEndTime.setHours(hour + 1, 0, 0, 0);
                isPast = slotEndTime <= now;
            }

            // Count free computers for this slot
            let freeCount = availableComputers.length;

            availableComputers.forEach(computer => {
                const startOfSlot = new Date(selectedDate);
                startOfSlot.setHours(hour, 0, 0, 0);
                const endOfSlot = new Date(selectedDate);
                endOfSlot.setHours(hour + 1, 0, 0, 0);

                const isBooked = bookings.some(b => {
                    if (b.computerId !== computer.id) return false;
                    const bookingStart = new Date(b.startTime);
                    const bookingEnd = new Date(b.endTime);
                    return bookingStart < endOfSlot && bookingEnd > startOfSlot;
                });

                if (isBooked) freeCount--;
            });

            slots.push({
                hour,
                freeCount,
                totalCount: availableComputers.length,
                isPast,
                isSelected: hour === selectedHour,
            });
        }

        return slots;
    }, [selectedDate, selectedHour, bookings, computers, todaySchedule]);

    if (!todaySchedule) {
        return (
            <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-8 text-center">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Zárva</h3>
                <p className="text-gray-400 text-sm">Ezen a napon nincs nyitva a gaming szoba.</p>
            </div>
        );
    }

    const getSlotConfig = (slot: TimeSlotInfo) => {
        if (slot.isPast) {
            return {
                bg: 'bg-gray-800/30',
                border: 'border-gray-700/30',
                text: 'text-gray-500',
                badge: 'bg-gray-700/50 text-gray-500',
                label: 'Lejárt',
                disabled: true,
            };
        }
        if (slot.isSelected) {
            return {
                bg: 'bg-primary/20',
                border: 'border-primary',
                text: 'text-white',
                badge: 'bg-primary/30 text-primary',
                label: 'Kiválasztva',
                disabled: false,
            };
        }
        if (slot.freeCount === 0) {
            return {
                bg: 'bg-red-500/10',
                border: 'border-red-500/30',
                text: 'text-red-400',
                badge: 'bg-red-500/20 text-red-400',
                label: 'Tele',
                disabled: true,
            };
        }
        if (slot.freeCount <= 2) {
            return {
                bg: 'bg-yellow-500/10 hover:bg-yellow-500/20',
                border: 'border-yellow-500/30 hover:border-yellow-500/50',
                text: 'text-yellow-400',
                badge: 'bg-yellow-500/20 text-yellow-400',
                label: 'Kevés hely',
                disabled: false,
            };
        }
        return {
            bg: 'bg-green-500/10 hover:bg-green-500/20',
            border: 'border-green-500/30 hover:border-green-500/50',
            text: 'text-green-400',
            badge: 'bg-green-500/20 text-green-400',
            label: 'Elérhető',
            disabled: false,
        };
    };

    return (
        <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-5 mt-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Clock size={18} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-white">Válassz időpontot</h3>
                        <p className="text-xs text-gray-500">
                            Nyitvatartás: {todaySchedule.startHour}:00 – {todaySchedule.endHour}:00
                        </p>
                    </div>
                </div>

                {/* Mini legend */}
                <div className="flex gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Szabad
                    </span>
                    <span className="flex items-center gap-1.5 text-yellow-400">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        Kevés
                    </span>
                    <span className="flex items-center gap-1.5 text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Tele
                    </span>
                </div>
            </div>

            {/* Time slot grid - larger cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {timeSlots.map((slot) => {
                    const config = getSlotConfig(slot);

                    return (
                        <button
                            key={slot.hour}
                            onClick={() => !config.disabled && onSelectHour(slot.hour)}
                            disabled={config.disabled}
                            className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${config.bg} ${config.border}
                ${!config.disabled ? 'cursor-pointer hover:scale-102 hover:shadow-lg' : 'cursor-not-allowed opacity-60'}
                ${slot.isSelected ? 'ring-2 ring-primary/50 shadow-lg shadow-primary/10' : ''}
              `}
                        >
                            {/* Time */}
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-xl font-bold ${slot.isSelected ? 'text-white' : config.text}`}>
                                    {slot.hour}:00
                                </span>
                                {slot.isSelected && (
                                    <ChevronRight size={18} className="text-primary" />
                                )}
                            </div>

                            {/* Availability info */}
                            <div className="flex items-center gap-2">
                                <Users size={14} className={config.text} />
                                <div className={`flex-1 text-left text-sm font-medium ${config.text}`}>
                                    {slot.freeCount}/{slot.totalCount}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-2 h-1.5 bg-black/20 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${slot.freeCount === 0 ? 'bg-red-500' :
                                            slot.freeCount <= 2 ? 'bg-yellow-500' :
                                                'bg-green-500'
                                        }`}
                                    style={{ width: `${(slot.freeCount / slot.totalCount) * 100}%` }}
                                />
                            </div>

                            {/* Status label */}
                            <div className={`mt-2 text-[10px] font-medium uppercase tracking-wider ${config.text}`}>
                                {slot.isPast ? 'Lejárt' : slot.freeCount === 0 ? 'Tele' : `${slot.freeCount} szabad`}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
