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
    DOK: 1,
    MODERATOR: 2,
    TEACHER: 3,
    ORGANIZER: 4,
    ADMIN: 5,
  };

  const roleLabels: Record<string, string> = {
    STUDENT: "Diák",
    DOK: "DÖK",
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
        className="tactical-card rounded-lg border border-border shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-card/95 backdrop-blur-md shrink-0">
          <h2 className="text-xl font-display font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Shield className="text-primary" size={20} />
            Szerepkör módosítása
          </h2>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/80"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center gap-4 mb-6 bg-secondary/40 p-4 rounded border border-border/80">
            <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center border border-border font-mono text-xl font-bold text-primary">
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-display font-bold text-foreground text-base uppercase">
                {user.displayName || user.username}
              </div>
              <div className="text-muted-foreground font-mono text-xs">{user.email}</div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-muted-foreground text-xs font-mono font-bold mb-2 uppercase tracking-wider">
              Válassz új szerepkört
            </label>
            <div className="grid grid-cols-1 gap-2">
              {["STUDENT", "DOK", "MODERATOR", "TEACHER", "ORGANIZER", "ADMIN"].map(
                (role) => {
                  const isAllowed = canSelectRole(role);
                  const isSelected = selectedRole === role;

                  return (
                    <button
                      key={role}
                      onClick={() => isAllowed && setSelectedRole(role)}
                      disabled={!isAllowed}
                      className={`w-full flex items-center justify-between p-3 rounded border font-mono text-xs uppercase tracking-wider transition-all duration-200 
                                            ${isSelected
                          ? "bg-primary/20 border-primary text-primary font-bold shadow-md shadow-primary/10"
                          : isAllowed
                            ? "bg-secondary/60 border-border text-foreground hover:bg-secondary hover:border-primary/40 font-medium"
                            : "bg-secondary/20 border-border/40 text-muted-foreground cursor-not-allowed opacity-50"
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
                                  : role === "DOK"
                                    ? "bg-orange-500"
                                    : "bg-gray-500"
                            }`}
                        />
                        <span>{roleLabels[role]}</span>
                      </div>
                      {isSelected && (
                        <Check size={16} className="text-primary" />
                      )}
                      {!isAllowed && (
                        <span className="text-[10px] font-mono lowercase opacity-75">
                          Nincs jog
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3 flex gap-3 items-start">
            <AlertTriangle
              className="text-amber-500 shrink-0 mt-0.5"
              size={16}
            />
            <p className="text-amber-200/80 font-mono text-xs leading-relaxed">
              Figyelem: A szerepkör módosítása azonnal érvénybe lép, és extra
              jogosultságokat adhat, vagy vonhat vissza a felhasználótól.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3 bg-card/95 shrink-0">
          <button
            className="px-5 py-2.5 rounded border border-border text-foreground bg-secondary/80 hover:bg-secondary transition-colors font-mono text-xs uppercase tracking-wider font-semibold"
            onClick={onClose}
            disabled={isLoading}
          >
            Mégse
          </button>
          <button
            className="px-5 py-2.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-mono text-xs uppercase tracking-wider font-bold shadow-md shadow-primary/20 disabled:opacity-50"
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
