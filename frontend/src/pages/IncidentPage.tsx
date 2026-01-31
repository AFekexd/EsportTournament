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

const IncidentPage = () => {
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
          color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
          icon: Loader2,
        },
        RESOLVED: {
          label: "Megoldva",
          color: "text-green-400 bg-green-400/10 border-green-400/20",
          icon: CheckCircle,
        },
        CLOSED: {
          label: "Lezárva",
          color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
          icon: XCircle,
        },
      };

    const item = config[status] || {
      label: status,
      color: "text-gray-400",
      icon: HelpCircle,
    };
    const Icon = item.icon;

    return (
      <span
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${item.color}`}
      >
        <Icon size={12} />
        {item.label}
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-20 glass-card rounded-2xl bg-[#0a0a0f]/50 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-2">
            Nem vagy bejelentkezve
          </h3>
          <p className="text-gray-400">Jelentkezz be a hibajelentéshez.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="mb-12 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 blur-[100px] rounded-full -z-10" />
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-yellow-200 to-yellow-500 bg-clip-text text-transparent mb-4">
          Incidens Jelentés
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Hiba a teremben? Probléma a géppel? Jelentsd be itt!
        </p>
      </div>

      <div className="flex justify-end mb-8 max-w-6xl mx-auto">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-medium hover:brightness-110 transition-all shadow-lg shadow-yellow-500/20"
        >
          {showForm ? <XCircle size={20} /> : <Plus size={20} />}
          {showForm ? "Mégse" : "Új bejelentés"}
        </button>
      </div>

      {showForm && (
        <div className="max-w-3xl mx-auto mb-12 glass-card rounded-2xl p-8 bg-[#0f1016] border border-white/5 animate-slide-up">
          <h2 className="text-2xl font-bold text-white mb-6">Új Incidens</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">
                Tárgy / Probléma *
              </label>
              <input
                type="text"
                className="w-full px-5 py-4 bg-[#0a0a0f]/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-all"
                placeholder="Pl. Nem működik a fejhallgató..."
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">
                  Érintett eszköz
                </label>
                <div className="relative">
                  <Monitor
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <select
                    className="w-full pl-12 pr-5 py-4 bg-[#0a0a0f]/50 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-yellow-500/50 transition-all"
                    value={formData.computerId}
                    onChange={(e) =>
                      setFormData({ ...formData, computerId: e.target.value })
                    }
                  >
                    <option value="general">Általános / Nem konkrét gép</option>
                    {computers.map((pc) => (
                      <option
                        key={pc.id}
                        value={pc.id}
                        className="bg-[#0a0a0f]"
                      >
                        {pc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">
                  Prioritás
                </label>
                <select
                  className="w-full px-5 py-4 bg-[#0a0a0f]/50 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-yellow-500/50 transition-all"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                >
                  <option value="LOW" className="bg-[#0a0a0f]">
                    Alacsony (Ráér)
                  </option>
                  <option value="MEDIUM" className="bg-[#0a0a0f]">
                    Normál
                  </option>
                  <option value="HIGH" className="bg-[#0a0a0f]">
                    Magas (Zavaró)
                  </option>
                  <option value="CRITICAL" className="bg-[#0a0a0f]">
                    Kritikus (Azonnali)
                  </option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">
                Részletes leírás *
              </label>
              <textarea
                rows={5}
                className="w-full px-5 py-4 bg-[#0a0a0f]/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-all resize-none"
                placeholder="Írd le részletesen, mi történt..."
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
              className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:brightness-110 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Send size={20} /> Beküldés
                </>
              )}
            </button>
          </form>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-yellow-500" /> Korábbi bejelentéseim
        </h2>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-yellow-500" size={32} />
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#0a0a0f]/30 border border-white/5 rounded-2xl border-dashed">
            <CheckCircle className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white">
              Nincs bejelentésed
            </h3>
            <p className="text-gray-500">
              Még nem jelentettél be egy hibát sem.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="group relative overflow-hidden bg-[#0f1016] border border-white/5 rounded-2xl p-6 hover:border-yellow-500/30 transition-all hover:shadow-[0_0_20px_rgba(234,179,8,0.1)]"
              >
                <div
                  className={`absolute top-0 left-0 w-1 h-full ${
                    incident.status === "RESOLVED"
                      ? "bg-green-500"
                      : incident.status === "CLOSED"
                        ? "bg-gray-500"
                        : "bg-yellow-500"
                  }`}
                />

                <div className="flex justify-between items-start mb-4">
                  <h3
                    className="text-lg font-bold text-white truncate pr-2"
                    title={incident.title}
                  >
                    {incident.title}
                  </h3>
                  {getStatusBadge(incident.status)}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(incident.createdAt).toLocaleDateString("hu-HU")}
                  </span>
                  {incident.computer && (
                    <span className="flex items-center gap-1">
                      <Monitor size={12} />
                      {incident.computer.name}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-300 line-clamp-3 mb-4 min-h-[3em]">
                  {incident.description}
                </p>

                {incident.resolutionNote && (
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="block text-xs font-semibold uppercase text-green-400 mb-1">
                      Megoldás / Válasz:
                    </span>
                    <p className="text-sm text-gray-300">
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
