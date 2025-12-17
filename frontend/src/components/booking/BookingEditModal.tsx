import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useRedux';
import { updateBooking, type Booking } from '../../store/slices/bookingsSlice';
import './BookingEditModal.css';

interface BookingEditModalProps {
    booking: Booking;
    isOpen: boolean;
    onClose: () => void;
}

export function BookingEditModal({ booking, isOpen, onClose }: BookingEditModalProps) {
    const dispatch = useAppDispatch();
    const [startTime, setStartTime] = useState(new Date(booking.startTime).toISOString().slice(0, 16));
    const [endTime, setEndTime] = useState(new Date(booking.endTime).toISOString().slice(0, 16));
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);

        try {
            // Validation
            const start = new Date(startTime);
            const end = new Date(endTime);

            if (start >= end) {
                throw new Error('A kezdési időnek korábbinak kell lennie a befejezésnél.');
            }

            const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            if (diffMinutes < 30) {
                throw new Error('A foglalásnak legalább 30 percesnek kell lennie.');
            }
            if (diffMinutes > 120) {
                throw new Error('A foglalás legfeljebb 2 óra lehet.');
            }

            // Create dates with correct timezone offset handling if needed,
            // but for ISO string inputs, standard Date parsing usually works okay in local context.
            // However, we should ensure we send ISO strings.

            await dispatch(updateBooking({
                id: booking.id,
                startTime: start.toISOString(),
                endTime: end.toISOString()
            })).unwrap();

            onClose();
        } catch (err: any) {
            setError(err.message || 'Hiba történt a módosítás során.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content booking-edit-modal">
                <div className="modal-header">
                    <h3>Foglalás módosítása</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div className="error-message">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="current-info">
                            <span className="label">Jelenlegi időpont:</span>
                            <span className="value">
                                {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="edit-start-time">Kezdés</label>
                            <input
                                type="datetime-local"
                                id="edit-start-time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="edit-end-time">Befejezés</label>
                            <input
                                type="datetime-local"
                                id="edit-end-time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                            />
                        </div>

                        <p className="hint">
                            Csak az időpont módosítható. Ha másik gépet szeretnél, töröld ezt a foglalást és hozz létre újat.
                        </p>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                            Mégse
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSaving}>
                            {isSaving ? <span className="spinner-sm" /> : <Save size={18} />}
                            Mentés
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
