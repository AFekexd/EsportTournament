import { toast } from "sonner";
import { useState } from "react";
import { Save, Bell, Lock, User, Shield, Mail, AtSign, RefreshCw } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch } from "../hooks/useRedux";
import { updateUser } from "../store/slices/authSlice";
import { ImageUpload } from "../components/common/ImageUpload";
import { API_URL } from "../config";
import { apiFetch } from "../lib/api-client";

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isAdmin } = useAuth();

  // Settings state - must be declared before any conditional returns
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [emailNotifications, setEmailNotifications] = useState(
    user?.emailNotifications ?? true
  );
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [steamId, setSteamId] = useState(user?.steamId || "");
  const [syncLoading, setSyncLoading] = useState(false);

  const handleSteamSync = async () => {
    if (!steamId) return;
    setSyncLoading(true);
    try {
      // First save the Steam ID if it changed
      if (steamId !== user?.steamId) {
        await apiFetch(`${API_URL}/users/${user?.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steamId }),
        });
        // Update local user state roughly
        dispatch(updateUser({ ...user!, steamId }));
      }

      const response = await apiFetch(`${API_URL}/steam/sync`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`Sikeres szinkronizálás! ${data.count} tökéletes játék.`);
        dispatch(updateUser({ ...user!, steamId, perfectGamesCount: data.count }));
      } else {
        toast.error(data.message || "Hiba a szinkronizáláskor");
      }
    } catch (e) {
      console.error(e);
      toast.error("Hiba történt");
    } finally {
      setSyncLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-20 glass-card rounded-2xl">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 neon-border">
            <Lock size={40} className="text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 text-glow">
            Nem vagy bejelentkezve
          </h3>
          <p className="text-gray-400">
            Jelentkezz be a beállítások módosításához.
          </p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user?.id) return;

    setSaveLoading(true);
    setSaveSuccess(false);

    try {
      const response = await apiFetch(`${API_URL}/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          avatarUrl: avatarUrl || undefined,
          emailNotifications: emailNotifications,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile");
      }

      setSaveSuccess(true);
      dispatch(updateUser(data.data));
      toast.success("Beállítások sikeresen mentve!");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Hiba történt a mentés során");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 page">
      {/* Modern Header with Gradient */}
      <div className="mb-16 text-center relative animate-fade-in">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -z-10" />
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-primary-300 to-primary-500 bg-clip-text text-transparent mb-6 text-glow">
          Beállítások
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Szabd személyre a profilod és kezeld a fiókod egy helyen.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Profile Card */}
        <div
          className="glass-card rounded-2xl p-8 hover:scale-[1.01] transition-transform animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary/10 rounded-xl neon-border">
              <User size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Profil Adatai</h2>
              <p className="text-sm text-gray-400">Hogyan látnak mások téged</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center mb-6">
              <ImageUpload
                value={avatarUrl}
                onChange={setAvatarUrl}
                label="Profilkép"
                placeholder="https://example.com/avatar.jpg"
                maxSizeMB={15}
                className="w-64 w-full"
                aspect="square"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="displayName"
                className="text-sm font-medium text-gray-300 ml-1 flex items-center justify-between"
              >
                <span>Megjelenítendő név</span>
                {!isAdmin && (
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <Lock size={10} />
                    Csak Admin módosíthatja
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isAdmin}
                  maxLength={50}
                  className={`w-full px-5 py-4 bg-[#0a0a0f]/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-lg ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  placeholder="pl. GamerPro123"
                />
                {!isAdmin && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock size={18} />
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-1 ml-1">
                {!isAdmin ? (
                  <p className="text-xs text-gray-500">
                    Biztonsági okokból a nevedet csak adminisztrátor módosíthatja.
                  </p>
                ) : <span></span>}
                {isAdmin && <span className="text-xs text-gray-500">{displayName.length}/50</span>}
              </div>
            </div>

            {/* Steam ID Section */}
            <div className="space-y-2 pt-4 border-t border-white/5">
              <label
                htmlFor="steamId"
                className="text-sm font-medium text-gray-300 ml-1 flex items-center justify-between"
              >
                <span>Steam ID (64-bit)</span>
                <a
                  href="https://steamid.xyz/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                  ID Keresése
                </a>
              </label>
              <div className="flex gap-2">
                <input
                  id="steamId"
                  type="text"
                  value={steamId}
                  onChange={(e) => setSteamId(e.target.value)}
                  className="flex-1 px-5 py-4 bg-[#0a0a0f]/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="76561198..."
                />
                <button
                  onClick={handleSteamSync}
                  disabled={!steamId || syncLoading}
                  className="px-4 py-2 bg-[#0f1015] border border-white/10 rounded-xl hover:bg-primary/20 hover:border-primary/50 hover:text-white transition-all text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Játékok szinkronizálása"
                >
                  <RefreshCw size={24} className={syncLoading ? "animate-spin text-primary" : ""} />
                </button>
              </div>
              <p className="text-xs text-gray-500 ml-1">
                Add meg a Steam ID-dat a Platinum játékok megjelenítéséhez. (Privát profil nem működik!)
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Account & Notifications */}
        <div
          className="space-y-8 animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          {/* Account Details */}
          <div className="glass-card rounded-2xl p-8 hover:border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Shield size={24} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Fiók Adatok</h2>
                <p className="text-sm text-gray-400">
                  Biztonsági és azonosítási adatok
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="group">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">
                  Email Cím
                </label>
                <div className="flex items-center gap-3 px-4 py-3 bg-[#0a0a0f] border border-white/5 rounded-xl text-gray-400 group-hover:border-white/10 transition-colors">
                  <Mail size={18} className="text-gray-600" />
                  <span className="flex-1 font-mono">{user?.email}</span>
                  <Lock size={14} className="text-gray-700" />
                </div>
              </div>

              <div className="group">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">
                  Felhasználónév
                </label>
                <div className="flex items-center gap-3 px-4 py-3 bg-[#0a0a0f] border border-white/5 rounded-xl text-gray-400 group-hover:border-white/10 transition-colors">
                  <AtSign size={18} className="text-gray-600" />
                  <span className="flex-1 font-mono">{user?.username}</span>
                  <Lock size={14} className="text-gray-700" />
                </div>
              </div>

              <div className="mt-2 text-xs text-center text-gray-600">
                Ezek az adatok biztonsági okokból nem módosíthatók.
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card rounded-2xl p-8 hover:border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                <Bell size={24} className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Értesítések</h2>
                <p className="text-sm text-gray-400">
                  Válaszd ki, miről szeretnél hallani
                </p>
              </div>
            </div>

            <div
              className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 border border-white/5 rounded-xl hover:bg-[#0a0a0f] transition-all cursor-pointer"
              onClick={() => setEmailNotifications(!emailNotifications)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${emailNotifications
                    ? "bg-primary/20 text-primary"
                    : "bg-gray-800 text-gray-500"
                    }`}
                >
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-white">Email értesítések</h3>
                  <p className="text-xs text-gray-400">
                    Fontos hírek, emlékeztetők
                  </p>
                </div>
              </div>

              <div
                className={`w-12 h-7 rounded-full p-1 transition-colors relative ${emailNotifications ? "bg-primary" : "bg-gray-700"
                  }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${emailNotifications ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Desktop: Bottom Right, Mobile: Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 md:static md:mt-3 flex justify-center md:justify-end max-w-5xl mx-auto z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg transform hover:-translate-y-1 ${saveSuccess
              ? "bg-green-500 hover:bg-green-600 shadow-green-500/25 text-white"
              : "bg-gradient-to-r from-primary to-neon-pink hover:brightness-110 shadow-primary/25 text-white"
              } ${saveLoading ? "opacity-75 cursor-wait" : ""}`}
          >
            {saveLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Mentés...
              </>
            ) : saveSuccess ? (
              <>
                <Shield size={20} />
                Sikeresen Mentve!
              </>
            ) : (
              <>
                <Save size={20} />
                Változtatások Mentése
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spacer for sticky mobile button */}
      <div className="h-24 md:h-0" />
    </div>
  );
}
