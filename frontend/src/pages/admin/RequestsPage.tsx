
import { useState, useEffect } from "react";
import { useAppSelector } from "../../hooks/useRedux";
import { API_URL } from "../../config";
import { apiFetch } from "../../lib/api-client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Check, X, User, Shield } from "lucide-react";
import dict from "../../lib/dict";
import { toast } from "sonner";
import { ConfirmationModal } from "../../components/common/ConfirmationModal";

interface ChangeRequest {
    id: string;
    type: "USER_PROFILE" | "TEAM_PROFILE";
    entityId: string;
    entityName: string;
    requesterId: string;
    requester: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    data: any;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
}

export default function RequestsPage() {
    const [requests, setRequests] = useState<ChangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAppSelector((state) => state.auth);
    console.log(user);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: "danger" | "warning" | "info" | "primary" | "success";
        confirmLabel?: string;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        variant: "primary",
    });

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`${API_URL}/change-requests`);
            const data = await res.json();
            if (data.success) {
                setRequests(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch requests", error);
            toast.error("Nem sikerült letölteni a kérelmeket");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = (request: ChangeRequest, action: "approve" | "reject") => {
        setConfirmModal({
            isOpen: true,
            title: action === "approve" ? "Kérelem jóváhagyása" : "Kérelem elutasítása",
            message: `Biztosan ${action === "approve" ? "jóváhagyod" : "elutasítod"} ezt a kérelmet?`,
            variant: action === "approve" ? "success" : "danger",
            confirmLabel: action === "approve" ? "Jóváhagyás" : "Elutasítás",
            onConfirm: async () => {
                try {
                    const res = await apiFetch(`${API_URL}/change-requests/${request.id}/${action}`, {
                        method: "POST",
                    });
                    const data = await res.json();
                    if (data.success) {
                        toast.success(`Kérelem sikeresen ${action === "approve" ? "jóváhagyva" : "elutasítva"}`);
                        setRequests((prev) => prev.filter((r) => r.id !== request.id));
                        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                    } else {
                        throw new Error(data.error?.message || "Hiba történt");
                    }
                } catch (error: any) {
                    console.error(`Failed to ${action} request`, error);
                    toast.error(error.message || `Nem sikerült ${action === "approve" ? "jóváhagyni" : "elutasítani"} a kérelmet`);
                }
            },
        });
    };

    const closeConfirmModal = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    if (loading) {
        return <div className="p-8 text-center text-gray-400">Betöltés...</div>;
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2">Kérelmek</h1>
            <p className="text-gray-400 mb-8">Jóváhagyásra váró profil és csapat módosítások</p>

            {requests.length === 0 ? (
                <div className="bg-[#1a1b26] border border-white/5 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="text-green-500" size={32} />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">Nincs függőben lévő kérelem</h3>
                    <p className="text-gray-400">Jelenleg minden kérelem fel van dolgozva.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {requests.map((request) => (
                        <div key={request.id} className="bg-[#1a1b26] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
                            <div className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        {request.type === "USER_PROFILE" ? (
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                <User size={20} />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                <Shield size={20} />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                {request.type === "USER_PROFILE" ? "Felhasználói Profil" : "Csapat Profil"}
                                                <span className="text-gray-400 font-normal text-sm">
                                                    • {request.entityName}
                                                </span>
                                            </h3>
                                            <div className="text-sm text-gray-400 flex items-center gap-2">
                                                <span>Kérelmező: {request.requester.username}</span>
                                                <span>•</span>
                                                <span>{format(new Date(request.createdAt), "yyyy. MM. dd. HH:mm", { locale: hu })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleAction(request, "reject")}
                                            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-2 font-medium"
                                        >
                                            <X size={18} /> Elutasítás
                                        </button>
                                        <button
                                            onClick={() => handleAction(request, "approve")}
                                            className="px-4 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors flex items-center gap-2 font-medium"
                                        >
                                            <Check size={18} /> Jóváhagyás
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                    <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Változtatások</h4>
                                    <div className="space-y-3">
                                        {Object.entries(request.data).map(([key, value]) => (
                                            <div key={key} className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 md:gap-8 items-start py-2 border-b border-white/5 last:border-0">
                                                <div className="text-gray-400 font-medium">
                                                    {dict[key as keyof typeof dict] || key}
                                                </div>
                                                <div className="text-white break-all">
                                                    {key.toLowerCase().endsWith('url') && typeof value === 'string' ? (
                                                        <div className="flex items-center gap-4">
                                                            {value && (
                                                                <img src={value} alt="New" className="h-16 w-auto rounded-md object-contain bg-black/50" />
                                                            )}
                                                            <span className="text-xs text-gray-500 font-mono">{value ? 'Új kép feltöltve' : 'Kép törölve'}</span>
                                                        </div>
                                                    ) : (
                                                        String(value)
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant as any}
                confirmLabel={confirmModal.confirmLabel}
            />
        </div>
    );
}
