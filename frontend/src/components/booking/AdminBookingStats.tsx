import { useEffect } from 'react';
import { BarChart3, Users, Monitor, Calendar } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { fetchBookingStats } from '../../store/slices/bookingsSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

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

    const dayNames = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];

    // Map day statistics for Recharts
    const dailyData = stats.byDayOfWeek.map((count, index) => ({
        name: dayNames[index].substring(0, 3), // e.g. "Vas", "Hét"
        foglalás: count,
    }));

    // Map hourly data for Recharts
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        foglalás: stats.byHour[i] || 0,
    }));

    const averageComputerUsage = stats.computerUtilization.length
        ? Math.round(stats.computerUtilization.reduce((acc, curr) => acc + curr.bookings, 0) / stats.computerUtilization.length)
        : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
                <BarChart3 className="text-primary" size={28} />
                Áttekintés (Elmúlt 30 nap)
            </h3>

            {/* Top Stat Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Összes foglalás</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalBookings}</div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aktív felhasználók</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.topUsers.length}</div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lefoglalt gépek átlaga</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Monitor className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{averageComputerUsage}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {/* Napi eloszlás Chart (Bar) */}
                <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm shadow-sm border border-border/50">
                    <CardHeader>
                        <CardTitle>Napi eloszlás</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                                        itemStyle={{ color: 'hsl(var(--primary))' }}
                                    />
                                    <Bar dataKey="foglalás" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Óránkénti eloszlás Chart (Area) */}
                <Card className="lg:col-span-3 bg-card/50 backdrop-blur-sm shadow-sm border border-border/50">
                    <CardHeader>
                        <CardTitle>Óránkénti terhelés</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorFoglalasi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} minTickGap={20} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                                        itemStyle={{ color: 'hsl(var(--primary))' }}
                                    />
                                    <Area type="monotone" dataKey="foglalás" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorFoglalasi)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lists Section */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Top Users */}
                <Card className="bg-card/50 backdrop-blur-sm shadow-sm border border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users size={18} className="text-primary" />
                            Top Felhasználók
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.topUsers.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shadow-sm group-hover:scale-110 transition-transform">
                                            {idx + 1}
                                        </div>
                                        <span className="font-medium text-foreground">
                                            {item.user?.displayName || item.user?.username || 'Ismeretlen'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-primary">{item.count}</span>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide">foglalás</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Computer Utilization */}
                <Card className="bg-card/50 backdrop-blur-sm shadow-sm border border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Monitor size={18} className="text-primary" />
                            Gép Kihasználtság
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-5">
                            {stats.computerUtilization
                                .slice()
                                .sort((a, b) => b.bookings - a.bookings)
                                .slice(0, 5)
                                .map((item) => {
                                    const percent = Math.min(100, Math.round((item.bookings / (stats.totalBookings || 1)) * 100));
                                    return (
                                        <div key={item.computer.id} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-primary/70" />
                                                    {item.computer.name}
                                                </span>
                                                <span className="text-muted-foreground font-medium">{item.bookings} db</span>
                                            </div>
                                            <div className="h-2 w-full bg-secondary overflow-hidden rounded-full">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
