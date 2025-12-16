import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { updateTournament } from '../../store/slices/tournamentsSlice';
import { fetchGames } from '../../store/slices/gamesSlice';
import type { Tournament } from '../../types';
import './AdminModals.css';

interface TournamentEditModalProps {
    tournament: Tournament;
    onClose: () => void;
}

export function TournamentEditModal({ tournament, onClose }: TournamentEditModalProps) {
    const dispatch = useAppDispatch();
    const { updateLoading } = useAppSelector((state) => state.tournaments);
    const { games } = useAppSelector((state) => state.games);

    const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    };

    const [formData, setFormData] = useState({
        name: tournament.name,
        description: tournament.description || '',
        status: tournament.status,
        format: tournament.format,
        maxTeams: tournament.maxTeams,
        startDate: formatDateForInput(tournament.startDate),
        endDate: tournament.endDate ? formatDateForInput(tournament.endDate) : '',
        registrationDeadline: formatDateForInput(tournament.registrationDeadline),
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (games.length === 0) {
            dispatch(fetchGames());
        }
    }, [dispatch, games.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: { [key: string]: string } = {};
        if (!formData.name || formData.name.length < 3) {
            newErrors.name = 'A verseny nevének legalább 3 karakter hosszúnak kell lennie';
        }
        if (!formData.startDate) {
            newErrors.startDate = 'Add meg a kezdési dátumot';
        }
        if (!formData.registrationDeadline) {
            newErrors.registrationDeadline = 'Add meg a jelentkezési határidőt';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            await dispatch(updateTournament({
                id: tournament.id,
                data: {
                    name: formData.name,
                    description: formData.description || undefined,
                    status: formData.status,
                    format: formData.format,
                    startDate: formData.startDate,
                    endDate: formData.endDate || undefined,
                    registrationDeadline: formData.registrationDeadline,
                },
            })).unwrap();

            onClose();
        } catch (err) {
            console.error('Failed to update tournament:', err);
        }
    };

    const statusOptions = [
        { value: 'DRAFT', label: 'Piszkozat' },
        { value: 'REGISTRATION', label: 'Regisztráció nyitva' },
        { value: 'IN_PROGRESS', label: 'Folyamatban' },
        { value: 'COMPLETED', label: 'Befejezett' },
        { value: 'CANCELLED', label: 'Törölve' },
    ];

    const formatOptions = [
        { value: 'SINGLE_ELIMINATION', label: 'Egyenes kieséses' },
        { value: 'DOUBLE_ELIMINATION', label: 'Dupla kieséses' },
        { value: 'ROUND_ROBIN', label: 'Körmérkőzés' },
        { value: 'SWISS', label: 'Svájci rendszer' },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Verseny szerkesztése</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="edit-tournament-name" className="form-label">
                                Verseny neve <span className="required">*</span>
                            </label>
                            <input
                                id="edit-tournament-name"
                                type="text"
                                className={`input ${errors.name ? 'input-error' : ''}`}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                maxLength={100}
                            />
                            {errors.name && <span className="error-message">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="edit-tournament-status" className="form-label">
                                Státusz
                            </label>
                            <select
                                id="edit-tournament-status"
                                className="input"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as Tournament['status'] })}
                            >
                                {statusOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="edit-tournament-description" className="form-label">
                            Leírás
                        </label>
                        <textarea
                            id="edit-tournament-description"
                            className="input textarea"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Rövid leírás a versenyről..."
                            rows={3}
                            maxLength={500}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Játék</label>
                            <input
                                type="text"
                                className="input"
                                value={tournament.game?.name || 'Ismeretlen'}
                                disabled
                            />
                            <small className="form-hint">A játék nem módosítható létrehozás után</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="edit-tournament-format" className="form-label">
                                Formátum
                            </label>
                            <select
                                id="edit-tournament-format"
                                className="input"
                                value={formData.format}
                                onChange={(e) => setFormData({ ...formData, format: e.target.value as Tournament['format'] })}
                            >
                                {formatOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="edit-tournament-regDeadline" className="form-label">
                                Jelentkezési határidő <span className="required">*</span>
                            </label>
                            <input
                                id="edit-tournament-regDeadline"
                                type="datetime-local"
                                className={`input ${errors.registrationDeadline ? 'input-error' : ''}`}
                                value={formData.registrationDeadline}
                                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                            />
                            {errors.registrationDeadline && <span className="error-message">{errors.registrationDeadline}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="edit-tournament-startDate" className="form-label">
                                Kezdési dátum <span className="required">*</span>
                            </label>
                            <input
                                id="edit-tournament-startDate"
                                type="datetime-local"
                                className={`input ${errors.startDate ? 'input-error' : ''}`}
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                            {errors.startDate && <span className="error-message">{errors.startDate}</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="edit-tournament-endDate" className="form-label">
                            Befejezési dátum
                        </label>
                        <input
                            id="edit-tournament-endDate"
                            type="datetime-local"
                            className="input"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
