import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  MessageSquare,
  Gamepad2,
  Users,
  Swords,
} from "lucide-react";
import { apiFetch } from "../../lib/api-client";
import { API_URL } from "../../config";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";

interface ScrimCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  currentUserRole?: string;
}

interface Game {
  id: string;
  name: string;
}

export function ScrimCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: ScrimCreateModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [formData, setFormData] = useState({
    teamId: "",
    gameId: "",
    scheduledAt: "",
    durationMinutes: 60,
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch Games
      apiFetch(`${API_URL}/games`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setGames(data.data);
        });

      // Fetch User's Teams (Owned or Captain)
      // Since we don't have a direct endpoint for "my manageable teams", we might need to filter client side or use existing teams logic.
      // Assuming /api/teams/my exists or similar.
      // Or fetch all user teams via /api/users/me?include=teams
      if (user) {
        apiFetch(`${API_URL}/users/${user.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.data.teamMemberships) {
              const manageableTeams = data.data.teamMemberships
                .filter(
                  (m: any) =>
                    m.team.ownerId === user.id || m.role === "CAPTAIN",
                )
                .map((m: any) => ({
                  id: m.team.id,
                  name: m.team.name,
                  ownerId: m.team.ownerId,
                  currentUserRole: m.role,
                }));
              setTeams(manageableTeams);
              if (manageableTeams.length > 0) {
                setFormData((prev) => ({
                  ...prev,
                  teamId: manageableTeams[0].id,
                }));
              }
            }
          });
      }
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.teamId) return toast.error("Válassz egy csapatot!");
    if (!formData.gameId) return toast.error("Válassz egy játékot!");
    if (!formData.scheduledAt) return toast.error("Add meg az időpontot!");

    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/scrims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        toast.error(data.error?.message || "Hiba történt a létrehozáskor");
      }
    } catch (error) {
      console.error("Failed to create scrim", error);
      toast.error("Hiba történt a kérés küldésekor");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161722] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Swords className="text-primary" size={20} />
            Új Gyakorló Meccs (Scrim)
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Team Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Users size={16} />
              Válaszd ki a csapatod
            </label>
            {teams.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {teams.map((team) => (
                  <label
                    key={team.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.teamId === team.id
                        ? "bg-primary/20 border-primary text-white"
                        : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="team"
                      value={team.id}
                      checked={formData.teamId === team.id}
                      onChange={() =>
                        setFormData({ ...formData, teamId: team.id })
                      }
                      className="hidden"
                    />
                    <span className="font-bold flex-1">{team.name}</span>
                    <span className="text-xs uppercase px-2 py-0.5 bg-black/40 rounded text-gray-500">
                      {team.currentUserRole || "OWNER"}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                Nem vagy kapitánya/tulajdonosa egy csapatnak sem.
              </div>
            )}
          </div>

          {/* Game Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Gamepad2 size={16} />
              Játék
            </label>
            <select
              value={formData.gameId}
              onChange={(e) =>
                setFormData({ ...formData, gameId: e.target.value })
              }
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 appearance-none"
            >
              <option value="">Válassz játékot...</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Calendar size={16} />
                Időpont
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledAt: e.target.value })
                }
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 [color-scheme:dark]"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Clock size={16} />
                Időtartam (perc)
              </label>
              <input
                type="number"
                min="30"
                max="180"
                step="15"
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    durationMinutes: parseInt(e.target.value),
                  })
                }
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <MessageSquare size={16} />
              Megjegyzés (pl. rank elvárás)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 min-h-[80px] resize-none"
              placeholder="Pl. Gold/Plat rank, BO3..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={loading || !formData.teamId}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {loading ? "Létrehozás..." : "Meccs kiírása"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
