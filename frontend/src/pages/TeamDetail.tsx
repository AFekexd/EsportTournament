import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  Trophy,
  Settings,
  Copy,
  Check,
  Link as LinkIcon,
  UserPlus,
  Edit,
  Trash2,
  RefreshCw,
  Info,
  Shield,
  Calendar,
  Clock,
  Share2,
} from "lucide-react";
import { ConfirmationModal } from "../components/common/ConfirmationModal";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { useAuth } from "../hooks/useAuth";
import {
  fetchTeam,
  deleteTeam,
  removeMember,
  regenerateJoinCode,
  clearCurrentTeam,
} from "../store/slices/teamsSlice";
import { TeamEditModal } from "../components/teams/TeamEditModal";
import { MemberCard } from "../components/teams/MemberCard";
import { API_URL } from "../config";
import { apiFetch } from "../lib/api-client";

type TabType = "overview" | "members" | "tournaments" | "settings";

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { currentTeam, isLoading } = useAppSelector((state) => state.teams);

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

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

  const isOwner = currentTeam?.ownerId === user?.id;

  useEffect(() => {
    if (id) {
      dispatch(fetchTeam(id));
    }

    return () => {
      dispatch(clearCurrentTeam());
    };
  }, [id, dispatch]);

  // Check for pending requests
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  useEffect(() => {
    if (!id || !user) return;

    const checkPendingRequests = async () => {
      try {
        const res = await apiFetch(`${API_URL}/change-requests/my-requests`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Find latest PENDING team profile request for this team
          const pending = data.data.find(
            (r: any) =>
              r.status === "PENDING" &&
              r.type === "TEAM_PROFILE" &&
              r.entityId === id,
          );
          setPendingRequest(pending);
        }
      } catch (error) {
        console.error("Failed to check pending request", error);
      }
    };
    checkPendingRequests();
  }, [id, user]);

  const handleCopyJoinCode = () => {
    if (currentTeam?.joinCode) {
      navigator.clipboard.writeText(currentTeam.joinCode);
      setCopied(true);
      toast.success("Csatlakozási kód vágólapra másolva!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyInviteLink = () => {
    if (currentTeam?.joinCode) {
      const link = `${window.location.origin}/teams?joinCode=${currentTeam.joinCode}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success("Meghívó link vágólapra másolva!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (currentTeam?.id) {
      await dispatch(regenerateJoinCode(currentTeam.id));
      toast.success("Csatlakozási kód újragenerálva!");
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (!currentTeam?.id) return;

    setConfirmModal({
      isOpen: true,
      title: "Tag eltávolítása",
      message: "Biztosan eltávolítod ezt a tagot?",
      variant: "danger",
      confirmLabel: "Eltávolítás",
      onConfirm: async () => {
        await dispatch(removeMember({ teamId: currentTeam.id, memberId }));
        toast.success("Tag eltávolítva.");
      },
    });
  };

  const handleDeleteTeam = () => {
    if (!currentTeam?.id) return;

    setConfirmModal({
      isOpen: true,
      title: "Csapat törlése",
      message:
        "A csapat törlése végleges és nem visszavonható. Minden adat (tagok, elért eredmények) elvész. Biztosan törölni szeretnéd?",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        await dispatch(deleteTeam(currentTeam.id));
        toast.success("Csapat törölve.");
        navigate("/teams");
      },
    });
  };

  if (isLoading || !currentTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1015]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-gray-400">Csapat betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  text-white p-4 md:p-8 rounded-sm">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <div>
          <button
            onClick={() => navigate("/teams")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Vissza a csapatokhoz</span>
          </button>
        </div>

        {/* Team Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-[#1a1b26] border border-white/5 shadow-2xl">
          {/* Banner */}
          <div className="h-48 md:h-64 relative group">
            {currentTeam.coverUrl ? (
              <>
                <img
                  src={currentTeam.coverUrl}
                  alt="Cover"
                  className={`absolute inset-0 w-full h-full object-cover ${pendingRequest ? "grayscale-[0.5]" : ""}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b26] via-[#1a1b26]/50 to-transparent"></div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-blue-900/40 to-primary/40"></div>
            )}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>
            {!currentTeam.coverUrl && (
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b26] to-transparent"></div>
            )}


            <div className="absolute top-6 right-6 flex gap-3 z-20">
              <button
                onClick={() => {
                  const shareUrl = `https://esport-backend.pollak.info/share/teams/${currentTeam.id}`;
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Discord megosztási link másolva!");
                }}
                className="p-2 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 rounded-full transition-all hover:scale-105"
                title="Megosztás Discord-on"
              >
                <Share2 size={20} />
              </button>
              {isOwner && (
                <>
                  {pendingRequest ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 backdrop-blur-md border border-yellow-500/50 rounded-full text-yellow-500 font-bold animate-pulse">
                      <Clock size={16} />
                      <span>Módosítás függőben</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="p-2 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 rounded-full transition-all hover:scale-105"
                      title="Szerkesztés"
                    >
                      <Edit size={20} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="px-8 pb-8">
            <div className="relative flex  md:flex-row gap-8 items-end -mt-20">
              {/* Logo */}
              <div className="relative shrink-0 mx-auto md:mx-0 z-10 flex items-center justify-center">
                <div className="w-36 h-36 md:w-44 md:h-44 flex items-center justify-center rounded-2xl p-1.5 bg-[#1a1b26] shadow-2xl relative transition-transform duration-300">
                  <div className="w-full h-full rounded-xl p-1 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <div className="w-full h-full rounded-lg bg-[#0f1015] overflow-hidden flex items-center justify-center relative z-10">
                      {currentTeam.logoUrl ? (
                        <img
                          src={currentTeam.logoUrl}
                          alt={currentTeam.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-5xl font-bold text-white">
                          {currentTeam.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Info & Meta */}
              <div className="flex-1 w-full flex flex-col md:flex-row items-center md:items-end justify-between gap-6 md:pb-4">
                <div className="text-center md:text-left space-y-2 w-full md:w-auto">
                  <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight break-words px-2 md:px-0">
                    {currentTeam.name}
                  </h1>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-gray-400">
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full text-xs sm:text-sm">
                      <Trophy size={14} className="text-yellow-500 shrink-0" />
                      <span className="font-bold text-white">
                        {currentTeam.elo}
                      </span>{" "}
                      ELO
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full text-xs sm:text-sm">
                      <Users size={14} className="text-blue-400 shrink-0" />
                      <span>{currentTeam.members?.length || 0} tag</span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full text-xs sm:text-sm">
                      <Calendar size={14} className="text-purple-400 shrink-0" />
                      <span>
                        {new Date(currentTeam.createdAt).toLocaleDateString(
                          "hu-HU",
                        )}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Join Code (for Owner) */}
                {isOwner && currentTeam.joinCode && (
                  <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col gap-2 min-w-[250px]">
                    <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">
                      Csatlakozási kód
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-black/50 border border-white/5 rounded px-3 py-1.5 font-mono text-lg text-primary tracking-widest text-center">
                        {currentTeam.joinCode}
                      </code>
                      <button
                        onClick={handleCopyJoinCode}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Másolás"
                      >
                        {copied ? (
                          <Check size={18} className="text-green-500" />
                        ) : (
                          <Copy size={18} />
                        )}
                      </button>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={handleCopyInviteLink}
                        className="flex-1 text-xs bg-white/5 hover:bg-white/10 py-1.5 rounded text-gray-300 transition-colors flex items-center justify-center gap-1"
                      >
                        {copiedLink ? (
                          <Check size={12} />
                        ) : (
                          <LinkIcon size={12} />
                        )}{" "}
                        Link másolása
                      </button>
                      <button
                        onClick={handleRegenerateCode}
                        className="flex-1 text-xs bg-white/5 hover:bg-white/10 py-1.5 rounded text-gray-300 transition-colors flex items-center justify-center gap-1"
                      >
                        <RefreshCw size={12} /> Új kód
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 px-8 border-t border-white/5 bg-black/20 overflow-x-auto">
            {(["overview", "members", "tournaments", "settings"] as const).map(
              (tab) => {
                if (tab === "settings" && !isOwner) return null;

                const icons = {
                  overview: Info,
                  members: Users,
                  tournaments: Trophy,
                  settings: Settings,
                };
                const labels = {
                  overview: "Áttekintés",
                  members: "Tagok",
                  tournaments: "Versenyek",
                  settings: "Beállítások",
                };
                const Icon = icons[tab];

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <Icon size={18} />
                    {labels[tab]}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-[#1a1b26] rounded-xl border border-white/5 p-6 h-full">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Info size={20} className="text-primary" />A Csapatról
                  </h2>
                  <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed max-w-[200px] break-words">
                    {currentTeam.description ? (
                      currentTeam.description
                    ) : (
                      <span className="italic opacity-50">
                        Nincs leírás megadva.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-[#1a1b26] rounded-xl border border-white/5 p-6">
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                    Statisztikák
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Trophy size={16} /> Versenyek
                      </span>
                      <span className="text-xl font-bold text-white">
                        {currentTeam.tournamentEntries?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Users size={16} /> Tagok
                      </span>
                      <span className="text-xl font-bold text-white">
                        {currentTeam.members?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Shield size={16} /> Csapat kapitány
                      </span>
                      <span className="text-white font-medium">
                        {currentTeam.owner?.displayName ||
                          currentTeam.owner?.username}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Csapattagok</h2>
                {isOwner && (
                  <button className="btn btn-primary btn-sm gap-2">
                    <UserPlus size={16} />
                    Tag meghívása
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentTeam.members?.length ? (
                  currentTeam.members.map((member) => (
                    <MemberCard
                      key={member.userId}
                      member={member}
                      isOwner={isOwner}
                      currentUserId={user?.id}
                      onRemove={() => handleRemoveMember(member.userId)}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-gray-500 bg-[#1a1b26]/50 rounded-xl border border-dashed border-white/10">
                    <Users size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Még nincsenek tagok.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "tournaments" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">
                Nevezett Versenyek
              </h2>
              {currentTeam.tournamentEntries?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentTeam.tournamentEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      to={`/tournaments/${entry.tournament?.id}`}
                      className="group bg-[#1a1b26] border border-white/5 rounded-xl p-5 hover:border-primary/50 transition-all hover:-translate-y-1 block shadow-lg shadow-black/20"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors line-clamp-1">
                          {entry.tournament?.name}
                        </h3>
                        <div
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${entry.tournament?.status === "REGISTRATION"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : entry.tournament?.status === "IN_PROGRESS"
                              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                            }`}
                        >
                          {entry.tournament?.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <Trophy size={14} className="text-primary" />
                        <span>{entry.tournament?.game?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>
                          {new Date(
                            entry.tournament?.startDate || "",
                          ).toLocaleDateString("hu-HU")}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500 bg-[#1a1b26]/50 rounded-xl border border-dashed border-white/10">
                  <Trophy size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Nincs verseny nevezés.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && isOwner && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-[#1a1b26] rounded-xl border border-white/5 p-6">
                <h2 className="text-lg font-bold text-white mb-4">
                  Csapat szerkesztése
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                  Kép, név, leírás módosítása.
                </p>
                <button
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit size={16} />
                  Adatok módosítása
                </button>
              </div>

              <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-6">
                <h2 className="text-lg font-bold text-red-500 mb-2">
                  Veszélyzóna
                </h2>
                <p className="text-red-400/70 text-sm mb-4">
                  A csapat törlése végleges és nem visszavonható. Minden adat
                  (tagok, elért eredmények) elvész.
                </p>

                <button
                  className="btn btn-danger w-full flex items-center justify-center gap-2"
                  onClick={handleDeleteTeam}
                >
                  <Trash2 size={16} />
                  Csapat törlése
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <TeamEditModal
          team={currentTeam}
          onClose={() => setShowEditModal(false)}
        />
      )}

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
