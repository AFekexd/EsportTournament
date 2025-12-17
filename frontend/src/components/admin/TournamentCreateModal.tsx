import { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { createTournament } from '../../store/slices/tournamentsSlice';
import { fetchGames } from '../../store/slices/gamesSlice';


interface TournamentCreateModalProps {
    onClose: () => void;
}

export function TournamentCreateModal({ onClose }: TournamentCreateModalProps) {
    const dispatch = useAppDispatch();
    const { createLoading } = useAppSelector((state) => state.tournaments);
    const { games } = useAppSelector((state) => state.games);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        gameId: '',
        format: 'SINGLE_ELIMINATION',
        maxTeams: 16,
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        prizePool: '',
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        dispatch(fetchGames());
    }, [dispatch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: { [key: string]: string } = {};
        if (!formData.name || formData.name.length < 3) {
            newErrors.name = 'A verseny nevének legalább 3 karakter hosszúnak kell lennie';
        }
        if (!formData.gameId) {
            newErrors.gameId = 'Válassz egy játékot';
        }
        if (!formData.startDate) {
            newErrors.startDate = 'Add meg a kezdési dátumot';
        }
        if (!formData.registrationDeadline) {
            newErrors.registrationDeadline = 'Add meg a jelentkezési határidőt';
        }
        if (formData.maxTeams < 2) {
            newErrors.maxTeams = 'Legalább 2 csapat szükséges';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            await dispatch(createTournament({
                name: formData.name,
                description: formData.description || undefined,
                gameId: formData.gameId,
                format: formData.format,
                maxTeams: formData.maxTeams,
                startDate: formData.startDate,
                endDate: formData.endDate || undefined,
                registrationDeadline: formData.registrationDeadline,
                prizePool: formData.prizePool || undefined,
            })).unwrap();

            onClose();
        } catch (err) {
            console.error('Failed to create tournament:', err);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-[800px]" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Új verseny létrehozása</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="tournament-name" className="form-label">
                                Verseny neve <span className="required">*</span>
                            </label>
                            <input
                                id="tournament-name"
                                type="text"
                                className={`input ${errors.name ? 'input-error' : ''}`}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Pl: Tavaszi Bajnokság 2024"
                                maxLength={100}
                            />
                            {errors.name && <span className="error-message">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="tournament-game" className="form-label">
                                Játék <span className="required">*</span>
                            </label>
                            <select
                                id="tournament-game"
                                className={`input ${errors.gameId ? 'input-error' : ''}`}
                                value={formData.gameId}
                                onChange={(e) => setFormData({ ...formData, gameId: e.target.value })}
                            >
                                <option value="">Válassz játékot...</option>
                                {games.map((game) => (
                                    <option key={game.id} value={game.id}>
                                        {game.name}
                                    </option>
                                ))}
                            </select>
                            {errors.gameId && <span className="error-message">{errors.gameId}</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="tournament-description" className="form-label">
                            Leírás
                        </label>
                        <textarea
                            id="tournament-description"
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
                            <label htmlFor="tournament-format" className="form-label">
                                Formátum
                            </label>
                            <select
                                id="tournament-format"
                                className="input"
                                value={formData.format}
                                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                            >
                                <option value="SINGLE_ELIMINATION">Egyenes kieséses</option>
                                <option value="DOUBLE_ELIMINATION">Dupla kieséses</option>
                                <option value="ROUND_ROBIN">Körmérkőzés</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="tournament-maxTeams" className="form-label">
                                Max csapatok <span className="required">*</span>
                            </label>
                            <input
                                id="tournament-maxTeams"
                                type="number"
                                className={`input ${errors.maxTeams ? 'input-error' : ''}`}
                                value={formData.maxTeams}
                                onChange={(e) => setFormData({ ...formData, maxTeams: parseInt(e.target.value) })}
                                min={2}
                                max={128}
                            />
                            {errors.maxTeams && <span className="error-message">{errors.maxTeams}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="tournament-regDeadline" className="form-label">
                                Jelentkezési határidő <span className="required">*</span>
                            </label>
                            <input
                                id="tournament-regDeadline"
                                type="datetime-local"
                                className={`input ${errors.registrationDeadline ? 'input-error' : ''}`}
                                value={formData.registrationDeadline}
                                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                            />
                            {errors.registrationDeadline && <span className="error-message">{errors.registrationDeadline}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="tournament-startDate" className="form-label">
                                Kezdési dátum <span className="required">*</span>
                            </label>
                            <input
                                id="tournament-startDate"
                                type="datetime-local"
                                className={`input ${errors.startDate ? 'input-error' : ''}`}
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                            {errors.startDate && <span className="error-message">{errors.startDate}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="tournament-endDate" className="form-label">
                                Befejezési dátum
                            </label>
                            <input
                                id="tournament-endDate"
                                type="datetime-local"
                                className="input"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="tournament-prizePool" className="form-label">
                                Díjazás
                            </label>
                            <input
                                id="tournament-prizePool"
                                type="text"
                                className="input"
                                value={formData.prizePool}
                                onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                                placeholder="Pl: 100,000 Ft"
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Mégse
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={createLoading}>
                            {createLoading ? (
                                <>
                                    <div className="spinner" />
                                    Létrehozás...
                                </>
                            ) : (
                                <>
                                    <Trophy size={18} />
                                    Verseny létrehozása
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
