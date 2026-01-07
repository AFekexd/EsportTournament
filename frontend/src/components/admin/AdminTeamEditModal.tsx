import { useState, useEffect } from "react";
import { X, Save, Trash2, Shield, User } from "lucide-react";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { updateTeam, removeMember } from "../../store/slices/teamsSlice";
import type { Team } from "../../types";
import { toast } from "sonner";
import { ImageUpload } from "../common/ImageUpload";

interface AdminTeamEditModalProps {
  team: Team;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminTeamEditModal({
  team,
  onClose,
  onSuccess,
}: AdminTeamEditModalProps) {
  const dispatch = useAppDispatch();
  const { updateLoading } = useAppSelector((state) => state.teams);

  const [formData, setFormData] = useState({
    name: team.name,
    description: team.description || "",
    logoUrl: team.logoUrl || "",
    coverUrl: team.coverUrl || "",
  });

  const [localMembers, setLocalMembers] = useState(team.members || []);
  const [errors, setErrors] = useState<{ name?: string }>({});

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

  // Update local members if team prop changes
  useEffect(() => {
    setLocalMembers(team.members || []);
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || formData.name.length < 3) {
      setErrors({
        name: "A csapat nevének legalább 3 karakter hosszúnak kell lennie",
      });
      return;
    }

    try {
      await dispatch(
        updateTeam({
          id: team.id,
          data: {
            name: formData.name,
            description: formData.description || undefined,
            logoUrl: formData.logoUrl || undefined,
            coverUrl: formData.coverUrl || undefined,
          },
        })
      ).unwrap();

      toast.success("Csapat sikeresen frissítve");
      onSuccess(); // Refresh parent
      onClose();
    } catch (err: any) {
      console.error("Failed to update team:", err);
      toast.error(err.message || "Nem sikerült frissíteni a csapatot");
    }
  };

  const handleRemoveMember = (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Tag eltávolítása",
      message: "Biztosan el akarod távolítani ezt a tagot?",
      variant: "danger",
      confirmLabel: "Eltávolítás",
      onConfirm: async () => {
        try {
          await dispatch(
            removeMember({ teamId: team.id, memberId: userId })
          ).unwrap();
          setLocalMembers((prev) => prev.filter((m) => m.userId !== userId));
          toast.success("Tag sikeresen eltávolítva");
          onSuccess();
        } catch (err: any) {
          console.error("Failed to remove member:", err);
          toast.error(err.message || "Nem sikerült eltávolítani a tagot");
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div
        className="bg-[#161722] border border-white/10 rounded-2xl max-w-[800px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-[#161722] z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-primary" size={24} />
            Csapat szerkesztése
          </h2>
          <button
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: General Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Alapadatok
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Csapat neve
                </label>
                <input
                  type="text"
                  className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors ${errors.name ? "border-red-500/50" : ""
                    }`}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  maxLength={50}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.name ? (
                    <span className="text-red-400 text-xs">{errors.name}</span>
                  ) : <span></span>}
                  <span className="text-xs text-gray-500">{formData.name.length}/50</span>
                </div>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Leírás
                </label>
                <textarea
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  maxLength={500}
                />
                <div className="text-right mt-1">
                  <span className="text-xs text-gray-500">{formData.description.length}/500</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Logó
                  </label>
                  <ImageUpload
                    value={formData.logoUrl}
                    onChange={(val) =>
                      setFormData({ ...formData, logoUrl: val })
                    }
                    aspect="square"
                    label=""
                    placeholder="Logó URL..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Borítókép
                  </label>
                  <ImageUpload
                    value={formData.coverUrl}
                    onChange={(val) =>
                      setFormData({ ...formData, coverUrl: val })
                    }
                    aspect="video"
                    label=""
                    placeholder="Borítókép URL..."
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full btn btn-primary flex items-center justify-center gap-2"
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    "Mentés..."
                  ) : (
                    <>
                      <Save size={18} /> Mentés
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Members */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
              <span>Csapattagok</span>
              <span className="text-sm font-normal text-muted-foreground">
                {localMembers.length} tag
              </span>
            </h3>
            <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5">
                {localMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {member.user?.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt={member.user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <User size={14} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-white flex items-center gap-2">
                          {member.user?.displayName || member.user?.username}
                          {member.role === "CAPTAIN" && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded uppercase font-bold">
                              CPT
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          @{member.user?.username}
                        </div>
                      </div>
                    </div>

                    {member.role !== "CAPTAIN" && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Tag eltávolítása"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {localMembers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Nincsenek tagok
                  </div>
                )}
              </div>
            </div>
          </div>
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
}
