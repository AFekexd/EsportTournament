import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Plus, Trash2, Shield, GripVertical } from "lucide-react";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { fetchRanks, addRank, deleteRank } from "../../store/slices/gamesSlice";
import type { Game } from "../../types";
// Reusing existing modal styles

interface GameRankModalProps {
  game: Game;
  onClose: () => void;
}

export function GameRankModal({ game, onClose }: GameRankModalProps) {
  const dispatch = useAppDispatch();
  const { gameRanks } = useAppSelector((state) => state.games);
  const ranks = gameRanks[game.id] || [];

  const [newRank, setNewRank] = useState({
    name: "",
    value: 1000,
    image: "",
    order: ranks.length + 1,
  });

  useEffect(() => {
    dispatch(fetchRanks(game.id));
  }, [dispatch, game.id]);

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

  const handleAdd = async () => {
    if (!newRank.name) return;
    try {
      await dispatch(
        addRank({
          gameId: game.id,
          rankData: newRank,
        })
      ).unwrap();

      // Reset form but keep logical defaults
      setNewRank({
        name: "",
        value: newRank.value + 100, // Increment default logic
        image: "",
        order: ranks.length + 2,
      });
    } catch (error) {
      console.error("Failed to add rank:", error);
      toast.error("Hiba történt a rang hozzáadásakor");
    }
  };

  const handleDelete = (rankId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Rang törlése",
      message: "Biztosan törölni szeretnéd ezt a rangot?",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        try {
          await dispatch(deleteRank({ gameId: game.id, rankId })).unwrap();
        } catch (error) {
          console.error("Failed to delete rank:", error);
          toast.error("Hiba történt a törléskor");
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="tactical-card w-full max-w-2xl overflow-hidden rounded-lg border border-border shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-card/95 backdrop-blur-md flex-shrink-0">
          <h2 className="text-xl font-display font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
            {game.name} <span className="text-primary font-mono">/</span> Rangok Kezelése
          </h2>
          <button
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/80 p-2 rounded transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="mb-6 relative overflow-hidden rounded border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/20 rounded text-primary">
                <Shield size={20} />
              </div>
              <div>
                <h4 className="text-foreground font-display font-bold text-xs uppercase tracking-wider mb-1">
                  Rang Rendszer
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed font-mono">
                  A rangok határozzák meg a játékosok P-ELO (Pollák ELO)
                  pontszámát. Állítsd be a határokat és a hozzájuk tartozó
                  vizuális elemeket.
                </p>
              </div>
            </div>
          </div>

          {/* Add New Rank Form */}
          <div className="mb-6 group">
            <div className="flex items-center gap-2 mb-3">
              <Plus size={16} className="text-primary" />
              <h4 className="text-foreground font-mono font-bold text-xs uppercase tracking-wider">
                Új Rang Hozzáadása
              </h4>
            </div>

            <div className="tactical-card p-5 border border-border rounded shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Megnevezés
                  </label>
                  <input
                    type="text"
                    className="w-full bg-secondary/80 border border-border rounded px-4 py-2.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground"
                    placeholder="Pl. Silver 1"
                    value={newRank.name}
                    onChange={(e) =>
                      setNewRank({ ...newRank, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    P-ELO Érték
                  </label>
                  <input
                    type="number"
                    className="w-full bg-secondary/80 border border-border rounded px-4 py-2.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground"
                    placeholder="1000"
                    value={newRank.value}
                    onChange={(e) =>
                      setNewRank({
                        ...newRank,
                        value: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Kép URL (Opcionális)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-secondary/80 border border-border rounded px-4 py-2.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground"
                    placeholder="https://..."
                    value={newRank.image}
                    onChange={(e) =>
                      setNewRank({ ...newRank, image: e.target.value })
                    }
                  />
                </div>
                {/* Order is auto-handled usually, but let's keep it if user wants manual override */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Sorrend
                  </label>
                  <input
                    type="number"
                    className="w-full bg-secondary/80 border border-border rounded px-4 py-2.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground"
                    value={newRank.order}
                    onChange={(e) =>
                      setNewRank({
                        ...newRank,
                        order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <button
                className={`w-full py-2.5 rounded font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-md ${!newRank.name
                  ? "bg-secondary text-muted-foreground cursor-not-allowed shadow-none"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                  }`}
                disabled={!newRank.name}
                onClick={handleAdd}
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus size={16} />
                  <span>Hozzáadás</span>
                </div>
              </button>
            </div>
          </div>

          {/* Ranks List */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-primary" />
              <h4 className="text-foreground font-mono font-bold text-xs uppercase tracking-wider">
                Jelenlegi Rangok
              </h4>
            </div>

            {ranks.length === 0 ? (
              <div className="text-center py-12 bg-secondary/30 rounded border border-border border-dashed">
                <Shield size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium text-sm">
                  Még nincs rang felvéve ehhez a játékhoz.
                </p>
                <p className="text-muted-foreground text-xs font-mono mt-1">
                  Adj hozzá egyet a fenti űrlap segítségével.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...ranks]
                  .sort((a, b) => a.order - b.order)
                  .map((rank) => (
                    <div
                      key={rank.id}
                      className="group bg-secondary/40 hover:bg-secondary/70 border border-border hover:border-primary/50 p-3 rounded flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground cursor-grab active:cursor-grabbing transition-colors">
                          <GripVertical size={18} />
                        </div>

                        <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center border border-border p-1.5 overflow-hidden">
                          {rank.image ? (
                            <img
                              src={rank.image}
                              alt={rank.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Shield size={18} className="text-muted-foreground" />
                          )}
                        </div>

                        <div>
                          <div className="font-display font-bold text-foreground text-sm uppercase">
                            {rank.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                              {rank.value} ELO
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-xs font-mono font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded border border-border">
                          #{rank.order}
                        </div>
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded text-destructive hover:bg-destructive/10 hover:border hover:border-destructive/20 transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => handleDelete(rank.id)}
                          title="Törlés"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
}
