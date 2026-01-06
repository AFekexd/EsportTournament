import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Monitor, Save, Check } from "lucide-react";
import { useAppDispatch } from "../../hooks/useRedux";
import { fetchComputers } from "../../store/slices/bookingsSlice";
import { authService } from "../../lib/auth-service";
import { API_URL } from "../../config";

interface Computer {
  id: string;
  name: string;
  row: number;
  position: number;
  specs?: string | null;
  status?: string | null;
  isActive: boolean;
}

interface ComputerModalProps {
  computer?: Computer | null;
  onClose: () => void;
}

export function ComputerModal({ computer, onClose }: ComputerModalProps) {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    name: "",
    row: 0,
    position: 0,
    specs: "",
    status: "Elérhető",
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (computer) {
      setFormData({
        name: computer.name,
        row: computer.row,
        position: computer.position,
        specs: computer.specs || "",
        status: computer.status || "Elérhető",
        isActive: computer.isActive,
      });
    }
  }, [computer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = authService.keycloak?.token;
      if (!token) {
        toast.error("Nincs bejelentkezve");
        return;
      }

      const url = computer
        ? `${API_URL}/bookings/computers/${computer.id}`
        : `${API_URL}/bookings/computers`;

      const method = computer ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Hiba történt");
      }

      dispatch(fetchComputers());
      onClose();
      toast.success(
        computer ? "Gép sikeresen módosítva" : "Új gép sikeresen hozzáadva"
      );
    } catch (error) {
      console.error("Failed to save computer:", error);
      toast.error("Hiba történt a gép mentése során");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-[#1a1b26] rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1a1b26] border-b border-white/10 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Monitor size={20} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {computer ? "Gép szerkesztése" : "Új gép hozzáadása"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gép neve <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="pl. PC-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sor <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors"
                value={formData.row + 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    row: Math.max(0, parseInt(e.target.value) - 1),
                  })
                }
                required
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Pozíció <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors"
                value={formData.position + 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    position: Math.max(0, parseInt(e.target.value) - 1),
                  })
                }
                required
                min={1}
              />
            </div>
          </div>

          {/* Specs */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Specifikációk
            </label>
            <textarea
              className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors resize-none"
              value={formData.specs}
              onChange={(e) =>
                setFormData({ ...formData, specs: e.target.value })
              }
              placeholder="pl. Intel i7, 16GB RAM, RTX 3060"
              rows={3}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Státusz
            </label>
            <select
              className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="Elérhető">Elérhető</option>
              <option value="Javítás alatt">Javítás alatt</option>
              <option value="Zárt">Zárt</option>
              <option value="Karbantartás">Karbantartás</option>
            </select>
          </div>

          {/* Checkbox */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  formData.isActive
                    ? "bg-primary border-primary"
                    : "border-white/20 group-hover:border-primary/50"
                }`}
              >
                {formData.isActive && (
                  <Check size={14} className="text-white" />
                )}
              </div>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="hidden"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                Aktív (foglalható)
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="flex gap-4 pt-2 border-t border-white/10 mt-6">
            <button
              type="button"
              className="flex-1 px-6 py-3 bg-[#0f1015] hover:bg-[#2a2b36] border border-white/10 text-white rounded-xl font-semibold transition-all"
              onClick={onClose}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  {computer ? "Mentés" : "Létrehozás"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
