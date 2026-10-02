import { Link } from "react-router-dom";
import {
  Trophy,
  Users,
  Monitor,
  ArrowRight,
  Shield,
  Zap,
  Swords,
  ChevronRight,
  Terminal,
  Activity,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchStats } from "../store/slices/statsSlice";
import { Skeleton } from "@/components/ui/skeleton";

export function HomePage() {
  const { isAuthenticated, login } = useAuth();
  const dispatch = useAppDispatch();
  const { data: stats, loading: statsLoading } = useAppSelector(
    (state) => state.stats
  );

  useEffect(() => {
    dispatch(fetchStats());
    const interval = setInterval(() => {
      dispatch(fetchStats());
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const statsData = [
    {
      code: "01",
      value: stats?.activeTournaments ?? 0,
      label: "Aktív Versenyek",
      unit: "Bajnokság",
      url: "/tournaments",
      icon: <Trophy className="h-4 w-4 text-primary" />,
    },
    {
      code: "02",
      value: stats?.registeredUsers ?? 0,
      label: "Igazolt Játékosok",
      unit: "Diák",
      url: "/leaderboards",
      icon: <Users className="h-4 w-4 text-accent" />,
    },
    {
      code: "03",
      value: stats?.createdTeams ?? 0,
      label: "Bejegyzett Csapatok",
      unit: "Formáció",
      url: "/teams",
      icon: <Swords className="h-4 w-4 text-primary" />,
    },
    {
      code: "04",
      value: stats?.playedMatches ?? 0,
      label: "Lejátszott Mérkőzések",
      unit: "Mérkőzés",
      url: "/tournaments",
      icon: <Activity className="h-4 w-4 text-emerald-400" />,
    },
  ];

  const pillars = [
    {
      badge: "VERSENYRENDSZER",
      title: "Automata Ágrajz & Svájci Lebonyolítás",
      description:
        "Valós idejű bracket generálás, single és double elimination formátumok, automatikus pontszámítás és eredménykezelés.",
      link: "/tournaments",
      linkText: "Bajnokságok böngészése",
      icon: <Trophy className="h-6 w-6 text-primary" />,
      accentBorder: "hover:border-primary/60",
    },
    {
      badge: "ESPORT TEREM",
      title: "Gépfoglalás & Tanulmányi Időkeret",
      description:
        "10 db csúcskategóriás gamer konfiguráció az iskola esport laborjában. Foglalj gépet edzéshez vagy hivatalos meccsekhez.",
      link: "/booking",
      linkText: "Időpont foglalása",
      icon: <Monitor className="h-6 w-6 text-accent" />,
      accentBorder: "hover:border-accent/60",
    },
    {
      badge: "HIVATALOS RANGLISTA",
      title: "Iskolai Teljesítményrangsor",
      description:
        "Győzelmek és mérkőzés statisztikák alapján összeállított rangsor. Hódítsd meg a Pollák ranglistáját diáktársaiddal!",
      link: "/leaderboards",
      linkText: "Ranglista megtekintése",
      icon: <Shield className="h-6 w-6 text-amber-400" />,
      accentBorder: "hover:border-amber-400/60",
    },
    {
      badge: "SQUAD HUB",
      title: "Csapatépítés & Steam Integráció",
      description:
        "Alapíts csapatot diáktársaiddal, szinkronizáld a Steam profilodat, kövesd a közös meccselőzményeket és a statisztikákat.",
      link: "/teams",
      linkText: "Csapatok felfedezése",
      icon: <Users className="h-6 w-6 text-emerald-400" />,
      accentBorder: "hover:border-emerald-400/60",
    },
  ];

  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Platform Status Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4 pt-2">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            POLLÁK ANTAL TECHNIKUM <span className="text-border mx-1">|</span> ESPORTHUB BÖNGÉSZŐ
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <span className="hidden sm:inline">SZERVER: ONLINE</span>
          <span className="hidden sm:inline text-border">/</span>
          <span>10 PC ELÉRHETŐ</span>
          <span className="text-border">/</span>
          <Link to="/rules" className="hover:text-primary transition-colors">
            HÁZIREND [?]
          </Link>
        </div>
      </div>

      {/* Hero Section — Tactical Esports Arena */}
      <section className="relative grid grid-cols-1 gap-12 lg:grid-cols-12 items-center">
        {/* Left Column: Mission & Actions */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="inline-flex w-fit items-center gap-2 rounded border border-border bg-secondary/80 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
            <Terminal className="h-3.5 w-3.5" />
            <span>2026 TAVASZI SZEZON // OFFICIAL LEAGUE</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight text-foreground leading-[1.05]">
            LÉPJ BE AZ <span className="text-primary">ARÉNÁBA.</span>
            <br />
            VERSENYEZZ A <span className="text-accent">LEGJOBBAKKAL.</span>
          </h1>

          <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            A Pollák Antal Technikum hivatalos esport versenysorozata és laborfoglaló
            rendszere. Alapíts csapatot diáktársaiddal, regisztrálj az aktív kupákra, és
            küzdj meg a dicsőségért a 10 gépes esport laborban.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              asChild
              size="lg"
              className="h-12 px-6 rounded-md bg-primary hover:bg-primary/90 text-white font-display text-base font-bold uppercase tracking-wider shadow-sm transition-all"
            >
              <Link to="/tournaments" className="flex items-center gap-2 text-white">
                <Trophy className="h-4 w-4 text-white" />
                <span>Bajnokságok böngészése</span>
                <ArrowRight className="h-4 w-4 ml-1 text-white" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-6 rounded-md border-border bg-card hover:bg-secondary text-foreground font-display text-base font-bold uppercase tracking-wider transition-all"
            >
              <Link to="/booking" className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-accent" />
                Gépfoglalás
              </Link>
            </Button>

            {!isAuthenticated && (
              <Button
                variant="ghost"
                onClick={login}
                className="h-12 px-5 font-mono text-sm text-muted-foreground hover:text-foreground"
              >
                [ Belépés Keycloak fiókkal ]
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: Tactical Live Telemetry Radar Card */}
        <div className="lg:col-span-5">
          <div className="relative rounded-lg border border-border bg-card p-6 shadow-xl overflow-hidden">
            {/* Corner Tactical Marks */}
            <div className="absolute top-2 left-2 text-[10px] font-mono text-muted-foreground/60 select-none">
              +-- HUD.01
            </div>
            <div className="absolute top-2 right-2 text-[10px] font-mono text-emerald-400/80 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  KIEMELT SZEZON INFORMÁCIÓ
                </span>
                <span className="font-mono text-xs text-primary font-bold">
                  S26 // POLLÁK CUP
                </span>
              </div>

              {/* Tournament Match Preview Container */}
              <div className="rounded-md border border-border/80 bg-background/60 p-4">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
                  <span>HIVATALOS FORMÁTUM</span>
                  <span className="text-foreground font-semibold">5v5 / DOUBLE ELIM.</span>
                </div>
                <div className="text-xl font-display font-bold uppercase text-foreground">
                  Pollák Tavaszi Esport Bajnokság
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minden mérkőzés az iskola esport termében és online közvetítésben zajlik.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs font-mono">
                  <div className="bg-secondary/60 p-2 rounded">
                    <span className="text-muted-foreground block text-[10px]">HELYSZÍN</span>
                    <span className="text-foreground font-bold">Esport Terem (10 PC)</span>
                  </div>
                  <div className="bg-secondary/60 p-2 rounded">
                    <span className="text-muted-foreground block text-[10px]">DÍJAZÁS</span>
                    <span className="text-amber-400 font-bold">Kupa & Érmek</span>
                  </div>
                </div>
              </div>

              {/* Lab Status Quick Feed */}
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-xs font-mono">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-accent" />
                  GÉPTEREM ÁLLAPOT:
                </span>
                <span className="text-emerald-400 font-semibold">FOGLALÁSOK AKTÍVAK</span>
              </div>

              <Button
                asChild
                className="w-full h-10 rounded bg-secondary hover:bg-secondary/80 text-foreground font-display font-bold uppercase tracking-wider text-sm border border-border"
              >
                <Link to="/tournaments" className="flex items-center justify-center gap-2">
                  Aktuális bajnokság megtekintése
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Telemetry / Live Metrics Section */}
      <section className="relative">
        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-2">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            TELEMETRIA // VALÓS IDEJŰ STATISZTIKÁK
          </h2>
          <span className="font-mono text-xs text-muted-foreground">AUTO-REFRESH 30s</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <Skeleton className="h-4 w-20 mb-3 bg-secondary" />
                  <Skeleton className="h-10 w-28 mb-2 bg-secondary" />
                  <Skeleton className="h-3 w-36 bg-secondary" />
                </div>
              ))
            : statsData.map((stat) => (
                <Link
                  key={stat.code}
                  to={stat.url}
                  className="group relative rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:border-primary/60 hover:bg-card/90"
                >
                  <div className="flex items-center justify-between text-muted-foreground mb-2">
                    <span className="font-mono text-xs text-muted-foreground/80">
                      [{stat.code}]
                    </span>
                    <span className="transition-transform group-hover:scale-110">
                      {stat.icon}
                    </span>
                  </div>

                  <div className="font-mono text-3xl sm:text-4xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {stat.value.toLocaleString("hu-HU")}
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                    <span className="font-display font-semibold uppercase text-muted-foreground group-hover:text-foreground transition-colors">
                      {stat.label}
                    </span>
                    <span className="font-mono text-muted-foreground/60 text-[11px]">
                      {stat.unit}
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </section>

      {/* Platform Pillars Section */}
      <section className="flex flex-col gap-6">
        <div className="border-b border-border/60 pb-3">
          <div className="font-mono text-xs uppercase tracking-widest text-primary mb-1">
            // FUNKCIÓK & RENDSZEREK
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-foreground">
            A Pollák Esport Ökoszisztéma
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pillars.map((pillar, idx) => (
            <Link
              key={idx}
              to={pillar.link}
              className={`group flex flex-col justify-between rounded-lg border border-border bg-card p-6 transition-all duration-200 ${pillar.accentBorder}`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-block rounded border border-border bg-secondary px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                    {pillar.badge}
                  </span>
                  <div className="rounded p-2 bg-secondary/80 group-hover:bg-secondary transition-colors">
                    {pillar.icon}
                  </div>
                </div>

                <h3 className="font-display text-xl font-bold uppercase text-foreground group-hover:text-primary transition-colors mb-2">
                  {pillar.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-primary group-hover:underline">
                {pillar.linkText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Community & Discord Station */}
      <section className="rounded-lg border border-border bg-card p-8 lg:p-10 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#5865F2]/20 border border-[#5865F2]/30 px-2.5 py-0.5 font-mono text-xs uppercase tracking-wider text-[#5865F2] font-semibold">
                COMMUNITY HUB
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                DISCORD SZERVER
              </span>
            </div>

            <h2 className="font-display text-2xl sm:text-4xl font-bold uppercase text-foreground leading-tight">
              Csatlakozz a Pollák Esport Közösséghez
            </h2>

            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
              Közvetlen kapcsolat a versenybírókkal és szervezőkkel, csapatkereső
              csatornák, automata meccsértesítések és baráti mérkőzések.
              A szerver az iskola hivatalos virtuális klubháza.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                asChild
                className="h-11 px-6 rounded bg-[#5865F2] hover:bg-[#4752C4] text-white font-display text-sm font-bold uppercase tracking-wider transition-all"
              >
                <a
                  href="https://discord.gg/BsAz7YqjWx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
                  </svg>
                  Belépés a Discord szerverre
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-11 px-5 border-border bg-secondary hover:bg-secondary/80 font-display text-sm font-bold uppercase tracking-wider"
              >
                <Link to="/rules">Versenyszabályzat olvasása</Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-center">
            <div className="w-full max-w-[320px] rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs">
              <div className="text-muted-foreground uppercase mb-2 border-b border-border pb-1">
                // SZABÁLYZATI IRÁNYELVEK
              </div>
              <ul className="space-y-2 text-muted-foreground text-[12px]">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">01.</span>
                  <span>Sportszerű magatartás és Fair Play kötelezettség.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">02.</span>
                  <span>Érvényes Pollák diák jogviszony a versenyeken.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">03.</span>
                  <span>Géptermi eszközök kímélése és rendbetétele.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final Action Strip */}
      <section className="rounded-lg border border-border bg-secondary/40 p-8 sm:p-12 text-center flex flex-col items-center gap-4">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          // KÉSZEN ÁLLSZ A MEGMEKKETTETÉSRE?
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-bold uppercase text-foreground max-w-2xl">
          Építsd Fel a Csapatodat és Hódítsd Meg a Bajnokságot
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
          Csatlakozz a bajnokságokhoz, kövesd az élő meccseket és képviseld az
          osztályodat a Pollák Esport Ligában.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="h-12 px-8 rounded-md bg-primary hover:bg-primary/90 text-white font-display text-base font-bold uppercase tracking-wider"
          >
            <Link to="/tournaments" className="text-white">Bajnokságok listája</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 px-8 rounded-md border-border bg-card hover:bg-secondary font-display text-base font-bold uppercase tracking-wider"
          >
            <Link to="/teams">Csapat létrehozása</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
