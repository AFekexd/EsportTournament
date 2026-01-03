import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Users, Shield, Search, Edit2, Trash2, Clock } from "lucide-react";
import { authService } from "../../lib/auth-service";
import { RoleChangeModal } from "./RoleChangeModal";
import { UserTimeModal } from "./UserTimeModal";
import { UserEditModal } from "./UserEditModal";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { API_URL } from "../../config";

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "ORGANIZER" | "MODERATOR" | "TEACHER" | "STUDENT";
  elo: number;
  timeBalanceSeconds: number;
  createdAt: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");

  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [timeModalUser, setTimeModalUser] = useState<User | null>(null);
  const [editModalUser, setEditModalUser] = useState<User | null>(null);

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = authService.keycloak?.token;
      if (!token) return;

      const response = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { class: string; label: string }> = {
      ADMIN: {
        class: "bg-red-500/20 text-red-400 border-red-500/30",
        label: "Admin",
      },
      ORGANIZER: {
        class: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        label: "Szervező",
      },
      TEACHER: {
        class: "bg-green-500/20 text-green-400 border-green-500/30",
        label: "Tanár",
      },
      MODERATOR: {
        class: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        label: "Moderátor",
      },
      STUDENT: {
        class: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        label: "Diák",
      },
    };
    const config = roleConfig[role] || {
      class: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      label: role,
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold border ${config.class}`}
      >
        {config.label}
      </span>
    );
  };

  const formatTime = (seconds: number) => {
    if (!seconds && seconds !== 0) return "-";

    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);

    const hours = Math.floor(absSeconds / 3600);
    const mins = Math.floor((absSeconds % 3600) / 60);

    const sign = isNegative ? "-" : "";

    if (hours > 0) {
      return `${sign}${hours}ó ${mins}p`;
    }
    return `${sign}${mins}p`;
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        false);

    const matchesRole = selectedRole === "ALL" || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  const handleDeleteUser = (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Felhasználó törlése",
      message: "Biztosan törölni szeretnéd ezt a felhasználót?",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        try {
          const token = authService.keycloak?.token;
          if (!token) return;

          const response = await fetch(`${API_URL}/users/${userId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            toast.success("Felhasználó sikeresen törölve");
          } else {
            const data = await response.json();
            toast.error(`Hiba: ${data.message || "Sikertelen törlés"}`);
          }
        } catch (error) {
          console.error("Failed to delete user:", error);
          toast.error("Hiba történt a törlés során");
        }
      },
    });
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      const token = authService.keycloak?.token;
      if (!token) return;

      const response = await fetch(`${API_URL}/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role: data.data.role } : u
          )
        );
      } else {
        toast.error("Sikertelen szerep módosítás");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="section-title mb-0">Felhasználók kezelése</h2>
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

          {/* Role Filter */}
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="appearance-none w-full sm:w-auto px-4 py-2 pr-10 bg-[#0f1015] border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50 transition-colors text-sm cursor-pointer"
              style={{
                colorScheme: "dark",
              }}
            >
              <option value="ALL">Minden szerep</option>
              <option value="ADMIN">Admin</option>
              <option value="ORGANIZER">Szervező</option>
              <option value="TEACHER">Tanár</option>
              <option value="MODERATOR">Moderátor</option>
              <option value="STUDENT">Diák</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0f1015] rounded-xl border border-white/5 p-4">
          <div className="text-2xl font-bold text-white">{users.length}</div>
          <div className="text-sm text-gray-400">Összes felhasználó</div>
        </div>
        <div className="bg-[#0f1015] rounded-xl border border-white/5 p-4">
          <div className="text-2xl font-bold text-red-400">
            {users.filter((u) => u.role === "ADMIN").length}
          </div>
          <div className="text-sm text-gray-400">Admin</div>
        </div>
        <div className="bg-[#0f1015] rounded-xl border border-white/5 p-4">
          <div className="text-2xl font-bold text-green-400">
            {users.filter((u) => u.role === "TEACHER").length}
          </div>
          <div className="text-sm text-gray-400">Tanár</div>
        </div>
        <div className="bg-[#0f1015] rounded-xl border border-white/5 p-4">
          <div className="text-2xl font-bold text-blue-400">
            {users.filter((u) => u.role === "MODERATOR").length}
          </div>
          <div className="text-sm text-gray-400">Moderátor</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-container overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-muted text-sm uppercase">
              <th className="p-3">Felhasználó</th>
              <th className="p-3">Email</th>
              <th className="p-3">Szerep</th>
              <th className="p-3 text-center">Időkeret</th>
              <th className="p-3 text-center">ELO</th>
              <th className="p-3">Regisztráció</th>
              <th className="p-3 text-right">Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center p-8 text-muted">
                  {searchTerm || selectedRole !== "ALL"
                    ? "Nincs találat a szűrési feltételeknek megfelelően"
                    : "Még nincs felhasználó"}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-3">
                    <Link
                      to={`/profile/${user.id}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-primary/50 transition-colors"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                          <Users size={20} className="text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white group-hover:text-primary transition-colors">
                          {user.displayName || user.username}
                        </div>
                        {user.displayName && (
                          <div className="text-xs text-gray-500">
                            {user.username.includes("@")
                              ? user.username
                              : `@${user.username}`}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="p-3 text-muted">{user.email}</td>
                  <td className="p-3">{getRoleBadge(user.role)}</td>
                  <td
                    className={`p-3 text-center font-mono text-sm ${
                      user.timeBalanceSeconds < 0
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {["ADMIN", "TEACHER"].includes(user.role)
                      ? "∞"
                      : formatTime(user.timeBalanceSeconds || 0)}
                  </td>
                  <td className="p-3 text-center font-mono text-sm text-primary">
                    {user.elo}
                  </td>
                  <td className="p-3 text-sm text-muted">
                    {new Date(user.createdAt).toLocaleDateString("hu-HU")}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        className="btn-icon hover:bg-white/10"
                        title="Időkeret kezelése"
                        onClick={() => setTimeModalUser(user)}
                      >
                        <Clock size={16} />
                      </button>
                      <button
                        className="btn-icon hover:bg-white/10"
                        title="Szerep módosítása"
                        onClick={() => setRoleModalUser(user)}
                      >
                        <Shield size={16} />
                      </button>
                      <button
                        className="btn-icon hover:bg-white/10"
                        title="Szerkesztés"
                        onClick={() => setEditModalUser(user)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon hover:bg-red-500/10 text-red-400"
                        title="Törlés"
                        onClick={() => handleDeleteUser(user.id)}
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

      {roleModalUser && (
        <RoleChangeModal
          user={roleModalUser}
          onClose={() => setRoleModalUser(null)}
          onSave={handleRoleUpdate}
        />
      )}

      {timeModalUser && (
        <UserTimeModal
          user={timeModalUser}
          onClose={() => setTimeModalUser(null)}
          onSuccess={() => {
            fetchUsers(); // Refresh to show new balance
          }}
        />
      )}

      {editModalUser && (
        <UserEditModal
          user={editModalUser}
          onClose={() => setEditModalUser(null)}
          onSuccess={() => {
            fetchUsers(); // Refresh to show new name/avatar
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
