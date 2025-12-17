import { useEffect, useState, useMemo } from 'react';
import { Monitor, Calendar, Clock, Plus, AlertCircle, Check, LayoutGrid, CalendarDays, List, Info } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { useAuth } from '../hooks/useAuth';
import {
    fetchComputers,
    fetchSchedules,
    fetchBookingsForDate,
    fetchWeeklyBookings,
    createBooking,
    deleteBooking,
    setSelectedDate,
    setViewMode,
    type Computer,
    type Booking,
} from '../store/slices/bookingsSlice';
import { MyBookings, WeeklyCalendar, ComputerInfo, BookingEditModal, WaitlistButton } from '../components/booking';
import './Booking.css';

export function BookingPage() {
    const dispatch = useAppDispatch();
    const { isAuthenticated, user } = useAuth();
    const {
        computers,
        bookings,
        schedules,
        selectedDate,
        selectedWeekStart,
        viewMode,
        isLoading,
        error
    } = useAppSelector((state) => state.bookings);

    const [activeTab, setActiveTab] = useState<'booking' | 'my-bookings'>('booking');

    // Booking Create Modal State
    const [selectedComputer, setSelectedComputer] = useState<Computer | null>(null);
    const [selectedDuration, setSelectedDuration] = useState<number>(60);
    const [selectedStartHour, setSelectedStartHour] = useState<number | null>(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);

    // Booking Edit Modal State
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

    // Computer Info Toggle State
    const [expandedComputerId, setExpandedComputerId] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchComputers());
        dispatch(fetchSchedules());
    }, [dispatch]);

    useEffect(() => {
        if (activeTab === 'booking') {
            if (viewMode === 'weekly') {
                dispatch(fetchWeeklyBookings(selectedWeekStart));
            } else {
                dispatch(fetchBookingsForDate(selectedDate));
            }
        }
    }, [dispatch, activeTab, viewMode, selectedDate, selectedWeekStart]);

    // Daily View Logic
    const selectedDateObj = new Date(selectedDate);
    const dayOfWeek = selectedDateObj.getDay();
    const todaySchedule = useMemo(
        () => schedules.find((s) => s.dayOfWeek === dayOfWeek && s.isActive),
        [schedules, dayOfWeek]
    );

    const availableSlots = useMemo(() => {
        if (!todaySchedule) return [];
        const slots: number[] = [];
        for (let hour = todaySchedule.startHour; hour < todaySchedule.endHour; hour++) {
            slots.push(hour);
        }
        return slots;
    }, [todaySchedule]);

    const isComputerBooked = (computerId: string, hour: number): Booking | undefined => {
        const startOfSlot = new Date(selectedDate);
        startOfSlot.setHours(hour, 0, 0, 0);
        const endOfSlot = new Date(selectedDate);
        endOfSlot.setHours(hour + 1, 0, 0, 0);

        return bookings.find((b) => {
            if (b.computerId !== computerId) return false;
            const bookingStart = new Date(b.startTime);
            const bookingEnd = new Date(b.endTime);
            return bookingStart < endOfSlot && bookingEnd > startOfSlot;
        });
    };

    const handleComputerClick = (computer: Computer, hour: number) => {
        const booking = isComputerBooked(computer.id, hour);

        if (booking) {
            if (booking.userId === user?.id) {
                if (confirm('Biztos törölni szeretnéd ezt a foglalást?')) {
                    dispatch(deleteBooking(booking.id));
                }
            }
            return;
        }

        openCreateModal(computer, hour);
    };

    const openCreateModal = (computer: Computer, hour: number, dateStr?: string) => {
        if (!isAuthenticated) {
            setBookingError('Jelentkezz be a foglaláshoz!');
            // Optional: Redirect to login or show login modal
            return;
        }

        if (dateStr) {
            dispatch(setSelectedDate(dateStr));
        }

        setSelectedComputer(computer);
        setSelectedStartHour(hour);
        setShowBookingModal(true);
        setBookingError(null);
    };

    const handleBooking = async () => {
        if (!selectedComputer || selectedStartHour === null) return;

        // Use selectedDate from state which should be set correctly for both daily/weekly via openCreateModal
        const startTime = new Date(selectedDate);
        startTime.setHours(selectedStartHour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + selectedDuration);

        try {
            await dispatch(
                createBooking({
                    computerId: selectedComputer.id,
                    date: selectedDate, // API expects YYYY-MM-DD
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                })
            ).unwrap();

            setShowBookingModal(false);
            setSelectedComputer(null);
            setSelectedStartHour(null);

            // Refresh data
            if (viewMode === 'weekly') {
                dispatch(fetchWeeklyBookings(selectedWeekStart));
            } else {
                dispatch(fetchBookingsForDate(selectedDate));
            }
        } catch (err) {
            setBookingError(err instanceof Error ? err.message : 'Sikertelen foglalás');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('hu-HU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const computersByRow = useMemo(() => {
        const rows: Computer[][] = [[], []];
        computers.forEach((c) => {
            if (c.row === 0) rows[0].push(c);
            else rows[1].push(c);
        });
        rows[0].sort((a, b) => a.position - b.position);
        rows[1].sort((a, b) => a.position - b.position);
        return rows;
    }, [computers]);

    const dayNames = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];

    return (
        <div className="booking-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Monitor className="title-icon" />
                        Gépfoglalás
                    </h1>
                    <p className="page-subtitle">Foglalj helyet a gaming szobában</p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="booking-tabs-container">
                <div className="booking-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'booking' ? 'active' : ''}`}
                        onClick={() => setActiveTab('booking')}
                    >
                        <LayoutGrid size={18} />
                        Foglalás
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'my-bookings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('my-bookings')}
                    >
                        <List size={18} />
                        Saját foglalások
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {(error || bookingError) && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <span>{error || bookingError}</span>
                </div>
            )}

            {activeTab === 'my-bookings' && (
                <MyBookings onEditBooking={setEditingBooking} />
            )}

            {activeTab === 'booking' && (
                <>
                    {/* View Toggle */}
                    <div className="view-controls">
                        <div className="view-toggle">
                            <button
                                className={`toggle-btn ${viewMode === 'daily' ? 'active' : ''}`}
                                onClick={() => dispatch(setViewMode('daily'))}
                            >
                                <LayoutGrid size={16} />
                                Napi
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`}
                                onClick={() => dispatch(setViewMode('weekly'))}
                            >
                                <CalendarDays size={16} />
                                Heti
                            </button>
                        </div>

                        {viewMode === 'daily' && (
                            <div className="date-picker-wrapper">
                                <Calendar size={18} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => dispatch(setSelectedDate(e.target.value))}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                <span className="date-label">{formatDate(selectedDate)}</span>
                            </div>
                        )}
                    </div>

                    {viewMode === 'weekly' ? (
                        <WeeklyCalendar
                            onSlotClick={(computer, date, hour) => openCreateModal(computer, hour, date)}
                            onBookingClick={(booking) => {
                                if (booking.userId === user?.id) {
                                    setEditingBooking(booking);
                                }
                            }}
                        />
                    ) : (
                        /* Daily View Content */
                        <>
                            {!todaySchedule && (
                                <div className="no-schedule-warning card">
                                    <AlertCircle size={32} />
                                    <h3>Nincs elérhető időpont</h3>
                                    <p>{dayNames[dayOfWeek]} napon nincs nyitva a gaming szoba.</p>
                                </div>
                            )}

                            {todaySchedule && (
                                <div className="time-slots-section">
                                    <div className="section-header">
                                        <h2 className="section-title">
                                            <Clock size={20} />
                                            Idősávok ({todaySchedule.startHour}:00 - {todaySchedule.endHour}:00)
                                        </h2>

                                        <div className="grid-legend-inline">
                                            <span className="legend-item available"><span className="dot"></span>Szabad</span>
                                            <span className="legend-item booked"><span className="dot"></span>Foglalt</span>
                                            <span className="legend-item own"><span className="dot"></span>Saját</span>
                                        </div>
                                    </div>

                                    <div className="computer-grid-wrapper">
                                        {availableSlots.map((hour) => (
                                            <div key={hour} className="time-slot-row">
                                                <div className="time-label-column">
                                                    <span className="time-value">{hour}:00</span>
                                                    <span className="time-range">{hour}:00 - {hour + 1}:00</span>
                                                </div>

                                                <div className="computers-column">
                                                    {computersByRow.map((row, rowIndex) => (
                                                        <div key={rowIndex} className="computer-row-group">
                                                            {row.map((computer) => {
                                                                const booking = isComputerBooked(computer.id, hour);
                                                                const isOwn = booking?.userId === user?.id;
                                                                const isBooked = !!booking;
                                                                const isMaintained = computer.status === 'MAINTENANCE';
                                                                const isOutOfOrder = computer.status === 'OUT_OF_ORDER';

                                                                let statusClass = 'available';
                                                                if (isOwn) statusClass = 'own-booking';
                                                                else if (isBooked) statusClass = 'booked';
                                                                else if (isMaintained || isOutOfOrder) statusClass = 'unavailable';

                                                                const isDisabled = isBooked || isMaintained || isOutOfOrder || isLoading;

                                                                return (
                                                                    <div key={computer.id} className="computer-cell-wrapper">
                                                                        <div className="computer-cell-header">
                                                                            <span className="computer-name">{computer.name}</span>
                                                                            <button
                                                                                className="info-btn"
                                                                                onClick={() => setExpandedComputerId(
                                                                                    expandedComputerId === `${computer.id}-${hour}` ? null : `${computer.id}-${hour}`
                                                                                )}
                                                                            >
                                                                                <Info size={14} />
                                                                            </button>
                                                                        </div>

                                                                        <button
                                                                            className={`computer-slot-btn ${statusClass}`}
                                                                            onClick={() => handleComputerClick(computer, hour)}
                                                                            disabled={isDisabled && !isOwn}
                                                                        >
                                                                            {isOwn && <Check size={18} />}
                                                                            {isBooked && !isOwn && <Monitor size={18} />}
                                                                            {(!isBooked && !isMaintained && !isOutOfOrder) && <Plus size={18} className="plus-icon" />}
                                                                        </button>

                                                                        {isBooked && !isOwn && isAuthenticated && (
                                                                            <div className="waitlist-action">
                                                                                <WaitlistButton
                                                                                    computerId={computer.id}
                                                                                    date={selectedDate}
                                                                                    startHour={hour}
                                                                                    endHour={hour + 1}
                                                                                />
                                                                            </div>
                                                                        )}

                                                                        {expandedComputerId === `${computer.id}-${hour}` && (
                                                                            <div className="computer-info-popup">
                                                                                <ComputerInfo computer={computer} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Booking Create Modal */}
            {showBookingModal && selectedComputer && selectedStartHour !== null && (
                <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">
                            <Plus size={24} />
                            Új foglalás
                        </h2>

                        <div className="booking-details">
                            <div className="detail-row">
                                <Monitor size={18} />
                                <span>{selectedComputer.name}</span>
                            </div>
                            <div className="detail-row">
                                <Calendar size={18} />
                                <span>{formatDate(selectedDate)}</span>
                            </div>
                            <div className="detail-row">
                                <Clock size={18} />
                                <span>{selectedStartHour}:00 kezdés</span>
                            </div>
                        </div>

                        <div className="duration-selector">
                            <label>Időtartam:</label>
                            <div className="duration-options">
                                {[30, 60, 90, 120].map((mins) => (
                                    <button
                                        key={mins}
                                        className={`duration-btn ${selectedDuration === mins ? 'active' : ''}`}
                                        onClick={() => setSelectedDuration(mins)}
                                    >
                                        {mins < 60 ? `${mins} perc` : `${mins / 60} óra`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="booking-summary">
                            <strong>Foglalás időtartama:</strong>{' '}
                            {selectedStartHour}:00 - {selectedStartHour + Math.floor(selectedDuration / 60)}:
                            {(selectedDuration % 60).toString().padStart(2, '0')}
                        </div>

                        {bookingError && (
                            <div className="modal-error">
                                <AlertCircle size={16} />
                                {bookingError}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowBookingModal(false)}>
                                Mégse
                            </button>
                            <button className="btn btn-primary" onClick={handleBooking} disabled={isLoading}>
                                <Check size={18} />
                                Foglalás
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Edit Modal */}
            {editingBooking && (
                <BookingEditModal
                    booking={editingBooking}
                    isOpen={!!editingBooking}
                    onClose={() => setEditingBooking(null)}
                />
            )}
        </div>
    );
}
