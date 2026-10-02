import { useState } from "react";
import { X, Gamepad2, Globe, Search, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { createGame, searchGlobalGames } from "../../store/slices/gamesSlice";
import { ImageUpload } from "../common/ImageUpload";
import { RichTextEditor } from "../common/RichTextEditor";
import { PdfUpload } from "../common/PdfUpload";

interface GameCreateModalProps {
  onClose: () => void;
}

export function GameCreateModal({ onClose }: GameCreateModalProps) {
  const dispatch = useAppDispatch();
  const { createLoading, globalGames, globalLoading } = useAppSelector((state) => state.games);
  const [showRawgSearch, setShowRawgSearch] = useState(false);
  const [rawgQuery, setRawgQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    rules: "",
    rulesPdf: undefined as string | undefined,
  });

  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { name?: string } = {};
    if (!formData.name || formData.name.length < 2) {
      newErrors.name =
        "A játék nevének legalább 2 karakter hosszúnak kell lennie";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await dispatch(
        createGame({
          name: formData.name,
          description: formData.description || undefined,
          imageUrl: formData.imageUrl || undefined,
          rules: formData.rules || undefined,
          rulesPdf: formData.rulesPdf,
        })
      ).unwrap();

      onClose();
    } catch (err) {
      console.error("Failed to create game:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="tactical-card w-full max-w-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-display font-bold uppercase tracking-wider text-foreground">Új játék hozzáadása</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* RAWG Fast Import */}
          <div className="p-4 bg-secondary/40 border border-border/80 rounded space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
                <Globe size={14} />
                Automatikus kitöltés globális adatbázisból (RAWG)
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowRawgSearch(!showRawgSearch);
                  if (!showRawgSearch && !globalGames.length) {
                    dispatch(searchGlobalGames(""));
                  }
                }}
                className="text-xs font-mono text-primary hover:underline font-semibold"
              >
                {showRawgSearch ? "Bezárás" : "Keresés megnyitása"}
              </button>
            </div>

            {showRawgSearch && (
              <div className="space-y-3 pt-1">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={rawgQuery}
                    onChange={(e) => {
                      setRawgQuery(e.target.value);
                      dispatch(searchGlobalGames(e.target.value));
                    }}
                    placeholder="Keress játékot a globális katalógusban..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-secondary/80 border border-border rounded font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                {globalLoading ? (
                  <div className="flex items-center justify-center py-4 text-xs font-mono text-muted-foreground gap-2">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span>Keresés a globális API-ban...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                    {globalGames.slice(0, 10).map((g) => (
                      <button
                        key={String(g.id)}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            name: g.name,
                            description: g.genres?.join(", ") || formData.description,
                            imageUrl: g.backgroundImage || formData.imageUrl,
                          });
                          setShowRawgSearch(false);
                        }}
                        className="flex items-center gap-2 p-2 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded text-left transition-all group"
                      >
                        {g.backgroundImage ? (
                          <img src={g.backgroundImage} alt={g.name} className="w-9 h-9 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                            <Gamepad2 size={16} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground group-hover:text-primary truncate">{g.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">{g.genres?.slice(0, 2).join(", ") || "Esport"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="game-name"
              className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Játék neve <span className="text-destructive">*</span>
            </label>
            <input
              id="game-name"
              type="text"
              className={`w-full px-4 py-2.5 bg-secondary/80 border ${errors.name ? "border-destructive" : "border-border"
                } rounded text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors`}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Pl: League of Legends"
              maxLength={100}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.name ? (
                <p className="text-destructive text-xs font-mono">{errors.name}</p>
              ) : <span></span>}
              <span className="text-xs font-mono text-muted-foreground">{formData.name.length}/100</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="game-description"
              className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Leírás
            </label>
            <textarea
              id="game-description"
              className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Rövid leírás a játékról..."
              rows={3}
              maxLength={500}
            />
            <div className="text-right mt-1">
              <span className="text-xs font-mono text-muted-foreground">{formData.description.length}/500</span>
            </div>
          </div>

          {/* Image Upload */}
          <ImageUpload
            value={formData.imageUrl}
            onChange={(value) => setFormData({ ...formData, imageUrl: value })}
            label="Játék képe"
            placeholder="https://example.com/image.jpg"
            maxSizeMB={15}
          />

          <div className="space-y-4">
            <RichTextEditor
              label="Szabályok (Szöveges)"
              value={formData.rules}
              onChange={(value) => setFormData({ ...formData, rules: value })}
              placeholder="Játék szabályok szövegesen..."
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 font-mono text-muted-foreground">VAGY</span>
              </div>
            </div>

            <PdfUpload
              label="Szabályok (PDF)"
              value={formData.rulesPdf}
              onChange={(value) =>
                setFormData({ ...formData, rulesPdf: value })
              }
            />
          </div>

          {/* Footer */}
          <div className="flex gap-4 pt-6 border-t border-border">
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
              disabled={createLoading}
            >
              {createLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Létrehozás...
                </>
              ) : (
                <>
                  <Gamepad2 size={16} />
                  Játék létrehozása
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
