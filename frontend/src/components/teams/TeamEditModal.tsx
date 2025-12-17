import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { updateTeam } from '../../store/slices/teamsSlice';
import type { Team } from '../../types';

interface TeamEditModalProps {
    team: Team;
    onClose: () => void;
}

export function TeamEditModal({ team, onClose }: TeamEditModalProps) {
    const dispatch = useAppDispatch();
    const { updateLoading } = useAppSelector((state) => state.teams);

    const [formData, setFormData] = useState({
        name: team.name,
        description: team.description || '',
        logoUrl: team.logoUrl || '',
    });

    const [errors, setErrors] = useState<{ name?: string }>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.name || formData.name.length < 3) {
            setErrors({ name: 'A csapat nevének legalább 3 karakter hosszúnak kell lennie' });
            return;
        }

        try {
            await dispatch(updateTeam({
                id: team.id,
                data: {
                    name: formData.name,
                    description: formData.description || undefined,
                    logoUrl: formData.logoUrl || undefined,
                },
            })).unwrap();

            onClose();
        } catch (err) {
            console.error('Failed to update team:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-2xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)] max-md:max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-border max-md:p-4">
                    <h2 className="text-2xl font-bold text-foreground">Csapat szerkesztése</h2>
                    <button className="w-8 h-8 rounded-lg bg-transparent border-none text-muted-foreground cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-muted hover:text-foreground" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 max-md:p-4">
                    <div className="form-group">
                        <label htmlFor="edit-name" className="form-label">
                            Csapat neve <span className="required">*</span>
                        </label>
                        <input
                            id="edit-name"
                            type="text"
                            className={`input ${errors.name ? 'input-error' : ''}`}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            maxLength={50}
                        />
                        {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="edit-description" className="form-label">
                            Leírás
                        </label>
                        <textarea
                            id="edit-description"
                            className="input textarea"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            maxLength={500}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="edit-logoUrl" className="form-label">
                            Logó URL
                        </label>
                        <input
                            id="edit-logoUrl"
                            type="url"
                            className="input"
                            value={formData.logoUrl}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Mégse
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={updateLoading}>
                            {updateLoading ? (
                                <>
                                    <div className="spinner" />
                                    Mentés...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
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
