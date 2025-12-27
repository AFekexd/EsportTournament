import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Monitor,
  Trash2,
  QrCode,
  CheckCircle,
  AlertCircle,
  Edit2,
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

interface MyBookingsProps {
  onEditBooking?: (booking: Booking) => void;
}

export function MyBookings({ onEditBooking }: MyBookingsProps) {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { myBookings, isLoading } = useAppSelector((state) => state.bookings);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);

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
      weekday: "short",
      month: "short",
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
        return { label: "Bejelentkezve", class: "status-checked-in" };
      case "active":
        return { label: "Aktív", class: "status-active" };
      default:
        return { label: "Közelgő", class: "status-upcoming" };
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="my-bookings-empty">
        <AlertCircle size={32} />
        <p>Jelentkezz be a foglalásaid megtekintéséhez</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="my-bookings-loading">
        <div className="spinner" />
        <p>Betöltés...</p>
      </div>
    );
  }

  if (myBookings.length === 0) {
    return (
      <div className="my-bookings-empty">
        <Calendar size={32} />
        <p>Nincs aktív foglalásod</p>
      </div>
    );
  }

  return (
    <div className="my-bookings">
      <h3 className="my-bookings-title">
        <Calendar size={20} />
        Saját foglalásaim ({myBookings.length})
      </h3>

      <div className="my-bookings-list">
        {myBookings.map((booking) => {
          const status = getBookingStatus(booking);
          const statusInfo = getStatusLabel(status);

          return (
            <div key={booking.id} className={`booking-card ${status}`}>
              <div className="booking-card-header">
                <div className="booking-computer">
                  <Monitor size={18} />
                  <span>{booking.computer.name}</span>
                </div>
                <span className={`booking-status ${statusInfo.class}`}>
                  {status === "checked-in" && <CheckCircle size={14} />}
                  {statusInfo.label}
                </span>
              </div>

              <div className="booking-card-body">
                <div className="booking-datetime">
                  <div className="booking-date">
                    <Calendar size={16} />
                    <span>{formatDate(booking.date)}</span>
                  </div>
                  <div className="booking-time">
                    <Clock size={16} />
                    <span>
                      {formatTime(booking.startTime)} -{" "}
                      {formatTime(booking.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="booking-card-actions">
                {booking.checkInCode && status !== "checked-in" && (
                  <button
                    className="btn-icon btn-qr"
                    onClick={() =>
                      setShowQRCode(
                        showQRCode === booking.id ? null : booking.id
                      )
                    }
                    title="QR kód megjelenítése"
                  >
                    <QrCode size={18} />
                  </button>
                )}
                {status === "upcoming" && onEditBooking && (
                  <button
                    className="btn-icon btn-edit"
                    onClick={() => onEditBooking(booking)}
                    title="Módosítás"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
                {status === "upcoming" && (
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleDelete(booking.id)}
                    title="Törlés"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {showQRCode === booking.id && booking.checkInCode && (
                <div className="qr-code-panel">
                  <div className="qr-code-placeholder">
                    <QrCode size={64} />
                    <p
                      className="qr-code-value"
                      style={{
                        wordBreak: "break-all",
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                      }}
                    >
                      {booking.checkInCode}
                    </p>
                    <p className="qr-hint">
                      Mutasd meg ezt a kódot a helyszínen
                    </p>
                  </div>
                </div>
              )}
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
