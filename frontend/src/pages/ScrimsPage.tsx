import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiFetch } from "../lib/api-client";
import { API_URL } from "../config";
import { toast } from "sonner";
import {
  Swords,
  Calendar,
  Clock,
  Filter,
  Plus,
  Search,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Link } from "react-router-dom";
import { ScrimCreateModal } from "../components/scrims/ScrimCreateModal"; // Will create this next
import { ConfirmationModal } from "../components/common/ConfirmationModal";

interface Scrim {
  id: string;
  game: { id: string; name: string; imageUrl?: string };
  requesterTeam: {
    id: string;
    name: string;
    logoUrl?: string;
    elo: number;
  };
  scheduledAt: string;
  durationMinutes: number;
  notes?: string;
  status: "OPEN" | "ACCEPTED" | "CANCELLED";
}

export function ScrimsPage() {
  const { user } = useAuth();
  const [scrims, setScrims] = useState<Scrim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filters
  const [searchGame, setSearchGame] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const fetchScrims = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filterDate) queryParams.append("date", filterDate);

      const res = await apiFetch(`${API_URL}/scrims?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        let filtered = data.data;
        if (searchGame) {
          filtered = filtered.filter((s: Scrim) =>
            s.game.name.toLowerCase().includes(searchGame.toLowerCase()),
          );
        }
        setScrims(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch scrims", error);
      toast.error("Nem sikerült betölteni a gyakorló meccseket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrims();
  }, [filterDate, searchGame]); // Re-fetch when date changes, client filter game for now or server? Server supports gameId but searching by name is easier on client if list is small.
  // Actually server supports gameId, let's keep client search by name for simplicity unless list grows huge.

  const handleAccept = (_scrim: Scrim) => {
    // We need to know which team the user is accepting for.
    // Ideally open a modal to select team if user has multiple captain roles.
    // For MVP, if user is owner of exactly one team, auto-select?
    // Let's assume user accepts as the team they are currently viewing or managing context.
    // Or just simple check: "Biztosan elfogadod a [Csapat Neve] nevében?" (If we knew which team).

    // Better approach: Prompt user to enter their Team ID or select from their owned teams.
    // Since we don't have a team selector in the UI yet, let's fetch user's teams first.

    // TODO: Fetch user teams where role is CAPTAIN/OWNER
    toast.info(
      "Ez a funkció még fejlesztés alatt (Csapat kiválasztása szükséges)",
    );
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    fetchScrims();
    toast.success("Gyakorló meccs kiírva!");
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
            <Swords className="text-primary" size={32} />
            Gyakorló Meccsek
          </h1>
          <p className="text-muted-foreground">
            Keress ellenfelet tét nélküli gyakorláshoz (Scrim)
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/20 transition-all hover:scale-105"
        >
          <Plus size={20} />
          <span>Új keresés</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-[#0f1016] border border-white/5 p-4 rounded-xl">
        <div className="relative">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Keresés játékra..."
            value={searchGame}
            onChange={(e) => setSearchGame(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="relative">
          <Calendar
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50 [color-scheme:dark]"
          />
        </div>
        <div className="flex items-center justify-end text-sm text-gray-400">
          <Filter size={16} className="mr-2" />
          {scrims.length} nyitott lehetőség
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : scrims.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 border-dashed">
            <Swords size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">
              Nincs elérhető gyakorló meccs
            </h3>
            <p className="text-gray-600 mt-2">
              Légy te az első aki kiír egyet!
            </p>
          </div>
        ) : (
          scrims.map((scrim) => (
            <div
              key={scrim.id}
              className="group bg-[#161722] border border-white/5 rounded-xl p-5 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                {/* Left: Team & Game Info */}
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex-shrink-0 relative">
                    {scrim.requesterTeam.logoUrl ? (
                      <img
                        src={scrim.requesterTeam.logoUrl}
                        alt={scrim.requesterTeam.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-600">
                        {scrim.requesterTeam.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-md">
                      {scrim.requesterTeam.elo}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors flex items-center gap-2">
                      {scrim.requesterTeam.name}
                      <span className="text-xs font-normal text-gray-500 px-2 py-0.5 bg-white/5 rounded">
                        {scrim.game.name}
                      </span>
                    </h3>

                    <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-primary" />
                        {format(
                          new Date(scrim.scheduledAt),
                          "yyyy. MM. dd. HH:mm",
                          { locale: hu },
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-primary" />
                        {scrim.durationMinutes} perc
                      </div>
                      {scrim.notes && (
                        <div className="flex items-center gap-1.5 text-gray-500 italic max-w-md truncate">
                          <MessageSquare size={14} />
                          {scrim.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Action */}
                <div className="flex-shrink-0 w-full md:w-auto">
                  {user ? (
                    <button
                      onClick={() => handleAccept(scrim)}
                      className="w-full md:w-auto px-6 py-2.5 bg-white/5 hover:bg-green-500/20 text-white hover:text-green-400 border border-white/10 hover:border-green-500/50 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Swords size={18} />
                      Kihívás
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="text-sm text-primary hover:underline"
                    >
                      Jelentkezz be a kihíváshoz
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isCreateModalOpen && (
        <ScrimCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}
