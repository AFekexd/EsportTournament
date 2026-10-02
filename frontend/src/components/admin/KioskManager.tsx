import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { fetchMachines } from "../../store/slices/kioskSlice";
import { Monitor, Edit2, Trash2, Tv, ExternalLink } from "lucide-react";
import type { Computer } from "../../types";
import { MachineEditModal } from "./MachineEditModal";
import { toast } from "sonner";
import { authService } from "../../lib/auth-service";
import { API_URL } from "../../config";
import { ConfirmationModal } from "../common/ConfirmationModal";

export const KioskManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { machines, isLoading } = useAppSelector((state) => state.kiosk);
  const [editingMachine, setEditingMachine] = useState<Computer | null>(null);
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
    onConfirm: () => { },
    variant: "primary",
  });

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    dispatch(fetchMachines());
    const interval = setInterval(() => {
      dispatch(fetchMachines());
    }, 60000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Group machines by row
  const uniqueRows = Array.from(new Set(machines.map((m) => m.row))).sort(
    (a, b) => a - b,
  );

  const machinesByRow = uniqueRows.map((row) => ({
    rowNumber: row,
    machines: machines
      .filter((m) => m.row === row)
      .sort((a, b) => a.position - b.position),
  }));

  const handleDeleteMachine = (machineId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Gép törlése",
      message: "Biztosan törölni szeretnéd ezt a gépet? Ez a művelet nem visszavonható.",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        try {
          const token = authService.keycloak?.token;
          if (!token) return;

          const response = await fetch(
            `${API_URL}/bookings/computers/${machineId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = await response.json();
          if (data.success) {
            toast.success("Gép sikeresen törölve");
            dispatch(fetchMachines());
          } else {
            toast.error("Gép törlése sikertelen");
          }
        } catch (error) {
          console.error("Failed to delete computer:", error);
          toast.error("Hiba történt a gép törlése során");
        } finally {
          closeConfirmModal();
        }
      },
    });
  };

  return (
    <div className="admin-section">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="section-title flex items-center gap-2 mb-1">
            <Monitor className="text-primary" />
            Gépterem és Munkaállomások
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Az Esport laborban található fizikai számítógépek elhelyezkedése és állapota.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded bg-secondary/80 border border-border text-foreground hover:bg-secondary hover:border-primary/50 transition-colors"
          >
            <Tv size={14} className="text-primary" />
            TV Kijelző (Versenyek)
            <ExternalLink size={12} className="text-muted-foreground" />
          </a>
          <a
            href="/tv2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded bg-secondary/80 border border-border text-foreground hover:bg-secondary hover:border-primary/50 transition-colors"
          >
            <Tv size={14} className="text-primary" />
            TV Kijelző (Toborzás)
            <ExternalLink size={12} className="text-muted-foreground" />
          </a>
        </div>
      </div>

      {isLoading && machines.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-border rounded-lg bg-secondary animate-pulse">
          Betöltés...
        </div>
      ) : (
        <>
          <div className="grid gap-8">
            {machinesByRow.map(({ rowNumber, machines }) => (
              <div key={rowNumber} className="space-y-4">
                <h3 className="text-white/70 font-medium ml-2">
                  {rowNumber}. Sor
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {machines.length > 0 ? (
                    machines.map((machine) => (
                      <MachineCard
                        key={machine.id}
                        machine={machine}
                        onEdit={() => setEditingMachine(machine)}
                        onDelete={() => handleDeleteMachine(machine.id)}
                      />
                    ))
                  ) : (
                    <div className="col-span-full p-4 border border-dashed border-border rounded-lg text-center text-muted">
                      Nincsenek gépek ebben a sorban
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-tertiary rounded-lg border border-border">
            <h3 className="font-bold text-foreground mb-2 text-xs font-mono uppercase tracking-wider">Jelmagyarázat</h3>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-mono text-xs">
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Szabad / Elérhető
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Karbantartás alatt
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Nem üzemel
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div> Inaktív
              </span>
            </div>
          </div>
        </>
      )}

      {editingMachine && (
        <MachineEditModal
          computer={editingMachine}
          isOpen={!!editingMachine}
          onClose={() => setEditingMachine(null)}
        />
      )}

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

interface MachineCardProps {
  machine: Computer;
  onEdit: () => void;
  onDelete: () => void;
}

const MachineCard: React.FC<MachineCardProps> = ({
  machine,
  onEdit,
  onDelete,
}) => {
  // Determine status color & label
  let statusColor = "bg-[#121824] border-border";
  let statusDot = "bg-emerald-500";
  let statusText = "SZABAD";
  let statusTextColor = "text-emerald-400";

  if (!machine.isActive) {
    statusColor = "bg-[#0d121c] border-border/50 opacity-70";
    statusDot = "bg-gray-500";
    statusText = "INAKTÍV";
    statusTextColor = "text-muted-foreground";
  } else if (machine.status === "MAINTENANCE") {
    statusColor = "bg-amber-950/20 border-amber-500/30";
    statusDot = "bg-amber-500";
    statusText = "KARBANTARTÁS";
    statusTextColor = "text-amber-400";
  } else if (machine.status === "OUT_OF_ORDER") {
    statusColor = "bg-red-950/20 border-red-500/30";
    statusDot = "bg-red-500";
    statusText = "NEM ÜZEMEL";
    statusTextColor = "text-red-400";
  }

  return (
    <div
      className={`card ${statusColor} p-4 transition-all hover:shadow-lg relative group flex flex-col h-full border rounded-lg`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${statusDot} animate-pulse`}
            ></div>
            <span className="font-bold text-lg text-foreground leading-none font-display">
              {machine.name}
            </span>
          </div>
          {machine.hostname && machine.hostname !== machine.name && (
            <span className="text-xs text-muted-foreground font-mono mt-1">
              {machine.hostname}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4 flex-1">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-muted-foreground">Állapot:</span>
          <span className={`font-semibold ${statusTextColor}`}>
            {statusText}
          </span>
        </div>

        {(machine.specs ||
          (machine.installedGames && machine.installedGames.length > 0)) && (
            <div className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/60 space-y-1 font-mono">
              {machine.specs?.gpu && (
                <div className="truncate text-foreground/80" title={`GPU: ${machine.specs.gpu}`}>
                  🎮 {machine.specs.gpu}
                </div>
              )}
              {machine.specs?.cpu && (
                <div className="truncate text-muted-foreground" title={`CPU: ${machine.specs.cpu}`}>
                  ⚡ {machine.specs.cpu}
                </div>
              )}
              {machine.installedGames && machine.installedGames.length > 0 && (
                <div className="flex gap-1 flex-wrap pt-1">
                  {machine.installedGames.slice(0, 3).map((g, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-secondary text-[10px] rounded text-muted-foreground border border-border/40">
                      {g}
                    </span>
                  ))}
                  {machine.installedGames.length > 3 && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      +{machine.installedGames.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-border/40">
        <button
          onClick={onEdit}
          className="px-2 py-1.5 rounded bg-secondary/80 hover:bg-secondary text-gray-200 hover:text-foreground text-xs font-mono flex items-center justify-center gap-1.5 border border-border transition-colors"
          title="Szerkesztés"
        >
          <Edit2 size={13} />
          <span>Szerkeszt</span>
        </button>
        <button
          onClick={onDelete}
          className="px-2 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-mono flex items-center justify-center gap-1.5 border border-red-500/20 transition-colors"
          title="Törlés"
        >
          <Trash2 size={13} />
          <span>Törlés</span>
        </button>
      </div>
    </div>
  );
};
