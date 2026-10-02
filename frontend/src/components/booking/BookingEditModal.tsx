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
    () => new Date(booking.startTime).toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState(
    () => new Date(booking.endTime).toISOString().slice(0, 16)
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="tactical-card rounded-lg w-full max-w-md border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-card/95 backdrop-blur-md border-b border-border p-6 flex items-center justify-between">
          <h3 className="text-xl font-display font-bold uppercase tracking-wider text-foreground">Foglalás módosítása</h3>
          <button
            className="p-1.5 hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded p-3 flex items-start gap-2.5 text-destructive text-xs font-mono">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1 pb-4 border-b border-border">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Jelenlegi időpont
            </span>
            <span className="text-base font-mono font-bold text-foreground flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
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
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Kezdés
              </label>
              <input
                type="datetime-local"
                id="edit-start-time"
                className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors calendar-picker-indicator-invert"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                step="1800"
                required
              />
            </div>

            <div>
              <label
                htmlFor="edit-end-time"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Befejezés
              </label>
              <input
                type="datetime-local"
                id="edit-end-time"
                className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors calendar-picker-indicator-invert"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                step="1800"
                required
              />
            </div>
          </div>

          <p className="text-xs font-mono text-muted-foreground bg-secondary/40 p-3 rounded border border-border/80">
            Csak az időpont módosítható. Ha másik gépet szeretnél, töröld ezt a
            foglalást és hozz létre újat.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 px-5 py-2.5 bg-secondary/80 hover:bg-secondary border border-border text-foreground rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all"
              onClick={onClose}
              disabled={isSaving}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={16} />
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
