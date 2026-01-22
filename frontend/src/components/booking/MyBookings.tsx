import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Monitor,
  Trash2,
  CheckCircle,
  AlertCircle,

} from "lucide-react";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
  fetchMyBookings,
  deleteBooking,
  type Booking,
} from "../../store/slices/bookingsSlice";
import { useAuth } from "../../hooks/useAuth";
import "./MyBookings.css";



export function MyBookings() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { myBookings, isLoading } = useAppSelector((state) => state.bookings);

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
    if (isAuthenticated) {
      dispatch(fetchMyBookings());
    }
  }, [dispatch, isAuthenticated]);

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Foglalás törlése",
      message: "Biztos törölni szeretnéd ezt a foglalást?",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: () => {
        dispatch(deleteBooking(id));
      },
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("hu-HU", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBookingStatus = (
    booking: Booking
  ): "upcoming" | "active" | "checked-in" => {
    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);

    if (booking.checkedInAt) return "checked-in";
    if (now >= start && now <= end) return "active";
    return "upcoming";
  };

  const getStatusLabel = (status: "upcoming" | "active" | "checked-in") => {
    switch (status) {
      case "checked-in":
        return { label: "Bejelentkezve", color: "text-green-400 bg-green-500/10 border-green-500/20" };
      case "active":
        return { label: "Aktív", color: "text-primary bg-primary/10 border-primary/20" };
      default:
        return { label: "Közelgő", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#1a1b26] rounded-2xl border border-white/5">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} className="text-gray-400" />
        </div>
        <p className="text-gray-400 text-lg">Jelentkezz be a foglalásaid megtekintéséhez</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (myBookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#1a1b26] rounded-2xl border border-white/5">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <Calendar size={32} className="text-gray-400" />
        </div>
        <p className="text-gray-400 text-lg">Nincs aktív foglalásod</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
        <Calendar size={24} className="text-primary" />
        Saját foglalásaim <span className="text-gray-500 text-lg font-normal">({myBookings.length})</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myBookings.map((booking) => {
          const status = getBookingStatus(booking);
          const statusInfo = getStatusLabel(status);

          return (
            <div
              key={booking.id}
              className="group relative bg-[#1a1b26] rounded-xl border border-white/5 p-5 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_20px_-5px_rgba(139,92,246,0.15)] flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0f1015] flex items-center justify-center border border-white/5 group-hover:border-primary/20 transition-colors">
                    <Monitor size={20} className="text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-primary transition-colors">{booking.computer.name}</h4>
                    <span className="text-xs text-gray-500">Számítógép</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color} flex items-center gap-1.5`}>
                  {status === "checked-in" && <CheckCircle size={12} />}
                  {statusInfo.label}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <Calendar size={16} className="text-gray-500" />
                  <span className="capitalize">{formatDate(booking.date)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <Clock size={16} className="text-gray-500" />
                  <span>
                    {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex justify-end">
                {status === "upcoming" && (
                  <button
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    onClick={() => handleDelete(booking.id)}
                    title="Foglalás törlése"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
