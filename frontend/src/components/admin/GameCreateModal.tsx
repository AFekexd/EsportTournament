import { useState } from 'react';
import { X, Gamepad2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { createGame } from '../../store/slices/gamesSlice';
import { ImageUpload } from '../common/ImageUpload';

interface GameCreateModalProps {
    onClose: () => void;
}

export function GameCreateModal({ onClose }: GameCreateModalProps) {
    const dispatch = useAppDispatch();
    const { createLoading } = useAppSelector((state) => state.games);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        imageUrl: '',
        rules: '',
    });

    const [errors, setErrors] = useState<{ name?: string }>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: { name?: string } = {};
        if (!formData.name || formData.name.length < 2) {
            newErrors.name = 'A játék nevének legalább 2 karakter hosszúnak kell lennie';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            await dispatch(createGame({
                name: formData.name,
                description: formData.description || undefined,
                imageUrl: formData.imageUrl || undefined,
                rules: formData.rules || undefined,
            })).unwrap();

            onClose();
        } catch (err) {
            console.error('Failed to create game:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#1a1b26] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1b26] border-b border-white/10 p-6 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold text-white">Új játék hozzáadása</h2>
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
                        <label htmlFor="game-name" className="block text-sm font-medium text-gray-300 mb-2">
                            Játék neve <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="game-name"
                            type="text"
                            className={`w-full px-4 py-3 bg-[#0f1015] border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors`}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Pl: League of Legends"
                            maxLength={100}
                        />
                        {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="game-description" className="block text-sm font-medium text-gray-300 mb-2">
                            Leírás
                        </label>
                        <textarea
                            id="game-description"
                            className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

                    <div>
                        <label htmlFor="game-rules" className="block text-sm font-medium text-gray-300 mb-2">
                            Szabályok
                        </label>
                        <textarea
                            id="game-rules"
                            className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                            value={formData.rules}
                            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                            placeholder="Játék szabályok..."
                            rows={4}
                            maxLength={1000}
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
                            disabled={createLoading}
                        >
                            {createLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Létrehozás...
                                </>
                            ) : (
                                <>
                                    <Gamepad2 size={18} />
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
