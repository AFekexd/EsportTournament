import { useState } from "react";
import { toast } from "sonner";
import { X, Clock, Plus, Minus, RotateCcw } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { API_URL } from "../../config";

interface BulkUserTimeModalProps {
    userIds: string[];
    userCount: number;
    selectAll?: boolean;
    filters?: {
        role: string;
        search: string;
    };
    onClose: () => void;
    onSuccess: () => void;
}

export const BulkUserTimeModal: React.FC<BulkUserTimeModalProps> = ({
    userIds,
    userCount,
    selectAll,
    filters,
    onClose,
    onSuccess,
}) => {
    const { getToken } = useAuth();
    const [amount, setAmount] = useState<number>(60);
    const [reason, setReason] = useState<string>("");
    const [mode, setMode] = useState<"ADD" | "REMOVE" | "ZERO">("ADD");
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!reason.trim()) {
            toast.error("Meg kell adnod egy indoklást!");
            return;
        }

        if (!selectAll && userIds.length === 0) {
            toast.error("Nincs kijelölt felhasználó!");
            return;
        }

        setIsLoading(true);
        try {
            const validToken = await getToken();
            if (!validToken) return;

            const response = await fetch(`${API_URL}/admin/kiosk/users/bulk-time`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${validToken}`,
                },
                body: JSON.stringify({
                    userIds,
                    selectAll,
                    filters,
                    action: mode,
                    seconds: amount * 60,
                    reason
                }),
            });

            if (response.ok) {
                toast.success(`${userCount} felhasználó időkerete frissítve.`);
                onSuccess();
                onClose();
            } else {
                const errData = await response.json();
                toast.error(`Hiba: ${errData.error || errData.message || "Sikertelen módosítás"}`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Hiba történt a kommunikáció során");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div
                className="tactical-card rounded-lg border border-border shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center bg-card/95 backdrop-blur-md">
                    <h2 className="text-xl font-display font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Clock className="text-primary" size={20} />
                        Tömeges Időkeret kezelés
                    </h2>
                    <button
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/80"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6 bg-secondary/40 p-4 rounded border border-border/80">
                        <div className="w-12 h-12 rounded bg-primary/20 flex flex-col items-center justify-center border border-primary/50 text-foreground">
                            <span className="font-mono font-bold text-base text-primary">{userCount}</span>
                        </div>
                        <div>
                            <div className="font-display font-bold text-foreground text-sm uppercase">
                                Érintett felhasználók: {userCount} fő
                            </div>
                            <div className="text-muted-foreground font-mono text-xs">
                                Az alábbi művelet mindenkin végrehajtódik
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 bg-secondary/60 p-1.5 rounded border border-border/80 mb-6">
                        <button
                            className={`flex-1 min-w-[30%] py-2 rounded text-xs font-mono uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-1.5 ${mode === "ADD"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                            onClick={() => setMode("ADD")}
                        >
                            <Plus size={14} /> Hozzáadás
                        </button>
                        <button
                            className={`flex-1 min-w-[30%] py-2 rounded text-xs font-mono uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-1.5 ${mode === "REMOVE"
                                ? "bg-destructive/20 text-destructive border border-destructive/40"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                            onClick={() => setMode("REMOVE")}
                        >
                            <Minus size={14} /> Levonás
                        </button>
                        <button
                            className={`flex-1 min-w-[30%] py-2 rounded text-xs font-mono uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-1.5 ${mode === "ZERO"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                            onClick={() => setMode("ZERO")}
                        >
                            <RotateCcw size={14} /> Nullázás
                        </button>
                    </div>

                    {mode !== "ZERO" && (
                        <div className="mb-6">
                            <label className="block text-muted-foreground text-xs font-mono uppercase tracking-wider font-bold mb-1.5">
                                Időtartam (perc)
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="1"
                                    className="flex-1 bg-secondary/80 border border-border rounded px-4 py-2 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                />
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setAmount(30)}
                                        className="px-3 py-2 rounded border border-border bg-secondary font-mono text-xs uppercase hover:bg-secondary/80 text-foreground transition-colors"
                                    >
                                        30p
                                    </button>
                                    <button
                                        onClick={() => setAmount(60)}
                                        className="px-3 py-2 rounded border border-border bg-secondary font-mono text-xs uppercase hover:bg-secondary/80 text-foreground transition-colors"
                                    >
                                        1h
                                    </button>
                                    <button
                                        onClick={() => setAmount(120)}
                                        className="px-3 py-2 rounded border border-border bg-secondary font-mono text-xs uppercase hover:bg-secondary/80 text-foreground transition-colors"
                                    >
                                        2h
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-muted-foreground text-xs font-mono uppercase tracking-wider font-bold mb-1.5">
                            Indoklás (Kötelező)
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {[
                                "Nyeremény",
                                "Jutalomból",
                                "Technikai kompenzáció",
                                "Büntetés",
                                "Időkeret lenullázása",
                                "Egyéb"
                            ].map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => setReason(preset)}
                                    className={`px-2.5 py-1 rounded font-mono text-xs uppercase tracking-wider transition-colors ${reason === preset
                                        ? "bg-primary text-primary-foreground font-bold border border-primary"
                                        : "bg-secondary text-muted-foreground border border-border hover:text-foreground"
                                        }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="w-full bg-secondary/80 border border-border rounded px-4 py-2.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary min-h-[80px]"
                            placeholder="Írd ide az indoklást..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-end gap-3 bg-card/95">
                    <button
                        className="px-5 py-2.5 rounded border border-border text-foreground bg-secondary/80 hover:bg-secondary transition-colors font-mono text-xs uppercase tracking-wider font-semibold"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Mégse
                    </button>
                    <button
                        className={`px-5 py-2.5 rounded font-mono text-xs uppercase tracking-wider font-bold shadow-md transition-all ${mode === "ADD"
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                            : mode === "REMOVE"
                                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20"
                                : "bg-amber-600 hover:bg-amber-500 text-black shadow-amber-600/20"
                            }`}
                        onClick={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading
                            ? "Folyamatban..."
                            : mode === "ADD"
                                ? "Idő jóváírása"
                                : mode === "REMOVE"
                                    ? "Idő levonása"
                                    : "Összes nullázása"}
                    </button>
                </div>
            </div>
        </div>
    );
};
