import { useState } from 'react';
import { BarChart3, Edit2, Shield, AlertCircle, Plus, Monitor, Clock, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { createSchedule, deleteSchedule, seedComputers, checkInByCode } from '../../store/slices/bookingsSlice';
import { AdminBookingStats } from './AdminBookingStats';

export function BookingManagement() {
    const dispatch = useAppDispatch();
    const { schedules, computers } = useAppSelector((state) => state.bookings);

    const [bookingSubTab, setBookingSubTab] = useState<'management' | 'stats'>('stats');
    const [checkInCode, setCheckInCode] = useState('');
    const [newSchedule, setNewSchedule] = useState({ dayOfWeek: 5, startHour: 14, endHour: 18 });

    const handleCheckIn = async () => {
        if (!checkInCode.trim()) return;
        try {
            await dispatch(checkInByCode(checkInCode)).unwrap();
            alert('Sikeres bejelentkezés!');
            setCheckInCode('');
        } catch (error) {
            alert('Sikertelen bejelentkezés: Érvénytelen kód vagy a foglalás nem most esedékes.');
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
                    {/* Check-in Section */}
                    <div className="card p-4 bg-tertiary">
                        <h3 className="section-subtitle mt-0 mb-3 flex items-center gap-2">
                            <Shield size={18} />
                            Kódos Check-in
                        </h3>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                className="input"
                                placeholder="Írd be a foglalási kódot..."
                                value={checkInCode}
                                onChange={(e) => setCheckInCode(e.target.value)}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleCheckIn}
                                disabled={!checkInCode}
                            >
                                Bejelentkezés
                            </button>
                        </div>
                    </div>

                    {/* Seed Computers Button */}
                    {computers.length === 0 && (
                        <div className="alert alert-warning mb-2 flex items-center gap-4">
                            <AlertCircle size={20} />
                            <div className="flex-1">
                                <h4 className="m-0">Nincs gép létrehozva</h4>
                                <p className="m-0 text-sm">Kattints a gombra a 10 gép (2x5 rács) létrehozásához.</p>
                            </div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => dispatch(seedComputers())}
                            >
                                <Plus size={16} />
                                Gépek létrehozása
                            </button>
                        </div>
                    )}

                    {computers.length > 0 && (
                        <div className="alert alert-success mb-2 flex items-center gap-2">
                            <Monitor size={20} />
                            <span>{computers.length} gép elérhető a rendszerben</span>
                        </div>
                    )}

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
        </div>
    );
}
