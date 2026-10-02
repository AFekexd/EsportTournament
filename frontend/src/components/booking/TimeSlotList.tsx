import { useMemo, useState, useEffect, useRef } from 'react';
import { Clock, Users, AlertCircle, Shield, ShieldAlert, ShieldCheck, UserPlus, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Computer, Booking, BookingSchedule, BookingSupervisor } from '../../store/slices/bookingsSlice';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { assignSupervisor, removeSupervisor, fetchEligibleSupervisors } from '../../store/slices/bookingsSlice';

interface TimeSlotListProps {
    selectedDate: string;
    selectedHour: number | null;
    selectedMinute: number;
    onSelectSlot: (hour: number, minute: number) => void;
    bookings: Booking[];
    schedules: BookingSchedule[];
    computers: Computer[];
    supervisors: BookingSupervisor[];
}

interface TimeSlotInfo {
    hour: number;
    minute: number;
    freeCount: number;
    totalCount: number;
    isPast: boolean;
    isSelected: boolean;
    supervisor?: BookingSupervisor;
}

export function TimeSlotList({
    selectedDate,
    selectedHour,
    onSelectSlot,
    bookings,
    schedules,
    computers,
    supervisors,
}: TimeSlotListProps) {
    const dayOfWeek = new Date(selectedDate).getDay();
    const specificSchedule = schedules.find(s => s.specificDate && s.specificDate.startsWith(selectedDate) && s.isActive);
    const daySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek && s.isActive);
    const todaySchedule = specificSchedule || daySchedule;
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const { eligibleSupervisors } = useAppSelector(state => state.bookings);

    const [isAssigning, setIsAssigning] = useState<number | null>(null);
    const [openAssignHour, setOpenAssignHour] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const canSupervise = !!user && user.role !== 'STUDENT';
    const isAdmin = user?.role === 'ADMIN';

    // Click outside handler for delegation dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openAssignHour !== null && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenAssignHour(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openAssignHour]);

    useEffect(() => {
        if (isAdmin) {
            dispatch(fetchEligibleSupervisors());
        }
    }, [isAdmin, dispatch]);

    const timeSlots = useMemo((): TimeSlotInfo[] => {
        if (!todaySchedule) return [];

        const now = new Date();
        const [year, month, day] = selectedDate.split('-').map(Number);
        const selectedDateObj = new Date(year, month - 1, day);
        const isToday = now.toDateString() === selectedDateObj.toDateString();

        const slots: TimeSlotInfo[] = [];
        const availableComputers = computers.filter(c =>
            c.status === 'AVAILABLE' && c.isActive && !c.isCompetitionMode
        );

        // Hourly slots: from startHour to endHour - 1
        for (let hour = todaySchedule.startHour; hour < todaySchedule.endHour; hour++) {
            const startOfSlot = new Date(year, month - 1, day, hour, 0, 0, 0);
            const endOfSlot = new Date(year, month - 1, day, hour + 1, 0, 0, 0);

            // Slot is considered past if start time is already in the past today
            let isPast = false;
            if (isToday) {
                // If current time is past the slot start time
                isPast = startOfSlot.getTime() <= now.getTime();
            }

            // Count free computers for this 1-hour slot
            let freeCount = availableComputers.length;

            availableComputers.forEach(computer => {
                const isBooked = bookings.some(b => {
                    if (b.computerId !== computer.id) return false;
                    const bookingStart = new Date(b.startTime);
                    const bookingEnd = new Date(b.endTime);
                    return bookingStart < endOfSlot && bookingEnd > startOfSlot;
                });

                if (isBooked) freeCount--;
            });

            // Find supervisor for this date and hour
            const supervisor = supervisors.find(s => {
                const sDateStr = typeof s.date === 'string' ? s.date.split('T')[0] : new Date(s.date).toISOString().split('T')[0];
                return sDateStr === selectedDate && s.hour === hour;
            });

            slots.push({
                hour,
                minute: 0,
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
            <div className="tactical-card rounded-xl border border-border p-8 text-center bg-[#121824]/60">
                <div className="w-16 h-16 bg-muted/20 border border-border/80 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-display font-bold uppercase tracking-wider text-foreground mb-2">Zárva</h3>
                <p className="text-muted-foreground text-sm font-mono">Ezen a napon nincs nyitva a gaming szoba.</p>
            </div>
        );
    }

    const handleAssign = async (hour: number, targetUserId?: string) => {
        if (!user) return;
        try {
            setIsAssigning(hour);
            await dispatch(assignSupervisor({ date: selectedDate, hour, targetUserId })).unwrap();
            setOpenAssignHour(null);
            toast.success("Felelős sikeresen rögzítve!");
        } catch (error: any) {
            console.error("Failed to assign supervisor:", error);
            toast.error(error?.message || "Hiba történt a felelős mentésekor");
        } finally {
            setIsAssigning(null);
        }
    };

    const handleRemove = async (supervisorId: string, hour: number) => {
        if (!user) return;
        try {
            setIsAssigning(hour);
            await dispatch(removeSupervisor(supervisorId)).unwrap();
            toast.success("Felelős sikeresen eltávolítva!");
        } catch (error: any) {
            console.error("Failed to remove supervisor:", error);
            toast.error(error?.message || "Hiba történt a felelős eltávolításakor");
        } finally {
            setIsAssigning(null);
        }
    };

    const getSlotConfig = (slot: TimeSlotInfo) => {
        if (slot.isPast) {
            return {
                bg: 'bg-muted/10',
                border: 'border-border/30',
                text: 'text-muted-foreground',
                badgeBg: 'bg-muted/30 text-muted-foreground border-border/40',
                label: 'Lejárt',
                disabled: true,
                bookable: false,
            };
        }

        const isSupervisor = slot.supervisor && user && slot.supervisor.userId === user.id;

        // If NO supervisor, booking is disabled for everyone
        if (!slot.supervisor) {
            return {
                bg: 'bg-[#121824]/80 hover:bg-[#151e2e]',
                border: 'border-indigo-500/20 hover:border-indigo-500/40',
                text: 'text-indigo-400',
                badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
                label: 'Nincs felelős',
                disabled: true,
                bookable: false,
                needsSupervisor: true,
            };
        }

        // If current user is the supervisor, cannot book own slot
        if (isSupervisor) {
            return {
                bg: 'bg-teal-950/20 hover:bg-teal-950/30',
                border: 'border-teal-500/40',
                text: 'text-teal-400',
                badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/40',
                label: 'Ügyeleted',
                disabled: true,
                bookable: false,
                isMySupervision: true,
            };
        }

        if (!todaySchedule.isOpenForBooking) {
            return {
                bg: 'bg-muted/10',
                border: 'border-border/40',
                text: 'text-muted-foreground',
                badgeBg: 'bg-muted/30 text-muted-foreground border-border/50',
                label: 'Csak Ügyelet',
                disabled: true,
                bookable: false,
            };
        }

        if (slot.isSelected) {
            return {
                bg: 'bg-primary/10',
                border: 'border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/10',
                text: 'text-primary',
                badgeBg: 'bg-primary text-black font-bold border-primary',
                label: 'Kiválasztva',
                disabled: false,
                bookable: true,
            };
        }

        if (slot.freeCount === 0) {
            return {
                bg: 'bg-[#121824]/60',
                border: 'border-red-500/20',
                text: 'text-red-400',
                badgeBg: 'bg-red-500/10 text-red-400 border-red-500/30',
                label: 'Megtelt',
                disabled: true,
                bookable: false,
            };
        }

        if (slot.freeCount <= 2) {
            return {
                bg: 'bg-[#121824]/90 hover:bg-[#151f30]',
                border: 'border-amber-500/30 hover:border-amber-500/60',
                text: 'text-amber-400',
                badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
                label: 'Kevés hely',
                disabled: false,
                bookable: true,
            };
        }

        return {
            bg: 'bg-[#121824]/90 hover:bg-[#162030]',
            border: 'border-border/80 hover:border-emerald-500/50',
            text: 'text-foreground',
            badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            label: 'Elérhető',
            disabled: false,
            bookable: true,
        };
    };

    return (
        <div className="tactical-card rounded-xl border border-border p-5 md:p-6 bg-[#0E131F]/90 backdrop-blur-sm shadow-xl">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-border/60 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-center shadow-inner">
                        <Clock size={20} className="text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base md:text-lg font-display font-extrabold uppercase tracking-wide text-foreground">
                                Válassz időpontot
                            </h3>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                                1 órás sávok
                            </span>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            Nyitvatartás: <span className="text-foreground font-semibold">{todaySchedule.startHour}:00 – {todaySchedule.endHour}:00</span>
                        </p>
                    </div>
                </div>

                {/* Status Legend */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121824] border border-border/80 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Szabad</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121824] border border-border/80 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Kevés hely</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121824] border border-border/80 text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Megtelt</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121824] border border-border/80 text-indigo-400">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span>Nincs felelős</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121824] border border-border/80 text-teal-400">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        <span>Ügyeleted</span>
                    </div>
                </div>
            </div>

            {/* Time Slot Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {timeSlots.map((slot) => {
                    const config = getSlotConfig(slot);
                    const slotKey = slot.hour;
                    const isDropdownOpen = openAssignHour === slot.hour;
                    const isCurrentSlotLoading = isAssigning === slot.hour;

                    const percentFree = slot.totalCount > 0 ? (slot.freeCount / slot.totalCount) * 100 : 0;

                    return (
                        <div
                            key={slotKey}
                            className={`
                                relative rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-visible
                                ${config.bg} ${config.border}
                                ${config.bookable ? 'hover:scale-[1.01] hover:shadow-lg' : ''}
                            `}
                        >
                            {/* Card Content - Clickable for slot booking */}
                            <div
                                onClick={() => config.bookable && onSelectSlot(slot.hour, 0)}
                                className={`p-4 flex-1 flex flex-col justify-between ${config.bookable ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                                {/* Top: Time Header and Status Badge */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-xl font-bold font-mono tracking-tight ${slot.isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                {slot.hour}:00 – {slot.hour + 1}:00
                                            </span>
                                            {slot.isSelected && (
                                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            )}
                                        </div>
                                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                            60 perces idősáv
                                        </span>
                                    </div>

                                    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${config.badgeBg}`}>
                                        {config.label}
                                    </span>
                                </div>

                                {/* Middle: Availability Counter & Progress Bar */}
                                <div className="my-2 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-mono">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                            <Users size={13} className="text-muted-foreground" />
                                            Szabad gépek
                                        </span>
                                        <span className={`font-bold ${slot.freeCount === 0 ? 'text-red-400' : slot.freeCount <= 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {slot.freeCount} / {slot.totalCount}
                                        </span>
                                    </div>

                                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-border/40 p-[0.5px]">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                slot.freeCount === 0
                                                    ? 'bg-red-500'
                                                    : slot.freeCount <= 2
                                                    ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${percentFree}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer: Supervisor Section */}
                            <div className="px-4 py-3 bg-black/25 border-t border-border/50 rounded-b-xl">
                                {slot.supervisor ? (
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
                                                <ShieldCheck size={13} className="text-teal-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-medium text-foreground truncate max-w-[130px]" title={slot.supervisor.user.displayName || slot.supervisor.user.username}>
                                                    {slot.supervisor.user.displayName || slot.supervisor.user.username}
                                                </div>
                                                <div className="text-[9px] font-mono text-muted-foreground leading-none">
                                                    {slot.supervisor.userId === user?.id ? (
                                                        <span className="text-teal-400 font-semibold">Te felügyeled</span>
                                                    ) : (
                                                        <span>Felelős tanár / tag</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions for current supervisor or admin */}
                                        {!slot.isPast && (
                                            <div>
                                                {slot.supervisor.userId === user?.id ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('Biztosan lemondasz az ügyeletedről?')) {
                                                                handleRemove(slot.supervisor!.id, slot.hour);
                                                            }
                                                        }}
                                                        disabled={isCurrentSlotLoading}
                                                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[10px] font-mono uppercase font-semibold transition-colors flex items-center gap-1"
                                                    >
                                                        {isCurrentSlotLoading ? (
                                                            <span className="w-2.5 h-2.5 border-2 border-rose-300/30 border-t-rose-300 rounded-full animate-spin" />
                                                        ) : (
                                                            <ShieldAlert size={11} />
                                                        )}
                                                        Lemondás
                                                    </button>
                                                ) : isAdmin ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`Biztosan eltávolítod a felelőst (${slot.supervisor!.user.displayName || slot.supervisor!.user.username})?`)) {
                                                                handleRemove(slot.supervisor!.id, slot.hour);
                                                            }
                                                        }}
                                                        disabled={isCurrentSlotLoading}
                                                        title="Felelős eltávolítása"
                                                        className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                    >
                                                        {isCurrentSlotLoading ? (
                                                            <span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin inline-block" />
                                                        ) : (
                                                            <X size={14} />
                                                        )}
                                                    </button>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* No Supervisor assigned */
                                    <div className="relative">
                                        {!slot.isPast && canSupervise ? (
                                            <div className="flex items-center gap-1.5">
                                                {/* Take responsibility self button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAssign(slot.hour);
                                                    }}
                                                    disabled={isCurrentSlotLoading}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]"
                                                >
                                                    {isCurrentSlotLoading ? (
                                                        <span className="w-3.5 h-3.5 border-2 border-indigo-200/30 border-t-indigo-200 rounded-full animate-spin" />
                                                    ) : (
                                                        <Shield size={13} />
                                                    )}
                                                    <span>Ügyelet vállalása</span>
                                                </button>

                                                {/* Admin delegation dropdown toggle */}
                                                {isAdmin && (
                                                    <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenAssignHour(isDropdownOpen ? null : slot.hour);
                                                            }}
                                                            title="Kijelölés másnak"
                                                            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center justify-center ${
                                                                isDropdownOpen
                                                                    ? 'bg-primary text-black border-primary'
                                                                    : 'bg-secondary/70 border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                                                            }`}
                                                        >
                                                            <UserPlus size={14} />
                                                        </button>

                                                        {/* Floating delegation popover */}
                                                        {isDropdownOpen && (
                                                            <div className="absolute right-0 bottom-full mb-2 w-56 bg-[#161D2B] border border-border/90 rounded-xl shadow-2xl z-50 p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                                                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
                                                                    Felelős kijelölése ({slot.hour}:00)
                                                                </div>

                                                                <div className="max-h-48 overflow-y-auto space-y-0.5">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAssign(slot.hour);
                                                                        }}
                                                                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-white/10 flex items-center justify-between"
                                                                    >
                                                                        <span>Magam ({user?.displayName || user?.username})</span>
                                                                        <Check size={13} className="text-primary" />
                                                                    </button>

                                                                    {eligibleSupervisors
                                                                        .filter(s => s.id !== user?.id)
                                                                        .map(staff => (
                                                                            <button
                                                                                key={staff.id}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleAssign(slot.hour, staff.id);
                                                                                }}
                                                                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-white/10 flex items-center justify-between"
                                                                            >
                                                                                <span className="truncate">{staff.displayName || staff.username}</span>
                                                                                <span className="text-[10px] font-mono text-muted-foreground opacity-70">
                                                                                    {staff.role === 'ADMIN' ? 'Admin' : 'Staff'}
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Regular student or past slot */
                                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400/90 py-0.5">
                                                <AlertCircle size={13} className="shrink-0 text-amber-400" />
                                                <span className="truncate">Ügyelet nélkül nem foglalható</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
