import { useState } from 'react';
import { X, Save, Bell, MessageSquare } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { updateTournament } from '../../store/slices/tournamentsSlice';

interface TournamentStatusModalProps {
    tournamentId: string;
    currentStatus: string;
    currentNotifyUsers?: boolean;
    currentNotifyDiscord?: boolean;
    currentDiscordChannel?: string;
    onClose: () => void;
}

const statusOptions = [
    { value: 'DRAFT', label: 'Tervezet', description: 'A verseny még nem publikus' },
    { value: 'REGISTRATION', label: 'Regisztráció', description: 'Csapatok regisztrálhatnak' },
    { value: 'IN_PROGRESS', label: 'Folyamatban', description: 'A verseny elkezdődött' },
    { value: 'COMPLETED', label: 'Befejezett', description: 'A verseny véget ért' },
    { value: 'CANCELLED', label: 'Törölve', description: 'A verseny törölve lett' },
];

export function TournamentStatusModal({
    tournamentId,
    currentStatus,
    currentNotifyUsers = false,
    currentNotifyDiscord = false,
    currentDiscordChannel = 'matches',
    onClose
}: TournamentStatusModalProps) {
    const dispatch = useAppDispatch();
    const { updateLoading } = useAppSelector((state) => state.tournaments);
    const [selectedStatus, setSelectedStatus] = useState(currentStatus);
    const [notifyUsers, setNotifyUsers] = useState(currentNotifyUsers);
    const [notifyDiscord, setNotifyDiscord] = useState(currentNotifyDiscord);
    const [discordChannel, setDiscordChannel] = useState(currentDiscordChannel);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await dispatch(updateTournament({
                id: tournamentId,
                data: {
                    status: selectedStatus,
                    notifyUsers,
                    notifyDiscord,
                    discordChannelId: discordChannel,
                },
            })).unwrap();

            onClose();
        } catch (err) {
            console.error('Failed to update tournament:', err);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Verseny beállítások</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-section">
                        <h3 className="section-title">Státusz</h3>
                        <div className="flex flex-col gap-3">
                            {statusOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex items-start gap-4 p-4 border-2 border-border rounded-lg cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-muted/30 ${selectedStatus === option.value ? 'border-primary bg-primary/10' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="status"
                                        value={option.value}
                                        checked={selectedStatus === option.value}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="mt-1 cursor-pointer"
                                    />
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold text-foreground">{option.label}</span>
                                        <span className="text-sm text-muted-foreground">{option.description}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-section">
                        <h3 className="section-title">Értesítések</h3>

                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={notifyUsers}
                                onChange={(e) => setNotifyUsers(e.target.checked)}
                            />
                            <Bell size={18} />
                            <span>Felhasználói értesítések küldése</span>
                        </label>
                        <p className="help-text">
                            Minden meccs eredménynél értesítést küldenek a csapat tagjainak
                        </p>

                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={notifyDiscord}
                                onChange={(e) => setNotifyDiscord(e.target.checked)}
                            />
                            <MessageSquare size={18} />
                            <span>Discord értesítések küldése</span>
                        </label>
                        <p className="help-text">
                            Meccs eredmények automatikusan kiírásra kerülnek Discord-ra
                        </p>

                        {notifyDiscord && (
                            <div className="form-group">
                                <label className="label">Discord csatorna</label>
                                <select
                                    className="input"
                                    value={discordChannel}
                                    onChange={(e) => setDiscordChannel(e.target.value)}
                                >
                                    <option value="matches">⚔️ Meccsek</option>
                                    <option value="tournaments">🏆 Versenyek</option>
                                    <option value="announcements">📢 Bejelentések</option>
                                    <option value="general">💬 Általános</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Mégse
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={updateLoading}
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
