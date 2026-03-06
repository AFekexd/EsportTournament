import { useState } from "react";
import { X, Shield, AlertTriangle, Check } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface RoleChangeModalProps {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    role: string;
    email: string;
  };
  onClose: () => void;
  onSave: (userId: string, newRole: string) => Promise<void>;
}

export const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  user,
  onClose,
  onSave,
}) => {
  const { user: currentUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [isLoading, setIsLoading] = useState(false);

  // Define role hierarchy: Higher number = Higher Rank
  // Define role hierarchy: Higher number = Higher Rank
  const roleHierarchy: Record<string, number> = {
    STUDENT: 0,
    MODERATOR: 1,
    TEACHER: 2,
    ORGANIZER: 3,
    ADMIN: 4,
  };

  const roleLabels: Record<string, string> = {
    STUDENT: "Diák",
    MODERATOR: "Moderátor",
    TEACHER: "Tanár",
    ORGANIZER: "Szervező",
    ADMIN: "Admin",
  };

  // Current logged-in user's rank
  const myRank = roleHierarchy[currentUser?.role || "STUDENT"] || 0;

  // Helper to check if I can promote/demote TO this role
  const canSelectRole = (role: string) => {
    const targetRank = roleHierarchy[role];
    // Rules:
    // 1. I can only assign roles STRICTLY LOWER than my own?
    //    OR: "Only higher rank can take a user higher" -> "I must be higher than the target role"
    // Let's interpret "I must be strictly higher than the role I am assigning"
    // Exception: If I am ADMIN (3), I can make other ADMINs? Usually yes.
    // Let's assume: I must be >= targetRank.
    // User rule: "csak magasabb rang tud egy usert feljebb vinni"
    // Interpretation: To promote someone to Rank X, my Rank must be > Rank X (or >= if admin?)
    // Let's go with: I can assign any role < myRank.
    // Except if I am MAX_RANK (ADMIN), I can assign ADMIN. (Self-replication default for Admins).

    if (currentUser?.role === "ADMIN") return true; // Admins can do anything

    return targetRank < myRank;
  };

  const handleSave = async () => {
    if (!selectedRole || selectedRole === user.role) return;

    setIsLoading(true);
    try {
      await onSave(user.id, selectedRole);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div
        className="bg-[#121A22] rounded-xl border border-border shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="text-primary" size={24} />
            Szerepkör módosítása
          </h2>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 bg-secondary p-4 rounded-lg border border-border">
            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center border border-border text-xl font-bold text-muted-foreground">
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-foreground text-lg">
                {user.displayName || user.username}
              </div>
              <div className="text-muted-foreground text-sm">{user.email}</div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-muted-foreground text-sm font-bold mb-2 uppercase tracking-wide">
              Válassz új szerepkört
            </label>
            <div className="grid grid-cols-1 gap-2">
              {["STUDENT", "MODERATOR", "TEACHER", "ORGANIZER", "ADMIN"].map(
                (role) => {
                  const isAllowed = canSelectRole(role);
                  const isSelected = selectedRole === role;

                  return (
                    <button
                      key={role}
                      onClick={() => isAllowed && setSelectedRole(role)}
                      disabled={!isAllowed}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 
                                            ${isSelected
                          ? "bg-primary/20 border-primary text-foreground shadow-lg shadow-primary/10"
                          : isAllowed
                            ? "bg-secondary border-border text-gray-300 hover:bg-secondary hover:border-border"
                            : "bg-secondary border-border text-muted-foreground cursor-not-allowed opacity-50"
                        }
                                        `}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${role === "ADMIN"
                              ? "bg-red-500"
                              : role === "ORGANIZER"
                                ? "bg-purple-500"
                                : role === "TEACHER"
                                  ? "bg-green-500"
                                  : role === "MODERATOR"
                                    ? "bg-blue-500"
                                    : "bg-gray-500"
                            }`}
                        />
                        <span>{roleLabels[role]}</span>
                      </div>
                      {isSelected && (
                        <Check size={18} className="text-primary" />
                      )}
                      {!isAllowed && (
                        <span className="text-xs italic">
                          Nincs jogosultság
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 flex gap-3 items-start">
            <AlertTriangle
              className="text-yellow-500 shrink-0 mt-0.5"
              size={16}
            />
            <p className="text-yellow-200/80 text-xs leading-relaxed">
              Figyelem: A szerepkör módosítása azonnal érvénybe lép, és extra
              jogosultságokat adhat, vagy vonhat vissza a felhasználótól.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3 bg-secondary">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Mégse
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isLoading || selectedRole === user.role}
          >
            {isLoading ? "Mentés..." : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
};
