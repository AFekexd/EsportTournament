import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Bug,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Search,
    Globe,
    Trophy,
    Calendar,
    Users,
    HelpCircle,
    ArrowUp,
    ArrowRight,
    ArrowDown,
    MessageSquare,
    Trash2,
    ExternalLink,
    FileText,
    Bell,
    Mail,
    Plus,
    X,
} from "lucide-react";
import { API_URL } from "../../config";
import { apiFetch } from "../../lib/api-client";
import { ConfirmationModal } from "../common/ConfirmationModal";

interface BugReport {
    id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    imageUrl?: string;
    adminNote?: string;
    createdAt: string;
    resolvedAt?: string;
    reporter: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
}

interface AdminUser {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    email: string;
    discordId?: string;
    role: string;
}

interface NotificationSetting {
    id: string;
    userId: string;
    receiveEmail: boolean;
    receiveDiscord: boolean;
    user: AdminUser;
}

const categories = [
    { value: "WEBSITE", label: "Weboldal", icon: <Globe size={16} /> },
    { value: "TOURNAMENT", label: "Verseny", icon: <Trophy size={16} /> },
    { value: "BOOKING", label: "Foglalás", icon: <Calendar size={16} /> },
    { value: "TEAM", label: "Csapat", icon: <Users size={16} /> },
    { value: "OTHER", label: "Egyéb", icon: <HelpCircle size={16} /> },
];

const priorities = [
    { value: "LOW", label: "Alacsony", icon: <ArrowDown size={14} />, color: "text-green-400" },
    { value: "MEDIUM", label: "Közepes", icon: <ArrowRight size={14} />, color: "text-yellow-400" },
    { value: "HIGH", label: "Magas", icon: <ArrowUp size={14} />, color: "text-red-400" },
];

