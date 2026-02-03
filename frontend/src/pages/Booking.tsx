import { useEffect, useState } from "react";
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
  Map,
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
} from "../store/slices/bookingsSlice";
import {
  MyBookings,
  WeeklyCalendar,
  DayCalendarStrip,
  TimeSlotList,
  ComputerCardGrid,
} from "../components/booking";
import { RoomLayoutModal } from "../components/booking/RoomLayoutModal";

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
    "booking",
  );

  // Booking Create Modal State
  const [selectedComputer, setSelectedComputer] = useState<Computer | null>(
    null,
  );
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedStartHour, setSelectedStartHour] = useState<number | null>(
    null,
  );
  const [selectedStartMinute, setSelectedStartMinute] = useState<number>(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Note: These states are now managed within the new components

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
    onConfirm: () => { },
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


  const openCreateModal = (
    computer: Computer,
    hour: number,
    minute: number = 0,
    dateStr?: string,
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
    setSelectedStartMinute(minute);
    setShowBookingModal(true);
    setBookingError(null);
  };

  const handleBooking = async () => {
    if (!selectedComputer || selectedStartHour === null) return;

    // Use selectedDate from state which should be set correctly for both daily/weekly via openCreateModal
    const startTime = new Date(selectedDate);
    startTime.setHours(selectedStartHour, selectedStartMinute, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + selectedDuration);

    try {
      await dispatch(
        createBooking({
          computerId: selectedComputer.id,
          date: selectedDate, // API expects YYYY-MM-DD
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
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
        err instanceof Error ? err.message : "Sikertelen foglalás",
      );
    }
  };

  const formatBalance = (seconds: number) => {
    if (user?.role === "ADMIN") return "Végtelen";
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    return `${isNegative ? "-" : ""}${hours} óra ${minutes} perc`;
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


  const isBalanceInsufficient =
    user?.role !== "ADMIN" &&
    (user?.timeBalanceSeconds || 0) - selectedDuration * 60 < 0;

  return (
    <div className="w-full mx-auto px-4 py-4 md:py-8">
      {/* Modern Header with Gradient */}
      <div className="mb-8 md:mb-12 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-32 md:h-32 bg-primary/20 blur-3xl rounded-full -z-10" />
        <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary-100 to-gray-400 bg-clip-text text-transparent mb-2 md:mb-4">
          Gépfoglalás
        </h1>
        <p className="text-sm md:text-lg text-gray-400 max-w-2xl mx-auto mb-4 md:mb-2">
          Foglalj helyet a gaming szobában és élvezd a legjobb játékélményt!
        </p>

        <p className="text-xs md:text-sm !text-gray-400 max-w-2xl mx-auto mb-2 md:mb-2 italic">
          Note: Bejelentkezni csak Felhasználónév és Jelszó segítségével
          lehetséges!
        </p>

        {user && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-[#1a1b26] border border-white/10 rounded-full text-xs md:text-sm font-medium text-white shadow-lg">
            <Clock size={14} className="md:w-4 md:h-4 text-primary" />
            <span>
              Időegyenleg:{" "}
              <span className="text-primary">
                {formatBalance(user.timeBalanceSeconds)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="mb-6 md:mb-8 border-b border-white/10 overflow-x-auto">
        <div className="flex gap-4 md:gap-8 min-w-max">
          <button
            className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium transition-colors relative text-sm md:text-base ${activeTab === "booking"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            onClick={() => setActiveTab("booking")}
          >
            <LayoutGrid size={16} className="md:w-[18px] md:h-[18px]" />
            Foglalás
          </button>
          <button
            className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium transition-colors relative text-sm md:text-base ${activeTab === "my-bookings"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            onClick={() => setActiveTab("my-bookings")}
          >
            <List size={16} className="md:w-[18px] md:h-[18px]" />
            Saját foglalások
          </button>
        </div>
      </div>

      {/* Error Display */}
      {(error || bookingError) && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm md:text-base">
          <AlertCircle size={20} className="flex-shrink-0" />
          <span>{error || bookingError}</span>
        </div>
      )}

      {activeTab === "my-bookings" && <MyBookings />}

      {activeTab === "booking" && (
        <>
          {/* View Toggle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex bg-[#1a1b26] p-1 rounded-xl border border-white/5 w-full md:w-auto">
                <button
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm md:text-base ${viewMode === "daily"
                    ? "bg-[#0f1015] text-white shadow-lg"
                    : "text-gray-400 hover:text-gray-300"
                    }`}
                  onClick={() => dispatch(setViewMode("daily"))}
                >
                  <LayoutGrid size={16} />
                  Napi
                </button>
                <button
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm md:text-base ${viewMode === "weekly"
                    ? "bg-[#0f1015] text-white shadow-lg"
                    : "text-gray-400 hover:text-gray-300"
                    }`}
                  onClick={() => dispatch(setViewMode("weekly"))}
                >
                  <CalendarDays size={16} />
                  Heti
                </button>
              </div>

              <button
                className="flex md:hidden items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-sm bg-[#1a1b26] border border-white/5 text-primary hover:bg-white/5"
                onClick={() => setShowMapModal(true)}
              >
                <Map size={18} />
              </button>

              <button
                className="hidden md:flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all bg-[#1a1b26] border border-white/5 text-primary hover:bg-white/5 hover:text-white"
                onClick={() => setShowMapModal(true)}
              >
                <Map size={18} />
                Térkép
              </button>
            </div>

            {viewMode === "daily" && (
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <Calendar size={14} className="text-primary" />
                <span>{formatDate(selectedDate)}</span>
              </div>
            )}
          </div>

          {viewMode === "weekly" ? (
            <div className="overflow-x-auto pb-4">
              <WeeklyCalendar
                onSlotClick={(computer, date, hour, minute) =>
                  openCreateModal(computer, hour, minute, date)
                }
              />
            </div>
          ) : (
            /* Daily View Content - Step by Step Flow */
            <div className="space-y-6">
              {/* Step 1: Day Calendar Strip */}
              <DayCalendarStrip
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  dispatch(setSelectedDate(date));
                  setSelectedStartHour(null);
                }}
                bookings={bookings}
                schedules={schedules}
                computersCount={computers.length}
              />

              {/* Step 2: Time Slot Selection */}
              <TimeSlotList
                selectedDate={selectedDate}
                selectedHour={selectedStartHour}
                onSelectHour={(hour) => setSelectedStartHour(hour)}
                bookings={bookings}
                schedules={schedules}
                computers={computers}
              />

              {/* Step 3: Computer Selection */}
              {selectedStartHour !== null && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <ComputerCardGrid
                    selectedDate={selectedDate}
                    selectedHour={selectedStartHour}
                    computers={computers}
                    bookings={bookings}
                    userId={user?.id}
                    onBook={(computer, hour) => openCreateModal(computer, hour, 0)}
                    onCancelBooking={(booking) => {
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
                    }}
                  />
                </div>
              )}
            </div>
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
                <span>
                  {selectedStartHour}:
                  {selectedStartMinute.toString().padStart(2, "0")} kezdés
                </span>
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
                    className={`py-3 px-2 rounded-lg border-2 font-medium transition-all ${selectedDuration === mins
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

            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
              <div className="text-center">
                <strong className="text-white block mb-1">
                  Foglalás időtartama:
                </strong>
                <span className="text-primary font-semibold text-lg">
                  {(() => {
                    const startMin = selectedStartMinute;
                    const totalMins = startMin + selectedDuration;
                    const endHour =
                      selectedStartHour + Math.floor(totalMins / 60);
                    const endMin = totalMins % 60;
                    return `${selectedStartHour}:${startMin
                      .toString()
                      .padStart(2, "0")} - ${endHour}:${endMin
                        .toString()
                        .padStart(2, "0")}`;
                  })()}
                </span>
              </div>

              {user && (
                <div className="pt-3 border-t border-primary/20 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Jelenlegi egyenleg:</span>
                    <span>{formatBalance(user.timeBalanceSeconds)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-white">
                    <span>Foglalás után:</span>
                    <span
                      className={
                        user.role !== "ADMIN" &&
                          user.timeBalanceSeconds - selectedDuration * 60 < 0
                          ? "text-red-400"
                          : "text-green-400"
                      }
                    >
                      {formatBalance(
                        user.timeBalanceSeconds - selectedDuration * 60,
                      )}
                    </span>
                  </div>
                </div>
              )}
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
                disabled={isLoading || isBalanceInsufficient}
              >
                <Check size={18} />
                Foglalás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Layout Modal */}
      <RoomLayoutModal
        computers={computers}
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
      />

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


