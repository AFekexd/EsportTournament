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
    onConfirm: () => { },
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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary mb-2">
            <Shield size={14} className="text-primary" />
            <span>Rendszerkezelés // Profil Jóváhagyás</span>
          </div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-foreground">
            Kérelmek
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Jóváhagyásra váró profil és csapat módosítások moderációja
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-secondary/80 rounded p-1 border border-border">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all ${activeTab === "pending"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Függőben
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all ${activeTab === "history"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Előzmények
            </button>
          </div>
          <button
            onClick={fetchRequests}
            className="flex items-center justify-center p-2 bg-secondary/80 hover:bg-secondary rounded transition-colors text-muted-foreground hover:text-foreground border border-border"
            title="Frissítés"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="tactical-card p-12 text-center">
          <div className="w-12 h-12 bg-secondary/80 border border-border rounded flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <Check size={24} />
          </div>
          <h3 className="text-base font-display font-bold uppercase tracking-wider text-foreground mb-1">
            Nincs {activeTab === "pending" ? "függőben lévő" : ""} kérelem
          </h3>
          <p className="text-sm font-mono text-muted-foreground">
            {activeTab === "pending"
              ? "Jelenleg minden kérelem feldolgozásra került."
              : "Még nincsenek korábbi előzmények."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {requests.map((request) => (
            <div
              key={request.id}
              className="tactical-card overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    {request.type === "USER_PROFILE" ? (
                      <div className="w-10 h-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                        <User size={18} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                        <Shield size={18} />
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-display font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                        {request.type === "USER_PROFILE"
                          ? "Felhasználói Profil"
                          : "Csapat Profil"}
                        <span className="text-muted-foreground font-mono font-normal text-xs">
                          // {request.requester.displayName || request.entityName}
                        </span>
                        {/* Status Badge for History Tab */}
                        {activeTab === "history" && (
                          <span
                            className={`tactical-badge text-[10px] ml-2 ${request.status === "APPROVED"
                              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                              : "border-destructive/40 text-destructive bg-destructive/10"
                              }`}
                          >
                            {request.status === "APPROVED"
                              ? "Elfogadva"
                              : "Elutasítva"}
                          </span>
                        )}
                      </h3>
                      <div className="text-xs font-mono text-muted-foreground flex items-center gap-2 mt-1">
                        <span>Kérelmező: {request.requester.displayName || request.requester.username}</span>
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
                        <div className="text-xs font-mono text-muted-foreground mt-1">
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(request, "reject")}
                        className="px-3 py-1.5 rounded bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      >
                        <X size={14} /> Elutasítás
                      </button>
                      <button
                        onClick={() => handleAction(request, "approve")}
                        className="px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      >
                        <Check size={14} /> Jóváhagyás
                      </button>
                    </div>
                  )}
                </div>

                {/* Rejection Reason display in History */}
                {activeTab === "history" &&
                  request.status === "REJECTED" &&
                  request.rejectionReason && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded p-3 mb-4 font-mono text-xs">
                      <div className="text-destructive font-bold uppercase tracking-wider mb-1">
                        Elutasítás indoka
                      </div>
                      <div className="text-foreground">
                        {request.rejectionReason}
                      </div>
                    </div>
                  )}

                <div className="bg-secondary/40 rounded p-4 border border-border">
                  <h4 className="text-xs font-mono font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                    Változtatási Adatok
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(request.data).map(([key, value]) => {
                      const oldValue = request.currentData?.[key];
                      const isUrl = key.toLowerCase().endsWith("url");

                      return (
                        <div
                          key={key}
                          className="bg-card rounded p-3 border border-border"
                        >
                          <div className="text-xs font-mono font-bold text-primary uppercase tracking-wider mb-2">
                            {dict[key as keyof typeof dict] || key}
                          </div>
                          <div className="text-foreground">
                            {isUrl && typeof value === "string" ? (
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-4">
                                  {/* Old Image */}
                                  {oldValue && (
                                    <div className="flex flex-col items-center gap-1.5">
                                      <span className="text-[10px] font-mono font-bold text-destructive uppercase tracking-wider bg-destructive/10 border border-destructive/30 px-1.5 py-0.5 rounded">
                                        Régi
                                      </span>
                                      <img
                                        src={oldValue}
                                        alt="Old"
                                        className="h-20 w-20 rounded object-cover bg-secondary border border-destructive/40 opacity-70"
                                      />
                                    </div>
                                  )}

                                  {oldValue && (
                                    <div className="text-xl text-muted-foreground font-mono">→</div>
                                  )}

                                  {/* New Image */}
                                  {value && (
                                    <div className="flex flex-col items-center gap-1.5">
                                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                        Új
                                      </span>
                                      <img
                                        src={value}
                                        alt="New"
                                        className="h-20 w-20 rounded object-cover bg-secondary border border-emerald-500/50"
                                      />
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">
                                  {value
                                    ? oldValue
                                      ? "Kép lecserélése"
                                      : "Új kép feltöltve"
                                    : "Kép törölve"}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                                {oldValue !== undefined &&
                                  oldValue !== value && (
                                    <>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Régi</span>
                                        <span className="line-through text-muted-foreground decoration-destructive/50 decoration-2 bg-destructive/10 px-2.5 py-1 rounded border border-destructive/20">
                                          {String(oldValue)}
                                        </span>
                                      </div>
                                      <span className="text-base text-muted-foreground">→</span>
                                    </>
                                  )}
                                <div className="flex flex-col gap-1">
                                  {oldValue !== undefined && oldValue !== value && (
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Új</span>
                                  )}
                                  <span
                                    className={
                                      oldValue !== undefined && oldValue !== value
                                        ? "text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30"
                                        : "text-foreground"
                                    }
                                  >
                                    {String(value)}
                                  </span>
                                </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="tactical-card w-full max-w-md p-6">
            <h3 className="text-lg font-display font-bold uppercase tracking-tight text-foreground mb-1">
              Kérelem elutasítása
            </h3>
            <p className="text-muted-foreground font-mono text-xs mb-4">
              Kérlek add meg az elutasítás pontos okát, amit a felhasználó is meg fog kapni.
            </p>

            <textarea
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
              }
              className="w-full bg-secondary/80 border border-border rounded p-3 text-foreground font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:border-destructive min-h-[100px] mb-6 resize-none"
              placeholder="Pl.: Nem megfelelő profilkép, szabálytalan csapatnév..."
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setRejectModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-3.5 py-1.5 bg-secondary border border-border rounded text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectModal.reason.trim()}
                className="px-3.5 py-1.5 bg-destructive hover:bg-destructive/90 rounded text-xs font-mono font-bold uppercase tracking-wider text-destructive-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
