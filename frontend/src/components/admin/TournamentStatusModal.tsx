import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { updateTournament } from '../../store/slices/tournamentsSlice';

interface TournamentStatusModalProps {
    tournamentId: string;
    currentStatus: string;
    onClose: () => void;
}

const statusOptions = [
    { value: 'DRAFT', label: 'Tervezet', description: 'A verseny még nem publikus' },
    { value: 'REGISTRATION', label: 'Regisztráció', description: 'Csapatok regisztrálhatnak' },
    { value: 'IN_PROGRESS', label: 'Folyamatban', description: 'A verseny elkezdődött' },
    { value: 'COMPLETED', label: 'Befejezett', description: 'A verseny véget ért' },
    { value: 'CANCELLED', label: 'Törölve', description: 'A verseny törölve lett' },
];

export function TournamentStatusModal({ tournamentId, currentStatus, onClose }: TournamentStatusModalProps) {
    const dispatch = useAppDispatch();
    const { updateLoading } = useAppSelector((state) => state.tournaments);
    const [selectedStatus, setSelectedStatus] = useState(currentStatus);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedStatus === currentStatus) {
            onClose();
            return;
        }

        try {
            await dispatch(updateTournament({
                id: tournamentId,
                data: { status: selectedStatus },
            })).unwrap();

            onClose();
        } catch (err) {
            console.error('Failed to update tournament status:', err);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Verseny státusz módosítása</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="status-options">
                        {statusOptions.map((option) => (
                            <label
                                key={option.value}
                                className={`status-option ${selectedStatus === option.value ? 'selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="status"
                                    value={option.value}
                                    checked={selectedStatus === option.value}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                />
                                <div className="status-option-content">
                                    <span className="status-option-label">{option.label}</span>
                                    <span className="status-option-description">{option.description}</span>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Mégse
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={updateLoading || selectedStatus === currentStatus}
                        >
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
