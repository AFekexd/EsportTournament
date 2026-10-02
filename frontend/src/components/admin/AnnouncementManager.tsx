import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Send,
  MessageSquare,
  Mail,
  AlertTriangle,
  User,
  Search,
  X,
  Users,
} from "lucide-react";
import { authService } from "../../lib/auth-service";

export function AnnouncementManager() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetChannel, setTargetChannel] = useState<
    "discord" | "email" | "both"
  >("discord");
  const [recipientType, setRecipientType] = useState<
    "broadcast" | "individual"
  >("broadcast");
  const [isSending, setIsSending] = useState(false);

  // User Search
  const [userSearch, setUserSearch] = useState("");
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!userSearch || selectedUser) {
      setFoundUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = authService.keycloak?.token;
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/users?search=${encodeURIComponent(userSearch)}&limit=5`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setFoundUsers(data.data);
        }
      } catch (error) {
        console.error("Failed to search users:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearch, selectedUser]);

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setUserSearch("");
    setFoundUsers([]);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setUserSearch("");
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Kérlek írj be egy üzenetet!");
      return;
    }

    if (recipientType === "individual" && !selectedUser) {
      toast.error("Kérlek válassz egy címzettet!");
      return;
    }

    setIsSending(true);
    try {
      const token = authService.keycloak?.token;

      const channels = [];
      if (targetChannel === "discord" || targetChannel === "both")
        channels.push("discord");
      if (targetChannel === "email" || targetChannel === "both")
        channels.push("email");

      const body: any = {
        message: message,
        title: title,
        channels: channels,
      };

      // If individual, add targetUserId
      if (recipientType === "individual") {
        body.targetUserId = selectedUser.id;
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/admin/discord/announce`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Küldés sikertelen");
      }

      toast.success(
        recipientType === "individual"
          ? "Üzenet sikeresen elküldve!"
          : "Bejelentés sikeresen elküldve!",
      );

      setMessage("");
      setTitle("");
    } catch (error: any) {
      console.error("Failed to send announcement:", error);
      toast.error(error.message || "Hiba történt a küldés során.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="text-primary" size={24} />
          Bejelentések Kezelése
        </h2>
        <p className="text-sm text-muted-foreground">
          Körüzenetek küldése Discordra és Emailben.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="tactical-card p-6 space-y-4">
            {/* User Search (Only visible if individual) */}
            {recipientType === "individual" && (
              <div className="animate-fade-in relative z-20">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                  Címzett keresése
                </label>

                {selectedUser ? (
                  <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
                        {selectedUser.avatarUrl ? (
                          <img
                            src={selectedUser.avatarUrl}
                            alt={selectedUser.username}
                            className="w-full h-full rounded object-cover"
                          />
                        ) : (
                          selectedUser.displayName?.[0] ||
                          selectedUser.username?.[0] || <User size={18} />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">
                          {selectedUser.displayName || selectedUser.username}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {selectedUser.email || selectedUser.username}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleClearUser}
                      className="p-1.5 hover:bg-secondary rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={14}
                    />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Keresés név vagy email alapján..."
                      className="w-full pl-9 pr-4 py-2 bg-secondary/80 border border-border rounded text-foreground font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Dropdown Results */}
                    {foundUsers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-secondary/95 border border-border rounded shadow-xl overflow-hidden max-h-60 overflow-y-auto z-30 font-mono text-xs">
                        {foundUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleSelectUser(user)}
                            className="w-full flex items-center gap-3 p-2.5 hover:bg-secondary transition-colors text-left border-b border-border/50 last:border-0"
                          >
                            <div className="w-7 h-7 rounded bg-secondary border border-border flex items-center justify-center text-muted-foreground text-xs shrink-0 overflow-hidden">
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                user.displayName?.[0] || user.username?.[0]
                              )}
                            </div>
                            <div className="truncate">
                              <div className="font-semibold text-foreground text-sm">
                                {user.displayName || user.username}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                Üzenet Címe (Opcionális)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  recipientType === "individual"
                    ? "pl. Nyeremény átvétele"
                    : "pl. Verseny Emlékeztető"
                }
                className="w-full px-3.5 py-2 bg-secondary/80 border border-border rounded text-foreground font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                disabled={isSending}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                Üzenet Tartalma
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Írd ide az üzenet szövegét..."
                rows={recipientType === "individual" ? 5 : 8}
                className="w-full px-3.5 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                disabled={isSending}
              />
            </div>
          </div>
        </div>

        {/* Sidebar Options */}
        <div className="space-y-6">
          <div className="tactical-card p-6 space-y-6">
            {/* Recipient Type Selector */}
            <h3 className="font-display font-bold uppercase tracking-wider text-xs text-foreground flex items-center gap-2">
              <Users size={16} className="text-primary" />
              Címzett Típusa
            </h3>

            <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/80 rounded border border-border">
              <button
                onClick={() => setRecipientType("broadcast")}
                className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all ${recipientType === "broadcast"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <MessageSquare size={14} />
                Mindenki
              </button>
              <button
                onClick={() => setRecipientType("individual")}
                className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all ${recipientType === "individual"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <User size={14} />
                Egyéni
              </button>
            </div>

            <div className="h-px bg-border/60" />

            {/* Target Channel Selector */}
            <h3 className="font-display font-bold uppercase tracking-wider text-xs text-foreground flex items-center gap-2">
              <Send size={16} className="text-primary" />
              Küldési Csatorna
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <button
                onClick={() => setTargetChannel("discord")}
                className={`w-full flex items-center gap-3 p-3 rounded border transition-all ${targetChannel === "discord"
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
              >
                <div
                  className={`p-2 rounded ${targetChannel === "discord" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  <MessageSquare size={16} />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Discord</div>
                  <div className="text-[11px] opacity-70">
                    {recipientType === "individual"
                      ? "Privát üzenet (DM)"
                      : "Közös csatorna"}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTargetChannel("email")}
                className={`w-full flex items-center gap-3 p-3 rounded border transition-all ${targetChannel === "email"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-foreground"
                    : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
              >
                <div
                  className={`p-2 rounded ${targetChannel === "email" ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}
                >
                  <Mail size={16} />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Email</div>
                  <div className="text-[11px] opacity-70">Csak Email értesítés</div>
                </div>
              </button>

              <button
                onClick={() => setTargetChannel("both")}
                className={`w-full flex items-center gap-3 p-3 rounded border transition-all ${targetChannel === "both"
                    ? "bg-accent/10 border-accent/50 text-foreground"
                    : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
              >
                <div
                  className={`p-2 rounded ${targetChannel === "both" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  <Send size={16} />
                </div>
                <div className="text-left">
                  <div className="font-medium">Mindkettő</div>
                  <div className="text-xs opacity-70">Discord + Email</div>
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-border">
              <button
                onClick={handleSend}
                disabled={
                  isSending ||
                  !message.trim() ||
                  (recipientType === "individual" && !selectedUser)
                }
                className="w-full py-3 px-4 bg-primary text-foreground font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <span className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
                    Küldés...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    {recipientType === "individual"
                      ? "Üzenet Küldése"
                      : "Bejelentés Közzététele"}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
            <div className="text-sm text-yellow-200/80">
              <p className="font-semibold text-yellow-500 mb-1">Figyelem!</p>
              {recipientType === "broadcast"
                ? "A bejelentések azonnal kiküldésre kerülnek minden érintett felhasználónak."
                : "A privát üzenet azonnal elküldésre kerül a kiválasztott felhasználónak."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
