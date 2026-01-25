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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1a1b26] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <GitCommit size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Újdonságok és Változások
              </h2>
              <p className="text-sm text-gray-400">
                Kövesd nyomon a legfrissebb fejlesztéseket
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-gray-400">Betöltés...</div>
          ) : changelogs.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Tag size={48} className="mx-auto mb-4 opacity-20" />
              <p>Még nincsenek feljegyzett változtatások.</p>
            </div>
          ) : (
            <div className="relative border-l border-white/10 ml-3 space-y-8">
              {changelogs.map((log, index) => (
                <div key={log.id} className="relative pl-8">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full ring-4 ring-[#1a1b26] ${
                      index === 0 ? "bg-primary animate-pulse" : "bg-white/20"
                    }`}
                  />

                  {/* Version Header */}
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span
                      className={`text-lg font-bold ${
                        index === 0 ? "text-white" : "text-gray-300"
                      }`}
                    >
                      v{log.version}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded textxs font-bold uppercase tracking-wider ${
                        log.type === "MAJOR"
                          ? "bg-red-500/20 text-red-400"
                          : log.type === "MINOR"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(log.createdAt), "yyyy. MM. dd.", {
                        locale: hu,
                      })}
                    </span>
                    {log.author?.username && (
                      <span className="text-xs text-gray-600 ml-auto">
                        by {log.author.displayName || log.author.username}
                      </span>
                    )}
                  </div>

                  {/* Changes List */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                    <ul className="space-y-2">
                      {log.changes.map((change, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-gray-300 text-sm leading-relaxed"
                        >
                          <ChevronRight
                            size={14}
                            className="mt-1 text-primary shrink-0"
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
        <div className="p-4 border-t border-white/5 bg-black/20 text-center text-xs text-gray-500">
          Jelenlegi verzió: v{changelogs[0]?.version || "0.0.0"}
        </div>
      </div>
    </div>
  );
}
