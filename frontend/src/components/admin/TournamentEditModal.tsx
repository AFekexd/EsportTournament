import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { updateTournament } from '../../store/slices/tournamentsSlice';
import { fetchGames } from '../../store/slices/gamesSlice';
import type { Tournament } from '../../types';
import { ImageUpload } from '../common/ImageUpload';

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
        imageUrl: tournament.imageUrl || '',
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
                    imageUrl: formData.imageUrl || undefined,
                    status: formData.status,
                    format: formData.format,
                    maxTeams: formData.maxTeams,
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#1a1b26] rounded-2xl w-full max-w-3xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1b26] border-b border-white/10 p-6 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold text-white">Verseny szerkesztése</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Name & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="edit-tournament-name" className="block text-sm font-medium text-gray-300 mb-2">
                                Verseny neve <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="edit-tournament-name"
                                type="text"
                                className={`w-full px-4 py-3 bg-[#0f1015] border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors`}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                maxLength={100}
                            />
                            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="edit-tournament-status" className="block text-sm font-medium text-gray-300 mb-2">
                                Státusz
                            </label>
                            <select
                                id="edit-tournament-status"
                                className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors"
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

                    {/* Description */}
                    <div>
                        <label htmlFor="edit-tournament-description" className="block text-sm font-medium text-gray-300 mb-2">
                            Leírás
                        </label>
                        <textarea
                            id="edit-tournament-description"
                            className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Rövid leírás a versenyről..."
                            rows={3}
                            maxLength={500}
                        />
                    </div>

                    {/* Image Upload */}
                    <ImageUpload
                        value={formData.imageUrl}
                        onChange={(value) => setFormData({ ...formData, imageUrl: value })}
                        label="Verseny képe"
                        placeholder="https://example.com/image.jpg"
                        maxSizeMB={15}
                    />

                    {/* Game & Format */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Játék</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                                value={tournament.game?.name || 'Ismeretlen'}
                                disabled
                            />
                            <p className="text-xs text-gray-500 mt-1">A játék nem módosítható létrehozás után</p>
                        </div>

                        <div>
                            <label htmlFor="edit-tournament-format" className="block text-sm font-medium text-gray-300 mb-2">
                                Formátum
                            </label>
                            <select
                                id="edit-tournament-format"
                                className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors"
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

                    {/* Max Teams */}
                    <div>
                        <label htmlFor="edit-tournament-maxTeams" className="block text-sm font-medium text-gray-300 mb-2">
                            Max csapatok
                        </label>
                        <input
                            id="edit-tournament-maxTeams"
                            type="number"
                            className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors"
                            value={formData.maxTeams}
                            onChange={(e) => setFormData({ ...formData, maxTeams: parseInt(e.target.value) })}
                            min={2}
                            max={128}
                        />
                    </div>

                    {/* Registration Deadline & Start Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="edit-tournament-regDeadline" className="block text-sm font-medium text-gray-300 mb-2">
                                Jelentkezési határidő <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="edit-tournament-regDeadline"
                                type="datetime-local"
                                className={`w-full px-4 py-3 bg-[#0f1015] border ${errors.registrationDeadline ? 'border-red-500' : 'border-white/10'} rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors`}
                                value={formData.registrationDeadline}
                                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                            />
                            {errors.registrationDeadline && <p className="text-red-400 text-sm mt-1">{errors.registrationDeadline}</p>}
                        </div>

                        <div>
                            <label htmlFor="edit-tournament-startDate" className="block text-sm font-medium text-gray-300 mb-2">
                                Kezdési dátum <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="edit-tournament-startDate"
                                type="datetime-local"
                                className={`w-full px-4 py-3 bg-[#0f1015] border ${errors.startDate ? 'border-red-500' : 'border-white/10'} rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors`}
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                            {errors.startDate && <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>}
                        </div>
                    </div>

                    {/* End Date */}
                    <div>
                        <label htmlFor="edit-tournament-endDate" className="block text-sm font-medium text-gray-300 mb-2">
                            Befejezési dátum (opcionális)
                        </label>
                        <input
                            id="edit-tournament-endDate"
                            type="datetime-local"
                            className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
