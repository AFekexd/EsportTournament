import { Link } from "react-router-dom";
import {
  Trophy,
  Users,
  Gamepad2,
  Calendar,
  ArrowRight,
  Zap,
  Shield,
  Star,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchStats } from "../store/slices/statsSlice";
import { Skeleton } from "@/components/ui/skeleton";

const features = [
  {
    icon: <Trophy className="h-6 w-6" />,
    title: "Versenyek",
    description: "Regisztrálj versenyekre és versenyezz a legjobb csapatokkal.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Csapatok",
    description: "Hozz létre csapatot vagy csatlakozz meglévőkhöz.",
  },
  {
    icon: <Gamepad2 className="h-6 w-6" />,
    title: "Játékok",
    description: "Támogatunk minden népszerű esport játékot.",
  },
  {
    icon: <Star className="h-6 w-6" />,
    title: "Ranglisták",
    description: "ELO alapú rangsorrendszer a tiszta versenyzésért.",
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
  const { data: stats, loading: statsLoading } = useAppSelector(
    (state) => state.stats
  );

  // Fetch stats on component mount and refresh every 30 seconds
  useEffect(() => {
    dispatch(fetchStats());

    const interval = setInterval(() => {
      dispatch(fetchStats());
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [dispatch]);

  const statsData = [
    { value: stats?.activeTournaments ?? 0, label: "Versenyek", url: "/tournaments" },
    { value: stats?.registeredUsers ?? 0, label: "Regisztrált Játékosok", url: "/leaderboards" },
    { value: stats?.createdTeams ?? 0, label: "Létrehozott Csapatok", url: "/teams" },
    { value: stats?.playedMatches ?? 0, label: "Meccsek", },
  ];

  return (
    <div className="flex flex-col gap-20 pb-20 ">
      {/* Hero Section */}
      <section className="relative grid min-h-[600px] grid-cols-1 items-center gap-12 rounded-xl overflow-hidden py-12 lg:grid-cols-2">
        {/* Background Effects */}
        <div className="absolute -left-20 -top-20 -z-10 h-96 w-96 rounded-full bg-primary/30 blur-[128px]" />
        <div className="absolute  right-0 top-1/2 -z-10 h-96 w-96 rounded-full bg-[hsl(var(--neon-pink))]/20 blur-[128px]" />
        <div className="absolute left-1/2 bottom-0 -z-10 h-64 w-64 rounded-full bg-accent/20 blur-[100px]" />

        <div className="flex flex-col gap-8 p-10 ">
          <div className="w-fit rounded-full border border-primary/50 bg-primary/10 px-4 py-1.5 backdrop-blur-md shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <div className="flex items-center gap-2 text-sm font-bold text-primary tracking-wide">
              <Zap className="h-4 w-4 fill-primary animate-pulse" />
              <span>ISKOLAI ESPORT PLATFORM</span>
            </div>
          </div>

          <h1 className="text-glow text-5xl font-black leading-tight tracking-tighter text-white sm:text-6xl md:text-7xl">
            Versenyezz a{" "}
            <span className="bg-clip-text bg-gradient-to-r from-[hsl(var(--accent))] via-primary to-[hsl(var(--neon-pink))] animate-pulse">
              LEGJOBBAKKAL
            </span>
          </h1>

          <p className="max-w-[600px] text-lg text-muted-foreground sm:text-xl leading-relaxed font-light">
            Az iskolai esport versenysorozat hivatalos platformja. Csatlakozz a
            közösséghez, alapíts csapatot, és küzdj meg a bajnoki címért.
          </p>

          <div className="mt-4 flex flex-wrap gap-4">
            {isAuthenticated ? (
              <>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-primary/50 bg-black/20 text-base hover:bg-primary/10 hover:text-white hover:border-primary backdrop-blur-sm"
                >
                  <Link to="/tournaments" className="gap-2">
                    Versenyek
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-primary/50 bg-black/20 text-base hover:bg-primary/10 hover:text-white hover:border-primary backdrop-blur-sm"
                >
                  <Link to="/teams">Csapatok felfedezése</Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={login}
                  className="rounded-full bg-gradient-to-r from-primary to-[hsl(var(--neon-pink))] text-base font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.7)] border-none"
                >
                  Csatlakozás Most
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-primary/50 bg-black/20 text-base hover:bg-primary/10 hover:text-white hover:border-primary backdrop-blur-sm"
                >
                  <Link to="/tournaments">Versenyek böngészése</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="relative hidden h-[500px] lg:block perspective-[1000px]">
          {/* Visual elements using absolute positioning and Tailwind */}
          <div className="absolute left-[10%] top-[10%] w-56 hover:animate-bounce delay-0 hover:z-10">
            <div className="glass-card rounded-2xl p-6 text-center shadow-2xl transition-all hover:scale-110 group cursor-pointer border-t border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 text-primary transition-shadow">
                <Trophy className="h-7 w-7" />
              </div>
              <span className="font-bold text-white relative z-10">
                Automata Bracket
              </span>
            </div>
          </div>

          <div className="absolute right-[10%] top-[35%] w-56 hover:animate-bounce delay-700 hover:z-10">
            <div className="glass-card rounded-2xl p-6 text-center shadow-2xl transition-all hover:scale-110 group cursor-pointer border-t border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--accent))]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 text-accent shadow-[0_0_15px_hsla(var(--accent),0.3)] group-hover:shadow-[0_0_25px_hsla(var(--accent),0.6)] transition-shadow">
                <Shield className="h-7 w-7" />
              </div>
              <span className="font-bold text-white relative z-10">
                ELO Rendszer
              </span>
            </div>
          </div>

          <div className="absolute bottom-[10%] left-[20%] w-56 hover:animate-bounce delay-300 hover:z-10">
            <div className="glass-card rounded-2xl p-6 text-center shadow-2xl transition-all hover:scale-110 group cursor-pointer border-t border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--neon-pink))]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(var(--neon-pink))]/20 text-[hsl(var(--neon-pink))] shadow-[0_0_15px_hsla(var(--neon-pink),0.3)] group-hover:shadow-[0_0_25px_hsla(var(--neon-pink),0.6)] transition-shadow">
                <Calendar className="h-7 w-7" />
              </div>
              <span className="font-bold text-white relative z-10">
                Versenynaptár
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-10">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-3xl opacity-50" />
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {statsLoading
            ? // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col items-center justify-center border-l border-white/5 py-4 first:border-0"
              >
                <Skeleton className="h-16 w-32 mb-2 bg-white/5" />
                <Skeleton className="h-4 w-40 bg-white/5" />
              </div>
            ))
            : statsData.map((stat, index) => (
              <Link
                key={index}
                to={stat.url || '#'}
                className="flex flex-col items-center justify-center border-l border-white/5 py-4 first:border-0 group hover:bg-white/5 rounded-lg transition-colors"
              >
                <span className="text-glow mb-2 text-5xl font-black tracking-tight text-white md:text-6xl group-hover:scale-110 transition-transform duration-300 group-hover:text-primary">
                  {stat.value}
                </span>
                <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors">
                  {stat.label}
                </span>
              </Link>
            ))}
        </div>
      </section>

      {/* Discord Section */}
      <div className="flex w-full flex-col md:!flex-row justify-evenly items-center gap-8">
        <section className="relative overflow-hidden rounded-3xl border border-[#5865F2]/30 bg-[#5865F2]/10 p-8 md:p-12 ">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#5865F2,transparent_70%)] opacity-20" />

          <div className="flex flex-col justify-center gap-6 text-center md:flex-row md:justify-between md:text-left w-full h-full">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-3 md:justify-start">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5865F2] text-white shadow-[0_0_15px_rgba(88,101,242,0.5)]">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white md:text-3xl">
                  Pollák Discord
                </h2>

              </div>
              <p className="max-w-xl text-muted-foreground">
                Találj csapattársakat, szervezz meccseket, és légy része az
                iskolai esport vérkeringésének. Közvetlen kapcsolat a szervezőkkel
                és a többi játékossal.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="h-12 min-w-[200px] shrink-0 rounded-full bg-[#5865F2] text-white hover:bg-[#4752C4] shadow-[0_0_20px_rgba(88,101,242,0.4)] hover:shadow-[0_0_30px_rgba(88,101,242,0.6)] transition-all border-none"
            >
              <a
                href="https://discord.gg/HWB2bAMUNP"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2 !text-white hover:!text-[#5865F2]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
                </svg>
                Csatlakozás
              </a>
            </Button>

          </div>

        </section>
        <div className="w-full max-w-[350px]">
          <iframe
            src="https://discord.com/widget?id=1449786215720026237&theme=dark"
            className="w-full h-[500px] rounded-2xl"
            allowTransparency={true}
            frameBorder="0"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          ></iframe>
        </div>
      </div>
      {/* Features Section */}
      <section className="flex flex-col gap-16 ">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-card group relative overflow-hidden rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] border border-white/5 hover:border-primary/50 cursor-pointer"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-2xl transition-all group-hover:scale-150 group-hover:bg-primary/40" />

              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white shadow-inner ring-1 ring-white/10 transition-colors group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                {feature.icon}
              </div>
              <h3 className="mb-3 text-xl font-bold text-white group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-8">
        <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-background/50 p-1 md:p-1">
          {/* Outer Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 blur-3xl" />

          <div className="relative overflow-hidden rounded-[36px] bg-[#0A0A0B] px-6 py-16 text-center shadow-2xl md:px-16 md:py-24">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            <div className="absolute left-0 top-0 -z-10 h-full w-full bg-[radial-gradient(circle_800px_at_100%_200px,#3b0764,transparent)]" />
            <div className="absolute right-0 top-0 -z-10 h-full w-full bg-[radial-gradient(circle_800px_at_0%_-200px,#1e1b4b,transparent)]" />

            <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
                <span className="mr-2 flex h-2 w-2 items-center justify-center">
                  <span className="absolute h-2 w-2 animate-ping rounded-full bg-primary opacity-75"></span>
                  <span className="relative h-1.5 w-1.5 rounded-full bg-primary"></span>
                </span>
                Csatlakozz a jövő bajnokaihoz
              </div>

              <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                Készen állsz az <br />
                <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-500 bg-clip-text text-transparent">
                  igazi kihívásra?
                </span>
              </h2>

              <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Lépj be a versenyek világába, építsd fel a saját csapatodat, és
                mutasd meg mindenkinek, hogy mire vagy képes. A dicsőség csak
                egy kattintásra van.
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-4">
                {isAuthenticated ? (
                  <Button
                    asChild
                    size="lg"
                    className="h-14 min-w-[200px] rounded-full bg-white text-base font-bold text-black hover:bg-gray-200 hover:scale-105 transition-all duration-300"
                  >
                    <Link to="/teams/create">Csapat létrehozása</Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      onClick={login}
                      className="h-14 min-w-[200px] rounded-full bg-white text-base font-bold text-black hover:bg-gray-200 hover:scale-105 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                    >
                      Bejelentkezés
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-14 min-w-[200px] rounded-full border-white/10 bg-white/5 text-base font-bold text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                    >
                      <Link to="/tournaments">Versenyek</Link>
                    </Button>
                  </>
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