const statuses = [
    { value: "PENDING", label: "Függőben", icon: <Clock size={14} />, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    { value: "IN_PROGRESS", label: "Folyamatban", icon: <Loader2 size={14} />, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    { value: "RESOLVED", label: "Megoldva", icon: <CheckCircle size={14} />, color: "text-green-400 bg-green-400/10 border-green-400/20" },
    { value: "CLOSED", label: "Lezárva", icon: <XCircle size={14} />, color: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
];

export function BugReportsAdmin() {
    const [reports, setReports] = useState<BugReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [filterCategory, setFilterCategory] = useState<string>("");
    const [search, setSearch] = useState("");
    const [adminNote, setAdminNote] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [showChangelogModal, setShowChangelogModal] = useState(false);
    const [changelogDescription, setChangelogDescription] = useState("");
    // Notification settings state
    const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
    const [availableAdmins, setAvailableAdmins] = useState<AdminUser[]>([]);
    const [showNotificationSettings, setShowNotificationSettings] = useState(false);
    const [selectedAdminToAdd, setSelectedAdminToAdd] = useState<string>("");

    useEffect(() => {
        fetchReports();
        fetchNotificationSettings();
    }, [filterStatus, filterCategory]);

    const fetchNotificationSettings = async () => {
        try {
            const res = await apiFetch(`${API_URL}/bug-report-settings`);
            const data = await res.json();
            if (data.success) {
                setNotificationSettings(data.data.settings);
                setAvailableAdmins(data.data.availableAdmins);
            }
        } catch (error) {
            console.error("Failed to fetch notification settings:", error);
        }
    };

    const handleAddAdmin = async () => {
        if (!selectedAdminToAdd) return;
        try {
            const res = await apiFetch(`${API_URL}/bug-report-settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedAdminToAdd }),
            });
            const data = await res.json();
            if (data.success) {
                setNotificationSettings((prev) => [...prev, data.data]);
                setAvailableAdmins((prev) => prev.filter((a) => a.id !== selectedAdminToAdd));
                setSelectedAdminToAdd("");
                toast.success("Admin hozzáadva az értesítési listához");
            }
        } catch (error) {
            toast.error("Hiba az admin hozzáadásakor");
        }
    };

    const handleRemoveAdmin = async (userId: string) => {
        try {
            const res = await apiFetch(`${API_URL}/bug-report-settings/${userId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success) {
                const removed = notificationSettings.find((s) => s.userId === userId);
                setNotificationSettings((prev) => prev.filter((s) => s.userId !== userId));
                if (removed) {
                    setAvailableAdmins((prev) => [...prev, removed.user]);
                }
                toast.success("Admin eltávolítva az értesítési listáról");
            }
        } catch (error) {
            toast.error("Hiba az admin eltávolításakor");
        }
    };

    const handleToggleNotification = async (userId: string, field: "receiveEmail" | "receiveDiscord") => {
        const setting = notificationSettings.find((s) => s.userId === userId);
        if (!setting) return;
        try {
            const res = await apiFetch(`${API_URL}/bug-report-settings/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: !setting[field] }),
            });
            const data = await res.json();
            if (data.success) {
                setNotificationSettings((prev) =>
                    prev.map((s) => (s.userId === userId ? data.data : s))
                );
            }
        } catch (error) {
            toast.error("Hiba a beállítás módosításakor");
        }
    };

    const fetchReports = async () => {
        try {
            let url = `${API_URL}/bug-reports`;
            const params = new URLSearchParams();
            if (filterStatus) params.append("status", filterStatus);
            if (filterCategory) params.append("category", filterCategory);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await apiFetch(url);
            const data = await res.json();
            if (data.success) {
                setReports(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch bug reports:", error);
            toast.error("Hiba a hibajelentések betöltésekor");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (reportId: string, newStatus: string, createChangelog = false) => {
        setIsUpdating(true);
        try {
            const body: any = { status: newStatus };
            if (createChangelog && newStatus === 'RESOLVED') {
                body.createChangelog = true;
                body.changelogDescription = changelogDescription || undefined;
            }

            const res = await apiFetch(`${API_URL}/bug-reports/${reportId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.success) {
                setReports((prev) =>
                    prev.map((r) => (r.id === reportId ? data.data : r))
                );
                if (selectedReport?.id === reportId) {
                    setSelectedReport(data.data);
                }
                toast.success(createChangelog ? "Hibajavítás changelog-ba mentve" : "Státusz sikeresen módosítva");
                setShowChangelogModal(false);
                setChangelogDescription("");
            }
        } catch (error) {
            console.error("Failed to update status:", error);
            toast.error("Hiba a státusz módosításakor");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSaveNote = async () => {
        if (!selectedReport) return;
        setIsUpdating(true);
        try {
            const res = await apiFetch(`${API_URL}/bug-reports/${selectedReport.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminNote }),
            });

            const data = await res.json();
            if (data.success) {
                setReports((prev) =>
                    prev.map((r) => (r.id === selectedReport.id ? data.data : r))
                );
                setSelectedReport(data.data);
                toast.success("Megjegyzés mentve");
            }
        } catch (error) {
            console.error("Failed to save note:", error);
            toast.error("Hiba a megjegyzés mentésekor");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (reportId: string) => {
        try {
            const res = await apiFetch(`${API_URL}/bug-reports/${reportId}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (data.success) {
                setReports((prev) => prev.filter((r) => r.id !== reportId));
                if (selectedReport?.id === reportId) {
                    setSelectedReport(null);
                }
                toast.success("Hibajelentés törölve");
            }
        } catch (error) {
            console.error("Failed to delete:", error);
            toast.error("Hiba a törléskor");
        }
        setDeleteConfirm(null);
    };

    const filteredReports = reports.filter((report) => {
        if (search) {
            const searchLower = search.toLowerCase();
            return (
                report.title.toLowerCase().includes(searchLower) ||
                report.description.toLowerCase().includes(searchLower) ||
                report.reporter.username.toLowerCase().includes(searchLower)
            );
        }
        return true;
    });

    const getStatusConfig = (status: string) =>
        statuses.find((s) => s.value === status) || statuses[0];

    const getPriorityConfig = (priority: string) =>
        priorities.find((p) => p.value === priority) || priorities[1];

    const getCategoryConfig = (category: string) =>
        categories.find((c) => c.value === category) || categories[4];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Bug className="text-red-400" size={24} />
                            Hibajelentések
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {reports.length} bejelentés összesen
                        </p>
                    </div>
                    <button
                        onClick={() => setShowNotificationSettings(!showNotificationSettings)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${showNotificationSettings
                                ? "bg-primary/20 border-primary/50 text-primary"
                                : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                            }`}
                        title="Értesítési beállítások"
                    >
                        <Bell size={16} />
                        <span className="hidden sm:inline text-sm">Értesítések</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Keresés..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-[#0f1015] border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary/50"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 bg-[#0f1015] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
                    >
                        <option value="">Minden státusz</option>
                        {statuses.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-2 bg-[#0f1015] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
                    >
                        <option value="">Minden kategória</option>
                        {categories.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Notification Settings Panel */}
                {showNotificationSettings && (
                    <div className="bg-[#161722] rounded-xl border border-white/5 p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Bell className="text-primary" size={20} />
                            Értesítési beállítások
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Új hibajelentéskor az alábbi admin-ok kapnak értesítést:
                        </p>

                        {/* Add Admin */}
                        <div className="flex gap-2 mb-4">
                            <select
                                value={selectedAdminToAdd}
                                onChange={(e) => setSelectedAdminToAdd(e.target.value)}
                                className="flex-1 px-3 py-2 bg-[#0f1015] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
                            >
                                <option value="">Válassz admin-t...</option>
                                {availableAdmins.map((admin) => (
                                    <option key={admin.id} value={admin.id}>
                                        {admin.displayName || admin.username} ({admin.role})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddAdmin}
                                disabled={!selectedAdminToAdd}
                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Hozzáadás
                            </button>
                        </div>

                        {/* Admin List */}
                        {notificationSettings.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Még nincs beállított értesítés. Adj hozzá admin-okat!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {notificationSettings.map((setting) => (
                                    <div
                                        key={setting.id}
                                        className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                                                {setting.user.avatarUrl ? (
                                                    <img src={setting.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-sm font-bold text-primary">
                                                        {(setting.user.displayName || setting.user.username).charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {setting.user.displayName || setting.user.username}
                                                </p>
                                                <p className="text-xs text-gray-500">{setting.user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleNotification(setting.userId, "receiveEmail")}
                                                className={`p-2 rounded-lg transition-colors ${setting.receiveEmail
                                                    ? "bg-green-500/20 text-green-400"
                                                    : "bg-white/5 text-gray-500"
                                                    }`}
                                                title="Email értesítés"
                                            >
                                                <Mail size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleNotification(setting.userId, "receiveDiscord")}
                                                className={`p-2 rounded-lg transition-colors ${setting.receiveDiscord
                                                    ? "bg-indigo-500/20 text-indigo-400"
                                                    : "bg-white/5 text-gray-500"
                                                    }`}
                                                title="Discord értesítés"
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveAdmin(setting.userId)}
                                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                title="Eltávolítás"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Reports List */}
                <div className="lg:col-span-2 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={32} className="animate-spin text-primary" />
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10 border-dashed">
                            <Bug size={48} className="mx-auto mb-4 text-gray-600" />
                            <p className="text-muted-foreground">Nincs hibajelentés</p>
                        </div>
                    ) : (
                        filteredReports.map((report) => {
                            const statusConfig = getStatusConfig(report.status);
                            const priorityConfig = getPriorityConfig(report.priority);
                            const categoryConfig = getCategoryConfig(report.category);
                            const isSelected = selectedReport?.id === report.id;

                            return (
                                <div
                                    key={report.id}
                                    onClick={() => {
                                        setSelectedReport(report);
                                        setAdminNote(report.adminNote || "");
                                    }}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                                        ? "bg-primary/10 border-primary/50"
                                        : "bg-[#161722] border-white/5 hover:border-white/20"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <h3 className="font-medium text-white line-clamp-1">
                                            {report.title}
                                        </h3>
                                        <span
                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${statusConfig.color}`}
                                        >
                                            {statusConfig.icon}
                                            {statusConfig.label}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                                        {report.description}
                                    </p>

                                    <div className="flex items-center flex-wrap gap-2 text-xs">
                                        <span className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-gray-400">
                                            {categoryConfig.icon}
                                            {categoryConfig.label}
                                        </span>
                                        <span className={`flex items-center gap-1 ${priorityConfig.color}`}>
                                            {priorityConfig.icon}
                                            {priorityConfig.label}
                                        </span>
                                        <span className="text-gray-600">•</span>
                                        <span className="text-gray-500">
                                            {report.reporter.displayName || report.reporter.username}
                                        </span>
                                        <span className="ml-auto text-gray-600">
                                            {new Date(report.createdAt).toLocaleDateString("hu-HU")}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Detail Panel */}
                <div className="bg-[#161722] rounded-xl border border-white/5 p-6">
                    {selectedReport ? (
                        <div className="space-y-6">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="text-lg font-bold text-white">
                                    {selectedReport.title}
                                </h3>
                                <button
                                    onClick={() => setDeleteConfirm(selectedReport.id)}
                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Reporter */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center overflow-hidden border border-white/10">
                                    {selectedReport.reporter.avatarUrl ? (
                                        <img
                                            src={selectedReport.reporter.avatarUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-sm font-bold text-gray-500">
                                            {selectedReport.reporter.username.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        {selectedReport.reporter.displayName || selectedReport.reporter.username}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(selectedReport.createdAt).toLocaleString("hu-HU")}
                                    </p>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                                    Leírás
                                </label>
                                <p className="text-sm text-gray-300 bg-black/20 rounded-lg p-3">
                                    {selectedReport.description}
                                </p>
                            </div>

                            {/* Image */}
                            {selectedReport.imageUrl && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                                        Képernyőkép
                                    </label>
                                    <a
                                        href={selectedReport.imageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block relative group"
                                    >
                                        <img
                                            src={selectedReport.imageUrl}
                                            alt="Screenshot"
                                            className="rounded-lg max-h-48 object-cover border border-white/10"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                            <ExternalLink size={24} className="text-white" />
                                        </div>
                                    </a>
                                </div>
                            )}

                            {/* Status Change */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                                    Státusz módosítása
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {statuses.map((status) => (
                                        <button
                                            key={status.value}
                                            onClick={() => handleStatusChange(selectedReport.id, status.value)}
                                            disabled={isUpdating || selectedReport.status === status.value}
                                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${selectedReport.status === status.value
                                                ? status.color
                                                : "border-white/10 text-gray-500 hover:border-white/20 hover:text-white"
                                                } disabled:opacity-50`}
                                        >
                                            {status.icon}
                                            {status.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Resolve with Changelog option */}
                                {selectedReport.status !== 'RESOLVED' && selectedReport.status !== 'CLOSED' && (
                                    <button
                                        onClick={() => {
                                            setChangelogDescription(`🐛 ${selectedReport.title}`);
                                            setShowChangelogModal(true);
                                        }}
                                        disabled={isUpdating}
                                        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors text-sm disabled:opacity-50"
                                    >
                                        <FileText size={16} />
                                        Megoldva + Changelog
                                    </button>
                                )}
                            </div>

                            {/* Admin Note */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                                    Admin megjegyzés
                                </label>
                                <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 resize-none"
                                    placeholder="Megjegyzés a felhasználónak..."
                                />
                                <button
                                    onClick={handleSaveNote}
                                    disabled={isUpdating || adminNote === (selectedReport.adminNote || "")}
                                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm disabled:opacity-50"
                                >
                                    <MessageSquare size={16} />
                                    Megjegyzés mentése
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                            <Bug size={48} className="text-gray-700 mb-4" />
                            <p className="text-gray-500">
                                Válassz ki egy hibajelentést a részletek megtekintéséhez
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            <ConfirmationModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Hibajelentés törlése"
                message="Biztosan törölni szeretnéd ezt a hibajelentést?"
                variant="danger"
                confirmLabel="Törlés"
            />

            {/* Changelog Modal */}
            {showChangelogModal && selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowChangelogModal(false)}
                    />
                    <div className="relative bg-[#161722] rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl animate-fade-in">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="text-green-400" size={20} />
                            Changelog bejegyzés
                        </h3>

                        <p className="text-sm text-gray-400 mb-4">
                            Az alábbi leírás kerül a changelog-ba PATCH frissítésként:
                        </p>

                        <input
                            type="text"
                            value={changelogDescription}
                            onChange={(e) => setChangelogDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 mb-4"
                            placeholder="🐛 Hiba leírása..."
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowChangelogModal(false)}
                                className="flex-1 px-4 py-2 border border-white/10 text-gray-400 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                Mégse
                            </button>
                            <button
                                onClick={() => handleStatusChange(selectedReport.id, 'RESOLVED', true)}
                                disabled={isUpdating || !changelogDescription.trim()}
                                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isUpdating ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <CheckCircle size={16} />
                                )}
                                Mentés
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
