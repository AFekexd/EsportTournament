import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Users, Search, Trash2, Eye, Edit2 } from "lucide-react";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { fetchTeams, deleteTeam } from "../../store/slices/teamsSlice";
import { AdminTeamEditModal } from "./AdminTeamEditModal";
import type { Team } from "../../types";

export function TeamManagement() {
  const dispatch = useAppDispatch();
  const { teams, pagination, isLoading } = useAppSelector(
    (state) => state.teams
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    dispatch(fetchTeams({ page: 1, search: debouncedSearch }));
  }, [dispatch, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (pagination?.pages || 1)) {
      dispatch(fetchTeams({ page: newPage, search: debouncedSearch }));
    }
  };

  const handleDeleteTeam = (teamId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Csapat törlése",
      message:
        "Biztosan törölni szeretnéd ezt a csapatot? Ez a művelet nem visszavonható!",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        try {
          await dispatch(deleteTeam(teamId)).unwrap();
          toast.success("Csapat sikeresen törölve");
        } catch (error: any) {
          console.error("Failed to delete team:", error);
          toast.error(error.message || "Nem sikerült törölni a csapatot");
        }
      },
    });
  };

  if (isLoading && teams.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="section-title mb-0">Csapatok kezelése</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder="Keresés..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0f1015] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f1015] rounded-xl border border-white/5 p-4">
          <div className="text-2xl font-bold text-white">
            {pagination?.total || 0}
          </div>
          <div className="text-sm text-gray-400">Összes csapat</div>
        </div>
      </div>

      {/* Teams Table */}
      <div className="admin-table-container overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-muted text-sm uppercase">
              <th className="p-3">Csapat</th>
              <th className="p-3">Kód</th>
              <th className="p-3 text-center">Tagok</th>
              <th className="p-3 text-center">ELO</th>
              <th className="p-3">Létrehozva</th>
              <th className="p-3 text-right">Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-muted">
                  {searchTerm
                    ? "Nincs találat a keresési feltételeknek megfelelően"
                    : "Még nincs csapat létrehozva"}
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr
                  key={team.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-3">
                    <Link
                      to={`/teams/${team.id}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                    >
                      {team.logoUrl ? (
                        <img
                          src={team.logoUrl}
                          alt={team.name}
                          className="w-10 h-10 rounded-lg object-cover border border-white/10 group-hover:border-primary/50 transition-colors"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                          <Users size={20} className="text-emerald-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white group-hover:text-primary transition-colors">
                          {team.name}
                        </div>
                        {team.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {team.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-sm text-gray-400">
                    {team.joinCode}
                  </td>
                  <td className="p-3 text-center text-sm">
                    {team.members?.length || 0}
                  </td>
                  <td className="p-3 text-center font-mono text-sm text-primary">
                    {team.elo}
                  </td>
                  <td className="p-3 text-sm text-muted">
                    {new Date(team.createdAt).toLocaleDateString("hu-HU")}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link
                        to={`/teams/${team.id}`}
                        className="btn-icon hover:bg-white/10"
                        title="Megtekintés"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        className="btn-icon hover:bg-white/10"
                        title="Szerkesztés"
                        onClick={() => setEditingTeam(team)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon hover:bg-red-500/10 text-red-400"
                        title="Törlés"
                        onClick={() => handleDeleteTeam(team.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  pagination.page === page
                    ? "bg-primary text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>
      )}

      {editingTeam && (
        <AdminTeamEditModal
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSuccess={() => {
            dispatch(
              fetchTeams({
                page: pagination?.page || 1,
                search: debouncedSearch,
              })
            );
          }}
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
