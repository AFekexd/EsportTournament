import { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { createTournament } from '../../store/slices/tournamentsSlice';
import { fetchGames } from '../../store/slices/gamesSlice';
import { ImageUpload } from '../common/ImageUpload';

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
        imageUrl: '',
        gameId: '',
        format: 'SINGLE_ELIMINATION',
        maxTeams: 16,
        startDate: '',
        endDate: '',
        registrationDeadline: '',
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
                imageUrl: formData.imageUrl || undefined,
                gameId: formData.gameId,
                format: formData.format,
                maxTeams: formData.maxTeams,
                startDate: formData.startDate,
                endDate: formData.endDate || undefined,
                registrationDeadline: formData.registrationDeadline,
            })).unwrap();

            onClose();
        } catch (err) {
            console.error('Failed to create tournament:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#1a1b26] rounded-2xl w-full max-w-3xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1b26] border-b border-white/10 p-6 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold text-white">Új verseny létrehozása</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Name & Game */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="tournament-name" className="block text-sm font-medium text-gray-300 mb-2">
                                Verseny neve <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="tournament-name"
                                type="text"
                                className={`w-full px-4 py-3 bg-[#0f1015] border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors`}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Pl: Tavaszi CS2 Kupa"
                                maxLength={100}
                            />
                            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="tournament-game" className="block text-sm font-medium text-gray-300 mb-2">
                                Játék <span className="text-red-400">*</span>
                            </label>
                            <select
                                id="tournament-game"
                                className={`w-full px-4 py-3 bg-[#0f1015] border ${errors.gameId ? 'border-red-500' : 'border-white/10'} rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors`}
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
                            {errors.gameId && <p className="text-red-400 text-sm mt-1">{errors.gameId}</p>}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="tournament-description" className="block text-sm font-medium text-gray-300 mb-2">
                            Leírás
                        </label>
                        <textarea
                            id="tournament-description"
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

                    {/* Format & Max Teams */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="tournament-format" className="block text-sm font-medium text-gray-300 mb-2">
                                Formátum
                            </label>
                            <select
                                id="tournament-format"
                                className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors"
                                value={formData.format}
                                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                            >
                                <option value="SINGLE_ELIMINATION">Egyenes kieséses</option>
                                <option value="DOUBLE_ELIMINATION">Dupla kieséses</option>
                                <option value="ROUND_ROBIN">Körmérkőzés</option>
                                <option value="SWISS">Svájci</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="tournament-maxTeams" className="block text-sm font-medium text-gray-300 mb-2">
                                Max csapatok <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="tournament-maxTeams"
                                type="number"
                                className={`w-full px-4 py-3 bg-[#0f1015] border ${errors.maxTeams ? 'border-red-500' : 'border-white/10'} rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors`}
                                value={formData.maxTeams}
                                onChange={(e) => setFormData({ ...formData, maxTeams: parseInt(e.target.value) })}
                                min={2}
                                max={128}
                            />
                            {errors.maxTeams && <p className="text-red-400 text-sm mt-1">{errors.maxTeams}</p>}
                        </div>
                    </div>

                    {/* Registration Deadline & Start Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="tournament-regDeadline" className="block text-sm font-medium text-gray-300 mb-2">
                                Jelentkezési határidő <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="tournament-regDeadline"
                                type="datetime-local"
                                className={`w-full px-4 py-3 bg-[#0f1015] border ${errors.registrationDeadline ? 'border-red-500' : 'border-white/10'} rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors`}
                                value={formData.registrationDeadline}
                                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                            />
                            {errors.registrationDeadline && <p className="text-red-400 text-sm mt-1">{errors.registrationDeadline}</p>}
                        </div>

                        <div>
                            <label htmlFor="tournament-startDate" className="block text-sm font-medium text-gray-300 mb-2">
                                Kezdési dátum <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="tournament-startDate"
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
                        <label htmlFor="tournament-endDate" className="block text-sm font-medium text-gray-300 mb-2">
                            Befejezési dátum (opcionális)
                        </label>
                        <input
                            id="tournament-endDate"
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
                            disabled={createLoading}
                        >
                            {createLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
