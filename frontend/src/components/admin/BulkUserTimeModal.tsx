import { useState } from "react";
import { toast } from "sonner";
import { X, Clock, Plus, Minus, RotateCcw } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { API_URL } from "../../config";

interface BulkUserTimeModalProps {
    userIds: string[];
    userCount: number;
    onClose: () => void;
    onSuccess: () => void;
}

export const BulkUserTimeModal: React.FC<BulkUserTimeModalProps> = ({
    userIds,
    userCount,
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

        if (userIds.length === 0) {
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
                className="bg-[#121A22] rounded-xl border border-border shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Clock className="text-primary" size={24} />
                        Tömeges Időkeret kezelés
                    </h2>
                    <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={onClose}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6 bg-secondary p-4 rounded-lg border border-border">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex flex-col items-center justify-center border border-primary/50 text-foreground">
                            <span className="font-bold">{userCount}</span>
                        </div>
                        <div>
                            <div className="font-bold text-foreground text-lg">
                                Érintett felhasználók: {userCount} fő
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Az alábbi művelet mindenkin végrehajtódik
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 bg-secondary p-1 rounded-lg mb-6">
                        <button
                            className={`flex-1 min-w-[30%] py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === "ADD"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                            onClick={() => setMode("ADD")}
                        >
                            <Plus size={16} /> Hozzáadás
                        </button>
                        <button
                            className={`flex-1 min-w-[30%] py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === "REMOVE"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                            onClick={() => setMode("REMOVE")}
                        >
                            <Minus size={16} /> Levonás
                        </button>
                        <button
                            className={`flex-1 min-w-[30%] py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === "ZERO"
                                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                            onClick={() => setMode("ZERO")}
                        >
                            <RotateCcw size={16} /> Nullázás
                        </button>
                    </div>

                    {mode !== "ZERO" && (
                        <div className="mb-6">
                            <label className="block text-muted-foreground text-sm font-bold mb-2">
                                Időtartam (perc)
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    min="1"
                                    className="flex-1 bg-secondary border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-blue-500/50"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAmount(30)}
                                        className="px-3 py-1 rounded border border-border text-sm hover:bg-secondary transition-colors"
                                    >
                                        30p
                                    </button>
                                    <button
                                        onClick={() => setAmount(60)}
                                        className="px-3 py-1 rounded border border-border text-sm hover:bg-secondary transition-colors"
                                    >
                                        1h
                                    </button>
                                    <button
                                        onClick={() => setAmount(120)}
                                        className="px-3 py-1 rounded border border-border text-sm hover:bg-secondary transition-colors"
                                    >
                                        2h
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-muted-foreground text-sm font-bold mb-2">
                            Indoklás (Kötelező)
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
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
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${reason === preset
                                        ? "bg-primary text-foreground border-primary"
                                        : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80 hover:text-foreground"
                                        }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-blue-500/50 min-h-[80px]"
                            placeholder="Írd ide az indoklást..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-end gap-3 bg-secondary">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Mégse
                    </button>
                    <button
                        className={`btn ${mode === "ADD"
                            ? "bg-green-600 hover:bg-green-700"
                            : mode === "REMOVE"
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-yellow-600 hover:bg-yellow-700 text-black"
                            } border-none font-medium`}
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
