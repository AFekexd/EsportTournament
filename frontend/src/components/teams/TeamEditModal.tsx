import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { updateTeam } from '../../store/slices/teamsSlice';
import type { Team } from '../../types';
import './TeamEditModal.css';

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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Csapat szerkesztése</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
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

                    <div className="modal-footer">
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
