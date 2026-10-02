import { useState } from "react";
import { toast } from "sonner";
import { X, Save } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { updateTeam } from "../../store/slices/teamsSlice";
import type { Team } from "../../types";
import { ImageUpload } from "../common/ImageUpload";
import { Button } from "../ui/button";

interface TeamEditModalProps {
  team: Team;
  onClose: () => void;
}

export function TeamEditModal({ team, onClose }: TeamEditModalProps) {
  const dispatch = useAppDispatch();
  const { updateLoading } = useAppSelector((state) => state.teams);

  const [formData, setFormData] = useState({
    name: team.name,
    description: team.description || "",
    logoUrl: team.logoUrl || "",
    coverUrl: team.coverUrl || "",
  });

  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || formData.name.length < 3) {
      setErrors({
        name: "A csapat nevének legalább 3 karakter hosszúnak kell lennie",
      });
      return;
    }

    try {
      const result = await dispatch(
        updateTeam({
          id: team.id,
          data: {
            name: formData.name,
            description: formData.description || undefined,
            logoUrl: formData.logoUrl === "" ? null : formData.logoUrl,
            coverUrl: formData.coverUrl === "" ? null : formData.coverUrl,
          },
        })
      ).unwrap();

      if ((result as any)._status === 202) {
        toast.info(
          (result as any)._message || "A változtatások jóváhagyásra várnak."
        );
      } else {
        toast.success("Csapat sikeresen frissítve");
      }

      onClose();
    } catch (err: any) {
      console.error("Failed to update team:", err);
      toast.error(err.message || "Hiba történt a csapat frissítésekor");
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div
        className="tactical-card border border-border rounded-lg max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-border bg-card/95 backdrop-blur-md">
          <h2 className="text-xl font-display font-bold uppercase tracking-wider text-foreground">
            Csapat szerkesztése
          </h2>
          <button
            className="w-8 h-8 rounded bg-transparent border border-transparent text-muted-foreground cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-secondary hover:border-border hover:text-foreground"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
              Csapat neve <span className="text-primary">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              className={`w-full px-4 py-2.5 bg-secondary/80 border rounded text-foreground font-mono text-sm focus:outline-none transition-colors ${errors.name ? "border-red-500" : "border-border focus:border-primary"}`}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              maxLength={50}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.name ? (
                <span className="text-xs text-red-400 font-mono">{errors.name}</span>
              ) : (
                <span></span>
              )}
              <span className="text-xs font-mono text-muted-foreground">
                {formData.name.length}/50
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="edit-description" className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
              Leírás
            </label>
            <textarea
              id="edit-description"
              className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors max-h-[150px] min-h-[80px]"
              placeholder="Rövid leírás a csapatról..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              maxLength={500}
            />
            <div className="text-right mt-1">
              <span className="text-xs font-mono text-muted-foreground">
                {formData.description.length}/500
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Logó</label>
              <ImageUpload
                value={formData.logoUrl}
                onChange={(val) => setFormData({ ...formData, logoUrl: val })}
                aspect="square"
                label=""
                placeholder="Logó URL..."
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Borítókép</label>
              <ImageUpload
                value={formData.coverUrl}
                onChange={(val) => setFormData({ ...formData, coverUrl: val })}
                aspect="video"
                label=""
                placeholder="Borítókép URL..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              className="px-5 py-2.5 bg-secondary/80 hover:bg-secondary border border-border text-foreground rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all"
              onClick={onClose}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
              disabled={updateLoading}
            >
              {updateLoading ? (
                <>
                  <div className="spinner" />
                  Mentés...
                </>
              ) : (
                <>
                  <Save size={16} />
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
