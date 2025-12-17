import { useEffect } from 'react';
import { BarChart3, Users, Monitor, Calendar } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { fetchBookingStats } from '../../store/slices/bookingsSlice';

export function AdminBookingStats() {
    const dispatch = useAppDispatch();
    const { stats, isLoading } = useAppSelector((state) => state.bookings);

    useEffect(() => {
        dispatch(fetchBookingStats());
    }, [dispatch]);

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground"><span className="animate-spin" /> Betöltés...</div>;
    }

    if (!stats) {
        return <div className="p-8 text-center text-muted-foreground">Nincs elérhető statisztika.</div>;
    }

    const maxDayValue = Math.max(...stats.byDayOfWeek, 1);
    const dayNames = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo']; // 0 = Sunday

    // Prepare hourly data (0-23)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const maxHourValue = Math.max(...Object.values(stats.byHour), 1);

    return (
        <div className="p-6 bg-secondary rounded-lg border border-border">
            <h3 className="flex items-center gap-3 text-xl mb-8 text-foreground">
                <BarChart3 size={24} />
                Foglalási Statisztikák (Elmúlt 30 nap)
            </h3>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 mb-8">
                <div className="bg-muted/50 p-6 rounded-md border border-border flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/15 text-blue-500">
                        <Calendar size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Összes foglalás</span>
                        <span className="text-2xl font-bold text-foreground">{stats.totalBookings}</span>
                    </div>
                </div>

                <div className="bg-muted/50 p-6 rounded-md border border-border flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500/15 text-green-500">
                        <Users size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Aktív felhasználók</span>
                        <span className="text-2xl font-bold text-foreground">{stats.topUsers.length}</span>
                    </div>
                </div>

                <div className="bg-muted/50 p-6 rounded-md border border-border flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/15 text-primary">
                        <Monitor size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Átlagos géphasználat</span>
                        <span className="text-2xl font-bold text-foreground">
                            {Math.round(stats.computerUtilization.reduce((acc, curr) => acc + curr.bookings, 0) / (stats.computerUtilization.length || 1))}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 mb-8">
                {/* Daily Distribution */}
                <div className="bg-muted/50 p-6 rounded-md border border-border">
                    <h4 className="mb-6 text-base text-secondary-foreground">Napi eloszlás</h4>
                    <div className="flex justify-between items-end h-[200px] pb-6 border-b border-border">
                        {stats.byDayOfWeek.map((count, index) => (
                            <div key={index} className="flex flex-col items-center h-full justify-end flex-1">
                                <div
                                    className="w-[60%] bg-primary rounded-t min-h-[4px] relative transition-all duration-300 hover:bg-primary/80 group"
                                    style={{ height: `${(count / maxDayValue) * 100}%` }}
                                    title={`${count} foglalás`}
                                >
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white px-1.5 py-0.5 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap mb-1">{count}</span>
                                </div>
                                <span className="mt-2 text-xs text-muted-foreground">{dayNames[index]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hourly Distribution */}
                <div className="bg-muted/50 p-6 rounded-md border border-border">
                    <h4 className="mb-6 text-base text-secondary-foreground">Óránkénti eloszlás</h4>
                    <div className="flex justify-around items-end h-[200px] pb-6 border-b border-border gap-0.5">
                        {hours.map((hour) => {
                            const count = stats.byHour[hour] || 0;
                            return (
                                <div key={hour} className="flex flex-col items-center h-full justify-end flex-1">
                                    <div
                                        className="w-[60%] bg-primary rounded-t min-h-[4px] transition-all duration-300 hover:bg-primary/80"
                                        style={{ height: `${(count / maxHourValue) * 100}%` }}
                                        title={`${hour}:00 - ${count} foglalás`}
                                    ></div>
                                    {hour % 3 === 0 && <span className="mt-2 text-xs text-muted-foreground">{hour}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
                {/* Top Users */}
                <div className="bg-muted/50 p-6 rounded-md border border-border">
                    <h4 className="mb-6 text-base text-secondary-foreground flex items-center gap-2">
                        <Users size={18} />
                        Top Felhasználók
                    </h4>
                    <div>
                        {stats.topUsers.slice(0, 5).map((item, idx) => (
                            <div key={idx} className="flex items-center py-3 border-b border-border last:border-b-0">
                                <div className="w-8 font-semibold text-primary">{idx + 1}.</div>
                                <div className="flex-1 font-medium">
                                    <span>{item.user?.displayName || item.user?.username || 'Ismeretlen'}</span>
                                </div>
                                <span className="bg-secondary px-2 py-1 rounded-full text-xs text-muted-foreground">{item.count} foglalás</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Computer Utilization */}
                <div className="bg-muted/50 p-6 rounded-md border border-border">
                    <h4 className="mb-6 text-base text-secondary-foreground flex items-center gap-2">
                        <Monitor size={18} />
                        Gép kihasználtság
                    </h4>
                    <div className="flex flex-col gap-4">
                        {stats.computerUtilization
                            .slice()
                            .sort((a, b) => b.bookings - a.bookings)
                            .slice(0, 5)
                            .map((item) => (
                                <div key={item.computer.id}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">{item.computer.name}</span>
                                        <span className="text-muted-foreground">{item.bookings} foglalás</span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded"
                                            style={{ width: `${(item.bookings / (stats.totalBookings || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
