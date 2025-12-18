import { Link } from 'react-router-dom';
import { Trophy, Users, Gamepad2, Calendar, ArrowRight, Zap, Shield, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchStats } from '../store/slices/statsSlice';
import { Skeleton } from '@/components/ui/skeleton';

const features = [
    {
        icon: <Trophy className="h-6 w-6" />,
        title: 'Versenyek',
        description: 'Regisztrálj versenyekre és versenyezz a legjobb csapatokkal.',
    },
    {
        icon: <Users className="h-6 w-6" />,
        title: 'Csapatok',
        description: 'Hozz létre csapatot vagy csatlakozz meglévőkhöz.',
    },
    {
        icon: <Gamepad2 className="h-6 w-6" />,
        title: 'Játékok',
        description: 'Támogatunk minden népszerű esport játékot.',
    },
    {
        icon: <Star className="h-6 w-6" />,
        title: 'Ranglisták',
        description: 'ELO alapú rangsorrendszer a tiszta versenyzésért.',
    },
];

/*
5 verseny
Jó közösség
Értékes díjak
Automata Bracket rendszer
Részletes statisztikák
*/

export function HomePage() {
    const { isAuthenticated, login } = useAuth();
    const dispatch = useAppDispatch();
    const { data: stats, loading: statsLoading } = useAppSelector((state) => state.stats);

    // Fetch stats on component mount and refresh every 30 seconds
    useEffect(() => {
        dispatch(fetchStats());

        const interval = setInterval(() => {
            dispatch(fetchStats());
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [dispatch]);

    const statsData = [
        { value: stats?.activeTournaments ?? 0, label: 'Aktív Versenyek' },
        { value: stats?.registeredUsers ?? 0, label: 'Regisztrált Játékosok' },
        { value: stats?.createdTeams ?? 0, label: 'Létrehozott Csapatok' },
        { value: stats?.playedMatches ?? 0, label: 'Lejátszott Meccsek' },
    ];

    return (
        <div className="flex flex-col gap-20 pb-20">
            {/* Hero Section */}
            <section className="relative grid  min-h-[600px] grid-cols-1 items-center gap-12 overflow-hidden py-12 lg:grid-cols-2">
                {/* Background Effects */}
                <div className="absolute -left-20 -top-20 -z-10 h-96 w-96 rounded-full bg-primary/30 blur-[128px]" />
                <div className="absolute right-0 top-1/2 -z-10 h-96 w-96 rounded-full bg-[hsl(var(--neon-pink))]/20 blur-[128px]" />
                <div className="absolute left-1/2 bottom-0 -z-10 h-64 w-64 rounded-full bg-accent/20 blur-[100px]" />

                <div className="flex flex-col gap-8 p-10">
                    <div className="w-fit rounded-full border border-primary/50 bg-primary/10 px-4 py-1.5 backdrop-blur-md shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                        <div className="flex items-center gap-2 text-sm font-bold text-primary tracking-wide">
                            <Zap className="h-4 w-4 fill-primary animate-pulse" />
                            <span>ISKOLAI ESPORT PLATFORM</span>
                        </div>
                    </div>

                    <h1 className="text-glow text-5xl font-black leading-tight tracking-tighter text-white sm:text-6xl md:text-7xl">
                        Versenyezz a <span className="bg-clip-text bg-gradient-to-r from-[hsl(var(--accent))] via-primary to-[hsl(var(--neon-pink))] animate-pulse">LEGJOBBAKKAL</span>
                    </h1>

                    <p className="max-w-[600px] text-lg text-muted-foreground sm:text-xl leading-relaxed font-light">
                        Az iskolai esport versenysorozat hivatalos platformja. Csatlakozz a közösséghez,
                        alapíts csapatot, és küzdj meg a bajnoki címért.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4">
                        {isAuthenticated ? (
                            <>
                                <Button asChild variant="outline" size="lg" className="rounded-full border-primary/50 bg-black/20 text-base hover:bg-primary/10 hover:text-white hover:border-primary backdrop-blur-sm">
                                    <Link to="/tournaments" className="gap-2">
                                        Versenyek
                                        <ArrowRight className="h-5 w-5" />
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="rounded-full border-primary/50 bg-black/20 text-base hover:bg-primary/10 hover:text-white hover:border-primary backdrop-blur-sm">
                                    <Link to="/teams">Csapatok felfedezése</Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button size="lg" onClick={login} className="rounded-full bg-gradient-to-r from-primary to-[hsl(var(--neon-pink))] text-base font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.7)] border-none">
                                    Csatlakozás Most
                                </Button>
                                <Button asChild variant="outline" size="lg" className="rounded-full border-primary/50 bg-black/20 text-base hover:bg-primary/10 hover:text-white hover:border-primary backdrop-blur-sm">
                                    <Link to="/tournaments">Versenyek böngészése</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="relative hidden h-[500px] lg:block perspective-[1000px]">
                    {/* Visual elements using absolute positioning and Tailwind */}
                    <div className="absolute left-[10%] top-[10%] w-56 animate-bounce delay-0 hover:z-10">
                        <div className="glass-card rounded-2xl p-6 text-center shadow-2xl transition-all hover:scale-110 group cursor-pointer border-t border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-[0_0_15px_rgba(139,92,246,0.3)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] transition-shadow">
                                <Trophy className="h-7 w-7" />
                            </div>
                            <span className="font-bold text-white relative z-10">Automata Bracket</span>
                        </div>
                    </div>

                    <div className="absolute right-[10%] top-[35%] w-56 animate-bounce delay-700 hover:z-10">
                        <div className="glass-card rounded-2xl p-6 text-center shadow-2xl transition-all hover:scale-110 group cursor-pointer border-t border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--accent))]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 text-accent shadow-[0_0_15px_hsla(var(--accent),0.3)] group-hover:shadow-[0_0_25px_hsla(var(--accent),0.6)] transition-shadow">
                                <Shield className="h-7 w-7" />
                            </div>
                            <span className="font-bold text-white relative z-10">ELO Rendszer</span>
                        </div>
                    </div>

                    <div className="absolute bottom-[10%] left-[20%] w-56 animate-bounce delay-1000 hover:z-10">
                        <div className="glass-card rounded-2xl p-6 text-center shadow-2xl transition-all hover:scale-110 group cursor-pointer border-t border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--neon-pink))]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(var(--neon-pink))]/20 text-[hsl(var(--neon-pink))] shadow-[0_0_15px_hsla(var(--neon-pink),0.3)] group-hover:shadow-[0_0_25px_hsla(var(--neon-pink),0.6)] transition-shadow">
                                <Calendar className="h-7 w-7" />
                            </div>
                            <span className="font-bold text-white relative z-10">Versenynaptár</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="relative py-10">
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-3xl opacity-50" />
                <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
                    {statsLoading ? (
                        // Loading skeleton
                        Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="flex flex-col items-center justify-center border-l border-white/5 py-4 first:border-0">
                                <Skeleton className="h-16 w-32 mb-2 bg-white/5" />
                                <Skeleton className="h-4 w-40 bg-white/5" />
                            </div>
                        ))
                    ) : (
                        statsData.map((stat, index) => (
                            <div key={index} className="flex flex-col items-center justify-center border-l border-white/5 py-4 first:border-0 group hover:bg-white/5 rounded-lg transition-colors">
                                <span className="text-glow mb-2 text-5xl font-black tracking-tight text-white md:text-6xl group-hover:scale-110 transition-transform duration-300 group-hover:text-primary">
                                    {stat.value}+
                                </span>
                                <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors">{stat.label}</span>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="flex flex-col gap-16">
                <div className="text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl text-glow">Miért válassz minket?</h2>
                    <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                        Modern technológia és közösségi élmény egy helyen.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map((feature, index) => (
                        <div key={index} className="glass-card group relative overflow-hidden rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] border border-white/5 hover:border-primary/50">
                            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-2xl transition-all group-hover:scale-150 group-hover:bg-primary/40" />

                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white shadow-inner ring-1 ring-white/10 transition-colors group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                                {feature.icon}
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-white group-hover:text-primary transition-colors">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="pb-8">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-[hsl(var(--neon-pink))] to-accent p-1 md:p-1">
                    <div className="absolute inset-0 bg-white/10 blur-xl animate-pulse"></div>
                    <div className="relative rounded-[22px] bg-background/90 p-10 md:p-16 overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl"></div>

                        <div className="relative flex flex-col items-center justify-between gap-10 md:flex-row">
                            <div className="text-center md:text-left">
                                <h2 className="mb-4 text-4xl font-black text-white md:text-5xl text-glow">Készen állsz?</h2>
                                <p className="max-w-md text-lg text-white/80">
                                    Csatlakozz több száz játékoshoz és kezd el építeni az esport karriered még ma!
                                </p>
                            </div>

                            <div className="shrink-0">
                                {isAuthenticated ? (
                                    <Button asChild size="lg" className="h-16 rounded-full bg-gradient-to-r from-primary to-accent px-10 text-xl font-bold text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all shadow-lg">
                                        <Link to="/teams/create" className="gap-2">
                                            Csapat létrehozása
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button size="lg" onClick={login} className="h-16 rounded-full bg-gradient-to-r from-primary to-accent px-10 text-xl font-bold text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all shadow-lg">
                                        Kezdjük el!
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Remove the import CSS line since we are not using it anymore
// import './Home.css';
