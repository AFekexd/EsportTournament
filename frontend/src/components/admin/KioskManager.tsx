import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
  fetchMachines,
  updateMachine,
  deleteMachine,
  seedMachines,
  bulkUpdateGames,
} from "../../store/slices/kioskSlice";
import { fetchGames, searchGlobalGames } from "../../store/slices/gamesSlice";
import {
  Monitor,
  Edit2,
  Trash2,
  Tv,
  ExternalLink,
  Plus,
  Gamepad2,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  Layers,
  Sparkles,
  X,
  Check,
  Search,
  Globe,
  Loader2,
} from "lucide-react";
import type { Computer } from "../../types";
import { MachineEditModal } from "./MachineEditModal";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { toast } from "sonner";

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

export const KioskManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { machines, isLoading } = useAppSelector((state) => state.kiosk);
  const { games, globalGames, globalLoading } = useAppSelector((state) => state.games);

  const [editingMachine, setEditingMachine] = useState<Computer | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bulkSyncModalOpen, setBulkSyncModalOpen] = useState(false);
  const [bulkSyncRow, setBulkSyncRow] = useState<number | "all">("all");
  const [bulkGamesList, setBulkGamesList] = useState<string[]>([]);
  const [bulkRawgQuery, setBulkRawgQuery] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Debounced search for bulk modal
  useEffect(() => {
    if (!bulkSyncModalOpen || !bulkRawgQuery.trim()) return;

    const timer = setTimeout(() => {
      dispatch(searchGlobalGames(bulkRawgQuery.trim()));
    }, 350);

    return () => clearTimeout(timer);
  }, [bulkRawgQuery, bulkSyncModalOpen, dispatch]);

  // Prevent background scroll when bulk sync modal is open
  useEffect(() => {
    if (!bulkSyncModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [bulkSyncModalOpen]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "warning" | "info" | "primary";
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "primary",
  });

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    dispatch(fetchMachines());
    dispatch(fetchGames());

    const interval = setInterval(() => {
      dispatch(fetchMachines());
    }, 60000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Statistics calculation
  const totalMachines = machines.length;
  const availableCount = machines.filter(
    (m) => m.isActive && m.status === "AVAILABLE"
  ).length;
  const maintenanceCount = machines.filter(
    (m) => m.isActive && m.status === "MAINTENANCE"
  ).length;
  const outOfOrderCount = machines.filter(
    (m) => m.isActive && m.status === "OUT_OF_ORDER"
  ).length;
  const inactiveCount = machines.filter((m) => !m.isActive).length;

  // Group machines by row
  const uniqueRows = Array.from(new Set(machines.map((m) => m.row))).sort(
    (a, b) => a - b
  );

  const machinesByRow = uniqueRows.map((row) => ({
    rowNumber: row,
    machines: machines
      .filter((m) => m.row === row)
      .sort((a, b) => a.position - b.position),
  }));

  // Quick inline status change handler
  const handleQuickStatusChange = async (
    machine: Computer,
    newStatus: "AVAILABLE" | "MAINTENANCE" | "OUT_OF_ORDER"
  ) => {
    if (machine.status === newStatus) return;

    try {
      await dispatch(
        updateMachine({
          id: machine.id,
          status: newStatus,
        })
      ).unwrap();
      toast.success(`${machine.name} állapota frissítve!`);
    } catch (err: any) {
      toast.error(err?.message || "Nem sikerült módosítani az állapotot");
    }
  };

  const handleDeleteMachine = (machine: Computer) => {
    setConfirmModal({
      isOpen: true,
      title: "Gép törlése",
      message: `Biztosan törölni szeretnéd a(z) ${machine.name} munkaállomást? A hozzá kapcsolódó foglalások és előzmények is archiválásra kerülnek.`,
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        try {
          await dispatch(deleteMachine(machine.id)).unwrap();
          toast.success(`${machine.name} sikeresen törölve!`);
        } catch (error: any) {
          console.error("Failed to delete machine:", error);
          toast.error(error?.message || "Hiba történt a gép törlése során");
        } finally {
          closeConfirmModal();
        }
      },
    });
  };

  const handleSeedDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: "Alapértelmezett labor létrehozása",
      message:
        "Ez a művelet létrehoz 10 db alapértelmezett versenygépet (2 sorban, 5-5 géppel, PC-01-től PC-10-ig). Biztosan folytatod?",
      variant: "primary",
      confirmLabel: "Generálás",
      onConfirm: async () => {
        try {
          await dispatch(seedMachines()).unwrap();
          toast.success("10 db alapértelmezett munkaállomás sikeresen létrehozva!");
        } catch (err: any) {
          toast.error(err?.message || "Hiba történt a gépek generálásakor");
        } finally {
          closeConfirmModal();
        }
      },
    });
  };

  // Open bulk game modal
  const handleOpenBulkSync = (row?: number) => {
    setBulkSyncRow(row !== undefined ? row : "all");

    // Gather common games from existing machines
    const existing = Array.from(
      new Set(
        machines.flatMap((m) =>
          row !== undefined ? (m.row === row ? m.installedGames : []) : m.installedGames
        )
      )
    );

    const initial =
      existing.length > 0
        ? existing
        : games.length > 0
        ? games.map((g) => g.name)
        : COMMON_ESPORTS_GAMES.slice(0, 5);

    setBulkGamesList(initial);
    setBulkRawgQuery("");
    setBulkSyncModalOpen(true);
  };

  const toggleBulkGame = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (bulkGamesList.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setBulkGamesList(bulkGamesList.filter((g) => g.toLowerCase() !== trimmed.toLowerCase()));
    } else {
      setBulkGamesList([...bulkGamesList, trimmed]);
    }
  };

  const handleExecuteBulkSync = async () => {
    try {
      setIsBulkSaving(true);
      const payload: { installedGames: string[]; row?: number } = {
        installedGames: bulkGamesList,
      };

      if (bulkSyncRow !== "all") {
        payload.row = bulkSyncRow;
      }

      await dispatch(bulkUpdateGames(payload)).unwrap();
      toast.success(
        bulkSyncRow === "all"
          ? "Játéklista szinkronizálva az összes gépre!"
          : `Játéklista szinkronizálva a(z) ${bulkSyncRow + 1}. sor gépeire!`
      );
      setBulkSyncModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Nem sikerült a játékok szinkronizálása");
    } finally {
      setIsBulkSaving(false);
    }
  };

  return (
    <div className="admin-section space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Monitor size={18} className="text-primary" />
            </div>
            <h2 className="text-2xl font-display font-extrabold uppercase tracking-wide text-foreground">
              Gépterem és Munkaállomások
            </h2>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            A Pollák Esport labor fizikai gépeinek beállítása, pillanatnyi állapota és játékai.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xl bg-primary text-black hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <Plus size={16} />
            Új Gép Hozzáadása
          </button>

          {machines.length > 0 && (
            <button
              onClick={() => handleOpenBulkSync()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-semibold uppercase tracking-wider rounded-xl bg-[#121824] border border-border text-foreground hover:bg-secondary hover:border-primary/50 transition-colors"
            >
              <Gamepad2 size={15} className="text-primary" />
              Játékok Szinkronizálása
            </button>
          )}

          <div className="flex items-center gap-2 border-l border-border/60 pl-2.5">
            <a
              href="/tv"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-xl bg-[#121824] border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              title="TV Versenykijelző megnyitása új lapon"
            >
              <Tv size={14} className="text-primary" />
              <span>TV Verseny</span>
              <ExternalLink size={12} className="opacity-60" />
            </a>

            <a
              href="/tv2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-xl bg-[#121824] border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              title="TV Toborzó kijelző megnyitása új lapon"
            >
              <Tv size={14} className="text-primary" />
              <span>TV Toborzás</span>
              <ExternalLink size={12} className="opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {/* Lab Summary KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-[#121824] border border-border/80 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            Összes Munkaállomás
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-bold font-display text-foreground">
              {totalMachines}
            </span>
            <span className="text-xs font-mono text-muted-foreground">gép a laborban</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Elérhető / Szabad
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-bold font-display text-emerald-400">
              {availableCount}
            </span>
            <span className="text-xs font-mono text-emerald-400/70">üzemkész</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Karbantartás alatt
            </span>
            <Wrench size={14} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-bold font-display text-amber-400">
              {maintenanceCount}
            </span>
            <span className="text-xs font-mono text-amber-400/70">frissítés alatt</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-red-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Üzemen kívül
            </span>
            <ShieldAlert size={14} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-bold font-display text-red-400">
              {outOfOrderCount}
            </span>
            <span className="text-xs font-mono text-red-400/70">hibás</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d121c] border border-border/50 flex flex-col justify-between opacity-80 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            Inaktív (Rejtett)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-bold font-display text-muted-foreground">
              {inactiveCount}
            </span>
            <span className="text-xs font-mono text-muted-foreground">nem látható</span>
          </div>
        </div>
      </div>

      {/* Main Machine Grid by Rows */}
      {isLoading && machines.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground border border-border rounded-2xl bg-[#121824]/60 animate-pulse font-mono">
          Munkaállomások betöltése...
        </div>
      ) : machines.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-border/80 rounded-2xl bg-[#121824]/40 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
            <Monitor size={32} />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold uppercase tracking-wider text-foreground">
              Még nincsenek rögzített munkaállomások
            </h3>
            <p className="text-xs font-mono text-muted-foreground max-w-md mx-auto mt-1">
              Hozz létre új gépeket manuálisan, vagy generáld le a standard 10 gépes 2x5 elrendezést egyetlen kattintással.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleSeedDefault}
              className="px-4 py-2 bg-primary text-black rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              <Sparkles size={16} />
              Alapértelmezett labor generálása (10 gép)
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-[#121824] border border-border text-foreground rounded-xl font-mono text-xs font-semibold uppercase tracking-wider hover:bg-secondary transition-colors"
            >
              + Egyedi gép hozzáadása
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {machinesByRow.map(({ rowNumber, machines }) => (
            <div key={rowNumber} className="space-y-4">
              {/* Row Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/70 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center font-mono text-xs font-bold text-primary">
                    {rowNumber + 1}
                  </div>
                  <h3 className="font-display font-bold uppercase tracking-wider text-foreground text-base">
                    {rowNumber + 1}. Sor Versenyszínpad
                  </h3>
                  <span className="text-xs font-mono text-muted-foreground">
                    ({machines.length} gép)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenBulkSync(rowNumber)}
                    className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121824] border border-border/60 hover:border-primary/40"
                    title={`Játékok szinkronizálása csak a(z) ${rowNumber + 1}. sorra`}
                  >
                    <Layers size={13} />
                    <span>Játékok szinkronizálása a sorra</span>
                  </button>
                </div>
              </div>

              {/* Row Computer Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {machines.map((machine) => (
                  <ModernMachineCard
                    key={machine.id}
                    machine={machine}
                    onEdit={() => setEditingMachine(machine)}
                    onDelete={() => handleDeleteMachine(machine)}
                    onStatusChange={(status) => handleQuickStatusChange(machine, status)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit or Create Machine Modal */}
      {(editingMachine || isCreateOpen) && (
        <MachineEditModal
          computer={editingMachine}
          isOpen={!!editingMachine || isCreateOpen}
          existingMachines={machines}
          onClose={() => {
            setEditingMachine(null);
            setIsCreateOpen(false);
          }}
        />
      )}

      {/* Bulk Games Synchronization Modal */}
      {bulkSyncModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
            onClick={() => setBulkSyncModalOpen(false)}
          >
          <div
            className="rounded-2xl w-full max-w-xl border border-border shadow-2xl bg-[#0E131F] flex flex-col overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-border/80 flex items-center justify-between bg-[#121824]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <Gamepad2 size={18} />
                </div>
                <div>
                  <h3 className="font-display font-bold uppercase tracking-wider text-foreground text-base">
                    Játékok Csoportos Szinkronizálása
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    Cél:{" "}
                    <span className="text-primary font-bold">
                      {bulkSyncRow === "all"
                        ? "Teljes terem (Összes PC)"
                        : `${bulkSyncRow + 1}. Sor gépei`}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkSyncModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                  Célpont kiválasztása:
                </label>
                <select
                  value={bulkSyncRow.toString()}
                  onChange={(e) =>
                    setBulkSyncRow(e.target.value === "all" ? "all" : parseInt(e.target.value))
                  }
                  className="w-full bg-[#121824] border border-border rounded-lg px-3.5 py-2 text-foreground font-mono text-sm focus:border-primary focus:outline-none"
                >
                  <option value="all">Teljes labor (Összesen {totalMachines} gép)</option>
                  {uniqueRows.map((r) => (
                    <option key={r} value={r}>
                      Csak a(z) {r + 1}. sor gépei (
                      {machines.filter((m) => m.row === r).length} gép)
                    </option>
                  ))}
                </select>
              </div>

              {/* RAWG Global Database Search */}
              <div className="space-y-2">
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
                    value={bulkRawgQuery}
                    onChange={(e) => setBulkRawgQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (bulkRawgQuery.trim()) {
                          toggleBulkGame(bulkRawgQuery.trim());
                          setBulkRawgQuery("");
                        }
                      }
                    }}
                    placeholder="Keress játékot RAWG-on (pl. CS2, Cyberpunk, Assetto Corsa, GTA V, Valorant)..."
                    className="w-full pl-10 pr-24 py-2 bg-[#121824] border border-border rounded-xl text-foreground font-mono text-xs focus:border-primary focus:outline-none transition-colors"
                  />
                  {bulkRawgQuery && (
                    <button
                      type="button"
                      onClick={() => setBulkRawgQuery("")}
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
                {bulkRawgQuery.trim() && (
                  <div className="p-2.5 bg-[#0B1015] border border-primary/30 rounded-xl space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar shadow-2xl">
                    {globalLoading ? (
                      <div className="py-4 flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
                        <Loader2 size={15} className="animate-spin text-primary" />
                        <span>Keresés a RAWG API-ban...</span>
                      </div>
                    ) : globalGames.length === 0 ? (
                      <div className="py-3 text-center text-xs font-mono text-muted-foreground">
                        Nincs közvetlen találat a RAWG-on.
                        <button
                          type="button"
                          onClick={() => {
                            toggleBulkGame(bulkRawgQuery.trim());
                            setBulkRawgQuery("");
                          }}
                          className="block mx-auto mt-1 text-primary hover:underline font-semibold"
                        >
                          + &quot;{bulkRawgQuery.trim()}&quot; hozzáadása
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {globalGames.map((g) => {
                          const isSelected = bulkGamesList.some(
                            (name) => name.toLowerCase() === g.name.toLowerCase()
                          );
                          return (
                            <div
                              key={String(g.id)}
                              onClick={() => toggleBulkGame(g.name)}
                              className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-primary/15 border-primary text-foreground"
                                  : "bg-[#121824] border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {g.backgroundImage ? (
                                  <img
                                    src={g.backgroundImage}
                                    alt={g.name}
                                    className="w-8 h-8 object-cover rounded shrink-0 border border-border/40"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                                    <Gamepad2 size={14} />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-mono font-bold truncate text-foreground">
                                    {g.name}
                                  </div>
                                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                                    {g.released ? g.released.slice(0, 4) : ""}
                                    {g.genres && g.genres.length > 0 ? ` • ${g.genres.slice(0, 1).join(', ')}` : ""}
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 flex items-center gap-1 ${
                                  isSelected
                                    ? "bg-primary text-black"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check size={10} />
                                    <span>Hozzáadva</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={10} />
                                    <span>Választ</span>
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

              {/* Game selection chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Gyors választás platform és esport játékok közül:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                  {games.map((g) => {
                    const selected = bulkGamesList.some(
                      (name) => name.toLowerCase() === g.name.toLowerCase()
                    );
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleBulkGame(g.name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
                          selected
                            ? "bg-primary text-black font-semibold border-primary shadow-sm"
                            : "bg-[#121824] text-muted-foreground border-border/80 hover:text-foreground"
                        }`}
                      >
                        {selected ? <Check size={12} /> : <Plus size={12} />}
                        <span>{g.name}</span>
                      </button>
                    );
                  })}
                  {COMMON_ESPORTS_GAMES.filter(
                    (cg) => !games.some((g) => g.name.toLowerCase() === cg.toLowerCase())
                  ).map((cg) => {
                    const selected = bulkGamesList.some(
                      (name) => name.toLowerCase() === cg.toLowerCase()
                    );
                    return (
                      <button
                        key={cg}
                        type="button"
                        onClick={() => toggleBulkGame(cg)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
                          selected
                            ? "bg-primary text-black font-semibold border-primary shadow-sm"
                            : "bg-[#121824] text-muted-foreground border-border/80 hover:text-foreground"
                        }`}
                      >
                        {selected ? <Check size={12} /> : <Plus size={12} />}
                        <span>{cg}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active preview list */}
              <div className="p-3 bg-[#121824]/60 rounded-xl border border-border/80 flex flex-wrap gap-1.5 min-h-[50px]">
                {bulkGamesList.length === 0 ? (
                  <span className="text-xs font-mono text-muted-foreground italic w-full text-center py-2">
                    Nincs kijelölt játék
                  </span>
                ) : (
                  bulkGamesList.map((game, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-md bg-[#1A2333] border border-border/90 text-xs font-mono text-foreground flex items-center gap-1.5"
                    >
                      <Gamepad2 size={12} className="text-primary" />
                      <span>{game}</span>
                      <button
                        type="button"
                        onClick={() => toggleBulkGame(game)}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/80 flex justify-end gap-2.5 bg-[#121824]">
              <button
                type="button"
                onClick={() => setBulkSyncModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-foreground bg-secondary/80 hover:bg-secondary font-mono text-xs uppercase font-semibold"
              >
                Mégse
              </button>
              <button
                type="button"
                disabled={isBulkSaving}
                onClick={handleExecuteBulkSync}
                className="px-5 py-2 rounded-xl bg-primary text-black font-mono text-xs uppercase font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
              >
                {isBulkSaving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                <span>Szinkronizálás Alkalmazása</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmLabel={confirmModal.confirmLabel}
      />
    </div>
  );
};

interface ModernMachineCardProps {
  machine: Computer;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: "AVAILABLE" | "MAINTENANCE" | "OUT_OF_ORDER") => void;
}

const ModernMachineCard: React.FC<ModernMachineCardProps> = ({
  machine,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  // Status config
  let cardBg = "bg-[#121824]/90 border-border/80 hover:border-emerald-500/50";
  let statusDot = "bg-emerald-500";
  let statusText = "SZABAD";
  let statusBadgeColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

  if (!machine.isActive) {
    cardBg = "bg-[#0d121c]/90 border-border/40 opacity-70";
    statusDot = "bg-gray-500";
    statusText = "INAKTÍV";
    statusBadgeColor = "bg-gray-500/15 text-muted-foreground border-gray-500/30";
  } else if (machine.status === "MAINTENANCE") {
    cardBg = "bg-[#141824] border-amber-500/30 hover:border-amber-500/60";
    statusDot = "bg-amber-500";
    statusText = "KARBANTARTÁS";
    statusBadgeColor = "bg-amber-500/15 text-amber-400 border-amber-500/30";
  } else if (machine.status === "OUT_OF_ORDER") {
    cardBg = "bg-[#141624] border-red-500/30 hover:border-red-500/60";
    statusDot = "bg-red-500";
    statusText = "NEM ÜZEMEL";
    statusBadgeColor = "bg-red-500/15 text-red-400 border-red-500/30";
  }

  const installedGames = machine.installedGames || [];

  return (
    <div
      className={`relative rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md ${cardBg}`}
    >
      <div>
        {/* Top bar: Name, Seat info and Status pill */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl text-foreground tracking-tight">
                {machine.name}
              </span>
              <div className={`w-2 h-2 rounded-full ${statusDot} animate-pulse`} />
            </div>

            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
              #{machine.row + 1}. sor • {machine.position + 1}. asztal
              {machine.hostname && machine.hostname !== machine.name && (
                <span className="block truncate max-w-[120px] opacity-75">
                  {machine.hostname}
                </span>
              )}
            </div>
          </div>

          <span
            className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border font-bold ${statusBadgeColor}`}
          >
            {statusText}
          </span>
        </div>

        {/* Quick inline status buttons */}
        <div className="bg-black/30 border border-border/50 rounded-lg p-1 grid grid-cols-3 gap-1 mb-3">
          <button
            type="button"
            onClick={() => onStatusChange("AVAILABLE")}
            title="Állapot: Elérhető"
            className={`py-1 text-[10px] font-mono uppercase font-bold rounded transition-colors ${
              machine.status === "AVAILABLE"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            Szabad
          </button>
          <button
            type="button"
            onClick={() => onStatusChange("MAINTENANCE")}
            title="Állapot: Karbantartás alatt"
            className={`py-1 text-[10px] font-mono uppercase font-bold rounded transition-colors ${
              machine.status === "MAINTENANCE"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
            }`}
          >
            Szerviz
          </button>
          <button
            type="button"
            onClick={() => onStatusChange("OUT_OF_ORDER")}
            title="Állapot: Üzemen kívül"
            className={`py-1 text-[10px] font-mono uppercase font-bold rounded transition-colors ${
              machine.status === "OUT_OF_ORDER"
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            }`}
          >
            Hibás
          </button>
        </div>

        {/* Installed Games tags */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <Gamepad2 size={12} className="text-primary" />
              Telepített játékok
            </span>
            <span className="font-semibold text-foreground/80">{installedGames.length} db</span>
          </div>

          <div className="flex flex-wrap gap-1 min-h-[44px] items-start pt-0.5">
            {installedGames.length === 0 ? (
              <span className="text-[10px] font-mono text-muted-foreground/60 italic">
                Nincsenek játékok rögzítve
              </span>
            ) : (
              <>
                {installedGames.slice(0, 3).map((game, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded bg-secondary/80 text-[10px] font-mono text-foreground/90 border border-border/50 truncate max-w-[110px]"
                    title={game}
                  >
                    {game}
                  </span>
                ))}
                {installedGames.length > 3 && (
                  <span className="px-1.5 py-0.5 rounded bg-secondary/50 text-[10px] font-mono text-muted-foreground border border-border/40">
                    +{installedGames.length - 3}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/50">
        <button
          onClick={onEdit}
          className="px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-xs font-mono flex items-center justify-center gap-1.5 border border-border/80 transition-colors"
          title="Gép szerkesztése"
        >
          <Edit2 size={13} />
          <span>Szerkeszt</span>
        </button>
        <button
          onClick={onDelete}
          className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-mono flex items-center justify-center gap-1.5 border border-red-500/20 transition-colors"
          title="Gép törlése"
        >
          <Trash2 size={13} />
          <span>Törlés</span>
        </button>
      </div>
    </div>
  );
};
