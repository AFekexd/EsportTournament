import { useState, useEffect } from "react";
import { API_URL } from "../../config";
import { apiFetch } from "../../lib/api-client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Check, X, User, Shield, RefreshCw } from "lucide-react";
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
  currentData?: any;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  adminNote?: string;
  processedById?: string;
  processedAt?: string;
  createdAt: string;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  // Rejection Modal State
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    request: ChangeRequest | null;
    reason: string;
  }>({
    isOpen: false,
    request: null,
    reason: "",
  });

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
    onConfirm: () => {},
    variant: "primary",
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const statusParam =
        activeTab === "pending" ? "PENDING" : "APPROVED,REJECTED";
      const res = await apiFetch(
        `${API_URL}/change-requests?status=${statusParam}`,
      );
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
  }, [activeTab]);

  const handleAction = (
    request: ChangeRequest,
    action: "approve" | "reject",
  ) => {
    if (action === "reject") {
      setRejectModal({
        isOpen: true,
        request,
        reason: "",
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Kérelem jóváhagyása",
      message: "Biztosan jóváhagyod ezt a kérelmet?",
      variant: "success",
      confirmLabel: "Jóváhagyás",
      onConfirm: async () => {
        try {
          const res = await apiFetch(
            `${API_URL}/change-requests/${request.id}/approve`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            },
          );
          const data = await res.json();
          if (data.success) {
            toast.success("Kérelem sikeresen jóváhagyva");
            setRequests((prev) => prev.filter((r) => r.id !== request.id));
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            window.dispatchEvent(new CustomEvent("requests-updated"));
          } else {
            throw new Error(data.error?.message || "Hiba történt");
          }
        } catch (error: any) {
          console.error(`Failed to approve request`, error);
          toast.error(error.message || "Nem sikerült jóváhagyni a kérelmet");
        }
      },
    });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.request || !rejectModal.reason.trim()) {
      toast.error("Kérlek add meg az elutasítás indokát!");
      return;
    }

    try {
      const res = await apiFetch(
        `${API_URL}/change-requests/${rejectModal.request.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectModal.reason }),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Kérelem törölve/elutasítva");
        setRequests((prev) =>
          prev.filter((r) => r.id !== rejectModal.request!.id),
        );
        setRejectModal((prev) => ({ ...prev, isOpen: false }));
        window.dispatchEvent(new CustomEvent("requests-updated"));
      } else {
        throw new Error(data.error?.message || "Hiba történt");
      }
    } catch (error: any) {
      console.error(`Failed to reject request`, error);
      toast.error(error.message || "Nem sikerült elutasítani a kérelmet");
    }
  };

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Kérelmek</h1>
          <p className="text-gray-400">
            Jóváhagyásra váró profil és csapat módosítások
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "pending"
                  ? "bg-primary text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Váratlanok
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "history"
                  ? "bg-primary text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Előzmények
            </button>
          </div>
          <button
            onClick={fetchRequests}
            className="flex items-center gap-2 p-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white border border-white/10"
            title="Frissítés"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-[#1a1b26] border border-white/5 rounded-2xl p-12 text-center animate-fade-in">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-500" size={32} />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            Nincs {activeTab === "pending" ? "függőben lévő" : ""} kérelem
          </h3>
          <p className="text-gray-400">
            {activeTab === "pending"
              ? "Jelenleg minden kérelem fel van dolgozva."
              : "Még nincsenek előzmények."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-[#1a1b26] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors animate-slide-up"
            >
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
                        {request.type === "USER_PROFILE"
                          ? "Felhasználói Profil"
                          : "Csapat Profil"}
                        <span className="text-gray-400 font-normal text-sm">
                          • {request.entityName}
                        </span>
                        {/* Status Badge for History Tab */}
                        {activeTab === "history" && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ml-2 ${
                              request.status === "APPROVED"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            }`}
                          >
                            {request.status === "APPROVED"
                              ? "Elfogadva"
                              : "Elutasítva"}
                          </span>
                        )}
                      </h3>
                      <div className="text-sm text-gray-400 flex items-center gap-2">
                        <span>Kérelmező: {request.requester.username}</span>
                        <span>•</span>
                        <span>
                          {format(
                            new Date(request.createdAt),
                            "yyyy. MM. dd. HH:mm",
                            { locale: hu },
                          )}
                        </span>
                      </div>

                      {/* Processed By info for History */}
                      {activeTab === "history" && request.processedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Feldolgozva:{" "}
                          {format(
                            new Date(request.processedAt),
                            "yyyy. MM. dd. HH:mm",
                            { locale: hu },
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {activeTab === "pending" && (
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
                  )}
                </div>

                {/* Rejection Reason display in History */}
                {activeTab === "history" &&
                  request.status === "REJECTED" &&
                  request.rejectionReason && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
                      <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
                        Elutasítás indoka
                      </div>
                      <div className="text-white text-sm">
                        {request.rejectionReason}
                      </div>
                    </div>
                  )}

                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">
                    Változtatások
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(request.data).map(([key, value]) => {
                      const oldValue = request.currentData?.[key];
                      const isUrl = key.toLowerCase().endsWith("url");

                      return (
                        <div
                          key={key}
                          className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 md:gap-8 items-start py-2 border-b border-white/5 last:border-0"
                        >
                          <div className="text-gray-400 font-medium">
                            {dict[key as keyof typeof dict] || key}
                          </div>
                          <div className="text-white break-all">
                            {isUrl && typeof value === "string" ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-4">
                                  {/* Old Image */}
                                  {oldValue && (
                                    <div className="relative group">
                                      <img
                                        src={oldValue}
                                        alt="Old"
                                        className="h-16 w-auto rounded-md object-contain bg-black/50 grayscale opacity-70"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                        <span className="text-xs text-white">
                                          Régi
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {oldValue && (
                                    <div className="text-gray-500">→</div>
                                  )}

                                  {/* New Image */}
                                  {value && (
                                    <div className="relative">
                                      <img
                                        src={value}
                                        alt="New"
                                        className="h-16 w-auto rounded-md object-contain bg-black/50 border border-green-500/30"
                                      />
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 font-mono">
                                  {value
                                    ? oldValue
                                      ? "Kép lecserélése"
                                      : "Új kép feltöltve"
                                    : "Kép törölve"}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                {oldValue !== undefined &&
                                  oldValue !== value && (
                                    <>
                                      <span className="line-through text-gray-500 decoration-red-500/50 decoration-2">
                                        {String(oldValue)}
                                      </span>
                                      <span className="text-gray-500">→</span>
                                    </>
                                  )}
                                <span
                                  className={
                                    oldValue !== undefined && oldValue !== value
                                      ? "text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded"
                                      : ""
                                  }
                                >
                                  {String(value)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a1b26] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-2">
              Kérelem elutasítása
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Kérlek pótold az elutasítás okát, amit a felhasználó is meg fog
              kapni.
            </p>

            <textarea
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
              }
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 min-h-[100px] mb-6 resize-none"
              placeholder="Pl.: Nem megfelelő profilkép, trágár kifejezés..."
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setRejectModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectModal.reason.trim()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Elutasítás
              </button>
            </div>
          </div>
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
