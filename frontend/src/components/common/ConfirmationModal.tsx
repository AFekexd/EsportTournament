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
          button: "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20",
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
          icon: <Info className="text-blue-500" size={24} />,
          button: "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20",
          border: "border-blue-500/20",
          bgIcon: "bg-blue-500/10",
        };
      default:
        return {
          icon: <AlertCircle className="text-primary" size={24} />,
          button:
            "bg-primary hover:bg-primary-hover text-white shadow-primary/20",
          border: "border-primary/20",
          bgIcon: "bg-primary/10",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-[#161722] rounded-2xl border ${styles.border} shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${styles.bgIcon} flex-shrink-0`}>
              {styles.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              <p className="text-gray-400 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#0f1016]/50 border-t border-white/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95 ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
