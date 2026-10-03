import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { createMachine, updateMachine, bulkUpdateGames } from "../../store/slices/kioskSlice";
import { fetchGames, searchGlobalGames } from "../../store/slices/gamesSlice";
import {
    X,
    Save,
    Plus,
    Gamepad2,
    Check,
    Wrench,
    ShieldAlert,
    Monitor,
    Search,
    Globe,
    Loader2,
} from "lucide-react";
import type { Computer } from "../../types";
import { toast } from "sonner";

interface MachineEditModalProps {
    computer?: Computer | null;
    isOpen: boolean;
    onClose: () => void;
    existingMachines?: Computer[];
}

const COMMON_ESPORTS_GAMES = [
    "Counter-Strike 2",
    "Valorant",
    "League of Legends",
    "Rocket League",
    "Rainbow Six Siege",
    "EA Sports FC 24",
    "Fortnite",
    "Apex Legends",
    "Overwatch 2",
    "Dota 2",
    "Minecraft",
];

export function MachineEditModal({
    computer,
    isOpen,
    onClose,
    existingMachines = [],
}: MachineEditModalProps) {
    const dispatch = useAppDispatch();
    const { games, globalGames, globalLoading } = useAppSelector((state) => state.games);

    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [hostname, setHostname] = useState("");
    const [displayRow, setDisplayRow] = useState(1); // 1-based for user
    const [displayPosition, setDisplayPosition] = useState(1); // 1-based for user
    const [status, setStatus] = useState<"AVAILABLE" | "MAINTENANCE" | "OUT_OF_ORDER">("AVAILABLE");
    const [isActive, setIsActive] = useState(true);
    const [installedGames, setInstalledGames] = useState<string[]>([]);

    // RAWG Search State
    const [rawgSearchQuery, setRawgSearchQuery] = useState("");
    const [applyToRow, setApplyToRow] = useState(false);
    const [applyToAll, setApplyToAll] = useState(false);

    // Fetch tournament games list if empty
    useEffect(() => {
        if (isOpen && games.length === 0) {
            dispatch(fetchGames());
        }
    }, [isOpen, games.length, dispatch]);

    // Debounced RAWG search
    useEffect(() => {
        if (!isOpen || !rawgSearchQuery.trim()) {
            return;
        }

        const timer = setTimeout(() => {
            dispatch(searchGlobalGames(rawgSearchQuery.trim()));
        }, 350);

        return () => clearTimeout(timer);
    }, [rawgSearchQuery, isOpen, dispatch]);

    // Initialize or reset form state when modal opens or computer changes
    useEffect(() => {
        if (isOpen) {
            if (computer) {
                setName(computer.name || "");
                setHostname(computer.hostname || "");
                setDisplayRow((computer.row ?? 0) + 1);
                setDisplayPosition((computer.position ?? 0) + 1);
                setStatus(computer.status || "AVAILABLE");
                setIsActive(computer.isActive ?? true);
                setInstalledGames(computer.installedGames || []);
            } else {
                // Determine next suggested position
                const nextRow = existingMachines.length > 0 ? Math.max(...existingMachines.map((m) => m.row)) + 1 : 1;
                const computersInRow = existingMachines.filter((m) => m.row === nextRow - 1);
                const nextPos = computersInRow.length > 0 ? Math.max(...computersInRow.map((m) => m.position)) + 2 : 1;
                const nextNum = existingMachines.length + 1;

                setName(`PC-${nextNum.toString().padStart(2, "0")}`);
                setHostname("");
                setDisplayRow(nextRow > 0 ? nextRow : 1);
                setDisplayPosition(nextPos > 0 ? nextPos : 1);
                setStatus("AVAILABLE");
                setIsActive(true);
                // Default to top esports preset
                const defaultGames = ["Counter-Strike 2", "Valorant", "League of Legends"];
                setInstalledGames(defaultGames);
            }
            setRawgSearchQuery("");
            setApplyToRow(false);
            setApplyToAll(false);
        }
    }, [isOpen, computer, existingMachines]);

    // Prevent background scroll while modal is open
    useEffect(() => {
        if (!isOpen) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Toggle game in the installed list
    const toggleGame = (gameTitle: string) => {
        const trimmed = gameTitle.trim();
        if (!trimmed) return;

        if (installedGames.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
            setInstalledGames(installedGames.filter((g) => g.toLowerCase() !== trimmed.toLowerCase()));
        } else {
            setInstalledGames([...installedGames, trimmed]);
        }
    };

    // Add custom typed game
    const handleAddCustomGame = (gameName: string) => {
        const trimmed = gameName.trim();
        if (!trimmed) return;

        if (!installedGames.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
            setInstalledGames([...installedGames, trimmed]);
            toast.success(`"${trimmed}" hozzáadva a géphez!`);
        }
    };

    const handleSelectAllPlatformGames = () => {
        const allNames = Array.from(new Set([...installedGames, ...games.map((g) => g.name)]));
        setInstalledGames(allNames);
    };

    const handleClearGames = () => {
        setInstalledGames([]);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("A gép neve kötelező!");
            return;
        }

        const targetRow = Math.max(0, displayRow - 1);
        const targetPos = Math.max(0, displayPosition - 1);

        try {
            setIsLoading(true);

            const payload = {
                name: name.trim(),
                hostname: hostname.trim() || undefined,
                row: targetRow,
                position: targetPos,
                status,
                isActive,
                installedGames,
            };

            if (computer) {
                // Update machine
                await dispatch(updateMachine({ id: computer.id, ...payload })).unwrap();
                toast.success(`A(z) ${name} gép adatai sikeresen mentve!`);
            } else {
                // Create machine
                await dispatch(createMachine(payload)).unwrap();
                toast.success(`Új gép (${name}) sikeresen létrehozva!`);
            }

            // Handle bulk game propagation if requested
            if (applyToAll) {
                await dispatch(bulkUpdateGames({ installedGames })).unwrap();
                toast.success("Játéklista alkalmazva az összes gépre a teremben!");
            } else if (applyToRow) {
                await dispatch(bulkUpdateGames({ installedGames, row: targetRow })).unwrap();
                toast.success(`Játéklista alkalmazva a(z) ${displayRow}. sor összes gépére!`);
            }

            onClose();
        } catch (error: any) {
            console.error("Failed to save machine:", error);
            toast.error(error.message || "Hiba történt a gép mentése során");
        } finally {
            setIsLoading(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-[#0E131F] rounded-2xl w-full max-w-2xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 md:p-6 border-b border-border/80 bg-[#121824]/90">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-inner">
                            <Monitor size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-display font-bold uppercase tracking-wider text-foreground">
                                {computer ? `Munkaállomás szerkesztése: ${computer.name}` : "Új Munkaállomás hozzáadása"}
                            </h2>
                            <p className="text-xs font-mono text-muted-foreground">
                                {computer ? "Állapot, elhelyezkedés és egyedi telepített játékok kezelése" : "Új fizikai versenygép regisztrálása a laborban"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSave} className="overflow-y-auto p-5 md:p-6 space-y-6 flex-1 custom-scrollbar">
                    {/* 1. Alapadatok & Elhelyezkedés */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                                // 01. Alapadatok & Elhelyezkedés
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                                    Gép neve <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="pl. PC-01"
                                    className="w-full bg-[#121824] border border-border rounded-lg px-3.5 py-2 text-foreground font-mono text-sm focus:border-primary focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                                    Hálózati azonosító (Hostname)
                                </label>
                                <input
                                    type="text"
                                    value={hostname}
                                    onChange={(e) => setHostname(e.target.value)}
                                    placeholder="pl. pollak-pc01 (opcionális)"
                                    className="w-full bg-[#121824] border border-border rounded-lg px-3.5 py-2 text-foreground font-mono text-sm focus:border-primary focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Location: Row & Position */}
                        <div className="p-3.5 rounded-xl bg-[#121824]/60 border border-border/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                                    Sor elhelyezkedés
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        required
                                        value={displayRow}
                                        onChange={(e) => setDisplayRow(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-24 bg-[#0E131F] border border-border rounded-lg px-3 py-1.5 text-foreground font-mono text-sm focus:border-primary focus:outline-none"
                                    />
                                    <span className="text-xs font-mono text-muted-foreground">. Sor a színpadon</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                                    Pozíció / Asztal
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        required
                                        value={displayPosition}
                                        onChange={(e) => setDisplayPosition(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-24 bg-[#0E131F] border border-border rounded-lg px-3 py-1.5 text-foreground font-mono text-sm focus:border-primary focus:outline-none"
                                    />
                                    <span className="text-xs font-mono text-muted-foreground">. Asztal balról jobbra</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Állapot és Üzemkészültség */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                                // 02. Állapot & Foglalhatóság
                            </span>
                        </div>

                        {/* Status selector buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setStatus("AVAILABLE")}
                                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                    status === "AVAILABLE"
                                        ? "bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-400"
                                        : "bg-[#121824] border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-mono font-bold uppercase tracking-wider">Elérhető</span>
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                </div>
                                <span className="text-[11px] leading-tight opacity-80 font-mono">
                                    Üzemkész, foglalható
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setStatus("MAINTENANCE")}
                                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                    status === "MAINTENANCE"
                                        ? "bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 text-amber-400"
                                        : "bg-[#121824] border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-mono font-bold uppercase tracking-wider">Karbantartás</span>
                                    <Wrench size={14} className="text-amber-400" />
                                </div>
                                <span className="text-[11px] leading-tight opacity-80 font-mono">
                                    Frissítés vagy tesztelés alatt
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setStatus("OUT_OF_ORDER")}
                                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                    status === "OUT_OF_ORDER"
                                        ? "bg-red-500/15 border-red-500 ring-2 ring-red-500/30 text-red-400"
                                        : "bg-[#121824] border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-mono font-bold uppercase tracking-wider">Üzemen kívül</span>
                                    <ShieldAlert size={14} className="text-red-400" />
                                </div>
                                <span className="text-[11px] leading-tight opacity-80 font-mono">
                                    Nem működik, hibás
                                </span>
                            </button>
                        </div>

                        {/* Active toggle */}
                        <div
                            onClick={() => setIsActive(!isActive)}
                            className="flex items-center justify-between p-3.5 rounded-xl bg-[#121824] border border-border/80 cursor-pointer hover:border-primary/50 transition-colors"
                        >
                            <div>
                                <div className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                                    Láthatóság a foglalási felületen
                                </div>
                                <div className="text-[11px] font-mono text-muted-foreground">
                                    Ha kikapcsolod, a diákok nem látják ezt a gépet a foglalható listában
                                </div>
                            </div>

                            <div
                                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                                    isActive ? "bg-primary" : "bg-muted"
                                }`}
                            >
                                <div
                                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                        isActive ? "translate-x-5" : "translate-x-0"
                                    }`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Telepített Játékok (RAWG API Integráció) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                                <Gamepad2 size={16} />
                                // 03. Telepített Játékok ({installedGames.length})
                            </span>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleSelectAllPlatformGames}
                                    className="text-[11px] font-mono text-primary hover:underline"
                                >
                                    Versenyjátékok hozzáadása
                                </button>
                                <span className="text-muted-foreground text-xs">•</span>
                                <button
                                    type="button"
                                    onClick={handleClearGames}
                                    className="text-[11px] font-mono text-muted-foreground hover:text-red-400 hover:underline"
                                >
                                    Lista ürítése
                                </button>
                            </div>
                        </div>

                        {/* Currently installed on this specific machine */}
                        <div className="p-3.5 rounded-xl bg-[#121824]/60 border border-border/80 space-y-2">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block font-semibold">
                                Ezen a gépen rögzített játékok ({installedGames.length} db):
                            </span>

                            {installedGames.length === 0 ? (
                                <p className="text-muted-foreground text-xs font-mono italic py-2">
                                    Még nincsenek játékok hozzárendelve ehhez a géphez. Keress az alábbi RAWG keresőben!
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                                    {installedGames.map((game, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1A2333] border border-border/90 rounded-lg text-xs font-mono text-foreground shadow-sm group hover:border-primary/50 transition-colors"
                                        >
                                            <Gamepad2 size={13} className="text-primary" />
                                            <span>{game}</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleGame(game)}
                                                className="text-muted-foreground hover:text-red-400 transition-colors ml-1 p-0.5"
                                                title="Eltávolítás"
                                            >
                                                <X size={13} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RAWG Global Database Search */}
                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-mono uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
                                    <Globe size={14} />
                                    Keresés a Globális RAWG Adatbázisban
                                </label>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                    500,000+ PC cím
                                </span>
                            </div>

                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <input
                                    type="text"
                                    value={rawgSearchQuery}
                                    onChange={(e) => setRawgSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            if (rawgSearchQuery.trim()) {
                                                handleAddCustomGame(rawgSearchQuery.trim());
                                                setRawgSearchQuery("");
                                            }
                                        }
                                    }}
                                    placeholder="Keress játékot RAWG-on (pl. Cyberpunk, CS2, Assetto Corsa, GTA V, Valorant)..."
                                    className="w-full pl-10 pr-24 py-2.5 bg-[#121824] border border-border rounded-xl text-foreground font-mono text-xs focus:border-primary focus:outline-none transition-colors"
                                />
                                {rawgSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setRawgSearchQuery("")}
                                        className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                {globalLoading && (
                                    <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary" />
                                )}
                            </div>

                            {/* RAWG Search Results */}
                            {rawgSearchQuery.trim() && (
                                <div className="p-3 bg-[#0B1015] border border-primary/30 rounded-xl space-y-2 max-h-56 overflow-y-auto custom-scrollbar shadow-2xl animate-in fade-in-50 duration-150">
                                    {globalLoading ? (
                                        <div className="py-6 flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
                                            <Loader2 size={16} className="animate-spin text-primary" />
                                            <span>Keresés a RAWG API-ban...</span>
                                        </div>
                                    ) : globalGames.length === 0 ? (
                                        <div className="py-4 text-center text-xs font-mono text-muted-foreground">
                                            Nincs közvetlen találat a RAWG-on.
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleAddCustomGame(rawgSearchQuery.trim());
                                                    setRawgSearchQuery("");
                                                }}
                                                className="block mx-auto mt-2 text-primary hover:underline font-semibold"
                                            >
                                                + &quot;{rawgSearchQuery.trim()}&quot; hozzáadása egyedi címként
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {globalGames.map((g) => {
                                                const isInstalled = installedGames.some(
                                                    (name) => name.toLowerCase() === g.name.toLowerCase()
                                                );
                                                return (
                                                    <div
                                                        key={String(g.id)}
                                                        onClick={() => toggleGame(g.name)}
                                                        className={`p-2 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                                                            isInstalled
                                                                ? "bg-primary/15 border-primary text-foreground"
                                                                : "bg-[#121824] border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            {g.backgroundImage ? (
                                                                <img
                                                                    src={g.backgroundImage}
                                                                    alt={g.name}
                                                                    className="w-10 h-10 object-cover rounded-lg shrink-0 border border-border/40"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                                                                    <Gamepad2 size={16} />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-mono font-bold truncate text-foreground">
                                                                    {g.name}
                                                                </div>
                                                                <div className="text-[10px] font-mono text-muted-foreground truncate">
                                                                    {g.released ? g.released.slice(0, 4) : "Kiadás éve N/A"}
                                                                    {g.genres && g.genres.length > 0 ? ` • ${g.genres.slice(0, 2).join(', ')}` : ""}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div
                                                            className={`px-2 py-1 rounded text-[10px] font-mono font-bold shrink-0 flex items-center gap-1 ${
                                                                isInstalled
                                                                    ? "bg-primary text-black"
                                                                    : "bg-secondary text-muted-foreground"
                                                            }`}
                                                        >
                                                            {isInstalled ? (
                                                                <>
                                                                    <Check size={11} />
                                                                    <span>Telepítve</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus size={11} />
                                                                    <span>Hozzáadás</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Quick Platform Versenyjátékok & Top Esport chips */}
                        <div className="space-y-2 pt-2">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                                Gyors elérés: Iskolai versenyjátékok és népszerű esport címek
                            </span>

                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                {/* Registered tournament games */}
                                {games.map((g) => {
                                    const isInstalled = installedGames.some(
                                        (name) => name.toLowerCase() === g.name.toLowerCase()
                                    );
                                    return (
                                        <button
                                            key={g.id}
                                            type="button"
                                            onClick={() => toggleGame(g.name)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
                                                isInstalled
                                                    ? "bg-primary text-black font-semibold border-primary shadow-sm"
                                                    : "bg-[#121824] text-muted-foreground border-border/80 hover:text-foreground hover:border-primary/50"
                                            }`}
                                        >
                                            {isInstalled ? <Check size={12} /> : <Plus size={12} />}
                                            <span>{g.name}</span>
                                        </button>
                                    );
                                })}

                                {/* Other common esports games */}
                                {COMMON_ESPORTS_GAMES.filter(
                                    (cg) => !games.some((g) => g.name.toLowerCase() === cg.toLowerCase())
                                ).map((cg) => {
                                    const isInstalled = installedGames.some(
                                        (name) => name.toLowerCase() === cg.toLowerCase()
                                    );
                                    return (
                                        <button
                                            key={cg}
                                            type="button"
                                            onClick={() => toggleGame(cg)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
                                                isInstalled
                                                    ? "bg-primary text-black font-semibold border-primary shadow-sm"
                                                    : "bg-[#121824] text-muted-foreground border-border/80 hover:text-foreground hover:border-primary/50"
                                            }`}
                                        >
                                            {isInstalled ? <Check size={12} /> : <Plus size={12} />}
                                            <span>{cg}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Batch synchronization options */}
                        <div className="p-3 rounded-xl bg-[#121824] border border-border/80 space-y-2 mt-4">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block font-bold">
                                // Opcionális: Beállítás másolása más gépekre
                            </span>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={applyToRow}
                                        disabled={applyToAll}
                                        onChange={(e) => {
                                            setApplyToRow(e.target.checked);
                                            if (e.target.checked) setApplyToAll(false);
                                        }}
                                        className="w-4 h-4 rounded border-border bg-[#0E131F] text-primary focus:ring-primary"
                                    />
                                    <span className="text-xs font-mono text-foreground">
                                        Alkalmazás a(z) <strong>{displayRow}. sor</strong> összes gépére
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={applyToAll}
                                        onChange={(e) => {
                                            setApplyToAll(e.target.checked);
                                            if (e.target.checked) setApplyToRow(false);
                                        }}
                                        className="w-4 h-4 rounded border-border bg-[#0E131F] text-primary focus:ring-primary"
                                    />
                                    <span className="text-xs font-mono text-foreground">
                                        Alkalmazás a <strong>teljes teremre</strong> (összes PC)
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-4 border-t border-border/80 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-border text-foreground bg-secondary/80 hover:bg-secondary font-mono text-xs uppercase tracking-wider font-semibold transition-colors"
                        >
                            Mégse
                        </button>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2.5 rounded-xl bg-primary text-black font-mono text-xs uppercase tracking-wider font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            <span>{computer ? "Mentés" : "Gép létrehozása"}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
