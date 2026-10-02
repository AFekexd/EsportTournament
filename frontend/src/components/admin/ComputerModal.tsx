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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="tactical-card rounded-lg w-full max-w-lg border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-card/95 backdrop-blur-md border-b border-border p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded">
              <Monitor size={18} className="text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold uppercase tracking-wider text-foreground">
              {computer ? "Gép szerkesztése" : "Új gép hozzáadása"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
              Gép neve <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
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
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                Sor <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
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
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                Pozíció <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
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
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
              Specifikációk
            </label>
            <textarea
              className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors resize-none"
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
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
              Státusz
            </label>
            <select
              className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
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
          <div className="bg-secondary/40 border border-border/80 rounded p-3">
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.isActive
                    ? "bg-primary border-primary"
                    : "border-border group-hover:border-primary/50"
                  }`}
              >
                {formData.isActive && (
                  <Check size={12} className="text-primary-foreground" />
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
              <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                Aktív (foglalható)
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="flex gap-4 pt-4 border-t border-border">
            <button
              type="button"
              className="flex-1 px-5 py-2.5 bg-secondary/80 hover:bg-secondary border border-border text-foreground rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all"
              onClick={onClose}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={16} />
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
