import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api-client";
import { API_URL } from "../../config";
import { Loader2, Settings, User, Monitor, XCircle, Save } from "lucide-react";

// Types
interface Incident {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  resolutionNote?: string;
  createdAt: string;
  reporter: {
    id: string;
    displayName?: string;
    username: string;
    avatarUrl?: string;
  };
  computer?: {
    name: string;
  };
}

interface UserSummary {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export const AdminIncidents = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  // Management Modal
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [manageNote, setManageNote] = useState("");
  const [manageStatus, setManageStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const [admins, setAdmins] = useState<UserSummary[]>([]);
  const [handler, setHandler] = useState<UserSummary | null>(null);

  // Using simple approach: if I am the handler, show "Switch to Broadcast", else "Switch to Me"

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/incidents`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error(error);
      toast.error("Hiba a betöltéskor");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${API_URL}/admin/settings/incident-handler`);
      if (res.ok) {
        const data = await res.json();
        setHandler(data.handlerUser);
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    }
  };

  const fetchAdmins = async () => {
    try {
      // Fetch both ADMIN and ORGANIZER
      const [adminsRes, organizersRes] = await Promise.all([
        apiFetch(`${API_URL}/users?role=ADMIN`),
        apiFetch(`${API_URL}/users?role=ORGANIZER`),
      ]);

      let allAdmins: UserSummary[] = [];

      if (adminsRes.ok) {
        const data = await adminsRes.json();
        if (data.success) allAdmins = [...allAdmins, ...data.data];
      }

      if (organizersRes.ok) {
        const data = await organizersRes.json();
        if (data.success) allAdmins = [...allAdmins, ...data.data];
      }

      // Remove duplicates just in case
      const uniqueAdmins = Array.from(
        new Map(allAdmins.map((item) => [item.id, item])).values(),
      );
      setAdmins(uniqueAdmins);
    } catch (error) {
      console.error("Failed to fetch admins", error);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchSettings();
    fetchAdmins();
  }, []);

  const handleUpdate = async () => {
    if (!selectedIncident) return;
    try {
      setUpdating(true);
      const res = await apiFetch(
        `${API_URL}/incidents/${selectedIncident.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: manageStatus,
            resolutionNote: manageNote,
          }),
        },
      );

      if (res.ok) {
        toast.success("Incidens frissítve");
        setSelectedIncident(null);
        fetchIncidents();
      } else {
        toast.error("Hiba a mentéskor");
      }
    } catch (error) {
      console.error(error);
      toast.error("Hiba a mentéskor");
    } finally {
      setUpdating(false);
    }
  };

  const handleSetHandler = async (userId: string | null) => {
    try {
      const res = await apiFetch(`${API_URL}/admin/settings/incident-handler`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        toast.success("Beállítás mentve");
        fetchSettings();
      } else {
        toast.error("Nem sikerült menteni");
      }
    } catch (error) {
      console.error(error);
      toast.error("Nem sikerült menteni a beállítást");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-[#161722] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Nyitott Ügyek
          </h3>
          <div className="text-3xl font-bold text-white">
            {incidents.filter((i) => i.status === "OPEN").length}
          </div>
        </div>
        <div className="bg-[#161722] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Folyamatban
          </h3>
          <div className="text-3xl font-bold text-white">
            {incidents.filter((i) => i.status === "IN_PROGRESS").length}
          </div>
        </div>

        {/* Settings */}
        <div className="lg:col-span-2 bg-[#161722] border border-blue-500/20 rounded-2xl p-6 relative">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium text-blue-400 mb-1">
                <Settings className="w-4 h-4" /> Értesítési Beállítások
              </h3>
              <div className="text-white font-medium">
                {handler ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Kezelő:</span>
                    <div className="flex items-center gap-2 bg-white/10 px-2 py-1 rounded-lg">
                      {handler.avatarUrl && (
                        <img
                          src={handler.avatarUrl}
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      {handler.displayName || handler.username}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">
                    Minden admin értesítést kap (Broadcast)
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {handler && (
                <button
                  onClick={() => handleSetHandler(null)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors"
                >
                  Visszaállítás mindenkire
                </button>
              )}
              <div className="relative group">
                <button className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 transition-colors">
                  Váltás...
                </button>

                <div className="absolute right-0 top-full mt-2 w-64 bg-[#1f212e] border border-white/10 rounded-xl shadow-xl p-3 hidden group-hover:block z-50">
                  <p className="text-xs text-gray-500 mb-2">Válassz kezelőt:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {admins.map((admin) => (
                      <button
                        key={admin.id}
                        onClick={() => handleSetHandler(admin.id)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg text-left transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {admin.avatarUrl ? (
                            <img
                              src={admin.avatarUrl}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={12} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white font-medium truncate">
                            {admin.displayName || admin.username}
                          </div>
                        </div>
                      </button>
                    ))}
                    {admins.length === 0 && (
                      <div className="text-xs text-gray-500 text-center py-2">
                        Nincs elérhető admin
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#161722] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">
            Bejelentett Incidensek
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-gray-400 text-xs uppercase">
                <th className="p-4">Dátum</th>
                <th className="p-4">Prioritás</th>
                <th className="p-4">Tárgy</th>
                <th className="p-4">Eszköz</th>
                <th className="p-4">Jelentő</th>
                <th className="p-4">Státusz</th>
                <th className="p-4 text-right">Művelet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto" />
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Nincs megjeleníthető adat.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 text-sm text-gray-400">
                      {new Date(incident.createdAt).toLocaleDateString()} <br />
                      {new Date(incident.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          incident.priority === "CRITICAL"
                            ? "bg-red-500/20 text-red-500"
                            : incident.priority === "HIGH"
                              ? "bg-orange-500/20 text-orange-500"
                              : incident.priority === "MEDIUM"
                                ? "bg-yellow-500/20 text-yellow-500"
                                : "bg-green-500/20 text-green-500"
                        }`}
                      >
                        {incident.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-white">
                        {incident.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {incident.description}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {incident.computer?.name || "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                          {incident.reporter.avatarUrl ? (
                            <img
                              src={incident.reporter.avatarUrl}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={12} />
                          )}
                        </div>
                        <span className="text-sm text-gray-300">
                          {incident.reporter.displayName ||
                            incident.reporter.username}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          incident.status === "OPEN"
                            ? "bg-red-500 text-white"
                            : incident.status === "IN_PROGRESS"
                              ? "bg-blue-500 text-white"
                              : incident.status === "RESOLVED"
                                ? "bg-green-500 text-white"
                                : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {incident.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedIncident(incident);
                          setManageStatus(incident.status);
                          setManageNote(incident.resolutionNote || "");
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors"
                      >
                        Kezelés
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Modal (Custom implementation since Dialog is missing) */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#161722] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                Incidens Kezelése
              </h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="text-sm text-gray-300 mb-2 font-medium">
                  {selectedIncident.reporter.displayName} üzenete:
                </div>
                <p className="text-gray-400 italic">
                  "{selectedIncident.description}"
                </p>
                {selectedIncident.computer && (
                  <div className="mt-2 text-xs flex items-center gap-1 text-blue-400">
                    <Monitor size={12} /> {selectedIncident.computer.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Státusz
                </label>
                <select
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500/50"
                  value={manageStatus}
                  onChange={(e) => setManageStatus(e.target.value)}
                >
                  <option value="OPEN" className="bg-[#1f212e]">
                    Nyitott
                  </option>
                  <option value="IN_PROGRESS" className="bg-[#1f212e]">
                    Folyamatban
                  </option>
                  <option value="RESOLVED" className="bg-[#1f212e]">
                    Megoldva
                  </option>
                  <option value="CLOSED" className="bg-[#1f212e]">
                    Lezárva
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Megjegyzés / Válasz
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500/50 resize-none h-32"
                  placeholder="Üzenet a felhasználónak..."
                  value={manageNote}
                  onChange={(e) => setManageNote(e.target.value)}
                />
              </div>
            </div>
            <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-black/20">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium hover:brightness-110 shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {updating ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}{" "}
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
