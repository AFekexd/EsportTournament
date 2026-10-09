import { useState, useEffect } from "react";
import {
  X,
  Save,
  Trophy,
  Users,
  User,
  Calendar,
  Shield,
  Gamepad2,
  Tv,
  AlertCircle,
  Swords,
  Sparkles,
  Check,
  Hash,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { updateTournament } from "../../store/slices/tournamentsSlice";
import { fetchGames } from "../../store/slices/gamesSlice";
import type { Tournament } from "../../types";
import { ImageUpload } from "../common/ImageUpload";
import { toast } from "sonner";

interface TournamentEditModalProps {
  tournament: Tournament;
  onClose: () => void;
}

const statusOptions: {
  value: Tournament["status"];
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
}[] = [
  {
    value: "DRAFT",
    label: "Piszkozat",
    badgeClass: "text-muted-foreground border-border bg-secondary/60",
    dotClass: "bg-muted-foreground",
    description: "Csak az adminok és szervezők látják, készülőben lévő verseny",
  },
  {
    value: "REGISTRATION",
    label: "Regisztráció nyitva",
    badgeClass: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    dotClass: "bg-emerald-400 animate-pulse",
    description: "Bárki nevezhet határidőig, csapatok vagy egyéni játékosok jelentkezhetnek",
  },
  {
    value: "IN_PROGRESS",
    label: "Folyamatban",
    badgeClass: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    dotClass: "bg-amber-400",
    description: "A verseny már zajlik, a meccsek játszhatók",
  },
  {
    value: "COMPLETED",
    label: "Befejezett",
    badgeClass: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    dotClass: "bg-cyan-400",
    description: "A verseny hivatalosan lezárult, eredmények kihirdetve",
  },
  {
    value: "CANCELLED",
    label: "Törölve",
    badgeClass: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    dotClass: "bg-rose-400",
    description: "A bajnokság törölve lett",
  },
];

const formatOptions = [
  {
    value: "SINGLE_ELIMINATION",
    label: "Egyenes kieséses",
    sub: "Single Elimination",
    desc: "A vesztes csapat vagy játékos azonnal búcsúzik a tornától.",
  },
  {
    value: "DOUBLE_ELIMINATION",
    label: "Dupla kieséses",
    sub: "Double Elimination",
    desc: "Vigaszágas rendszer, két vereség után esik csak ki a résztvevő.",
  },
  {
    value: "ROUND_ROBIN",
    label: "Körmérkőzés",
    sub: "Round Robin",
    desc: "Minden csapat játszik mindegyik ellen a csoportban.",
  },
  {
    value: "SWISS",
    label: "Svájci rendszer",
    sub: "Swiss System",
    desc: "Azonos mérleggel és pontszámmal álló felek mérkőznek fordulóról fordulóra.",
  },
];

const seedingOptions = [
  {
    value: "STANDARD",
    label: "Standard (Ranglista / ELO)",
    desc: "1v8, 2v7 kiemelési séma a legmagasabb rangok szerint.",
  },
  {
    value: "SEQUENTIAL",
    label: "Szekvenciális (Sorrendi)",
    desc: "1v2, 3v4 egymás utáni regisztrációs sorrendben.",
  },
  {
    value: "RANDOM",
    label: "Véletlenszerű (Shuffle)",
    desc: "Teljesen véletlenszerű összekerülés kiemelés nélkül.",
  },
];

const teamSizePresets = [
  { value: 2, label: "2v2", sub: "Duó" },
  { value: 3, label: "3v3", sub: "Trió" },
  { value: 4, label: "4v4", sub: "Négyes" },
  { value: 5, label: "5v5", sub: "Standard Csapat" },
  { value: 6, label: "6v6", sub: "Bővített" },
];

const maxTeamsPresets = [4, 8, 16, 32, 64];

export function TournamentEditModal({
  tournament,
  onClose,
}: TournamentEditModalProps) {
  const dispatch = useAppDispatch();
  const { updateLoading } = useAppSelector((state) => state.tournaments);
  const { games } = useAppSelector((state) => state.games);

  // Helper to format date local string for datetime-local input
  const formatDateForInput = (dateString: string | undefined | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const isInitiallyIndividual =
    tournament.teamSize === 1 ||
    (!tournament.teamSize && tournament.game?.teamSize === 1);

  const initialTeamSize = isInitiallyIndividual
    ? 1
    : tournament.teamSize && tournament.teamSize >= 2
    ? tournament.teamSize
    : tournament.game?.teamSize && tournament.game.teamSize >= 2
    ? tournament.game.teamSize
    : 2;

  const [formData, setFormData] = useState({
    name: tournament.name,
    description: tournament.description || "",
    imageUrl: tournament.imageUrl || "",
    status: tournament.status,
    format: tournament.format,
    maxTeams: tournament.maxTeams,
    startDate: formatDateForInput(tournament.startDate),
    endDate: tournament.endDate ? formatDateForInput(tournament.endDate) : "",
    registrationDeadline: formatDateForInput(tournament.registrationDeadline),
    hasQualifier: tournament.hasQualifier || false,
    qualifierMatches: tournament.qualifierMatches || 10,
    qualifierMinPoints: tournament.qualifierMinPoints || 50,
    seedingMethod: tournament.seedingMethod || "STANDARD",
    participationType: isInitiallyIndividual ? "INDIVIDUAL" : "TEAM",
    teamSize: initialTeamSize,
    requireRank:
      tournament.requireRank !== undefined ? tournament.requireRank : true,
    streamUrl: tournament.streamUrl || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (games.length === 0) {
      dispatch(fetchGames());
    }
  }, [dispatch, games.length]);

  // Lock body scroll while modal is open & listen for Escape
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name =
        "A verseny nevének legalább 3 karakter hosszúnak kell lennie";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Kérlek add meg a verseny kezdési dátumát";
    }
    if (!formData.registrationDeadline) {
      newErrors.registrationDeadline =
        "Kérlek add meg a jelentkezési határidőt";
    }
    if (formData.maxTeams < 2) {
      newErrors.maxTeams = "Legalább 2 résztvevő / csapat szükséges";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Kérlek javítsd a megjelölt hibákat a folytatás előtt!");
      return;
    }

    const calculatedTeamSize =
      formData.participationType === "INDIVIDUAL"
        ? 1
        : Number(formData.teamSize) >= 2
        ? Number(formData.teamSize)
        : 2;

    try {
      await dispatch(
        updateTournament({
          id: tournament.id,
          data: {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            imageUrl: formData.imageUrl || undefined,
            status: formData.status,
            format: formData.format,
            maxTeams: Number(formData.maxTeams),
            startDate: formData.startDate,
            endDate: formData.endDate || undefined,
            registrationDeadline: formData.registrationDeadline,
            hasQualifier: formData.hasQualifier,
            qualifierMatches: formData.hasQualifier
              ? Number(formData.qualifierMatches)
              : 0,
            qualifierMinPoints: formData.hasQualifier
              ? Number(formData.qualifierMinPoints)
              : 0,
            seedingMethod: formData.seedingMethod as any,
            teamSize: calculatedTeamSize,
            requireRank: formData.requireRank,
            streamUrl: formData.streamUrl.trim() || undefined,
          },
        }),
      ).unwrap();

      toast.success("A verseny adatai sikeresen frissítve!");
      onClose();
    } catch (err: any) {
      console.error("Failed to update tournament:", err);
      toast.error(err?.message || "Nem sikerült frissíteni a versenyt");
    }
  };

  const isSolo = formData.participationType === "INDIVIDUAL";
  const displayTeamSize = isSolo ? 1 : formData.teamSize >= 2 ? formData.teamSize : 2;

  return (
    <div className="fixed inset-0 z-[100] bg-[#070A10] flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. TOP STICKY HEADER                                     */}
      {/* ======================================================== */}
      <header className="h-16 shrink-0 bg-[#0B0F17]/95 border-b border-border/80 px-4 sm:px-8 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 transition-colors font-mono text-xs uppercase tracking-wider"
            title="Bezárás (Esc)"
          >
            <X size={16} />
            <span className="hidden sm:inline">Bezárás</span>
          </button>

          <div className="h-5 w-px bg-border/60 hidden sm:block" />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Trophy size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wider text-foreground truncate">
                  Verseny szerkesztése
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 uppercase">
                  {tournament.game?.name || "Verseny"}
                </span>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground truncate hidden sm:block">
                {tournament.name}
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-foreground font-mono text-xs uppercase tracking-wider font-semibold transition-colors"
          >
            Mégse
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs sm:text-sm uppercase tracking-wider font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Mentés...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Változtatások mentése</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN SCROLLABLE CONTENT BODY                          */}
      {/* ======================================================== */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 custom-scrollbar">
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ==================================================== */}
            {/* LEFT COLUMN: MAIN CONFIGURATION (8 cols)             */}
            {/* ==================================================== */}
            <div className="lg:col-span-8 space-y-8">
              {/* CARD 1: ALAPADATOK ÉS ÁLLAPOT */}
              <section className="bg-[#0B0F17]/90 border border-border/80 rounded-xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Trophy size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-display font-bold uppercase tracking-wider text-foreground">
                        Alapadatok & Státusz
                      </h2>
                      <p className="text-xs font-mono text-muted-foreground">
                        A bajnokság neve, leírása és az aktuális lebonyolítási státusza
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest hidden sm:inline">
                    LÉPÉS 01
                  </span>
                </div>

                {/* Verseny neve */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="edit-tournament-name"
                      className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold"
                    >
                      Verseny neve <span className="text-destructive">*</span>
                    </label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {formData.name.length}/100
                    </span>
                  </div>
                  <input
                    id="edit-tournament-name"
                    type="text"
                    className={`w-full h-12 px-4 bg-secondary/60 hover:bg-secondary/80 focus:bg-secondary border ${
                      errors.name ? "border-destructive ring-1 ring-destructive" : "border-border"
                    } rounded-lg text-foreground font-sans text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all shadow-inner`}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Pl.: Pollák Tavaszi CS2 Kupa"
                    maxLength={100}
                  />
                  {errors.name && (
                    <p className="text-destructive text-xs font-mono mt-1.5 flex items-center gap-1.5">
                      <AlertCircle size={13} /> {errors.name}
                    </p>
                  )}
                </div>

                {/* Státusz választó */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                    Verseny státusza <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {statusOptions.map((opt) => {
                      const isSelected = formData.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              status: opt.value,
                            })
                          }
                          className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between gap-1.5 group ${
                            isSelected
                              ? `${opt.badgeClass} ring-1 ring-primary/40 shadow-sm`
                              : "bg-secondary/40 border-border/70 hover:bg-secondary/70 hover:border-border text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                              <span className={isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}>
                                {opt.label}
                              </span>
                            </span>
                            {isSelected && <Check size={14} className="text-primary" />}
                          </div>
                          <span className="text-[11px] font-sans text-muted-foreground line-clamp-2">
                            {opt.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Leírás */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="edit-tournament-description"
                      className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold"
                    >
                      Verseny leírása és részletei
                    </label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {formData.description.length}/500
                    </span>
                  </div>
                  <textarea
                    id="edit-tournament-description"
                    className="w-full min-h-[110px] p-4 bg-secondary/60 hover:bg-secondary/80 focus:bg-secondary border border-border rounded-lg text-foreground font-sans text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all resize-y shadow-inner leading-relaxed"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Írd le a bajnokság célját, jutalmakat, szabályokat és lebonyolítást..."
                    rows={4}
                    maxLength={500}
                  />
                </div>
              </section>

              {/* CARD 2: FORMÁTUM ÉS RÉSZVÉTEL */}
              <section className="bg-[#0B0F17]/90 border border-border/80 rounded-xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Swords size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-display font-bold uppercase tracking-wider text-foreground">
                        Formátum & Részvételi Mód
                      </h2>
                      <p className="text-xs font-mono text-muted-foreground">
                        Egyéni (1v1) vagy csapatos verseny, pontos csapatmérettel és ágrajzzal
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest hidden sm:inline">
                    LÉPÉS 02
                  </span>
                </div>

                {/* Játék fix kijelzése */}
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/70 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    {tournament.game?.imageUrl ? (
                      <img
                        src={tournament.game.imageUrl}
                        alt={tournament.game.name}
                        className="w-12 h-12 rounded-lg object-cover border border-border shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center border border-border text-muted-foreground">
                        <Gamepad2 size={24} />
                      </div>
                    )}
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                        Kiválasztott játék
                      </span>
                      <span className="font-display font-bold text-base text-foreground tracking-wide">
                        {tournament.game?.name || "Ismeretlen játék"}
                      </span>
                    </div>
                  </div>

                  <span className="font-mono text-xs px-3 py-1 rounded bg-secondary/70 border border-border text-muted-foreground">
                    Nem módosítható
                  </span>
                </div>

                {/* Részvétel Típusa: Nagy Interaktív Kártyák */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">
                    Részvétel formája <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Egyéni (1v1) */}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          participationType: "INDIVIDUAL",
                          teamSize: 1,
                        }))
                      }
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-4 group ${
                        formData.participationType === "INDIVIDUAL"
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/5 ring-1 ring-cyan-500/30"
                          : "bg-secondary/40 border-border/80 hover:bg-secondary/70 hover:border-border text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-lg border ${
                          formData.participationType === "INDIVIDUAL"
                            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                            : "bg-secondary border-border text-muted-foreground"
                        }`}
                      >
                        <User size={22} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold uppercase tracking-wider text-foreground text-sm">
                            Egyéni (1v1) Párbaj
                          </span>
                          {formData.participationType === "INDIVIDUAL" && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          )}
                        </div>
                        <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                          A diákok önállóan, egyéni játékosként indulnak. Nincs csapatkapitány és csapattagság követelmény.
                        </p>
                      </div>
                    </button>

                    {/* Csapatverseny */}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          participationType: "TEAM",
                          teamSize: prev.teamSize >= 2 ? prev.teamSize : 2,
                        }))
                      }
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-4 group ${
                        formData.participationType === "TEAM"
                          ? "bg-purple-500/10 border-purple-500 text-purple-400 shadow-md shadow-purple-500/5 ring-1 ring-purple-500/30"
                          : "bg-secondary/40 border-border/80 hover:bg-secondary/70 hover:border-border text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-lg border ${
                          formData.participationType === "TEAM"
                            ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                            : "bg-secondary border-border text-muted-foreground"
                        }`}
                      >
                        <Users size={22} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold uppercase tracking-wider text-foreground text-sm">
                            Csapatos Bajnokság
                          </span>
                          {formData.participationType === "TEAM" && (
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                          )}
                        </div>
                        <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                          Többfős csapatok viadala. A csapatkapitány regisztrálja a csapatot és választja ki az induló tagokat.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Csapatméret választó chip lista (ha csapat) */}
                {formData.participationType === "TEAM" && (
                  <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-mono uppercase tracking-wider text-purple-300 font-semibold">
                        Csapatméret (fő / csapat) <span className="text-destructive">*</span>
                      </label>
                      <span className="text-xs font-mono text-purple-400 font-bold">
                        Aktív: {displayTeamSize}v{displayTeamSize}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {teamSizePresets.map((preset) => {
                        const isSelected = displayTeamSize === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                teamSize: preset.value,
                              }))
                            }
                            className={`p-3 rounded-lg border text-center transition-all font-mono ${
                              isSelected
                                ? "bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-500/30"
                                : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border-border"
                            }`}
                          >
                            <span className="text-base font-bold block">{preset.label}</span>
                            <span className={`text-[10px] uppercase tracking-wider block ${isSelected ? "text-purple-100" : "text-muted-foreground"}`}>
                              {preset.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lebonyolítási Formátum & Kiemelés Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Formátum */}
                  <div>
                    <label
                      htmlFor="edit-tournament-format"
                      className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2"
                    >
                      Bajnokság Lebonyolítása <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="edit-tournament-format"
                      className="w-full h-12 px-4 bg-secondary/60 hover:bg-secondary/80 focus:bg-secondary border border-border rounded-lg text-foreground font-sans text-sm focus:outline-none focus:border-primary transition-all cursor-pointer"
                      value={formData.format}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          format: e.target.value as Tournament["format"],
                        })
                      }
                    >
                      {formatOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0B0F17] py-2">
                          {opt.label} ({opt.sub})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs font-sans text-muted-foreground mt-1.5 leading-relaxed">
                      {formatOptions.find((f) => f.value === formData.format)?.desc}
                    </p>
                  </div>

                  {/* Kiemelés */}
                  <div>
                    <label
                      htmlFor="edit-tournament-seeding"
                      className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2"
                    >
                      Kiemelési Módszer (Seeding) <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="edit-tournament-seeding"
                      className="w-full h-12 px-4 bg-secondary/60 hover:bg-secondary/80 focus:bg-secondary border border-border rounded-lg text-foreground font-sans text-sm focus:outline-none focus:border-primary transition-all cursor-pointer"
                      value={formData.seedingMethod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          seedingMethod: e.target.value as any,
                        })
                      }
                    >
                      {seedingOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0B0F17] py-2">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs font-sans text-muted-foreground mt-1.5 leading-relaxed">
                      {seedingOptions.find((s) => s.value === formData.seedingMethod)?.desc}
                    </p>
                  </div>
                </div>
              </section>

              {/* CARD 3: IDŐPONTOK ÉS FÉRŐHELYEK */}
              <section className="bg-[#0B0F17]/90 border border-border/80 rounded-xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-display font-bold uppercase tracking-wider text-foreground">
                        Időzítés & Létszámkeret
                      </h2>
                      <p className="text-xs font-mono text-muted-foreground">
                        Határidők, kezdési időpont és a maximálisan fogadható csapatok/fők
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest hidden sm:inline">
                    LÉPÉS 03
                  </span>
                </div>

                {/* Max férőhelyek & Presetek */}
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label
                      htmlFor="edit-tournament-maxTeams"
                      className="block text-xs font-mono uppercase tracking-wider text-foreground font-semibold flex items-center gap-1.5"
                    >
                      <Hash size={14} className="text-primary" />
                      Maximális férőhely:{" "}
                      <span className="text-primary font-bold">
                        {isSolo ? "Játékosok száma (fő)" : "Csapatok száma (csapat)"}
                      </span>
                      <span className="text-destructive">*</span>
                    </label>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-muted-foreground uppercase mr-1">
                        Gyors:
                      </span>
                      {maxTeamsPresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormData({ ...formData, maxTeams: preset })}
                          className={`px-2.5 py-1 rounded font-mono text-xs font-bold transition-colors ${
                            formData.maxTeams === preset
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      id="edit-tournament-maxTeams"
                      type="number"
                      className={`w-full h-12 px-4 bg-secondary/80 border ${
                        errors.maxTeams ? "border-destructive" : "border-border"
                      } rounded-lg text-foreground font-mono text-lg font-bold focus:outline-none focus:border-primary transition-all`}
                      value={formData.maxTeams}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxTeams: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      min={2}
                      max={256}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs uppercase tracking-wider text-muted-foreground pointer-events-none">
                      {isSolo ? "egyéni játékos" : "csapat"}
                    </span>
                  </div>
                  {errors.maxTeams && (
                    <p className="text-destructive text-xs font-mono">{errors.maxTeams}</p>
                  )}
                </div>

                {/* Időpontok Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Jelentkezési határidő */}
                  <div>
                    <label
                      htmlFor="edit-tournament-regDeadline"
                      className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2"
                    >
                      Jelentkezési határidő <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="edit-tournament-regDeadline"
                      type="datetime-local"
                      className={`w-full h-12 px-4 bg-secondary/60 hover:bg-secondary/80 focus:bg-secondary border ${
                        errors.registrationDeadline ? "border-destructive ring-1 ring-destructive" : "border-border"
                      } rounded-lg text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-all cursor-pointer`}
                      value={formData.registrationDeadline}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registrationDeadline: e.target.value,
                        })
                      }
                      onClick={(e) => e.currentTarget.showPicker?.()}
                    />
                    {errors.registrationDeadline ? (
                      <p className="text-destructive text-xs font-mono mt-1.5 flex items-center gap-1.5">
                        <AlertCircle size={13} /> {errors.registrationDeadline}
                      </p>
                    ) : (
                      <p className="text-xs font-sans text-muted-foreground mt-1.5">
                        Ezen időpont után nem fogad új nevezéseket a rendszer.
                      </p>
                    )}
                  </div>

                  {/* Kezdési dátum */}
                  <div>
                    <label
                      htmlFor="edit-tournament-startDate"
                      className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2"
                    >
                      Verseny kezdési dátuma <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="edit-tournament-startDate"
                      type="datetime-local"
                      className={`w-full h-12 px-4 bg-secondary/60 hover:bg-secondary/80 focus:bg-secondary border ${
                        errors.startDate ? "border-destructive ring-1 ring-destructive" : "border-border"
                      } rounded-lg text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-all cursor-pointer`}
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      onClick={(e) => e.currentTarget.showPicker?.()}
                    />
                    {errors.startDate ? (
                      <p className="text-destructive text-xs font-mono mt-1.5 flex items-center gap-1.5">
                        <AlertCircle size={13} /> {errors.startDate}
                      </p>
                    ) : (
                      <p className="text-xs font-sans text-muted-foreground mt-1.5">
                        A bajnoki meccsek hivatalos rajtjának időpontja.
                      </p>
                    )}
                  </div>
                </div>

                {/* Befejezési dátum (opcionális) */}
                <div>
                  <label
                    htmlFor="edit-tournament-endDate"
                    className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2"
                  >
                    Várható befejezési dátum (opcionális)
                  </label>
                  <input
                    id="edit-tournament-endDate"
                    type="datetime-local"
                    className="w-full h-12 px-4 bg-secondary/60 hover:bg-secondary/80 focus:bg-secondary border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-all cursor-pointer"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    onClick={(e) => e.currentTarget.showPicker?.()}
                  />
                  <p className="text-xs font-sans text-muted-foreground mt-1.5">
                    Ha többnapos vagy hétvégi a kupa, itt adható meg a záróesemény időpontja.
                  </p>
                </div>
              </section>

              {/* CARD 4: SZABÁLYOK ÉS SELEJTEZŐ */}
              <section className="bg-[#0B0F17]/90 border border-border/80 rounded-xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-display font-bold uppercase tracking-wider text-foreground">
                        Követelmények & Selejtező
                      </h2>
                      <p className="text-xs font-mono text-muted-foreground">
                        Hitelesített rangkövetelmény és selejtező fordulók kezelése
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest hidden sm:inline">
                    LÉPÉS 04
                  </span>
                </div>

                {/* Rang Hitelesítés Switch Card */}
                <div
                  className={`p-5 rounded-xl border transition-all flex items-start gap-4 cursor-pointer select-none ${
                    formData.requireRank
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-secondary/30 border-border"
                  }`}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      requireRank: !prev.requireRank,
                    }))
                  }
                >
                  <div className="pt-0.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.requireRank}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        formData.requireRank ? "bg-amber-500" : "bg-secondary/90 border border-border"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.requireRank ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display font-bold uppercase tracking-wider text-foreground text-sm">
                        Rang-Hitelesítés Követelmény
                      </span>
                      {formData.requireRank && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Aktív
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                      Ha be van kapcsolva, csak azok a diákok nevezhetnek a versenyre, akiknek a profiljában a választott játékhoz érvényes, beállított rang tartozik.
                    </p>
                  </div>
                </div>

                {/* Selejtező Kör Switch Card */}
                <div
                  className={`p-5 rounded-xl border transition-all space-y-4 ${
                    formData.hasQualifier
                      ? "bg-primary/10 border-primary/40"
                      : "bg-secondary/30 border-border"
                  }`}
                >
                  <div
                    className="flex items-start gap-4 cursor-pointer select-none"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        hasQualifier: !prev.hasQualifier,
                      }))
                    }
                  >
                    <div className="pt-0.5">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.hasQualifier}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          formData.hasQualifier ? "bg-primary" : "bg-secondary/90 border border-border"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.hasQualifier ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display font-bold uppercase tracking-wider text-foreground text-sm">
                          Selejtező Kör (Qualifier Phase)
                        </span>
                        {formData.hasQualifier && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-primary/20 text-primary border border-primary/30">
                            Bekapcsolva
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                        A főtábla ágrajz generálása előtt selejtező meccseket ír elő, és a minimálisan elért pontszámok alapján engedi tovább a versenyzőket.
                      </p>
                    </div>
                  </div>

                  {/* Selejtező paraméterek ha aktív */}
                  {formData.hasQualifier && (
                    <div className="pt-4 border-t border-primary/20 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                      <div>
                        <label
                          htmlFor="edit-qualifier-matches"
                          className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold"
                        >
                          Kötelező meccsek száma
                        </label>
                        <input
                          id="edit-qualifier-matches"
                          type="number"
                          className="w-full h-11 px-4 bg-secondary/80 border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-all"
                          value={formData.qualifierMatches}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              qualifierMatches: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          min={1}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="edit-qualifier-points"
                          className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold"
                        >
                          Minimum bejutási pontszám
                        </label>
                        <input
                          id="edit-qualifier-points"
                          type="number"
                          className="w-full h-11 px-4 bg-secondary/80 border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-all"
                          value={formData.qualifierMinPoints}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              qualifierMinPoints: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          min={0}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* ==================================================== */}
            {/* RIGHT COLUMN: PREVIEW, MEDIA, & ACTIONS (4 cols)     */}
            {/* ==================================================== */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-4">
              {/* KÁRTYA: ÉLŐ HUD ELŐNÉZET */}
              <div className="bg-[#0B0F17]/90 border border-border/80 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="relative h-44 w-full bg-[#0E1522] overflow-hidden">
                  {formData.imageUrl || tournament.imageUrl || tournament.game?.imageUrl ? (
                    <img
                      src={formData.imageUrl || tournament.imageUrl || tournament.game?.imageUrl}
                      alt="Borító előnézet"
                      className="w-full h-full object-cover filter brightness-[0.6]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Trophy size={40} className="opacity-30" />
                      <span className="font-mono text-xs uppercase tracking-wider">
                        Nincs beállított kép
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-transparent to-transparent" />

                  {/* Mode Badge in preview */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-wider bg-black/80 text-foreground border border-white/10 backdrop-blur-md">
                      <Users size={12} className="text-primary" />
                      {isSolo ? "1v1 EGYÉNI" : `${displayTeamSize}v${displayTeamSize} CSAPAT`}
                    </span>
                  </div>

                  {/* Status in preview */}
                  <div className="absolute top-3 right-3">
                    {(() => {
                      const curStatus = statusOptions.find((s) => s.value === formData.status);
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${
                            curStatus?.badgeClass || ""
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${curStatus?.dotClass || ""}`} />
                          {curStatus?.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold block mb-1">
                      {tournament.game?.name || "Esport Játék"}
                    </span>
                    <h3 className="font-display font-extrabold text-lg uppercase text-foreground leading-snug line-clamp-2">
                      {formData.name || "Névtelen verseny"}
                    </h3>
                  </div>

                  {/* Summary list */}
                  <div className="space-y-2 pt-2 border-t border-border/60 font-mono text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Kapacitás:</span>
                      <span className="text-foreground font-bold">
                        {formData.maxTeams} {isSolo ? "játékos" : "csapat"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Formátum:</span>
                      <span className="text-foreground font-semibold">
                        {formatOptions.find((f) => f.value === formData.format)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Kezdés:</span>
                      <span className="text-foreground">
                        {formData.startDate ? new Date(formData.startDate).toLocaleDateString("hu-HU") : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KÁRTYA: BORÍTÓKÉP FELTÖLTÉS */}
              <div className="bg-[#0B0F17]/90 border border-border/80 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2 text-foreground font-display font-bold text-xs uppercase tracking-wider">
                  <Sparkles size={15} className="text-primary" />
                  <span>Egyedi Borítókép</span>
                </div>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(value) => setFormData({ ...formData, imageUrl: value })}
                  label="Verseny képe (opcionális)"
                  placeholder="https://example.com/banner.jpg"
                  maxSizeMB={15}
                />
              </div>

              {/* KÁRTYA: STREAM URL */}
              <div className="bg-[#0B0F17]/90 border border-border/80 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-3">
                <div className="flex items-center gap-2 text-foreground font-display font-bold text-xs uppercase tracking-wider">
                  <Tv size={15} className="text-cyan-400" />
                  <span>Élő Közvetítés (Stream)</span>
                </div>
                <div>
                  <input
                    id="edit-tournament-streamUrl"
                    type="text"
                    className="w-full h-11 px-3.5 bg-secondary/60 hover:bg-secondary/80 focus:bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground font-mono text-xs focus:outline-none focus:border-primary transition-all"
                    value={formData.streamUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, streamUrl: e.target.value })
                    }
                    placeholder="https://twitch.tv/... vagy YouTube link"
                  />
                  <p className="text-[11px] font-sans text-muted-foreground mt-1.5 leading-relaxed">
                    A verseny adatlapján közvetlenül beágyazva jelenik meg a közvetítés.
                  </p>
                </div>
              </div>

              {/* KÁRTYA: GYORS MŰVELETEK */}
              <div className="bg-[#0B0F17]/90 border border-border/80 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={updateLoading}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Mentés folyamatban...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Változtatások mentése</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-11 px-4 bg-secondary/60 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-lg font-mono text-xs uppercase tracking-wider font-semibold transition-colors"
                >
                  Mégse és bezárás
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
