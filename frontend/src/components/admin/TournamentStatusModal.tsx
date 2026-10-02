import { useState } from "react";
import { X, Save, Bell, MessageSquare } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { updateTournament } from "../../store/slices/tournamentsSlice";

interface TournamentStatusModalProps {
  tournamentId: string;
  currentStatus: string;
  currentNotifyUsers?: boolean;
  currentNotifyDiscord?: boolean;
  currentDiscordChannel?: string;
  onClose: () => void;
}

const statusOptions = [
  {
    value: "DRAFT",
    label: "Tervezet",
    description: "A verseny még nem publikus",
  },
  {
    value: "REGISTRATION",
    label: "Regisztráció",
    description: "Csapatok regisztrálhatnak",
  },
  {
    value: "IN_PROGRESS",
    label: "Folyamatban",
    description: "A verseny elkezdődött",
  },
  {
    value: "COMPLETED",
    label: "Befejezett",
    description: "A verseny véget ért",
  },
  {
    value: "CANCELLED",
    label: "Törölve",
    description: "A verseny törölve lett",
  },
];

export function TournamentStatusModal({
  tournamentId,
  currentStatus,
  currentNotifyUsers = false,
  currentNotifyDiscord = false,
  currentDiscordChannel = "matches",
  onClose,
}: TournamentStatusModalProps) {
  const dispatch = useAppDispatch();
  const { updateLoading } = useAppSelector((state) => state.tournaments);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [notifyUsers, setNotifyUsers] = useState(currentNotifyUsers);
  const [notifyDiscord, setNotifyDiscord] = useState(currentNotifyDiscord);
  const [discordChannel, setDiscordChannel] = useState(currentDiscordChannel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await dispatch(
        updateTournament({
          id: tournamentId,
          data: {
            status: selectedStatus,
            notifyUsers,
            notifyDiscord,
            discordChannelId: discordChannel,
          },
        })
      ).unwrap();

      onClose();
    } catch (err) {
      console.error("Failed to update tournament:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="tactical-card w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-secondary/60 border-b border-border p-5 flex items-center justify-between z-10">
          <h2 className="text-base font-display font-bold uppercase tracking-tight text-foreground">Verseny beállítások</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded border border-border transition-colors group"
          >
            <X
              size={16}
              className="text-muted-foreground group-hover:text-foreground transition-colors"
            />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Status Selection */}
          <div>
            <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Státusz
            </h3>
            <div className="grid grid-cols-1 gap-2.5 font-mono">
              {statusOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={`relative flex items-center gap-4 p-3.5 rounded border cursor-pointer transition-all duration-200 group
                                        ${selectedStatus === option.value
                      ? "border-primary bg-primary/10 shadow-[0_0_15px_hsla(var(--primary),0.1)]"
                      : "border-border bg-secondary/40 hover:border-primary/40 hover:bg-secondary/60"
                    }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                                        ${selectedStatus === option.value
                        ? "border-primary"
                        : "border-muted-foreground group-hover:border-foreground"
                      }`}
                  >
                    {selectedStatus === option.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`font-bold transition-colors ${selectedStatus === option.value
                        ? "text-foreground"
                        : "text-gray-300 group-hover:text-foreground"
                        }`}
                    >
                      {option.label}
                    </span>
                    <span className="text-sm text-muted-foreground group-hover:text-muted-foreground transition-colors">
                      {option.description}
                    </span>
                  </div>
                  {selectedStatus === option.value && (
                    <div className="absolute right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Értesítések
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {/* User Notifications */}
              <div
                className={`p-3.5 rounded border transition-all duration-200 ${notifyUsers
                  ? "bg-primary/10 border-primary/40"
                  : "bg-secondary/40 border-border"
                  }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <div
                    className={`p-2 rounded transition-colors ${notifyUsers
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                      }`}
                  >
                    <Bell size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-semibold ${notifyUsers ? "text-foreground" : "text-muted-foreground"
                          }`}
                      >
                        Felhasználói értesítések
                      </span>
                      <input
                        type="checkbox"
                        checked={notifyUsers}
                        onChange={(e) => setNotifyUsers(e.target.checked)}
                        className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Értesítés küldése minden meccs eredményről a résztvevők számára.
                    </p>
                  </div>
                </label>
              </div>

              {/* Discord Notifications */}
              <div
                className={`p-3.5 rounded border transition-all duration-200 ${notifyDiscord
                  ? "bg-[#5865F2]/10 border-[#5865F2]/40"
                  : "bg-secondary/40 border-border"
                  }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <div
                    className={`p-2 rounded transition-colors ${notifyDiscord
                      ? "bg-[#5865F2]/20 text-[#5865F2]"
                      : "bg-secondary text-muted-foreground"
                      }`}
                  >
                    <MessageSquare size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-semibold ${notifyDiscord ? "text-foreground" : "text-muted-foreground"
                          }`}
                      >
                        Discord értesítések
                      </span>
                      <input
                        type="checkbox"
                        checked={notifyDiscord}
                        onChange={(e) => setNotifyDiscord(e.target.checked)}
                        className="w-4 h-4 rounded border-border bg-secondary text-[#5865F2] focus:ring-[#5865F2] focus:ring-offset-0 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Meccs eredmények automatikus posztolása Discordra.
                    </p>

                    {notifyDiscord && (
                      <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Célcsatorna
                        </label>
                        <select
                          className="w-full px-3 py-1.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-xs focus:outline-none focus:border-[#5865F2] transition-colors appearance-none"
                          value={discordChannel}
                          onChange={(e) => setDiscordChannel(e.target.value)}
                        >
                          <option value="matches">⚔️ Meccsek</option>
                          <option value="tournaments">🏆 Versenyek</option>
                          <option value="announcements">📢 Bejelentések</option>
                          <option value="general">💬 Általános</option>
                        </select>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-mono text-xs uppercase tracking-wider rounded transition-all"
              onClick={onClose}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold uppercase tracking-wider text-xs rounded transition-all shadow-[0_0_15px_hsla(var(--primary),0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={updateLoading}
            >
              {updateLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Mentés...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Mentés
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
