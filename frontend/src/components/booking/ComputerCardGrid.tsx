import { useMemo } from 'react';
import { Monitor, Gamepad2, Plus, Trophy, Wrench } from 'lucide-react';
import type { Computer, Booking } from '../../store/slices/bookingsSlice';

interface ComputerCardGridProps {
    selectedDate: string;
    selectedHour: number;
    selectedMinute: number;
    computers: Computer[];
    bookings: Booking[];
    userId?: string;
    onBook: (computer: Computer, hour: number, minute: number) => void;
    onCancelBooking: (booking: Booking) => void;
}

export function ComputerCardGrid({
    selectedDate,
    selectedHour,
    selectedMinute,
    computers,
    bookings,
    userId,
    onBook,
    onCancelBooking,
}: ComputerCardGridProps) {
    const computerStatuses = useMemo(() => {
        return computers.map(computer => {
            const startOfSlot = new Date(selectedDate);
            startOfSlot.setHours(selectedHour, selectedMinute, 0, 0);
            const endOfSlot = new Date(startOfSlot);
            endOfSlot.setMinutes(startOfSlot.getMinutes() + 60);

            const booking = bookings.find(b => {
                if (b.computerId !== computer.id) return false;
                const bookingStart = new Date(b.startTime);
                const bookingEnd = new Date(b.endTime);
                return bookingStart < endOfSlot && bookingEnd > startOfSlot;
            });

            const isOwn = !!booking && booking.userId === userId;
            const isBooked = !!booking;
            const isMaintenance = computer.status === 'MAINTENANCE';
            const isOutOfOrder = computer.status === 'OUT_OF_ORDER';
            const isTournament = computer.isCompetitionMode;

            return {
                computer,
                booking,
                isOwn,
                isBooked,
                isMaintenance,
                isOutOfOrder,
                isTournament,
                isAvailable: !isBooked && !isMaintenance && !isOutOfOrder && !isTournament,
            };
        });
    }, [computers, bookings, selectedDate, selectedHour, selectedMinute, userId]);

    const getStatusConfig = (status: typeof computerStatuses[0]) => {
        if (status.isOwn) {
            const isPending = status.booking?.status === 'PENDING';
            return {
                borderColor: isPending ? 'border-amber-500/50' : 'border-primary',
                bgColor: isPending ? 'bg-gradient-to-br from-amber-500/15 to-[#121824]' : 'bg-gradient-to-br from-primary/20 to-indigo-500/10',
                statusText: isPending ? 'Kérelem függőben (DÖK)' : 'Saját foglalás',
                statusColor: isPending ? 'text-amber-400' : 'text-primary',
                buttonText: 'Foglalás törlése',
                buttonStyle: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30',
            };
        }
        if (status.isBooked) {
            return {
                borderColor: 'border-red-500/30',
                bgColor: 'bg-red-500/5',
                statusText: 'Foglalt',
                statusColor: 'text-red-400',
                buttonText: null,
                buttonStyle: '',
            };
        }
        if (status.isTournament) {
            return {
                borderColor: 'border-yellow-500/30',
                bgColor: 'bg-yellow-500/5',
                statusText: 'Verseny mód',
                statusColor: 'text-yellow-400',
                buttonText: null,
                buttonStyle: '',
            };
        }
        if (status.isMaintenance || status.isOutOfOrder) {
            return {
                borderColor: 'border-gray-600/30',
                bgColor: 'bg-gray-800/30',
                statusText: status.isMaintenance ? 'Karbantartás alatt' : 'Nem működik',
                statusColor: 'text-muted-foreground',
                buttonText: null,
                buttonStyle: '',
            };
        }
        return {
            borderColor: 'border-green-500/30 hover:border-green-500/50',
            bgColor: 'bg-green-500/5 hover:bg-green-500/10',
            statusText: 'Szabad',
            statusColor: 'text-green-400',
            buttonText: 'Foglalás',
            buttonStyle: 'bg-primary hover:bg-primary/90 text-foreground',
        };
    };

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Monitor size={18} className="text-primary" />
                <h3 className="text-sm font-medium text-gray-300">
                    Válassz gépet – {selectedHour}:00 – {selectedHour + 1}:00
                </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {computerStatuses.map((status) => {
                    const config = getStatusConfig(status);

                    return (
                        <div
                            key={status.computer.id}
                            className={`
                relative rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col justify-between
                ${config.borderColor} ${config.bgColor}
              `}
                        >
                            {/* Card Content */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                      ${status.isAvailable ? 'bg-green-500/20 text-green-400' :
                        status.isOwn ? (status.booking?.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary') :
                        status.isTournament ? 'bg-yellow-500/20 text-yellow-400' :
                        status.isBooked ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-700/50 text-muted-foreground'}
                    `}>
                                            {status.isTournament ? <Trophy size={20} /> :
                                                status.isMaintenance || status.isOutOfOrder ? <Wrench size={20} /> :
                                                    <Monitor size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">{status.computer.name}</h4>
                                            <span className={`text-xs font-medium ${config.statusColor}`}>
                                                {config.statusText}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Installed games list (rendered ONCE) */}
                                    <div className="mb-4">
                                        <div className="flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                                            <Gamepad2 size={13} className="text-primary" />
                                            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                                                Telepített játékok:
                                            </span>
                                        </div>
                                        {status.computer.installedGames && status.computer.installedGames.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {status.computer.installedGames.map((game, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-[10px] font-mono px-2 py-0.5 bg-secondary text-foreground/90 rounded border border-border/60"
                                                    >
                                                        {game}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-muted-foreground font-mono italic">
                                                Alapértelmezett esport játékkészlet
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Action button */}
                                {config.buttonText && (
                                    <button
                                        onClick={() => {
                                            if (status.isOwn && status.booking) {
                                                onCancelBooking(status.booking);
                                            } else if (status.isAvailable) {
                                                onBook(status.computer, selectedHour, selectedMinute);
                                            }
                                        }}
                                        className={`
                      w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2
                      transition-all border
                      ${config.buttonStyle}
                    `}
                                    >
                                        <Plus size={16} />
                                        {config.buttonText}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
