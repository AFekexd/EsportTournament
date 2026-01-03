import { useState } from "react";
import { X, Save, AlertCircle, Calendar } from "lucide-react";
import { useAppDispatch } from "../../hooks/useRedux";
import { updateBooking, type Booking } from "../../store/slices/bookingsSlice";
import { toast } from "sonner";

interface BookingEditModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingEditModal({
  booking,
  isOpen,
  onClose,
}: BookingEditModalProps) {
  const dispatch = useAppDispatch();
  const [startTime, setStartTime] = useState(
    new Date(booking.startTime).toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState(
    new Date(booking.endTime).toISOString().slice(0, 16)
  );
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
        throw new Error(
          "A kezdési időnek korábbinak kell lennie a befejezésnél."
        );
      }

      const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      if (diffMinutes < 30) {
        throw new Error("A foglalásnak legalább 30 percesnek kell lennie.");
      }
      if (diffMinutes > 120) {
        throw new Error("A foglalás legfeljebb 2 óra lehet.");
      }

      await dispatch(
        updateBooking({
          id: booking.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        })
      ).unwrap();

      toast.success("Foglalás sikeresen módosítva");
      onClose();
    } catch (err: any) {
      setError(err.message || "Hiba történt a módosítás során.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1b26] rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1a1b26] border-b border-white/10 p-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Foglalás módosítása</h3>
          <button
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle size={16} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1 pb-4 border-b border-white/5">
            <span className="text-sm font-medium text-gray-400">
              Jelenlegi időpont
            </span>
            <span className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              {new Date(booking.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -
              {new Date(booking.endTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="edit-start-time"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Kezdés
              </label>
              <input
                type="datetime-local"
                id="edit-start-time"
                className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors calendar-picker-indicator-invert"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="edit-end-time"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Befejezés
              </label>
              <input
                type="datetime-local"
                id="edit-end-time"
                className="w-full px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors calendar-picker-indicator-invert"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 italic bg-white/5 p-3 rounded-lg border border-white/5">
            Csak az időpont módosítható. Ha másik gépet szeretnél, töröld ezt a
            foglalást és hozz létre újat.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 px-6 py-3 bg-[#0f1015] hover:bg-[#2a2b36] border border-white/10 text-white rounded-xl font-semibold transition-all"
              onClick={onClose}
              disabled={isSaving}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  Mentés
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
