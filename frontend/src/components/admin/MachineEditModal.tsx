import React, { useState, useEffect } from "react";
import { useAppDispatch } from "../../hooks/useRedux";
import { updateComputer, fetchComputers } from "../../store/slices/bookingsSlice";
import { updateMachineStatus } from "../../store/slices/kioskSlice";
import { X, Save, Plus } from "lucide-react";
import type { Computer } from "../../types";
import { toast } from "sonner";
import { authService } from "../../lib/auth-service";
import { API_URL } from "../../config";

interface MachineEditModalProps {
    computer?: Computer | null;
    isOpen: boolean;
    onClose: () => void;
}

export function MachineEditModal({
    computer,
    isOpen,
    onClose,
}: MachineEditModalProps) {
    const dispatch = useAppDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState(computer?.name || "");
    const [row, setRow] = useState(computer?.row || 0);
    const [position, setPosition] = useState(computer?.position || 0);
    const [status, setStatus] = useState<"AVAILABLE" | "MAINTENANCE" | "OUT_OF_ORDER">(computer?.status || "AVAILABLE");
    const [isActive, setIsActive] = useState(computer?.isActive ?? true);
    const [specs, setSpecs] = useState({
        cpu: computer?.specs?.cpu || "",
        gpu: computer?.specs?.gpu || "",
        ram: computer?.specs?.ram || "",
        monitor: computer?.specs?.monitor || "",
        storage: computer?.specs?.storage || "",
    });
    const [installedGames, setInstalledGames] = useState<string[]>(
        computer?.installedGames || []
    );
    const [newGame, setNewGame] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName(computer?.name || "");
            setRow(computer?.row || 0);
            setPosition(computer?.position || 0);
            setStatus(computer?.status || "AVAILABLE");
            setIsActive(computer?.isActive ?? true);
            setSpecs({
                cpu: computer?.specs?.cpu || "",
                gpu: computer?.specs?.gpu || "",
                ram: computer?.specs?.ram || "",
                monitor: computer?.specs?.monitor || "",
                storage: computer?.specs?.storage || "",
            });
            setInstalledGames(computer?.installedGames || []);
        }
    }, [isOpen, computer]);

    if (!isOpen) return null;

    const handleAddGame = (e: React.FormEvent) => {
        e.preventDefault();
        if (newGame.trim()) {
            if (!installedGames.includes(newGame.trim())) {
                setInstalledGames([...installedGames, newGame.trim()]);
            }
            setNewGame("");
        }
    };

    const handleRemoveGame = (gameToRemove: string) => {
        setInstalledGames(installedGames.filter((g) => g !== gameToRemove));
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            const data = {
                name,
                row,
                position,
                status,
                isActive,
                specs,
                installedGames,
            };

            const token = authService.keycloak?.token;
            if (!token) throw new Error("Nincs bejelentkezve");

            if (computer) {
                // Update via API
                await dispatch(updateComputer({ id: computer.id, ...data })).unwrap();

                // Update local kiosk state
                dispatch(updateMachineStatus({
                    id: computer.id,
                    ...data
                }));
                toast.success("Gép adatai sikeresen frissítve");
            } else {
                // Create new via fetch directly or add thunk
                // Since I removed ComputerModal which used fetch directly, I can do checking here
                // But bookingsSlice.ts doesn't seem to have createComputer yet?
                // ComputerModal had: fetch(`${API_URL}/bookings/computers`, { method: 'POST', ... })

                const response = await fetch(`${API_URL}/bookings/computers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || "Hiba történt a létrehozás során");
                }

                dispatch(fetchComputers());
                toast.success("Új gép sikeresen létrehozva");
            }

            onClose();
        } catch (error: any) {
            console.error("Failed to save computer:", error);
            toast.error(error.message || "Hiba történt a mentés során");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div
                className="bg-[#161722] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {computer ? `Gép Szerkesztése: ${computer.name}` : "Új Gép Létrehozása"}
                        </h2>
                        <p className="text-sm text-gray-400">
                            {computer ? "Adatok, specifikációk és játékok kezelése" : "Adatok megadása az új géphez"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                    {/* Alapadatok */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-2">
                            Alapadatok
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Gép neve</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#0f1015] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary/50 focus:outline-none transition-colors mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400">Sor (0-tól)</label>
                                    <input
                                        type="number"
                                        value={row}
                                        onChange={(e) => setRow(parseInt(e.target.value))}
                                        className="w-full bg-[#0f1015] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary/50 focus:outline-none transition-colors mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Pozíció (0-tól)</label>
                                    <input
                                        type="number"
                                        value={position}
                                        onChange={(e) => setPosition(parseInt(e.target.value))}
                                        className="w-full bg-[#0f1015] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary/50 focus:outline-none transition-colors mt-1"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400">Státusz</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as any)}
                                        className="w-full bg-[#0f1015] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary/50 focus:outline-none transition-colors mt-1"
                                    >
                                        <option value="AVAILABLE">Elérhető</option>
                                        <option value="MAINTENANCE">Karbantartás</option>
                                        <option value="OUT_OF_ORDER">Üzemen kívül</option>
                                    </select>
                                </div>
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-600 bg-[#0f1015] text-primary focus:ring-primary"
                                        />
                                        <span className="text-white">Aktív (Látható)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Specifikációk */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-2">
                            Hardver Specifikációk
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Processzor (CPU)</label>
                                <input
                                    type="text"
                                    value={specs.cpu}
                                    onChange={(e) => setSpecs({ ...specs, cpu: e.target.value })}
                                    placeholder="pl. Intel Core i7-12700K"
                                    className="w-full bg-[#0f1015] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary/50 focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Videókártya (GPU)</label>
                                <input
                                    type="text"
                                    value={specs.gpu}
                                    onChange={(e) => setSpecs({ ...specs, gpu: e.target.value })}
                                    placeholder="pl. NVIDIA RTX 4070"
                                    className="w-full bg-[#0f1015] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary/50 focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Memória (RAM)</label>
                                <input
                                    type="text"
                                    value={specs.ram}
                                    onChange={(e) => setSpecs({ ...specs, ram: e.target.value })}
                                    placeholder="pl. 32GB DDR5"
                                    className="w-full bg-[#0f1015] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary/50 focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Monitor</label>
                                <input
                                    type="text"
                                    value={specs.monitor}
                                    onChange={(e) =>
                                        setSpecs({ ...specs, monitor: e.target.value })
                                    }
                                    placeholder="pl. Samsung Odyssey G5 27"
                                    className="w-full bg-[#0f1015] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary/50 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Játékok */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-2">
                            Telepített Játékok
                        </h3>

                        <form onSubmit={handleAddGame} className="flex gap-2">
                            <input
                                type="text"
                                value={newGame}
                                onChange={(e) => setNewGame(e.target.value)}
                                placeholder="Új játék hozzáadása..."
                                className="flex-1 bg-[#0f1015] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary/50 focus:outline-none transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!newGame.trim()}
                                className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Hozzáadás
                            </button>
                        </form>

                        <div className="flex flex-wrap gap-2 min-h-[100px] bg-[#0f1015]/50 rounded-xl p-4 border border-white/5">
                            {installedGames.length === 0 ? (
                                <p className="text-gray-500 text-sm italic w-full text-center py-8">
                                    Nincsenek telepített játékok rögzítve
                                </p>
                            ) : (
                                installedGames.map((game, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2b36] rounded-lg border border-white/5 group"
                                    >
                                        <span className="text-sm text-gray-200">{game}</span>
                                        <button
                                            onClick={() => handleRemoveGame(game)}
                                            className="text-gray-500 hover:text-red-400 transition-colors p-0.5 rounded-md hover:bg-white/5"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium"
                    >
                        Mégse
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors font-medium shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        Mentés
                    </button>
                </div>
            </div>
        </div>
    );
}
