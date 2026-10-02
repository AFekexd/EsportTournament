import { useEffect, useState } from "react";
import { X, GitCommit, Calendar, Tag, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { apiFetch } from "../../lib/api-client";
import { API_URL } from "../../config";

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

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const [changelogs, setChangelogs] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchChangelogs();
    }
  }, [isOpen]);

  const fetchChangelogs = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/changelog`);
      const data = await res.json();
      if (data.success) {
        setChangelogs(data.data.history);
        // Update last seen version
        if (data.data.latestVersion) {
          localStorage.setItem("last_seen_version", data.data.latestVersion);
          // Dispatch event to update badges if needed
          window.dispatchEvent(new Event("changelog_seen"));
        }
      }
    } catch (error) {
      console.error("Failed to fetch changelogs", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="tactical-card w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <GitCommit size={18} />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold uppercase tracking-tight text-foreground">
                Újdonságok és Változások
              </h2>
              <p className="text-xs font-mono text-muted-foreground">
                Kövesd nyomon a legfrissebb fejlesztéseket
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded border border-border transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground font-mono text-xs uppercase tracking-wider">Betöltés...</div>
          ) : changelogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-mono text-xs">
              <Tag size={40} className="mx-auto mb-3 opacity-20" />
              <p>Még nincsenek feljegyzett változtatások.</p>
            </div>
          ) : (
            <div className="relative border-l border-border ml-3 space-y-6">
              {changelogs.map((log, index) => (
                <div key={log.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full ring-2 ring-background ${index === 0 ? "bg-primary animate-pulse" : "bg-muted-foreground"
                      }`}
                  />

                  {/* Version Header */}
                  <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                    <span
                      className={`text-base font-display font-bold ${index === 0 ? "text-foreground" : "text-muted-foreground"
                        }`}
                    >
                      v{log.version}
                    </span>
                    <span
                      className={`tactical-badge text-[10px] ${log.type === "MAJOR"
                          ? "border-destructive/40 text-destructive bg-destructive/10"
                          : log.type === "MINOR"
                            ? "border-primary/40 text-primary bg-primary/10"
                            : "border-border text-muted-foreground bg-secondary"
                        }`}
                    >
                      {log.type}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(log.createdAt), "yyyy. MM. dd.", {
                        locale: hu,
                      })}
                    </span>
                    {log.author?.username && (
                      <span className="text-xs font-mono text-muted-foreground ml-auto">
                        by {log.author.displayName || log.author.username}
                      </span>
                    )}
                  </div>

                  {/* Changes List */}
                  <div className="bg-secondary/40 rounded p-3.5 border border-border">
                    <ul className="space-y-1.5 font-mono text-xs">
                      {log.changes.map((change, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-foreground/80 leading-relaxed"
                        >
                          <ChevronRight
                            size={14}
                            className="mt-0.5 text-primary shrink-0"
                          />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-secondary/40 text-center text-xs font-mono text-muted-foreground">
          Jelenlegi verzió: v{changelogs[0]?.version || "0.0.0"}
        </div>
      </div>
    </div>
  );
}
