import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api-client";
import { API_URL } from "../../config";
import { toast } from "sonner";
import {
  Plus,
  Save,
  Trash,
  Calendar,
  GitCommit,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface ChangelogItem {
  id: string;
  version: string;
  type: "MAJOR" | "MINOR" | "PATCH";
  changes: string[];
  createdAt: string;
  author: {
    username: string;
    displayName?: string;
  };
}

export default function ReleasesPage() {
  const [history, setHistory] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Release Form State
  const [releaseType, setReleaseType] = useState<"MAJOR" | "MINOR" | "PATCH">(
    "PATCH"
  );
  const [customVersion, setCustomVersion] = useState("");
  const [changes, setChanges] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/changelog`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data.history);
      }
    } catch (error) {
      console.error("Failed to fetch changelog history", error);
      toast.error("Nem sikerült betölteni a kiadási előzményeket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleAddChangeLine = () => {
    setChanges([...changes, ""]);
  };

  const handleChangeLineUpdate = (index: number, value: string) => {
    const newChanges = [...changes];
    newChanges[index] = value;
    setChanges(newChanges);
  };

  const handleRemoveChangeLine = (index: number) => {
    if (changes.length === 1) {
      setChanges([""]);
      return;
    }
    setChanges(changes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validChanges = changes.filter((c) => c.trim().length > 0);
    if (validChanges.length === 0) {
      toast.error("Legalább egy változtatást meg kell adni");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        type: releaseType,
        changes: validChanges,
        ...(customVersion ? { customVersion } : {}),
      };

      const res = await apiFetch(`${API_URL}/changelog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Új verzió sikeresen kiadva!");
        // Reset form
        setChanges([""]);
        setCustomVersion("");
        setReleaseType("PATCH");
        // Refresh list
        fetchHistory();
      } else {
        throw new Error(data.error?.message || "Hiba történt");
      }
    } catch (error: any) {
      console.error("Failed to create release", error);
      toast.error(error.message || "Nem sikerült létrehozni a kiadást");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-2">Kiadások Kezelése</h1>
      <p className="text-gray-400 mb-8">
        Új verziók közzététele és előzmények megtekintése
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: New Release Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#1a1b26] border border-white/10 rounded-2xl p-6 sticky top-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="text-primary" />
              Új Kiadás
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Version Type */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-400">
                  Verzió Típus
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["MAJOR", "MINOR", "PATCH"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setReleaseType(type);
                        setCustomVersion("");
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                        releaseType === type && !customVersion
                          ? "bg-primary text-white border-primary"
                          : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Version Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                  Egyéni Verziószám (Opcionális)
                </label>
                <input
                  type="text"
                  placeholder="pl. 1.0.5-beta"
                  value={customVersion}
                  onChange={(e) => setCustomVersion(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Changes List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-400">
                    Változtatások
                  </label>
                  <button
                    type="button"
                    onClick={handleAddChangeLine}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <Plus size={12} /> Sor hozzáadása
                  </button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {changes.map((line, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={line}
                        onChange={(e) =>
                          handleChangeLineUpdate(index, e.target.value)
                        }
                        placeholder="• Új funkció..."
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                      />
                      {changes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChangeLine(index)}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                ) : (
                  <Save size={18} />
                )}
                Verzió Kiadása
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1a1b26] border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <GitCommit className="text-gray-400" />
              Kiadási Előzmények
            </h2>

            {loading ? (
              <div className="text-center py-12 text-gray-500">Betöltés...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
                Még nincs rögzített kiadás.
              </div>
            ) : (
              <div className="space-y-6">
                {history.map((release) => (
                  <div
                    key={release.id}
                    className="relative pl-6 border-l-2 border-white/5 pb-2 last:pb-0"
                  >
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#1a1b26] border-2 border-primary" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 bg-black/20 p-4 rounded-xl border border-white/5">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-2xl font-bold text-white">
                            v{release.version}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              release.type === "MAJOR"
                                ? "bg-red-500/20 text-red-400"
                                : release.type === "MINOR"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {release.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {format(
                              new Date(release.createdAt),
                              "yyyy. MM. dd. HH:mm",
                              { locale: hu }
                            )}
                          </span>
                          <span>•</span>
                          <span>
                            {release.author?.displayName ||
                              release.author?.username ||
                              "Admin"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pl-2 space-y-2 mt-2">
                      {release.changes.map((change, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-sm text-gray-300"
                        >
                          <ChevronRight
                            size={14}
                            className="mt-1 text-primary shrink-0"
                          />
                          <span>{change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
