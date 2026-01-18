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
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="text-blue-500" size={24} />
          Bejelentések Kezelése
        </h2>
        <p className="text-sm text-muted-foreground">
          Körüzenetek küldése Discordra és Emailben.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#161722] border border-white/5 rounded-xl p-6 space-y-4">
            {/* User Search (Only visible if individual) */}
            {recipientType === "individual" && (
              <div className="animate-fade-in relative z-20">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Címzett keresése
                </label>

                {selectedUser ? (
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        {selectedUser.avatarUrl ? (
                          <img
                            src={selectedUser.avatarUrl}
                            alt={selectedUser.username}
                            className="w-full h-full rounded-full"
                          />
                        ) : (
                          selectedUser.displayName?.[0] ||
                          selectedUser.username?.[0] || <User size={20} />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white">
                          {selectedUser.displayName || selectedUser.username}
                        </div>
                        <div className="text-xs text-gray-400">
                          {selectedUser.email || selectedUser.username}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleClearUser}
                      className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      size={18}
                    />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Keresés név vagy email alapján..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0f1016] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Dropdown Results */}
                    {foundUsers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b26] border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {foundUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleSelectUser(user)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs shrink-0 overflow-hidden">
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
                              <div className="font-medium text-white text-sm">
                                {user.displayName || user.username}
                              </div>
                              <div className="text-xs text-gray-500">
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
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
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
                className="w-full px-4 py-2.5 bg-[#0f1016] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                disabled={isSending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Üzenet Tartalma
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Írd ide az üzenet szövegét..."
                rows={recipientType === "individual" ? 5 : 8}
                className="w-full px-4 py-3 bg-[#0f1016] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                disabled={isSending}
              />
            </div>
          </div>
        </div>

        {/* Sidebar Options */}
        <div className="space-y-6">
          <div className="bg-[#161722] border border-white/5 rounded-xl p-6 space-y-6">
            {/* Recipient Type Selector */}
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users size={18} className="text-purple-400" />
              Címzett Típusa
            </h3>

            <div className="grid grid-cols-2 gap-2 p-1 bg-[#0f1016] rounded-lg border border-white/5">
              <button
                onClick={() => setRecipientType("broadcast")}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  recipientType === "broadcast"
                    ? "bg-purple-500 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <MessageSquare size={14} />
                Mindenki
              </button>
              <button
                onClick={() => setRecipientType("individual")}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  recipientType === "individual"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <User size={14} />
                Egyéni
              </button>
            </div>

            <div className="h-px bg-white/5" />

            {/* Target Channel Selector */}
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Send size={18} className="text-blue-400" />
              Küldési Csatorna
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => setTargetChannel("discord")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  targetChannel === "discord"
                    ? "bg-blue-500/10 border-blue-500/50 text-white"
                    : "bg-[#0f1016] border-white/5 text-gray-400 hover:bg-white/5"
                }`}
              >
                <div
                  className={`p-2 rounded-full ${targetChannel === "discord" ? "bg-blue-500" : "bg-gray-800"}`}
                >
                  <MessageSquare size={16} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Discord</div>
                  <div className="text-xs opacity-70">
                    {recipientType === "individual"
                      ? "Privát üzenet (DM)"
                      : "Közös csatorna"}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTargetChannel("email")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  targetChannel === "email"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-white"
                    : "bg-[#0f1016] border-white/5 text-gray-400 hover:bg-white/5"
                }`}
              >
                <div
                  className={`p-2 rounded-full ${targetChannel === "email" ? "bg-emerald-500" : "bg-gray-800"}`}
                >
                  <Mail size={16} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Email</div>
                  <div className="text-xs opacity-70">Csak Email értesítés</div>
                </div>
              </button>

              <button
                onClick={() => setTargetChannel("both")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  targetChannel === "both"
                    ? "bg-purple-500/10 border-purple-500/50 text-white"
                    : "bg-[#0f1016] border-white/5 text-gray-400 hover:bg-white/5"
                }`}
              >
                <div
                  className={`p-2 rounded-full ${targetChannel === "both" ? "bg-purple-500" : "bg-gray-800"}`}
                >
                  <Send size={16} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Mindkettő</div>
                  <div className="text-xs opacity-70">Discord + Email</div>
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-white/5">
              <button
                onClick={handleSend}
                disabled={
                  isSending ||
                  !message.trim() ||
                  (recipientType === "individual" && !selectedUser)
                }
                className="w-full py-3 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
