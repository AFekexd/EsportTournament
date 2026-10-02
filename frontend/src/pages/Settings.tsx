import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Save,
  Bell,
  Lock,
  User,
  Shield,
  Mail,
  AtSign,
  RefreshCw,
  Trophy,
  Gamepad2,
  Calendar,
  AlertCircle,
  Newspaper,
  Clock,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch } from "../hooks/useRedux";
import { updateUser } from "../store/slices/authSlice";
import { ImageUpload } from "../components/common/ImageUpload";
import { API_URL } from "../config";
import { apiFetch } from "../lib/api-client";

interface EmailPreference {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  value: boolean;
  setValue: (val: boolean) => void;
}

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isAdmin } = useAuth();

  // Settings state - must be declared before any conditional returns
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");

  // Email preferences state
  const [emailNotifications, setEmailNotifications] = useState(
    user?.emailNotifications ?? true,
  );
  const [emailPrefTournaments, setEmailPrefTournaments] = useState(
    user?.emailPrefTournaments ?? true,
  );
  const [emailPrefMatches, setEmailPrefMatches] = useState(
    user?.emailPrefMatches ?? true,
  );
  const [emailPrefBookings, setEmailPrefBookings] = useState(
    user?.emailPrefBookings ?? true,
  );
  const [emailPrefSystem, setEmailPrefSystem] = useState(
    user?.emailPrefSystem ?? true,
  );
  const [emailPrefWeeklyDigest, setEmailPrefWeeklyDigest] = useState(
    user?.emailPrefWeeklyDigest ?? false,
  );

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [steamId, setSteamId] = useState(user?.steamId || "");
  const [syncLoading, setSyncLoading] = useState(false);

  // Pending Request State
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  useEffect(() => {
    const checkPendingRequests = async () => {
      try {
        const res = await apiFetch(`${API_URL}/change-requests/my-requests`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Find latest PENDING user profile request
          const pending = data.data.find(
            (r: any) => r.status === "PENDING" && r.type === "USER_PROFILE",
          );
          setPendingRequest(pending);
        }
      } catch (error) {
        console.error("Failed to check pending requests", error);
      }
    };
    checkPendingRequests();
  }, []);

  const emailPreferences: EmailPreference[] = [
    {
      key: "emailPrefTournaments",
      label: "Verseny értesítések",
      description: "Új versenyek, meghívók és regisztrációs emlékeztetők",
      icon: <Trophy size={20} />,
      value: emailPrefTournaments,
      setValue: setEmailPrefTournaments,
    },
    {
      key: "emailPrefMatches",
      label: "Meccs értesítések",
      description: "Meccs emlékeztetők és eredmények",
      icon: <Gamepad2 size={20} />,
      value: emailPrefMatches,
      setValue: setEmailPrefMatches,
    },
    {
      key: "emailPrefBookings",
      label: "Foglalás értesítések",
      description: "Foglalás megerősítések, emlékeztetők és szabad helyek",
      icon: <Calendar size={20} />,
      value: emailPrefBookings,
      setValue: setEmailPrefBookings,
    },
    {
      key: "emailPrefSystem",
      label: "Rendszer értesítések",
      description: "Fontos rendszerüzenetek és bejelentések",
      icon: <AlertCircle size={20} />,
      value: emailPrefSystem,
      setValue: setEmailPrefSystem,
    },
    {
      key: "emailPrefWeeklyDigest",
      label: "Heti összefoglaló",
      description: "Heti statisztikák és közelgő versenyek összefoglalója",
      icon: <Newspaper size={20} />,
      value: emailPrefWeeklyDigest,
      setValue: setEmailPrefWeeklyDigest,
    },
  ];

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
        dispatch(
          updateUser({ ...user!, steamId, perfectGamesCount: data.count }),
        );
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
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6 neon-border">
            <Lock size={40} className="text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2 text-glow">
            Nem vagy bejelentkezve
          </h3>
          <p className="text-muted-foreground">
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
          emailNotifications,
          emailPrefTournaments,
          emailPrefMatches,
          emailPrefBookings,
          emailPrefSystem,
          emailPrefWeeklyDigest,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile");
      }

      if (response.status === 202) {
        toast.info(data.message || "A változtatások jóváhagyásra várnak.");
        return;
      }

      setSaveSuccess(true);
      dispatch(updateUser(data.data));

      if (data.message) {
        toast.success(data.message);
      } else {
        toast.success("Beállítások sikeresen mentve!");
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast.error(error.message || "Hiba történt a mentés során");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Tactical Header */}
      <div className="flex flex-col gap-3 border-b border-border/60 pb-6">
        <div className="inline-flex w-fit items-center gap-2 rounded border border-border bg-secondary/80 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
          <Shield className="h-3.5 w-3.5" />
          <span>PROFIL BEÁLLÍTÁSOK // USER CONFIG</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-foreground">
          FIÓK <span className="text-primary">BEÁLLÍTÁSOK</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          Szabd személyre a profilodat, értesítéseidet és kezeld a fiókod biztonsági beállításait.
        </p>
      </div>

      {pendingRequest && (
        <div className="tactical-card p-4 border-yellow-500/30 bg-yellow-500/5 flex items-center gap-4">
          <div className="p-2 bg-yellow-500/20 rounded text-yellow-500">
            <Clock size={22} />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-foreground">
              Módosítás jóváhagyásra vár
            </h3>
            <p className="text-muted-foreground text-xs mt-0.5">
              A profilodon végzett legutóbbi módosításaidat egy adminisztrátornak jóvá kell hagynia. Amíg a kérelem függőben van, nem indíthatsz újabb módosítást.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div
          className={`tactical-card p-6 sm:p-8 ${pendingRequest ? "opacity-75 pointer-events-none grayscale-[0.3]" : ""}`}
        >
          <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-border">
            <div className="p-2.5 bg-secondary rounded border border-border text-primary">
              <User size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">Profil Adatai</h2>
              <p className="text-xs text-muted-foreground">Hogyan látnak mások téged a platformon</p>
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
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
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
                  disabled={!isAdmin || !!pendingRequest}
                  maxLength={50}
                  className={`w-full px-4 py-2.5 bg-secondary/40 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-base ${!isAdmin || !!pendingRequest
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                    }`}
                  placeholder="pl. GamerPro123"
                />
                {!isAdmin && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock size={16} />
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-1 ml-1">
                {!isAdmin ? (
                  <p className="text-xs text-muted-foreground">
                    Biztonsági okokból a nevedet csak adminisztrátor módosíthatja.
                  </p>
                ) : (
                  <span></span>
                )}
                {isAdmin && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {displayName.length}/50
                  </span>
                )}
              </div>
            </div>

            {/* Steam ID Section */}
            <div className="space-y-2 pt-4 border-t border-border">
              <label
                htmlFor="steamId"
                className="text-sm font-medium text-gray-300 ml-1 flex items-center justify-between"
              >
                <span>Steam ID (64-bit)</span>
                <a
                  href="https://steamid.xyz/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
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
                  disabled={!!pendingRequest}
                  className="flex-1 px-4 py-2.5 bg-secondary/40 border border-border rounded text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-sm disabled:opacity-50"
                  placeholder="76561198..."
                />
                <button
                  onClick={handleSteamSync}
                  disabled={!steamId || syncLoading || !!pendingRequest}
                  className="px-3.5 py-2 bg-secondary border border-border rounded hover:border-primary/50 hover:text-foreground transition-all text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Játékok szinkronizálása"
                >
                  <RefreshCw
                    size={20}
                    className={syncLoading ? "animate-spin text-primary" : ""}
                  />
                </button>
              </div>
              <p className="text-xs text-muted-foreground ml-1">
                Add meg a Steam ID-dat a Platinum játékok megjelenítéséhez. (Privát profil nem működik!)
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Account & Notifications */}
        <div className="space-y-6">
          {/* Account Details */}
          <div className="tactical-card p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-border">
              <div className="p-2.5 bg-secondary rounded border border-border text-primary">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">Fiók Adatok</h2>
                <p className="text-xs text-muted-foreground">
                  Biztonsági és hitelesítési azonosítók
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="group">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block ml-1">
                  Email Cím
                </label>
                <div className="flex items-center gap-3 px-3.5 py-2.5 bg-secondary/30 border border-border rounded text-muted-foreground">
                  <Mail size={16} className="text-muted-foreground" />
                  <span className="flex-1 font-mono text-sm">{user?.email}</span>
                  <Lock size={14} className="text-muted-foreground/60" />
                </div>
              </div>

              <div className="group">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block ml-1">
                  Felhasználónév
                </label>
                <div className="flex items-center gap-3 px-3.5 py-2.5 bg-secondary/30 border border-border rounded text-muted-foreground">
                  <AtSign size={16} className="text-muted-foreground" />
                  <span className="flex-1 font-mono text-sm">{user?.username}</span>
                  <Lock size={14} className="text-muted-foreground/60" />
                </div>
              </div>

              <div className="mt-2 text-xs text-center text-muted-foreground">
                Ezek az adatok központilag kezeltek. Módosításhoz látogass el a Pollák fiókkezelőbe:{" "}
                <a
                  href="https://keycloak.pollak.info/realms/master/account/?referrer=security-admin-console"
                  className="text-primary hover:underline font-mono"
                  target="_blank"
                  rel="noreferrer"
                >
                  Keycloak Profil
                </a>
              </div>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="tactical-card p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-border">
              <div className="p-2.5 bg-secondary rounded border border-border text-yellow-400">
                <Bell size={20} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">
                  Email Értesítések
                </h2>
                <p className="text-xs text-muted-foreground">
                  Válaszd ki, milyen eseményekről szeretnél emailt kapni
                </p>
              </div>
            </div>

            {/* Master Toggle */}
            <div
              className={`flex items-center justify-between p-3.5 bg-secondary/40 border border-border rounded mb-4 cursor-pointer hover:border-primary/40 transition-colors ${pendingRequest ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => setEmailNotifications(!emailNotifications)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${emailNotifications
                      ? "bg-primary/20 text-primary"
                      : "bg-gray-800 text-muted-foreground"
                    }`}
                >
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Összes email értesítés
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Fő kapcsoló - kikapcsolva egyik emailt sem kapod meg
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

            {/* Individual Preferences */}
            <div
              className={`space-y-2 ${!emailNotifications || pendingRequest ? "opacity-50 pointer-events-none" : ""}`}
            >
              {emailPreferences.map((pref) => (
                <div
                  key={pref.key}
                  className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded hover:bg-secondary/60 hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => pref.setValue(!pref.value)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${pref.value
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                        }`}
                    >
                      {pref.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground text-sm">
                        {pref.label}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {pref.description}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors relative ${pref.value ? "bg-primary" : "bg-gray-700"
                      }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${pref.value ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              💡 Az email értesítéseket az adott email "Leiratkozás" linkjével is kikapcsolhatod.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 md:static md:mt-4 flex justify-center md:justify-end max-w-6xl mx-auto z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <button
            onClick={handleSave}
            disabled={saveLoading || !!pendingRequest}
            className={`flex items-center gap-2.5 px-6 py-3 rounded font-display font-bold uppercase tracking-wider text-base transition-all shadow-lg ${saveSuccess
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 text-foreground"
                : "bg-primary hover:bg-primary-hover shadow-primary/25 text-foreground"
              } ${saveLoading || !!pendingRequest ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {saveLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-border border-t-white rounded-full animate-spin" />
                Mentés...
              </>
            ) : saveSuccess ? (
              <>
                <Shield size={18} />
                Sikeresen Mentve!
              </>
            ) : pendingRequest ? (
              <>
                <Clock size={18} />
                Jóváhagyásra Vár...
              </>
            ) : (
              <>
                <Save size={18} />
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
