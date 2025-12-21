import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Monitor } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useRedux';
import { fetchComputers } from '../../store/slices/bookingsSlice';
import { authService } from '../../lib/auth-service';
import { API_URL } from '../../config';

interface Computer {
    id: string;
    name: string;
    row: number;
    position: number;
    specs?: string | null;
    status?: string | null;
    isActive: boolean;
}

interface ComputerModalProps {
    computer?: Computer | null;
    onClose: () => void;
}

export function ComputerModal({ computer, onClose }: ComputerModalProps) {
    const dispatch = useAppDispatch();
    const [formData, setFormData] = useState({
        name: '',
        row: 0,
        position: 0,
        specs: '',
        status: 'Elérhető',
        isActive: true,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (computer) {
            setFormData({
                name: computer.name,
                row: computer.row,
                position: computer.position,
                specs: computer.specs || '',
                status: computer.status || 'Elérhető',
                isActive: computer.isActive,
            });
        }
    }, [computer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = authService.keycloak?.token;
            if (!token) {
                toast.error('Nincs bejelentkezve');
                return;
            }

            const url = computer
                ? `${API_URL}/bookings/computers/${computer.id}`
                : `${API_URL}/bookings/computers`;

            const method = computer ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Hiba történt');
            }

            dispatch(fetchComputers());
            onClose();
        } catch (error) {
            console.error('Failed to save computer:', error);
            toast.error('Hiba történt a gép mentése során');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="flex items-center gap-2">
                        <Monitor size={24} className="text-primary" />
                        <h2 className="modal-title">{computer ? 'Gép szerkesztése' : 'Új gép hozzáadása'}</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Gép neve *</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="pl. PC-1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Sor (0-tól) *</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.row}
                                onChange={(e) => setFormData({ ...formData, row: parseInt(e.target.value) })}
                                required
                                min={0}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Pozíció (0-tól) *</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) })}
                                required
                                min={0}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Specifikációk</label>
                        <textarea
                            className="input"
                            value={formData.specs}
                            onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
                            placeholder="pl. Intel i7, 16GB RAM, RTX 3060"
                            rows={3}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Státusz</label>
                        <select
                            className="input"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="Elérhető">Elérhető</option>
                            <option value="Javítás alatt">Javítás alatt</option>
                            <option value="Zárt">Zárt</option>
                            <option value="Karbantartás">Karbantartás</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm text-muted">Aktív (foglalható)</span>
                        </label>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Mégse
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Mentés...' : computer ? 'Mentés' : 'Létrehozás'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
