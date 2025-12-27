import { useEffect, useState, useMemo } from "react";
import {
  Monitor,
  Calendar,
  Clock,
  Plus,
  AlertCircle,
  Check,
  LayoutGrid,
  CalendarDays,
  List,
  Info,
} from "lucide-react";
import { ConfirmationModal } from "../components/common/ConfirmationModal";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { useAuth } from "../hooks/useAuth";
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
} from "../store/slices/bookingsSlice";
import {
  MyBookings,
  WeeklyCalendar,
  ComputerInfo,
  BookingEditModal,
  WaitlistButton,
} from "../components/booking";

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
    error,
  } = useAppSelector((state) => state.bookings);

  const [activeTab, setActiveTab] = useState<"booking" | "my-bookings">(
    "booking"
  );

  // Booking Create Modal State
  const [selectedComputer, setSelectedComputer] = useState<Computer | null>(
    null
  );
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedStartHour, setSelectedStartHour] = useState<number | null>(
    null
  );
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Booking Edit Modal State
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Computer Info Toggle State
  const [expandedComputerId, setExpandedComputerId] = useState<string | null>(
    null
  );

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "warning" | "info" | "primary";
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "primary",
  });

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    dispatch(fetchComputers());
    dispatch(fetchSchedules());
  }, [dispatch]);

  useEffect(() => {
    if (activeTab === "booking") {
      if (viewMode === "weekly") {
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
    for (
      let hour = todaySchedule.startHour;
      hour < todaySchedule.endHour;
      hour++
    ) {
      slots.push(hour);
    }
    return slots;
  }, [todaySchedule]);

  const isComputerBooked = (
    computerId: string,
    hour: number
  ): Booking | undefined => {
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
        setConfirmModal({
          isOpen: true,
          title: "Foglalás törlése",
          message: "Biztos törölni szeretnéd ezt a foglalást?",
          variant: "danger",
          confirmLabel: "Törlés",
          onConfirm: () => {
            dispatch(deleteBooking(booking.id));
          },
        });
      }
      return;
    }

    openCreateModal(computer, hour);
  };

  const openCreateModal = (
    computer: Computer,
    hour: number,
    dateStr?: string
  ) => {
    if (!isAuthenticated) {
      setBookingError("Jelentkezz be a foglaláshoz!");
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
      if (viewMode === "weekly") {
        dispatch(fetchWeeklyBookings(selectedWeekStart));
      } else {
        dispatch(fetchBookingsForDate(selectedDate));
      }
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Sikertelen foglalás"
      );
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("hu-HU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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

  const dayNames = [
    "Vasárnap",
    "Hétfő",
    "Kedd",
    "Szerda",
    "Csütörtök",
    "Péntek",
    "Szombat",
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Modern Header with Gradient */}
      <div className="mb-12 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-3xl rounded-full -z-10" />
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary-100 to-gray-400 bg-clip-text text-transparent mb-4">
          Gépfoglalás
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Foglalj helyet a gaming szobában és élvezd a legjobb játékélményt!
        </p>
      </div>

      {/* Main Tabs */}
      <div className="mb-8 border-b border-white/10">
        <div className="flex gap-8">
          <button
            className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium transition-colors relative ${
              activeTab === "booking"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("booking")}
          >
            <LayoutGrid size={18} />
            Foglalás
          </button>
          <button
            className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium transition-colors relative ${
              activeTab === "my-bookings"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("my-bookings")}
          >
            <List size={18} />
            Saját foglalások
          </button>
        </div>
      </div>

      {/* Error Display */}
      {(error || bookingError) && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertCircle size={20} />
          <span>{error || bookingError}</span>
        </div>
      )}

      {activeTab === "my-bookings" && (
        <MyBookings onEditBooking={setEditingBooking} />
      )}

      {activeTab === "booking" && (
        <>
          {/* View Toggle */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex bg-[#1a1b26] p-1 rounded-xl border border-white/5">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === "daily"
                    ? "bg-[#0f1015] text-white shadow-lg"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => dispatch(setViewMode("daily"))}
              >
                <LayoutGrid size={16} />
                Napi
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === "weekly"
                    ? "bg-[#0f1015] text-white shadow-lg"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => dispatch(setViewMode("weekly"))}
              >
                <CalendarDays size={16} />
                Heti
              </button>
            </div>

            {viewMode === "daily" && (
              <div className="flex items-center gap-3 bg-[#1a1b26] px-4 py-2 rounded-xl border border-white/5">
                <Calendar size={18} className="text-primary" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => dispatch(setSelectedDate(e.target.value))}
                  min={new Date().toISOString().split("T")[0]}
                  className="bg-transparent border-none text-white font-medium cursor-pointer focus:outline-none"
                />
                <span className="text-gray-400 text-sm min-w-[140px]">
                  {formatDate(selectedDate)}
                </span>
              </div>
            )}
          </div>

          {viewMode === "weekly" ? (
            <WeeklyCalendar
              onSlotClick={(computer, date, hour) =>
                openCreateModal(computer, hour, date)
              }
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
                <div className="flex flex-col items-center justify-center py-20 bg-[#1a1b26]/50 rounded-2xl border border-white/5">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle size={40} className="text-gray-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Nincs elérhető időpont
                  </h3>
                  <p className="text-gray-400">
                    {dayNames[dayOfWeek]} napon nincs nyitva a gaming szoba.
                  </p>
                </div>
              )}

              {todaySchedule && (
                <div className="bg-[#1a1b26] rounded-xl border border-white/5 overflow-hidden shadow-lg">
                  <div className="flex justify-between items-center px-6 py-4 bg-[#0f1015] border-b border-white/5">
                    <h2 className="flex items-center gap-3 text-xl font-semibold text-white">
                      <Clock size={20} className="text-primary" />
                      Idősávok ({todaySchedule.startHour}:00 -{" "}
                      {todaySchedule.endHour}:00)
                    </h2>

                    <div className="flex gap-4">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-green-500/20 border-2 border-green-500"></span>
                        <span className="text-gray-400">Szabad</span>
                      </span>
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-red-500/20 border-2 border-red-500"></span>
                        <span className="text-gray-400">Foglalt</span>
                      </span>
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-primary/20 border-2 border-primary"></span>
                        <span className="text-gray-400">Saját</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    {availableSlots.map((hour) => (
                      <div
                        key={hour}
                        className="flex border-b border-white/5 last:border-b-0"
                      >
                        <div className="w-24 flex-shrink-0 bg-[#0f1015] border-r border-white/5 flex flex-col justify-center items-center py-4">
                          <span className="text-lg font-bold text-white">
                            {hour}:00
                          </span>
                          <span className="text-xs text-gray-500">
                            {hour}:00 - {hour + 1}:00
                          </span>
                        </div>

                        <div className="flex-1 p-4 flex flex-col gap-4 overflow-x-auto">
                          {computersByRow.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex gap-4">
                              {row.map((computer) => {
                                const booking = isComputerBooked(
                                  computer.id,
                                  hour
                                );
                                const isOwn = booking?.userId === user?.id;
                                const isBooked = !!booking;
                                const isMaintained =
                                  computer.status === "MAINTENANCE";
                                const isOutOfOrder =
                                  computer.status === "OUT_OF_ORDER";

                                const isDisabled =
                                  isBooked ||
                                  isMaintained ||
                                  isOutOfOrder ||
                                  isLoading;

                                return (
                                  <div
                                    key={computer.id}
                                    className="flex-1 min-w-[140px] relative bg-[#0f1015] rounded-lg p-3 border border-white/5"
                                  >
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5">
                                      <span className="text-sm font-semibold text-gray-300">
                                        {computer.name}
                                      </span>
                                      <button
                                        className="text-gray-500 hover:text-primary hover:bg-primary/10 p-1 rounded transition-colors"
                                        onClick={() =>
                                          setExpandedComputerId(
                                            expandedComputerId ===
                                              `${computer.id}-${hour}`
                                              ? null
                                              : `${computer.id}-${hour}`
                                          )
                                        }
                                      >
                                        <Info size={14} />
                                      </button>
                                    </div>

                                    <button
                                      className={`w-full h-12 rounded-lg flex items-center justify-center transition-all ${
                                        isOwn
                                          ? "bg-primary/20 text-primary border-2 border-primary cursor-pointer hover:bg-primary/30"
                                          : isBooked
                                          ? "bg-red-500/10 text-red-400 border-2 border-red-500/20 cursor-default"
                                          : isMaintained || isOutOfOrder
                                          ? "bg-gray-800/50 text-gray-600 border-2 border-gray-700/20 cursor-not-allowed opacity-50"
                                          : "bg-green-500/10 text-green-400 border-2 border-green-500/20 hover:bg-green-500/20 cursor-pointer group"
                                      }`}
                                      onClick={() =>
                                        handleComputerClick(computer, hour)
                                      }
                                      disabled={isDisabled && !isOwn}
                                    >
                                      {isOwn && <Check size={18} />}
                                      {isBooked && !isOwn && (
                                        <Monitor size={18} />
                                      )}
                                      {!isBooked &&
                                        !isMaintained &&
                                        !isOutOfOrder && (
                                          <Plus
                                            size={18}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                          />
                                        )}
                                    </button>

                                    {isBooked && !isOwn && isAuthenticated && (
                                      <div className="mt-2 pt-2 border-t border-white/5 flex justify-center">
                                        <WaitlistButton
                                          computerId={computer.id}
                                          date={selectedDate}
                                          startHour={hour}
                                          endHour={hour + 1}
                                        />
                                      </div>
                                    )}

                                    {expandedComputerId ===
                                      `${computer.id}-${hour}` && (
                                      <div className="absolute top-full left-0 mt-2 w-64 z-20 shadow-2xl">
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
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowBookingModal(false)}
        >
          <div
            className="bg-[#1a1b26] rounded-2xl p-8 w-full max-w-md border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-6">
              <Plus size={24} className="text-primary" />
              Új foglalás
            </h2>

            <div className="flex flex-col gap-4 mb-6 p-4 bg-[#0f1015] rounded-xl">
              <div className="flex items-center gap-3 text-gray-300">
                <Monitor size={18} className="text-primary" />
                <span>{selectedComputer.name}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Calendar size={18} className="text-primary" />
                <span>{formatDate(selectedDate)}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Clock size={18} className="text-primary" />
                <span>{selectedStartHour}:00 kezdés</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block mb-3 font-medium text-white">
                Időtartam:
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[30, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    className={`py-3 px-2 rounded-lg border-2 font-medium transition-all ${
                      selectedDuration === mins
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                        : "bg-[#0f1015] border-white/10 text-gray-400 hover:border-primary/50 hover:text-gray-300"
                    }`}
                    onClick={() => setSelectedDuration(mins)}
                  >
                    {mins < 60 ? `${mins} perc` : `${mins / 60} óra`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl text-center">
              <strong className="text-white">Foglalás időtartama:</strong>{" "}
              <span className="text-primary font-semibold">
                {selectedStartHour}:00 -{" "}
                {selectedStartHour + Math.floor(selectedDuration / 60)}:
                {(selectedDuration % 60).toString().padStart(2, "0")}
              </span>
            </div>

            {bookingError && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-6">
                <AlertCircle size={16} />
                <span className="text-sm">{bookingError}</span>
              </div>
            )}

            <div className="flex gap-4">
              <button
                className="flex-1 px-6 py-3 bg-[#0f1015] hover:bg-[#1a1b26] border border-white/10 text-white rounded-xl font-semibold transition-all"
                onClick={() => setShowBookingModal(false)}
              >
                Mégse
              </button>
              <button
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleBooking}
                disabled={isLoading}
              >
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

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmLabel={confirmModal.confirmLabel}
      />
    </div>
  );
}
