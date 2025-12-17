import { useState, useEffect } from 'react';
import { X, Gamepad2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { updateGame } from '../../store/slices/gamesSlice';
import type { Game } from '../../types';

interface GameEditModalProps {
    game: Game;
    onClose: () => void;
}

export function GameEditModal({ game, onClose }: GameEditModalProps) {
    const dispatch = useAppDispatch();
    const { createLoading } = useAppSelector((state) => state.games);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        imageUrl: '',
        rules: '',
        teamSize: 5,
    });

    const [errors, setErrors] = useState<{ name?: string; teamSize?: string }>({});

    useEffect(() => {
        if (game) {
            setFormData({
                name: game.name,
                description: game.description || '',
                imageUrl: game.imageUrl || '',
                rules: game.rules || '',
                teamSize: game.teamSize,
            });
        }
    }, [game]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: { name?: string; teamSize?: string } = {};
        if (!formData.name || formData.name.length < 2) {
            newErrors.name = 'A játék nevének legalább 2 karakter hosszúnak kell lennie';
        }
        if (![1, 2, 3, 5].includes(formData.teamSize)) {
            newErrors.teamSize = 'A csapatméret 1, 2, 3 vagy 5 lehet';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            await dispatch(updateGame({
                id: game.id,
                data: {
                    name: formData.name,
                    description: formData.description || undefined,
                    imageUrl: formData.imageUrl || undefined,
                    rules: formData.rules || undefined,
                    teamSize: formData.teamSize,
                }
            })).unwrap();

            onClose();
        } catch (err) {
            console.error('Failed to update game:', err);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Játék Szerkesztése</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label htmlFor="game-name" className="form-label">
                            Játék neve <span className="required">*</span>
                        </label>
                        <input
                            id="game-name"
                            type="text"
                            className={`input ${errors.name ? 'input-error' : ''}`}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Pl: League of Legends"
                            maxLength={100}
                        />
                        {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="game-description" className="form-label">
                            Leírás
                        </label>
                        <textarea
                            id="game-description"
                            className="input textarea"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Rövid leírás a játékról..."
                            rows={3}
                            maxLength={500}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="game-imageUrl" className="form-label">
                            Kép URL
                        </label>
                        <input
                            id="game-imageUrl"
                            type="url"
                            className="input"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            placeholder="https://example.com/image.png"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="game-teamSize" className="form-label">
                            Csapatméret <span className="required">*</span>
                        </label>
                        <select
                            id="game-teamSize"
                            className={`input ${errors.teamSize ? 'input-error' : ''}`}
                            value={formData.teamSize}
                            onChange={(e) => setFormData({ ...formData, teamSize: parseInt(e.target.value) })}
                        >
                            <option value={1}>1v1</option>
                            <option value={2}>2v2</option>
                            <option value={3}>3v3</option>
                            <option value={5}>5v5</option>
                        </select>
                        {errors.teamSize && <span className="error-message">{errors.teamSize}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="game-rules" className="form-label">
                            Szabályok
                        </label>
                        <textarea
                            id="game-rules"
                            className="input textarea"
                            value={formData.rules}
                            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                            placeholder="Játék szabályok..."
                            rows={4}
                            maxLength={1000}
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Mégse
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={createLoading}>
                            {createLoading ? (
                                <>
                                    <div className="spinner" />
                                    Mentés...
                                </>
                            ) : (
                                <>
                                    <Gamepad2 size={18} />
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
