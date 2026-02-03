import { useState, useMemo } from 'react';
import { Monitor, Cpu, HardDrive, Gamepad2, Plus, Info, ChevronDown, Trophy, Wrench } from 'lucide-react';
import type { Computer, Booking } from '../../store/slices/bookingsSlice';

interface ComputerCardGridProps {
    selectedDate: string;
    selectedHour: number;
    computers: Computer[];
    bookings: Booking[];
    userId?: string;
    onBook: (computer: Computer, hour: number) => void;
    onCancelBooking: (booking: Booking) => void;
}

export function ComputerCardGrid({
    selectedDate,
    selectedHour,
    computers,
    bookings,
    userId,
    onBook,
    onCancelBooking,
}: ComputerCardGridProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const computerStatuses = useMemo(() => {
        return computers.map(computer => {
            const startOfSlot = new Date(selectedDate);
            startOfSlot.setHours(selectedHour, 0, 0, 0);
            const endOfSlot = new Date(selectedDate);
            endOfSlot.setHours(selectedHour + 1, 0, 0, 0);

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
    }, [computers, bookings, selectedDate, selectedHour, userId]);

    const getStatusConfig = (status: typeof computerStatuses[0]) => {
        if (status.isOwn) {
            return {
                borderColor: 'border-primary',
                bgColor: 'bg-gradient-to-br from-primary/20 to-indigo-500/10',
                statusText: 'Saját foglalás',
                statusColor: 'text-primary',
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
                statusColor: 'text-gray-500',
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
            buttonStyle: 'bg-primary hover:bg-primary/90 text-white',
        };
    };

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Monitor size={18} className="text-primary" />
                <h3 className="text-sm font-medium text-gray-300">
                    Válassz gépet – {selectedHour}:00
                </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {computerStatuses.map((status) => {
                    const config = getStatusConfig(status);
                    const isExpanded = expandedId === status.computer.id;

                    return (
                        <div
                            key={status.computer.id}
                            className={`
                relative rounded-2xl border-2 transition-all duration-300 overflow-hidden
                ${config.borderColor} ${config.bgColor}
              `}
                        >
                            {/* Header */}
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center
                      ${status.isAvailable ? 'bg-green-500/20 text-green-400' :
                                                status.isOwn ? 'bg-primary/20 text-primary' :
                                                    status.isTournament ? 'bg-yellow-500/20 text-yellow-400' :
                                                        status.isBooked ? 'bg-red-500/20 text-red-400' :
                                                            'bg-gray-700/50 text-gray-500'}
                    `}>
                                            {status.isTournament ? <Trophy size={20} /> :
                                                status.isMaintenance || status.isOutOfOrder ? <Wrench size={20} /> :
                                                    <Monitor size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">{status.computer.name}</h4>
                                            <span className={`text-xs font-medium ${config.statusColor}`}>
                                                {config.statusText}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info toggle */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : status.computer.id)}
                                        className={`
                      p-2 rounded-lg transition-all
                      ${isExpanded ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}
                    `}
                                    >
                                        <ChevronDown
                                            size={16}
                                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                </div>

                                {/* Quick specs preview */}
                                {status.computer.specs && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {status.computer.specs.gpu && (
                                            <span className="flex items-center gap-1 text-[10px] px-2 py-1 bg-white/5 rounded-full text-gray-400">
                                                <Cpu size={10} />
                                                {status.computer.specs.gpu.split(' ').slice(0, 2).join(' ')}
                                            </span>
                                        )}
                                        {status.computer.specs.ram && (
                                            <span className="flex items-center gap-1 text-[10px] px-2 py-1 bg-white/5 rounded-full text-gray-400">
                                                <HardDrive size={10} />
                                                {status.computer.specs.ram}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Action button */}
                                {config.buttonText && (
                                    <button
                                        onClick={() => {
                                            if (status.isOwn && status.booking) {
                                                onCancelBooking(status.booking);
                                            } else if (status.isAvailable) {
                                                onBook(status.computer, selectedHour);
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

                            {/* Expanded specs */}
                            {isExpanded && (
                                <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="border-t border-white/10 pt-4">
                                        {status.computer.specs ? (
                                            <div className="space-y-3">
                                                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Info size={12} />
                                                    Részletek
                                                </h5>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {status.computer.specs.cpu && (
                                                        <div className="p-2 bg-white/5 rounded-lg">
                                                            <span className="text-gray-500 block">CPU</span>
                                                            <span className="text-gray-300">{status.computer.specs.cpu}</span>
                                                        </div>
                                                    )}
                                                    {status.computer.specs.gpu && (
                                                        <div className="p-2 bg-white/5 rounded-lg">
                                                            <span className="text-gray-500 block">GPU</span>
                                                            <span className="text-gray-300">{status.computer.specs.gpu}</span>
                                                        </div>
                                                    )}
                                                    {status.computer.specs.ram && (
                                                        <div className="p-2 bg-white/5 rounded-lg">
                                                            <span className="text-gray-500 block">RAM</span>
                                                            <span className="text-gray-300">{status.computer.specs.ram}</span>
                                                        </div>
                                                    )}
                                                    {status.computer.specs.monitor && (
                                                        <div className="p-2 bg-white/5 rounded-lg">
                                                            <span className="text-gray-500 block">Monitor</span>
                                                            <span className="text-gray-300">{status.computer.specs.monitor}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 italic">Nincs elérhető specifikáció.</p>
                                        )}

                                        {status.computer.installedGames && status.computer.installedGames.length > 0 && (
                                            <div className="mt-4">
                                                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                                    <Gamepad2 size={12} />
                                                    Telepített játékok
                                                </h5>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {status.computer.installedGames.map((game, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full"
                                                        >
                                                            {game}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
