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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#0f1016]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_50px_-12px_rgba(124,58,237,0.25)] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent flex-shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            {game.name} <span className="text-gray-500">/</span> Rangok Kezelése
          </h2>
          <button
            className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="mb-8 relative overflow-hidden rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Shield size={20} />
              </div>
              <div>
                <h4 className="text-blue-200 font-bold text-sm mb-1 uppercase tracking-wide">
                  Rang Rendszer
                </h4>
                <p className="text-blue-200/70 text-sm leading-relaxed">
                  A rangok határozzák meg a játékosok P-ELO (Pollák ELO)
                  pontszámát. Állítsd be a határokat és a hozzájuk tartozó
                  vizuális elemeket.
                </p>
              </div>
            </div>
          </div>

          {/* Add New Rank Form */}
          <div className="mb-8 group">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={16} className="text-primary" />
              <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                Új Rang Hozzáadása
              </h4>
            </div>

            <div className="bg-[#13141c] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Megnevezés
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-600 focus:bg-black/50"
                    placeholder="Pl. Silver 1"
                    value={newRank.name}
                    onChange={(e) =>
                      setNewRank({ ...newRank, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    P-ELO Érték
                  </label>
                  <input
                    type="number"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-600 focus:bg-black/50"
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
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Kép URL (Opcionális)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-600 focus:bg-black/50"
                    placeholder="https://..."
                    value={newRank.image}
                    onChange={(e) =>
                      setNewRank({ ...newRank, image: e.target.value })
                    }
                  />
                </div>
                {/* Order is auto-handled usually, but let's keep it if user wants manual override */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Sorrend
                  </label>
                  <input
                    type="number"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-600 focus:bg-black/50"
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
                className={`w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-300 ${!newRank.name
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-primary to-purple-600 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5"
                  }`}
                disabled={!newRank.name}
                onClick={handleAdd}
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus size={18} />
                  <span>Hozzáadás</span>
                </div>
              </button>
            </div>
          </div>

          {/* Ranks List */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-primary" />
              <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                Jelenlegi Rangok
              </h4>
            </div>

            {ranks.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 border-dashed">
                <Shield size={48} className="mx-auto text-gray-700 mb-4" />
                <p className="text-gray-400 font-medium">
                  Még nincs rang felvéve ehhez a játékhoz.
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  Adj hozzá egyet a fenti űrlap segítségével.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...ranks]
                  .sort((a, b) => a.order - b.order)
                  .map((rank) => (
                    <div
                      key={rank.id}
                      className="group bg-[#13141c] hover:bg-[#1a1b26] border border-white/5 hover:border-primary/30 p-4 rounded-xl flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-gray-600 group-hover:text-gray-400 cursor-grab active:cursor-grabbing transition-colors">
                          <GripVertical size={20} />
                        </div>

                        <div className="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center border border-white/5 p-2 overflow-hidden group-hover:border-white/10 transition-colors relative">
                          {rank.image ? (
                            <img
                              src={rank.image}
                              alt={rank.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Shield size={20} className="text-gray-600" />
                          )}
                          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                        </div>

                        <div>
                          <div className="font-bold text-white text-lg">
                            {rank.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              {rank.value} ELO
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-sm font-bold text-gray-600 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                          #{rank.order}
                        </div>
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 hover:border hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => handleDelete(rank.id)}
                          title="Törlés"
                        >
                          <Trash2 size={16} />
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
