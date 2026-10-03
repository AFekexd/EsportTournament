import { createPortal } from "react-dom";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info" | "primary";
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Megerősítés",
  cancelLabel = "Mégse",
  variant = "primary",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <AlertTriangle className="text-red-500" size={24} />,
          button: "bg-red-500 hover:bg-red-600 text-foreground shadow-red-500/20",
          border: "border-red-500/20",
          bgIcon: "bg-red-500/10",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="text-yellow-500" size={24} />,
          button:
            "bg-yellow-500 hover:bg-yellow-600 text-black shadow-yellow-500/20",
          border: "border-yellow-500/20",
          bgIcon: "bg-yellow-500/10",
        };
      case "info":
        return {
          icon: <Info className="text-primary" size={24} />,
          button: "bg-blue-500 hover:bg-blue-600 text-foreground shadow-blue-500/20",
          border: "border-primary/20",
          bgIcon: "bg-primary/20",
        };
      default:
        return {
          icon: <AlertCircle className="text-primary" size={24} />,
          button:
            "bg-primary hover:bg-primary-hover text-foreground shadow-primary/20",
          border: "border-primary/20",
          bgIcon: "bg-primary/10",
        };
    }
  };

  const styles = getVariantStyles();

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-[#0E131F] border ${styles.border} shadow-2xl w-full max-w-md overflow-hidden rounded-xl animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded ${styles.bgIcon} flex-shrink-0 border ${styles.border}`}>
              {styles.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-display font-bold uppercase tracking-tight text-foreground mb-1">{title}</h3>
              <p className="text-xs font-mono text-muted-foreground leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-secondary/40 border-t border-border flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded border border-border bg-secondary text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
