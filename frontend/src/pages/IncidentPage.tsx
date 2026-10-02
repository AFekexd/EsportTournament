import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Monitor,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Send,
  HelpCircle,
} from "lucide-react";
import { apiFetch } from "../lib/api-client";
import { API_URL } from "../config";
import { useAuth } from "../hooks/useAuth";

// Types
interface Incident {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  computer?: {
    id: string;
    name: string;
  };
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

interface Computer {
  id: string;
  name: string;
  hostname?: string;
}

interface IncidentPageProps {
  hideHeader?: boolean;
}

const IncidentPage = ({ hideHeader = false }: IncidentPageProps) => {
  const { isAuthenticated } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    computerId: "general", // 'general' or UUID
    priority: "MEDIUM",
  });

  const fetchData = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [myIncidentsRes, computersRes] = await Promise.all([
        apiFetch(`${API_URL}/incidents/my`).catch(() => null),
        apiFetch(`${API_URL}/kiosk/computers`).catch(() => null),
      ]);

      if (myIncidentsRes) {
        const data = await myIncidentsRes.json();
        setIncidents(Array.isArray(data) ? data : data.data || []);
      }

      if (computersRes) {
        const data = await computersRes.json();
        setComputers(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      // toast.error('Hiba történt az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      toast.error("Kérlek tölts ki minden kötelező mezőt!");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...formData,
        computerId:
          formData.computerId === "general" ? null : formData.computerId,
      };

      const res = await apiFetch(`${API_URL}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Incidens sikeresen beküldve!");
        setShowForm(false);
        setFormData({
          title: "",
          description: "",
          computerId: "general",
          priority: "MEDIUM",
        });
        fetchData(); // Refresh list
      } else {
        toast.error("Hiba történt a beküldéskor.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Hiba történt a beküldéskor.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string; icon: any }> =
    {
      OPEN: {
        label: "Nyitott",
        color: "text-red-400 bg-red-400/10 border-red-400/20",
        icon: AlertTriangle,
      },
      IN_PROGRESS: {
        label: "Folyamatban",
        color: "text-primary bg-primary/20 border-primary/20",
        icon: Loader2,
      },
      RESOLVED: {
        label: "Megoldva",
        color: "text-green-400 bg-green-400/10 border-green-400/20",
        icon: CheckCircle,
      },
      CLOSED: {
        label: "Lezárva",
        color: "text-muted-foreground bg-gray-400/10 border-gray-400/20",
        icon: XCircle,
      },
    };

    const item = config[status] || {
      label: status,
      color: "text-muted-foreground",
      icon: HelpCircle,
    };
    const Icon = item.icon;

    return (
      <span
        className={`tactical-badge flex items-center gap-1.5 ${item.color}`}
      >
        <Icon size={12} />
        {item.label}
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 tactical-card text-center my-8">
        <div className="w-16 h-16 bg-secondary rounded border border-border flex items-center justify-center mb-4 text-muted-foreground">
          <Monitor size={32} />
        </div>
        <h3 className="font-display text-xl font-bold uppercase tracking-wider text-foreground mb-2">
          Nem vagy bejelentkezve
        </h3>
        <p className="text-muted-foreground text-sm font-mono">Jelentkezz be az incidensek bejelentéséhez.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Tactical Header */}
      {!hideHeader ? (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border/60 pb-6">
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded border border-border bg-secondary/80 px-3 py-1 font-mono text-xs uppercase tracking-wider text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>LABOR INCIDENSKEZELŐ // HARDWARE & DESK STATUS</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-foreground">
              INCIDENS <span className="text-amber-400">JELENTÉS</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Hardveres meghibásodás a teremben vagy hiba az esport munkaállomáson? Jelentsd be és a laborfelelősök megoldják.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-display font-bold uppercase tracking-wider text-sm transition-all shadow-md shadow-amber-500/20"
          >
            {showForm ? <XCircle size={16} /> : <Plus size={16} />}
            <span>{showForm ? "Mégse" : "Új bejelentés"}</span>
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center bg-secondary/30 p-4 rounded border border-border">
          <p className="text-sm text-muted-foreground">
            Itt jelentheted a géptermi gépek, monitorok vagy perifériák hardveres problémáit.
          </p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-display font-bold uppercase tracking-wider text-xs transition-all shadow-md shadow-amber-500/20"
          >
            {showForm ? <XCircle size={14} /> : <Plus size={14} />}
            <span>{showForm ? "Mégse" : "Új labor incidens"}</span>
          </button>
        </div>
      )}

      {showForm && (
        <div className="tactical-card p-6 sm:p-8 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-border">
            <div className="p-2.5 bg-secondary rounded border border-border text-amber-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">Új Incidens Bejelentése</h2>
              <p className="text-xs text-muted-foreground">Add meg a meghibásodott eszköz vagy laborprobléma adatait</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground ml-1">
                Tárgy / Probléma megnevezése *
              </label>
              <input
                type="text"
                className="w-full h-10 px-4 bg-secondary/40 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-400/50 text-sm"
                placeholder="Pl. Nem működik a bal oldali fejhallgató jack aljzata..."
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground ml-1">
                  Érintett munkaállomás
                </label>
                <div className="relative">
                  <Monitor
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    size={16}
                  />
                  <select
                    className="w-full h-10 pl-10 pr-4 bg-secondary/40 border border-border rounded text-foreground focus:outline-none focus:border-amber-400/50 text-sm cursor-pointer"
                    value={formData.computerId}
                    onChange={(e) =>
                      setFormData({ ...formData, computerId: e.target.value })
                    }
                  >
                    <option value="general" className="bg-card">Általános / Nem konkrét gép</option>
                    {computers.map((pc) => (
                      <option
                        key={pc.id}
                        value={pc.id}
                        className="bg-card"
                      >
                        {pc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground ml-1">
                  Prioritás
                </label>
                <select
                  className="w-full h-10 px-4 bg-secondary/40 border border-border rounded text-foreground focus:outline-none focus:border-amber-400/50 text-sm cursor-pointer"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                >
                  <option value="LOW" className="bg-card">
                    Alacsony (Nem akadályoz)
                  </option>
                  <option value="MEDIUM" className="bg-card">
                    Normál
                  </option>
                  <option value="HIGH" className="bg-card">
                    Magas (Zavarja a játékot)
                  </option>
                  <option value="CRITICAL" className="bg-card">
                    Kritikus (Használhatatlan PC)
                  </option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground ml-1">
                Részletes leírás *
              </label>
              <textarea
                rows={4}
                className="w-full px-4 py-2.5 bg-secondary/40 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-400/50 text-sm resize-none"
                placeholder="Írd le részletesen, mi a hiba és hogyan lehet reprodukálni..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded bg-amber-500 hover:bg-amber-400 text-black font-display font-bold uppercase tracking-wider text-sm transition-all shadow-md shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Beküldés...</span>
                </>
              ) : (
                <>
                  <Send size={16} /> <span>Incidens Beküldése</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" /> Korábbi bejelentéseim
        </h2>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="animate-spin text-amber-400" size={28} />
          </div>
        ) : incidents.length === 0 ? (
          <div className="tactical-card p-12 text-center flex flex-col items-center justify-center">
            <CheckCircle className="w-10 h-10 text-muted-foreground mb-3 opacity-30" />
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-foreground mb-1">
              Nincs bejelentett incidens
            </h3>
            <p className="text-muted-foreground text-xs font-mono">
              Még nem jelentettél be hibát, vagy minden incidens megoldódott.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="tactical-card p-5 relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h3
                      className="font-bold text-foreground truncate pr-2 text-sm"
                      title={incident.title}
                    >
                      {incident.title}
                    </h3>
                    {getStatusBadge(incident.status)}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(incident.createdAt).toLocaleDateString("hu-HU")}
                    </span>
                    {incident.computer && (
                      <span className="flex items-center gap-1 text-primary">
                        <Monitor size={11} />
                        {incident.computer.name}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                    {incident.description}
                  </p>
                </div>

                {incident.resolutionNote && (
                  <div className="bg-secondary/60 p-3 rounded border border-border mt-auto">
                    <span className="block text-[11px] font-mono font-semibold uppercase text-emerald-400 mb-0.5">
                      Megoldás / Válasz:
                    </span>
                    <p className="text-xs text-secondary-foreground">
                      {incident.resolutionNote}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentPage;
