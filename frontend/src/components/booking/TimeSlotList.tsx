import { useMemo, useState } from 'react';
import { Clock, Users, ChevronRight, AlertCircle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Computer, Booking, BookingSchedule, BookingSupervisor } from '../../store/slices/bookingsSlice';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/useRedux';
import { assignSupervisor, removeSupervisor } from '../../store/slices/bookingsSlice';

interface TimeSlotListProps {
    selectedDate: string;
    selectedHour: number | null;
    onSelectHour: (hour: number) => void;
    bookings: Booking[];
    schedules: BookingSchedule[];
    computers: Computer[];
    supervisors: BookingSupervisor[];
}

interface TimeSlotInfo {
    hour: number;
    freeCount: number;
    totalCount: number;
    isPast: boolean;
    isSelected: boolean;
    supervisor?: BookingSupervisor;
}

export function TimeSlotList({
    selectedDate,
    selectedHour,
    onSelectHour,
    bookings,
    schedules,
    computers,
    supervisors,
}: TimeSlotListProps) {
    const dayOfWeek = new Date(selectedDate).getDay();
    const todaySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek && s.isActive);
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const [isAssigning, setIsAssigning] = useState<number | null>(null);

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

            // Find supervisor
            const supervisor = supervisors.find(s => {
                const sDate = new Date(s.date).toDateString();
                return sDate === selectedDateObj.toDateString() && s.hour === hour;
            });

            slots.push({
                hour,
                freeCount,
                totalCount: availableComputers.length,
                isPast,
                isSelected: hour === selectedHour,
                supervisor,
            });
        }

        return slots;
    }, [selectedDate, selectedHour, bookings, computers, todaySchedule, supervisors]);

    if (!todaySchedule) {
        return (
            <div className="bg-[#121A22] rounded-2xl border border-border p-8 text-center">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Zárva</h3>
                <p className="text-muted-foreground text-sm">Ezen a napon nincs nyitva a gaming szoba.</p>
            </div>
        );
    }

    const handleAssignSupervisor = async (hour: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        try {
            setIsAssigning(hour);
            await dispatch(assignSupervisor({ date: selectedDate, hour })).unwrap();
        } catch (error) {
            console.error("Failed to assign supervisor:", error);
            // Optionally, we could show a toast here.
        } finally {
            setIsAssigning(null);
        }
    };

    const handleRemoveSupervisor = async (id: string, hour: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        try {
            setIsAssigning(hour);
            await dispatch(removeSupervisor(id)).unwrap();
        } catch (error) {
            console.error("Failed to remove supervisor:", error);
        } finally {
            setIsAssigning(null);
        }
    };

    const getSlotConfig = (slot: TimeSlotInfo) => {
        if (slot.isPast) {
            return {
                bg: 'bg-gray-800/30',
                border: 'border-gray-700/30',
                text: 'text-muted-foreground',
                badge: 'bg-gray-700/50 text-muted-foreground',
                label: 'Lejárt',
                disabled: true,
            };
        }

        const isSupervisor = slot.supervisor && user && slot.supervisor.userId === user.id;

        // If NO supervisor, booking is disabled, but users can claim supervisor role
        if (!slot.supervisor) {
            return {
                bg: 'bg-primary/20 hover:bg-primary/30',
                border: 'border-primary/20 hover:border-indigo-500/50',
                text: 'text-primary',
                badge: 'bg-primary/30 text-primary',
                label: 'Nincs felelős',
                disabled: true, // You cannot book
                needsSupervisor: true,
            };
        }

        // If I AM the supervisor, I cannot book
        if (isSupervisor) {
            return {
                bg: 'bg-teal-500/10',
                border: 'border-teal-500/50',
                text: 'text-teal-400',
                badge: 'bg-teal-500/20 text-teal-400',
                label: 'Te vagy a felelős',
                disabled: true,
                isMySupervision: true,
            };
        }

        if (slot.isSelected) {
            return {
                bg: 'bg-primary/20',
                border: 'border-primary',
                text: 'text-foreground',
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
        <div className="bg-[#121A22] rounded-2xl border border-border p-5 mt-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Clock size={18} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Válassz időpontot</h3>
                        <p className="text-xs text-muted-foreground">
                            Nyitvatartás: {todaySchedule.startHour}:00 – {todaySchedule.endHour}:00
                        </p>
                    </div>
                </div>

                {/* Mini legend */}
                <div className="flex gap-2 text-xs flex-wrap">
                    <span className="flex items-center gap-1.5 text-primary">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        Nincs felelős
                    </span>
                    <span className="flex items-center gap-1.5 text-teal-400">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        Ügyeleted
                    </span>
                    <span className="flex items-center gap-1.5 text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Szabad
                    </span>
                    <span className="flex items-center gap-1.5 text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Tele
                    </span>
                </div>
            </div>

            {/* Time slot grid - larger cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {timeSlots.map((slot) => {
                    const config = getSlotConfig(slot);

                    return (
                        <div key={slot.hour} className="relative group">
                            <button
                                onClick={() => !config.disabled && onSelectHour(slot.hour)}
                                disabled={config.disabled}
                                className={`
                                    w-full relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                                    ${config.bg} ${config.border}
                                    ${!config.disabled ? 'cursor-pointer hover:scale-102 hover:shadow-lg' : 'cursor-not-allowed'}
                                    ${slot.isSelected ? 'ring-2 ring-primary/50 shadow-lg shadow-primary/10' : ''}
                                `}
                            >
                                {/* Time Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-xl font-bold ${slot.isSelected ? 'text-foreground' : config.text}`}>
                                        {slot.hour}:00
                                    </span>
                                    {slot.isSelected && (
                                        <ChevronRight size={18} className="text-primary" />
                                    )}
                                </div>

                                {/* Availability info */}
                                <div className="flex items-center gap-2 mb-2">
                                    <Users size={14} className={config.text} />
                                    <div className={`flex-1 text-left text-sm font-medium ${config.text}`}>
                                        {slot.freeCount}/{slot.totalCount} gép szabad
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
                                    <div
                                        className={`h-full rounded-full transition-all ${slot.freeCount === 0 ? 'bg-red-500' :
                                            slot.freeCount <= 2 ? 'bg-yellow-500' :
                                                'bg-green-500'
                                            }`}
                                        style={{ width: `${(slot.freeCount / slot.totalCount) * 100}%` }}
                                    />
                                </div>

                                {/* Status label */}
                                <div className={`flex items-center justify-between mt-2 text-xs font-medium ${config.text}`}>
                                    <span className="uppercase tracking-wider">
                                        {slot.isPast ? 'Lejárt' : config.label}
                                    </span>
                                    {slot.supervisor && !config.isMySupervision && (
                                        <span className="flex items-center gap-1 opacity-80" title={slot.supervisor.user.displayName || slot.supervisor.user.username}>
                                            <ShieldCheck size={14} />
                                            <span className="truncate max-w-[80px]">
                                                {slot.supervisor.user.displayName || slot.supervisor.user.username}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </button>

                            {/* Supervisor Action Overlay */}
                            {user && !slot.isPast && config.needsSupervisor && (
                                <div className="absolute inset-x-0 bottom-0 translate-y-full pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10">
                                    <button
                                        onClick={(e) => handleAssignSupervisor(slot.hour, e)}
                                        disabled={isAssigning === slot.hour}
                                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-foreground text-xs font-semibold rounded-lg shadow-lg border border-indigo-400/50 transition-colors"
                                    >
                                        {isAssigning === slot.hour ? (
                                            <span className="animate-spin w-4 h-4 border-2 border-border border-t-white rounded-full" />
                                        ) : (
                                            <Shield size={14} />
                                        )}
                                        Felelősséget vállalok
                                    </button>
                                </div>
                            )}

                            {user && !slot.isPast && config.isMySupervision && slot.supervisor && (
                                <div className="absolute inset-x-0 bottom-0 translate-y-full pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10">
                                    <button
                                        onClick={(e) => handleRemoveSupervisor(slot.supervisor!.id, slot.hour, e)}
                                        disabled={isAssigning === slot.hour}
                                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-xs font-semibold rounded-lg shadow-lg border border-rose-500/50 transition-colors"
                                    >
                                        {isAssigning === slot.hour ? (
                                            <span className="animate-spin w-4 h-4 border-2 border-rose-200/30 border-t-rose-200 rounded-full" />
                                        ) : (
                                            <ShieldAlert size={14} />
                                        )}
                                        Lemondás
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
