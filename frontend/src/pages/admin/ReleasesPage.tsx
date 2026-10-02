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
    <div className="flex flex-col gap-8 pb-16">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-6">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary">
          <GitCommit size={14} className="text-primary" />
          <span>Rendszerkezelés // Verzióvezérlés</span>
        </div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-foreground">
          Kiadások Kezelése
        </h1>
        <p className="text-sm text-muted-foreground font-mono">
          Új szoftververziók közzététele és changelog audit előzmények
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: New Release Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="tactical-card p-6 sticky top-6">
            <h2 className="text-base font-display font-bold uppercase tracking-wider text-foreground mb-6 flex items-center gap-2">
              <Plus className="text-primary" size={18} />
              Új Kiadás Rögzítése
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Version Type */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
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
                      className={`px-3 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider border transition-all ${releaseType === type && !customVersion
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Version Input */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Egyéni Verziószám (Opcionális)
                </label>
                <input
                  type="text"
                  placeholder="pl. 1.0.5-beta"
                  value={customVersion}
                  onChange={(e) => setCustomVersion(e.target.value)}
                  className="w-full bg-secondary/80 border border-border rounded px-3 py-2 text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Changes List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Változtatások
                  </label>
                  <button
                    type="button"
                    onClick={handleAddChangeLine}
                    className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
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
                        placeholder="• Új funkció / javítás..."
                        className="flex-1 bg-secondary/80 border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                      />
                      {changes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChangeLine(index)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
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
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold uppercase tracking-wider py-2.5 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-[0_0_15px_hsla(var(--primary),0.2)] hover:shadow-[0_0_20px_hsla(var(--primary),0.35)]"
              >
                {submitting ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent"></span>
                ) : (
                  <Save size={16} />
                )}
                Verzió Kiadása
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="tactical-card p-6">
            <h2 className="text-base font-display font-bold uppercase tracking-wider text-foreground mb-6 flex items-center gap-2">
              <GitCommit className="text-primary" size={18} />
              Kiadási Előzmények
            </h2>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-wider">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Előzmények lekérése...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded font-mono text-xs uppercase tracking-wider">
                Még nincs rögzített kiadás.
              </div>
            ) : (
              <div className="space-y-6">
                {history.map((release) => (
                  <div
                    key={release.id}
                    className="relative pl-6 border-l-2 border-border/70 pb-2 last:pb-0"
                  >
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 bg-secondary/40 p-4 rounded border border-border/80">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xl font-display font-bold text-foreground">
                            v{release.version}
                          </span>
                          <span
                            className={`tactical-badge text-[10px] ${release.type === "MAJOR"
                              ? "border-destructive/40 text-destructive bg-destructive/10"
                              : release.type === "MINOR"
                                ? "border-primary/40 text-primary bg-primary/10"
                                : "border-border text-muted-foreground bg-secondary"
                              }`}
                          >
                            {release.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
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
                          className="flex items-start gap-2 text-sm text-foreground/80 font-mono"
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
