import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
} from "lucide-react";
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
import "./TeamDetail.css";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = currentTeam?.ownerId === user?.id;

  useEffect(() => {
    if (id) {
      dispatch(fetchTeam(id));
    }

    return () => {
      dispatch(clearCurrentTeam());
    };
  }, [id, dispatch]);

  const handleCopyJoinCode = () => {
    if (currentTeam?.joinCode) {
      navigator.clipboard.writeText(currentTeam.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyInviteLink = () => {
    if (currentTeam?.joinCode) {
      const link = `${window.location.origin}/teams?joinCode=${currentTeam.joinCode}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (currentTeam?.id) {
      await dispatch(regenerateJoinCode(currentTeam.id));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (
      currentTeam?.id &&
      window.confirm("Biztosan eltávolítod ezt a tagot?")
    ) {
      await dispatch(removeMember({ teamId: currentTeam.id, memberId }));
    }
  };

  const handleDeleteTeam = async () => {
    if (currentTeam?.id) {
      await dispatch(deleteTeam(currentTeam.id));
      navigate("/teams");
    }
  };

  if (isLoading || !currentTeam) {
    return (
      <div className="loading-container">
        <div className="spinner-large" />
        <p>Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="team-detail-page">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate("/teams")}>
          <ArrowLeft size={18} />
          Vissza
        </button>
      </div>

      {/* Team Info Card */}
      <div className="team-header card">
        <div className="team-header-content">
          {currentTeam.logoUrl && (
            <div className="team-logo">
              <img src={currentTeam.logoUrl} alt={currentTeam.name} />
            </div>
          )}
          <div className="team-info">
            <h1 className="team-name">{currentTeam.name}</h1>
            <div className="team-meta">
              <span className="team-elo">
                <Trophy size={16} />
                {currentTeam.elo} ELO
              </span>
              <span className="team-members-count">
                <Users size={16} />
                {currentTeam.members?.length || 0} tagok
              </span>
            </div>
          </div>
        </div>

        {isOwner && currentTeam.joinCode && (
          <div className="join-code-section">
            <label className="join-code-label">Csatlakozási kód:</label>
            <div className="join-code-group">
              <code className="join-code">{currentTeam.joinCode}</code>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleCopyJoinCode}
                title="Kód másolása"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleCopyInviteLink}
                title="Meghívó link másolása"
              >
                {copiedLink ? <Check size={16} /> : <LinkIcon size={16} />}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleRegenerateCode}
                title="Újragenerálás"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Info size={18} />
            Áttekintés
          </button>
          <button
            className={`tab ${activeTab === "members" ? "active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            <Users size={18} />
            Tagok
          </button>
          <button
            className={`tab ${activeTab === "tournaments" ? "active" : ""}`}
            onClick={() => setActiveTab("tournaments")}
          >
            <Trophy size={18} />
            Versenyek
          </button>
          {isOwner && (
            <button
              className={`tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <Settings size={18} />
              Beállítások
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="overview-tab">
            <div className="card">
              <h2 className="section-title">Leírás</h2>
              <p className="team-description">
                {currentTeam.description || "Nincs leírás megadva."}
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card card">
                <div className="stat-icon">
                  <Trophy />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{currentTeam.elo}</span>
                  <span className="stat-label">ELO</span>
                </div>
              </div>
              <div className="stat-card card">
                <div className="stat-icon">
                  <Users />
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {currentTeam.members?.length || 0}
                  </span>
                  <span className="stat-label">Tagok</span>
                </div>
              </div>
              <div className="stat-card card">
                <div className="stat-icon">
                  <Trophy />
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {currentTeam.tournamentEntries?.length || 0}
                  </span>
                  <span className="stat-label">Versenyek</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="members-tab">
            <div className="members-header">
              <h2 className="section-title">Csapattagok</h2>
              {isOwner && (
                <button className="btn btn-primary btn-sm">
                  <UserPlus size={16} />
                  Tag hozzáadása
                </button>
              )}
            </div>

            <div className="members-grid">
              {currentTeam.members?.map((member) => (
                <MemberCard
                  key={member.userId}
                  member={member}
                  isOwner={isOwner}
                  currentUserId={user?.id}
                  onRemove={() => handleRemoveMember(member.userId)}
                />
              ))}
            </div>

            {(!currentTeam.members || currentTeam.members.length === 0) && (
              <div className="empty-state card">
                <Users size={48} />
                <p>Még nincsenek tagok ebben a csapatban</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "tournaments" && (
          <div className="tournaments-tab">
            <h2 className="section-title">Versenyek</h2>

            {currentTeam.tournamentEntries &&
            currentTeam.tournamentEntries.length > 0 ? (
              <div className="tournaments-list">
                {currentTeam.tournamentEntries.map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/tournaments/${entry.tournament?.id}`}
                    className="tournament-card card"
                  >
                    <div className="tournament-info">
                      <h3>{entry.tournament?.name}</h3>
                      <p className="tournament-game">
                        {entry.tournament?.game?.name}
                      </p>
                    </div>
                    <span
                      className={`badge ${
                        entry.tournament?.status === "REGISTRATION"
                          ? "badge-success"
                          : entry.tournament?.status === "IN_PROGRESS"
                          ? "badge-warning"
                          : entry.tournament?.status === "COMPLETED"
                          ? "badge-primary"
                          : entry.tournament?.status === "CANCELLED"
                          ? "badge-error"
                          : "badge-secondary"
                      }`}
                    >
                      {entry.tournament?.status === "REGISTRATION"
                        ? "Regisztráció"
                        : entry.tournament?.status === "IN_PROGRESS"
                        ? "Folyamatban"
                        : entry.tournament?.status === "COMPLETED"
                        ? "Befejezett"
                        : entry.tournament?.status === "CANCELLED"
                        ? "Törölve"
                        : entry.tournament?.status === "DRAFT"
                        ? "Piszkozat"
                        : entry.tournament?.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state card">
                <Trophy size={48} />
                <p>Ez a csapat még nem vesz részt versenyeken</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && isOwner && (
          <div className="settings-tab">
            <div className="settings-section card">
              <h2 className="section-title">Csapat beállítások</h2>

              <button
                className="btn btn-secondary"
                onClick={() => setShowEditModal(true)}
              >
                <Edit size={18} />
                Csapat szerkesztése
              </button>
            </div>

            <div className="settings-section card danger-zone">
              <h2 className="section-title">Veszélyzóna</h2>
              <p className="danger-description">
                A csapat törlése végleges és nem visszavonható művelet.
              </p>

              {!showDeleteConfirm ? (
                <button
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={18} />
                  Csapat törlése
                </button>
              ) : (
                <div className="delete-confirm">
                  <p>Biztosan törölni szeretnéd ezt a csapatot?</p>
                  <div className="delete-actions">
                    <button
                      className="btn btn-danger"
                      onClick={handleDeleteTeam}
                    >
                      Igen, törlés
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Mégse
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <TeamEditModal
          team={currentTeam}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
