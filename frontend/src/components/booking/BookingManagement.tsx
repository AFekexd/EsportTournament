import { useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, Edit2, AlertCircle, Plus, Monitor, Clock, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { createSchedule, deleteSchedule, fetchComputers } from '../../store/slices/bookingsSlice';
import { AdminBookingStats } from './AdminBookingStats';
import { ComputerModal } from '../admin/ComputerModal';
import { authService } from '../../lib/auth-service';
import { API_URL } from '../../config';

export function BookingManagement() {
    const dispatch = useAppDispatch();
    const { schedules, computers } = useAppSelector((state) => state.bookings);

    const [bookingSubTab, setBookingSubTab] = useState<'management' | 'stats'>('stats');
    const [newSchedule, setNewSchedule] = useState({ dayOfWeek: 5, startHour: 14, endHour: 18 });
    const [showComputerModal, setShowComputerModal] = useState(false);
    const [editingComputer, setEditingComputer] = useState<any>(null);


    const handleDeleteComputer = async (computerId: string) => {
        if (!confirm('Biztosan törölni szeretnéd ezt a gépet?')) return;

        try {
            const token = authService.keycloak?.token;
            if (!token) return;

            const response = await fetch(`${API_URL}/bookings/computers/${computerId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.success) {
                dispatch(fetchComputers());
            }
        } catch (error) {
            console.error('Failed to delete computer:', error);
            toast.error('Hiba történt a gép törlése során');
        }
    };

    return (
        <div className="admin-section">
            <div className="flex justify-between items-center mb-6">
                <h2 className="section-title mb-0">Gépfoglalás</h2>
                <div className="flex gap-2">
                    <button
                        className={`btn btn-sm ${bookingSubTab === 'stats' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setBookingSubTab('stats')}
                    >
                        <BarChart3 size={16} />
                        Statisztika
                    </button>
                    <button
                        className={`btn btn-sm ${bookingSubTab === 'management' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setBookingSubTab('management')}
                    >
                        <Edit2 size={16} />
                        Kezelés
                    </button>
                </div>
            </div>

            {bookingSubTab === 'stats' ? (
                <AdminBookingStats />
            ) : (
                <div className="space-y-6">
                    {/* Computer Management Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="section-subtitle flex items-center gap-2">
                                <Monitor size={18} />
                                Gépek kezelése
                            </h3>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setShowComputerModal(true)}
                            >
                                <Plus size={16} />
                                Új gép
                            </button>
                        </div>

                        {computers.length === 0 ? (
                            <div className="alert alert-info mb-4">
                                <AlertCircle size={20} />
                                <div>
                                    <h4 className="m-0">Nincs gép létrehozva</h4>
                                    <p className="m-0 text-sm">Kattints az "Új gép" gombra gépek hozzáadásához egyenként.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                {computers.map((computer) => (
                                    <div key={computer.id} className="card p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="text-lg font-semibold text-white mb-1">{computer.name}</h4>
                                                <p className="text-sm text-muted">
                                                    Pozíció: Sor {computer.row + 1}, Hely {computer.position + 1}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${computer.isActive
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                                }`}>
                                                {computer.isActive ? 'Aktív' : 'Inaktív'}
                                            </span>
                                        </div>
                                        {computer.specs && (
                                            <p className="text-sm text-muted mb-2">
                                                <strong>Specs:</strong> {typeof computer.specs === 'string' ? computer.specs : JSON.stringify(computer.specs)}
                                            </p>
                                        )}
                                        {computer.status && (
                                            <p className="text-sm text-muted mb-3">
                                                <strong>Státusz:</strong> {computer.status}
                                            </p>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                className="btn-icon hover:bg-white/10 flex-1"
                                                title="Szerkesztés"
                                                onClick={() => { setEditingComputer(computer); setShowComputerModal(true); }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="btn-icon hover:bg-red-500/10 text-red-400 flex-1"
                                                title="Törlés"
                                                onClick={() => handleDeleteComputer(computer.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Schedule Section */}
                    <div>
                        <h3 className="section-subtitle flex items-center gap-2 mb-2">
                            <Clock size={18} />
                            Nyitvatartási idők
                        </h3>
                        <p className="text-muted mb-4">Add meg, hogy melyik napokon és mikor érhető el a gaming szoba.</p>

                        {/* Add New Schedule Form */}
                        <div className="card p-4 mb-4">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="form-group mb-0">
                                    <label className="text-sm text-muted mb-1 block">Nap</label>
                                    <select
                                        className="input"
                                        value={newSchedule.dayOfWeek}
                                        onChange={(e) => setNewSchedule({ ...newSchedule, dayOfWeek: parseInt(e.target.value) })}
                                    >
                                        <option value={1}>Hétfő</option>
                                        <option value={2}>Kedd</option>
                                        <option value={3}>Szerda</option>
                                        <option value={4}>Csütörtök</option>
                                        <option value={5}>Péntek</option>
                                        <option value={6}>Szombat</option>
                                        <option value={0}>Vasárnap</option>
                                    </select>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="text-sm text-muted mb-1 block">Kezdés</label>
                                    <input
                                        type="number"
                                        className="input"
                                        min={0}
                                        max={23}
                                        value={newSchedule.startHour}
                                        onChange={(e) => setNewSchedule({ ...newSchedule, startHour: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="text-sm text-muted mb-1 block">Vége</label>
                                    <input
                                        type="number"
                                        className="input"
                                        min={0}
                                        max={23}
                                        value={newSchedule.endHour}
                                        onChange={(e) => setNewSchedule({ ...newSchedule, endHour: parseInt(e.target.value) })}
                                    />
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        dispatch(createSchedule(newSchedule));
                                    }}
                                >
                                    <Plus size={18} />
                                    Hozzáadás
                                </button>
                            </div>
                        </div>

                        {/* Schedule List */}
                        <div className="space-y-3">
                            {schedules.length === 0 ? (
                                <p className="text-muted text-center py-4">Még nincs nyitvatartás beállítva.</p>
                            ) : (
                                schedules.map((schedule) => {
                                    const dayNames = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
                                    return (
                                        <div key={schedule.id} className="card p-3 flex justify-between items-center">
                                            <div className="flex gap-6 items-center">
                                                <strong className="min-w-[100px]">{dayNames[schedule.dayOfWeek]}</strong>
                                                <span className="text-muted">{schedule.startHour}:00 - {schedule.endHour}:00</span>
                                            </div>
                                            <button
                                                className="btn-icon text-danger hover:bg-danger/10"
                                                onClick={() => dispatch(deleteSchedule(schedule.id))}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Computer Modal */}
            {showComputerModal && (
                <ComputerModal
                    computer={editingComputer}
                    onClose={() => {
                        setShowComputerModal(false);
                        setEditingComputer(null);
                    }}
                />
            )}
        </div>
    );
}
