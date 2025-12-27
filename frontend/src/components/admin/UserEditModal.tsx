import { useState } from "react";
import { toast } from "sonner";
import { X, Edit2, Key, ImageOff } from "lucide-react";
import { ConfirmationModal } from "../common/ConfirmationModal";

import { API_URL } from "../../config";

interface UserEditModalProps {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    email: string;
    avatarUrl: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  onClose,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  // Actions
  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const { authService } = await import("../../lib/auth-service");
      const token = authService.keycloak?.token;
      if (!token) return;

      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        toast.error("Sikertelen mentés");
      }
    } catch (error) {
      console.error(error);
      toast.error("Hiba történt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAvatar = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Profilkép törlése",
      message: "Biztosan törlöd a felhasználó profilképét?",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const { authService } = await import("../../lib/auth-service");
          const token = authService.keycloak?.token;
          if (!token) return;

          // AvatarUrl null to reset
          const response = await fetch(`${API_URL}/users/${user.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ avatarUrl: null }), // Backend should handle this to remove image
          });

          if (response.ok) {
            onSuccess();
            onClose(); // Or just refresh local state? For now close.
          } else {
            toast.error("Sikertelen képtörlés");
          }
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handlePasswordReset = async () => {
    if (!password) {
      toast.error("Adj meg egy új jelszót!");
      return;
    }
    setIsLoading(true);
    try {
      const { authService } = await import("../../lib/auth-service");
      const token = authService.keycloak?.token;
      if (!token) return;

      const response = await fetch(
        `${API_URL}/admin/kiosk/users/${user.id}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password }),
        }
      );

      if (response.ok) {
        toast.success("Jelszó sikeresen módosítva!");
        setPassword("");
      } else {
        const data = await response.json();
        toast.error(`Hiba: ${data.message || "Sikertelen jelszócsere"}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Hiba történt a jelszócsere során");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1b26] rounded-xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Edit2 className="text-blue-400" size={24} />
            Felhasználó szerkesztése
          </h2>
          <button
            className="text-gray-400 hover:text-white transition-colors"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-lg border border-white/5">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center border border-white/10 text-xl font-bold text-gray-400">
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm text-gray-400">Megjelenített név</div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-transparent border-b border-white/10 focus:border-blue-500 outline-none py-1 text-white font-medium"
                placeholder="Név megadása"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-3">
            {/* Avatar Reset */}
            <button
              onClick={handleResetAvatar}
              disabled={!user.avatarUrl || isLoading}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                !user.avatarUrl
                  ? "opacity-50 cursor-not-allowed border-white/5"
                  : "hover:bg-red-500/10 border-white/10 hover:border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <ImageOff
                  className={user.avatarUrl ? "text-red-400" : "text-gray-500"}
                  size={20}
                />
                <div className="text-left">
                  <div className="text-white font-medium">
                    Profilkép törlése
                  </div>
                  <div className="text-xs text-gray-500">
                    Alapértelmezett visszaállítása
                  </div>
                </div>
              </div>
            </button>

            {/* Password Reset */}
            <div className="p-3 rounded-lg border border-white/10 bg-black/20">
              <div className="flex items-center gap-3 mb-3">
                <Key className="text-yellow-400" size={20} />
                <div className="text-white font-medium">
                  Új jelszó beállítása
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text" // Admin sees it, safer for manual override
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Írd be az új jelszót..."
                  className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                />
                <button
                  onClick={handlePasswordReset}
                  disabled={!password || isLoading}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mentés
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Mégse
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveProfile}
            disabled={isLoading}
          >
            {isLoading ? "Mentés..." : "Változások mentése"}
          </button>
        </div>
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
};
