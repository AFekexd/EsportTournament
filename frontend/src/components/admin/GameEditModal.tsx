import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { updateGame } from "../../store/slices/gamesSlice";
import type { Game } from "../../types";
import { ImageUpload } from "../common/ImageUpload";
import { RichTextEditor } from "../common/RichTextEditor";
import { PdfUpload } from "../common/PdfUpload";

interface GameEditModalProps {
  game: Game;
  onClose: () => void;
}

export function GameEditModal({ game, onClose }: GameEditModalProps) {
  const dispatch = useAppDispatch();
  const { updateLoading } = useAppSelector((state) => state.games);

  const [formData, setFormData] = useState({
    name: game.name || "",
    description: game.description || "",
    imageUrl: game.imageUrl || "",
    rules: game.rules || "",
    rulesPdf: game.rulesPdfUrl || undefined,
    teamSize: game.teamSize || 5,
  });

  const [errors, setErrors] = useState<{ name?: string; teamSize?: string }>(
    {}
  );

  useEffect(() => {
    if (game) {
      setFormData({
        name: game.name,
        description: game.description || "",
        imageUrl: game.imageUrl || "",
        rules: game.rules || "",
        rulesPdf: game.rulesPdfUrl || undefined,
        teamSize: game.teamSize,
      });
    }
  }, [game]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { name?: string; teamSize?: string } = {};
    if (!formData.name || formData.name.length < 2) {
      newErrors.name =
        "A játék nevének legalább 2 karakter hosszúnak kell lennie";
    }
    if (![1, 2, 3, 5].includes(formData.teamSize)) {
      newErrors.teamSize = "A csapatméret 1, 2, 3 vagy 5 lehet";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await dispatch(
        updateGame({
          id: game.id,
          data: {
            name: formData.name,
            description: formData.description || undefined,
            imageUrl: formData.imageUrl || undefined,
            rules: formData.rules || undefined,
            rulesPdf: formData.rulesPdf,
            teamSize: formData.teamSize,
          },
        })
      ).unwrap();

      onClose();
    } catch (err) {
      console.error("Failed to update game:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-[#1a1b26] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1b26] border-b border-white/10 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-white">Játék szerkesztése</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label
              htmlFor="game-name"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Játék neve <span className="text-red-400">*</span>
            </label>
            <input
              id="game-name"
              type="text"
              className={`w-full px-4 py-3 bg-[#0f1015] border ${
                errors.name ? "border-red-500" : "border-white/10"
              } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors`}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Pl: League of Legends"
              maxLength={100}
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="game-description"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Leírás
            </label>
            <textarea
              id="game-description"
              className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors resize-none"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Rövid leírás a játékról..."
              rows={3}
              maxLength={500}
            />
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
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1a1b26] px-2 text-gray-500">VAGY</span>
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
          <div className="flex gap-4 pt-6 border-t border-white/10">
            <button
              type="button"
              className="flex-1 px-6 py-3 bg-[#0f1015] hover:bg-[#1a1b26] border border-white/10 text-white rounded-xl font-semibold transition-all"
              onClick={onClose}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={updateLoading}
            >
              {updateLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mentés...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Módosítások mentése
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
