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
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmationModal } from "../components/common/ConfirmationModal";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { useAuth } from "../hooks/useAuth";
import {
  fetchComputers,
  fetchSchedules,
  fetchBookingsForDate,
  fetchWeeklyBookings,
  fetchSupervisorsForDate,
  fetchSupervisorsForWeek,
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
    supervisors,
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
      const fetchData = () => {
        if (viewMode === "weekly") {
          dispatch(fetchWeeklyBookings(selectedWeekStart));
          dispatch(fetchSupervisorsForWeek(selectedWeekStart));
        } else {
          dispatch(fetchBookingsForDate(selectedDate));
          dispatch(fetchSupervisorsForDate(selectedDate));
        }
      };

      fetchData(); // Initial fetch

      const intervalId = setInterval(() => {
        fetchData();
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(intervalId);
    }
  }, [dispatch, activeTab, viewMode, selectedDate, selectedWeekStart]);


  const openCreateModal = (
    computer: Computer,
    hour: number,
    minute: number = 0,
    dateStr?: string,
  ) => {
    if (!isAuthenticated) {
      toast.error("Jelentkezz be a foglaláshoz!");
      return;
    }

    if (dateStr) {
      dispatch(setSelectedDate(dateStr));
    }

    setSelectedComputer(computer);
    setSelectedStartHour(hour);
    setSelectedStartMinute(minute);
    setBookingError(null);
    setShowBookingModal(true);
  };

  const handleBooking = async () => {
    if (!selectedComputer || selectedStartHour === null) return;

    // Use selectedDate from state which should be set correctly for both daily/weekly via openCreateModal
    const startTime = new Date(selectedDate);
    startTime.setHours(selectedStartHour, selectedStartMinute, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + selectedDuration);

    try {
      const created = await dispatch(
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

      if (created.status === 'PENDING') {
        toast.success("Foglalási kérelem leadva! Értesítettük a DÖK-öt Discordon.");
      } else {
        toast.success("Sikeres foglalás!");
      }

      // Refresh data
      if (viewMode === "weekly") {
        dispatch(fetchWeeklyBookings(selectedWeekStart));
      } else {
        dispatch(fetchBookingsForDate(selectedDate));
      }
    } catch (err: any) {
      // Show error inline in the modal
      const message = err?.message || (typeof err === 'string' ? err : 'Sikertelen foglalás');
      setBookingError(message);
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

  return (
    <div className="w-full mx-auto px-4 py-4 md:py-8">
      {/* Tactical Header */}
      <div className="mb-8 md:mb-10 text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#121824] border border-border/80 rounded text-xs font-mono text-primary font-bold tracking-widest uppercase mb-3">
          <Clock size={14} className="text-primary" />
          <span>// ESPORT LABOR // ÁLLOMÁSFOGLALÁS</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-foreground mb-2 md:mb-3">
          Gépterem és Munkaállomás Foglalás
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-3">
          Foglalj dedikált versenygépet a Pollák Esport laborban egyéni gyakorláshoz vagy csapat scrimhez.
        </p>

        <p className="text-xs font-mono text-muted-foreground/80 max-w-xl mx-auto mb-4">
          [INFÓ] A gépekre való belépéshez a saját felhő-felhasználóneved és jelszavad szükséges.
        </p>

        {user && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#121824] border border-border/80 rounded font-mono text-xs text-foreground shadow-sm">
            <Clock size={14} className="text-primary" />
            <span>
              Foglalási keret:{" "}
              <span className="text-primary font-bold">
                {user.role === "ADMIN" || user.role === "TEACHER" ? "Korlátlan" : "Heti max. 3 alkalom"}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="mb-6 md:mb-8 border-b border-border overflow-x-auto touch-pan-x touch-pan-y">
        <div className="flex gap-4 md:gap-8 min-w-max">
          <button
            className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium transition-colors relative text-sm md:text-base ${activeTab === "booking"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-gray-300"
              }`}
            onClick={() => setActiveTab("booking")}
          >
            <LayoutGrid size={16} className="md:w-[18px] md:h-[18px]" />
            Foglalás
          </button>
          <button
            className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium transition-colors relative text-sm md:text-base ${activeTab === "my-bookings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-gray-300"
              }`}
            onClick={() => setActiveTab("my-bookings")}
          >
            <List size={16} className="md:w-[18px] md:h-[18px]" />
            Saját foglalások
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm md:text-base">
          <AlertCircle size={20} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeTab === "my-bookings" && <MyBookings />}

      {activeTab === "booking" && (
        <>
          {/* View Toggle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex bg-secondary/80 p-1 rounded border border-border w-full md:w-auto font-mono">
                <button
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded text-xs uppercase tracking-wider font-bold transition-all ${viewMode === "daily"
                    ? "bg-card border border-border text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                  onClick={() => dispatch(setViewMode("daily"))}
                >
                  <LayoutGrid size={15} />
                  Napi
                </button>
                <button
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded text-xs uppercase tracking-wider font-bold transition-all ${viewMode === "weekly"
                    ? "bg-card border border-border text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                  onClick={() => dispatch(setViewMode("weekly"))}
                >
                  <CalendarDays size={15} />
                  Heti
                </button>
              </div>

              <button
                className="flex md:hidden items-center justify-center gap-2 px-4 py-2 rounded font-mono text-xs uppercase tracking-wider transition-all bg-secondary/80 border border-border text-primary hover:bg-secondary"
                onClick={() => setShowMapModal(true)}
              >
                <Map size={16} />
              </button>

              <button
                className="hidden md:flex items-center justify-center gap-2 px-4 py-2 rounded font-mono text-xs uppercase tracking-wider font-bold transition-all bg-secondary/80 border border-border text-primary hover:bg-secondary hover:text-foreground"
                onClick={() => setShowMapModal(true)}
              >
                <Map size={16} />
                Térkép
              </button>
            </div>

            {viewMode === "daily" && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Calendar size={14} className="text-primary" />
                <span>{formatDate(selectedDate)}</span>
              </div>
            )}
          </div>

          {viewMode === "weekly" ? (
            <div className="overflow-x-auto touch-pan-x touch-pan-y pb-4">
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
                selectedMinute={selectedStartMinute}
                onSelectSlot={(hour, minute) => {
                  setSelectedStartHour(hour);
                  setSelectedStartMinute(minute);
                }}
                bookings={bookings}
                schedules={schedules}
                computers={computers}
                supervisors={supervisors}
              />

              {/* Step 3: Computer Selection */}
              {selectedStartHour !== null && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <ComputerCardGrid
                    selectedDate={selectedDate}
                    selectedHour={selectedStartHour}
                    selectedMinute={selectedStartMinute}
                    computers={computers}
                    bookings={bookings}
                    userId={user?.id}
                    onBook={(computer, hour, minute) =>
                      openCreateModal(computer, hour, minute)
                    }
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
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowBookingModal(false)}
        >
          <div
            className="tactical-card rounded-lg p-6 sm:p-8 w-full max-w-md border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="flex items-center gap-3 text-xl font-display font-bold uppercase tracking-wider text-foreground mb-6">
              <Plus size={22} className="text-primary" />
              Új foglalás
            </h2>

            <div className="flex flex-col gap-3 mb-6 p-4 bg-secondary/60 border border-border/60 rounded font-mono text-xs">
              <div className="flex items-center gap-3 text-foreground/90">
                <Monitor size={16} className="text-primary" />
                <span>{selectedComputer.name}</span>
              </div>
              <div className="flex items-center gap-3 text-foreground/90">
                <Calendar size={16} className="text-primary" />
                <span>{formatDate(selectedDate)}</span>
              </div>
              <div className="flex items-center gap-3 text-foreground/90">
                <Clock size={16} className="text-primary" />
                <span>
                  {selectedStartHour}:
                  {selectedStartMinute.toString().padStart(2, "0")} kezdés
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Időtartam:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[60, 120].map((mins) => (
                  <button
                    key={mins}
                    className={`py-2.5 px-2 rounded border font-mono text-xs uppercase tracking-wider transition-all ${selectedDuration === mins
                      ? "bg-primary border-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
                      : "bg-secondary/80 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    onClick={() => setSelectedDuration(mins)}
                  >
                    {mins < 60 ? `${mins} perc` : `${mins / 60} óra`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded space-y-3 font-mono">
              <div className="text-center">
                <strong className="text-foreground block mb-1 text-xs uppercase tracking-wider">
                  Foglalás időtartama:
                </strong>
                <span className="text-primary font-bold text-lg">
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
                <div className="pt-3 border-t border-primary/20 flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Heti szabályzat:</span>
                    <span className="text-primary font-medium font-mono">
                      {user.role === "ADMIN" || user.role === "TEACHER"
                        ? "Korlátlan hozzáférés"
                        : "Heti max. 3 belépés / diák"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Show notice if there is no supervisor assigned */}
            {!supervisors.some((s) => s.date === selectedDate && s.hour === selectedStartHour) && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-mono flex items-start gap-2.5">
                <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-200 block mb-0.5">Felügyeleti jóváhagyás szükséges</span>
                  Erre az időpontra még nincs beosztott felügyelő. A leadott kérelemről a DÖK azonnal értesítést kap Discordon, és amint valaki elvállalja, a foglalásod jóváhagyásra kerül!
                </div>
              </div>
            )}

            {bookingError && (
              <div className="mb-4 flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 px-5 py-2.5 bg-secondary/80 hover:bg-secondary border border-border text-foreground rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all"
                onClick={() => setShowBookingModal(false)}
              >
                Mégse
              </button>
              <button
                className="flex-1 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleBooking}
                disabled={isLoading}
              >
                {supervisors.some((s) => s.date === selectedDate && s.hour === selectedStartHour) ? (
                  <>
                    <Check size={16} />
                    Foglalás
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Kérelem küldése
                  </>
                )}
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


