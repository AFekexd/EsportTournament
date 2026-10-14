import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Calendar,
  Trophy,
  Shield,
  Plus,
  Minus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Medal,
  Crown,
  CalendarDays,
  UserCheck,
  Search,
  Check,
  X,
  History,
  CalendarCheck,
  CalendarPlus,
  Award,
  Zap,
  Users,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { API_URL } from "../config";
import { apiFetch } from "../lib/api-client";
import { format, addDays, startOfWeek, isToday, isSameDay } from "date-fns";
import { ConfirmationModal } from "../components/common/ConfirmationModal";

interface SupervisorUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
}

interface SupervisorShift {
  id: string;
  date: string;
  hour: number;
  userId: string;
  user: SupervisorUser;
  createdAt?: string;
}

interface SupervisorStatItem {
  user: SupervisorUser;
  totalHours: number;
  monthHours: number;
  weekHours: number;
  upcomingHours: number;
  pastHours: number;
  lastShift: { date: string; hour: number } | null;
}

interface StatsResponseData {
  leaderboard: SupervisorStatItem[];
  totalAssignments: number;
  totalSupervisors: number;
  currentMonthTotal: number;
  currentWeekTotal: number;
  recentShifts: SupervisorShift[];
}

export function SchedulePage() {
  const { user, isAuthenticated } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<"calendar" | "leaderboard" | "my-shifts">("calendar");

  // Calendar State
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  const [showFullDayHours, setShowFullDayHours] = useState(false);
  const [shifts, setShifts] = useState<SupervisorShift[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);

  // Leaderboard & Stats State
  const [statsData, setStatsData] = useState<StatsResponseData | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [leaderboardFilterPeriod, setLeaderboardFilterPeriod] = useState<"total" | "month" | "week">("total");
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [leaderboardRoleFilter, setLeaderboardRoleFilter] = useState<string>("ALL");

  // Eligible supervisors (for admin multi-assignment)
  const [eligibleSupervisors, setEligibleSupervisors] = useState<SupervisorUser[]>([]);

  // Shift Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"single" | "multi-day" | "template">("single");
  const [modalDate, setModalDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [modalSelectedDays, setModalSelectedDays] = useState<string[]>([]);
  const [modalStartHour, setModalStartHour] = useState<number>(14);
  const [modalEndHour, setModalEndHour] = useState<number>(18);
  const [modalSelectedUserIds, setModalSelectedUserIds] = useState<string[]>([]);
  const [modalUserSearch, setModalUserSearch] = useState<string>("");
  const [modalRoleFilter, setModalRoleFilter] = useState<string>("ALL");
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);

  // Confirmation Modal State
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

  // Selected shifts for bulk deletion in My Shifts tab
  const [selectedMyShiftIds, setSelectedMyShiftIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Check supervisor access permission
  const isSupervisorRole = Boolean(
    user && ["ADMIN", "DOK", "TEACHER", "ORGANIZER", "MODERATOR"].includes(user.role)
  );
  const isAdminOrTeacher = Boolean(user && ["ADMIN", "TEACHER"].includes(user.role));

  // Initialize modal selected user IDs to current user
  useEffect(() => {
    if (user && modalSelectedUserIds.length === 0) {
      setModalSelectedUserIds([user.id]);
    }
  }, [user, modalSelectedUserIds.length]);

  // Fetch shifts for the selected week
  const fetchWeekShifts = useCallback(async (weekStart: Date) => {
    setIsCalendarLoading(true);
    try {
      const weekEnd = addDays(weekStart, 6);
      const startStr = format(weekStart, "yyyy-MM-dd");
      const endStr = format(weekEnd, "yyyy-MM-dd");

      const res = await apiFetch(`${API_URL}/supervisors/range?startDate=${startStr}&endDate=${endStr}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setShifts(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch shifts:", err);
      toast.error("Nem sikerült betölteni a heti beosztást.");
    } finally {
      setIsCalendarLoading(false);
    }
  }, []);

  // Fetch leaderboard stats
  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsStatsLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/supervisors/stats`);
      const data = await res.json();
      if (data.success && data.data) {
        setStatsData(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setIsStatsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch eligible supervisors for admin selector
  const fetchEligible = useCallback(async () => {
    if (!isAuthenticated || !isSupervisorRole) return;
    try {
      const res = await apiFetch(`${API_URL}/supervisors/eligible`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEligibleSupervisors(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch eligible supervisors:", err);
    }
  }, [isAuthenticated, isSupervisorRole]);

  useEffect(() => {
    if (isSupervisorRole) {
      fetchWeekShifts(currentWeekStart);
      fetchStats();
      fetchEligible();
    }
  }, [isSupervisorRole, currentWeekStart, fetchWeekShifts, fetchStats, fetchEligible]);

  // Week days array
  const weekDays = useMemo(() => {
    const days: { date: Date; dateStr: string; dayName: string; shortName: string }[] = [];
    const dayNames = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
    const shortNames = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

    for (let i = 0; i < 7; i++) {
      const d = addDays(currentWeekStart, i);
      days.push({
        date: d,
        dateStr: format(d, "yyyy-MM-dd"),
        dayName: dayNames[d.getDay()],
        shortName: shortNames[d.getDay()],
      });
    }
    return days;
  }, [currentWeekStart]);

  // Hours array (Standard: 12-20, Full: 8-22)
  const hoursRange = useMemo(() => {
    const start = showFullDayHours ? 8 : 12;
    const end = showFullDayHours ? 22 : 20;
    const list: number[] = [];
    for (let h = start; h <= end; h++) {
      list.push(h);
    }
    return list;
  }, [showFullDayHours]);

  // Timeline hours from 8 to 22
  const timelineHours = useMemo(() => {
    const list: number[] = [];
    for (let h = 8; h <= 22; h++) {
      list.push(h);
    }
    return list;
  }, []);

  // Helper map: dateStr_hour -> SupervisorShift[] (Multiple supervisors per slot supported!)
  const shiftsBySlotMap = useMemo(() => {
    const map = new Map<string, SupervisorShift[]>();
    shifts.forEach((shift) => {
      const dStr = format(new Date(shift.date), "yyyy-MM-dd");
      const key = `${dStr}_${shift.hour}`;
      const list = map.get(key) || [];
      list.push(shift);
      map.set(key, list);
    });
    return map;
  }, [shifts]);

  // Role Badge Helper
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "DOK":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            DÖK
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            ADMIN
          </span>
        );
      case "TEACHER":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            OKTATÓ
          </span>
        );
      case "ORGANIZER":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            SZERVEZŐ
          </span>
        );
      case "MODERATOR":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            MODERÁTOR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary text-muted-foreground border border-border">
            TAG
          </span>
        );
    }
  };

  // Quick 1-click assign self to an empty or existing slot
  const handleQuickAssign = async (dateStr: string, hour: number) => {
    if (!user) return;
    try {
      const res = await apiFetch(`${API_URL}/supervisors`, {
        method: "POST",
        body: JSON.stringify({
          date: dateStr,
          hour,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error?.message || "Hiba történt a rögzítéskor.");
      }
      toast.success(`Sikeresen elvállaltad a felügyeletet: ${dateStr} ${hour}:00`);
      fetchWeekShifts(currentWeekStart);
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Nem sikerült felvenni az ügyeletet.");
    }
  };

  // Open modal for a specific date and hour slot (pre-filling date and hour)
  const handleOpenSlotAssign = (dateStr: string, hour: number) => {
    setModalDate(dateStr);
    setModalStartHour(hour);
    setModalEndHour(Math.min(22, hour + 1));
    setModalMode("single");
    setIsCreateModalOpen(true);
  };

  // Delete shift
  const handleDeleteShift = (shift: SupervisorShift) => {
    setConfirmModal({
      isOpen: true,
      title: "Felügyelet lemondása",
      message: `Biztosan lemondod ${shift.user.displayName || shift.user.username} felügyeleti beosztását erre az időpontra: ${format(new Date(shift.date), "yyyy. MM. dd.")} ${shift.hour}:00?`,
      variant: "danger",
      confirmLabel: "Igen, lemondom",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`${API_URL}/supervisors/${shift.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || data.error?.message || "Törlési hiba");
          }
          toast.success("Ügyelet sikeresen törölve.");
          fetchWeekShifts(currentWeekStart);
          fetchStats();
        } catch (err: any) {
          toast.error(err.message || "Nem sikerült törölni az ügyeletet.");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handle shift create submission (Bulk / Range / Multi-user)
  const handleSaveShifts = async () => {
    if (modalStartHour >= modalEndHour) {
      toast.error("A kezdő órának korábbinak kell lennie, mint a záró órának!");
      return;
    }

    let datesToSend: string[] = [];
    if (modalMode === "single" || modalMode === "template") {
      if (!modalDate) {
        toast.error("Válassz ki egy dátumot!");
        return;
      }
      datesToSend = [modalDate];
    } else if (modalMode === "multi-day") {
      if (modalSelectedDays.length === 0) {
        toast.error("Válassz ki legalább egy napot!");
        return;
      }
      datesToSend = modalSelectedDays;
    }

    if (isAdminOrTeacher && modalSelectedUserIds.length === 0) {
      toast.error("Válassz ki legalább egy felelőst a listából!");
      return;
    }

    setIsSubmittingShift(true);
    try {
      const payload: any = {
        dates: datesToSend,
        startHour: modalStartHour,
        endHour: modalEndHour - 1, // End hour is exclusive in range
      };

      if (isAdminOrTeacher) {
        payload.targetUserIds = modalSelectedUserIds;
      } else if (user) {
        payload.targetUserIds = [user.id];
      }

      const res = await apiFetch(`${API_URL}/supervisors/bulk`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error?.message || "Hiba történt a mentéskor.");
      }

      if (data.createdCount > 0) {
        toast.success(`Sikeresen rögzítve: ${data.createdCount} ügyeleti óra!`);
      }

      if (data.conflicts && data.conflicts.length > 0) {
        const reasons = data.conflicts.map((c: any) => `${c.date} ${c.hour}:00 (${c.reason})`).join(", ");
        toast.warning(`Néhány időpont kihagyva: ${reasons}`);
      }

      setIsCreateModalOpen(false);
      fetchWeekShifts(currentWeekStart);
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Nem sikerült elmenteni a beosztást.");
    } finally {
      setIsSubmittingShift(false);
    }
  };

  // Toggle user selection in modal
  const toggleUserSelection = (userId: string) => {
    setModalSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Filtered eligible supervisors for modal
  const filteredEligibleSupervisors = useMemo(() => {
    return eligibleSupervisors.filter((s) => {
      const matchesRole = modalRoleFilter === "ALL" || s.role === modalRoleFilter;
      const q = modalUserSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.username.toLowerCase().includes(q) ||
        (s.displayName && s.displayName.toLowerCase().includes(q));
      return matchesRole && matchesSearch;
    });
  }, [eligibleSupervisors, modalRoleFilter, modalUserSearch]);

  // Apply Quick Template
  const handleApplyTemplate = (start: number, end: number, label: string) => {
    setModalStartHour(start);
    setModalEndHour(end);
    toast.info(`Sablon alkalmazva: ${label} (${start}:00 - ${end}:00)`);
  };

  // Handle bulk delete in My Shifts
  const handleBulkDeleteMyShifts = async () => {
    if (selectedMyShiftIds.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Kijelölt műszakok lemondása",
      message: `Biztosan lemondod a kijelölt ${selectedMyShiftIds.length} db ügyeleti időpontot?`,
      variant: "danger",
      confirmLabel: "Kijelöltek lemondása",
      onConfirm: async () => {
        setIsDeletingBulk(true);
        try {
          const res = await apiFetch(`${API_URL}/supervisors/bulk`, {
            method: "DELETE",
            body: JSON.stringify({ ids: selectedMyShiftIds }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || data.error?.message || "Törlési hiba");
          }
          toast.success(`${data.deletedCount} ügyelet sikeresen törölve.`);
          setSelectedMyShiftIds([]);
          fetchWeekShifts(currentWeekStart);
          fetchStats();
        } catch (err: any) {
          toast.error(err.message || "Hiba történt a törlés során.");
        } finally {
          setIsDeletingBulk(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // My Shifts list
  const myShiftsList = useMemo(() => {
    if (!user || !statsData) return [];
    const combined = new Map<string, SupervisorShift>();
    statsData.recentShifts.filter((s) => s.userId === user.id).forEach((s) => combined.set(s.id, s));
    shifts.filter((s) => s.userId === user.id).forEach((s) => combined.set(s.id, s));
    return Array.from(combined.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.hour - a.hour
    );
  }, [user, statsData, shifts]);

  // Leaderboard items filtered and sorted
  const sortedLeaderboard = useMemo(() => {
    if (!statsData?.leaderboard) return [];
    let list = [...statsData.leaderboard];

    // Filter by role
    if (leaderboardRoleFilter !== "ALL") {
      list = list.filter((item) => item.user.role === leaderboardRoleFilter);
    }

    // Filter by search query
    if (leaderboardSearch.trim()) {
      const q = leaderboardSearch.toLowerCase();
      list = list.filter(
        (item) =>
          item.user.username.toLowerCase().includes(q) ||
          (item.user.displayName && item.user.displayName.toLowerCase().includes(q))
      );
    }

    // Sort by selected period
    if (leaderboardFilterPeriod === "month") {
      list.sort((a, b) => b.monthHours - a.monthHours || b.totalHours - a.totalHours);
    } else if (leaderboardFilterPeriod === "week") {
      list.sort((a, b) => b.weekHours - a.weekHours || b.totalHours - a.totalHours);
    } else {
      list.sort((a, b) => b.totalHours - a.totalHours || b.monthHours - a.monthHours);
    }

    return list;
  }, [statsData, leaderboardFilterPeriod, leaderboardRoleFilter, leaderboardSearch]);

  // Current user's stats
  const currentUserStats = useMemo(() => {
    if (!user || !statsData?.leaderboard) return null;
    return statsData.leaderboard.find((s) => s.user.id === user.id) || null;
  }, [user, statsData]);

  // Access check guard
  if (!isAuthenticated || !isSupervisorRole) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-xl">
        <div className="tactical-card p-8 border-red-500/30 bg-red-950/10">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4 opacity-80" />
          <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-foreground mb-2">
            Hozzáférés Korlátozva
          </h2>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            Ez az oldal kizárólag a Diákönkormányzat (DÖK) tagjai, felügyelők, oktatók és adminisztrátorok számára
            érhető el az időbeosztás és teremügyelet kezelésére.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-mono text-xs uppercase tracking-wider border border-border transition-colors"
          >
            Vissza a főoldalra
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Tactical Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-card border border-border/80 rounded text-xs font-mono text-primary font-bold tracking-widest uppercase mb-2">
              <Zap size={13} className="text-primary animate-pulse" />
              <span>// OPERATÍV VEZÉRLÉS // DÖK & ADMINISZTRÁCIÓ</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold uppercase tracking-wide text-foreground">
              Időbeosztás & Ügyelet
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Heti és havi elérhetőség rögzítése, párhuzamos teremfelügyeleti műszakok kezelése és felelősségi statisztikák.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              <span>Új ügyelet rögzítése</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Quick Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="tactical-card p-4 bg-card/60 backdrop-blur-sm border-border/80">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="font-mono text-xs uppercase tracking-wider">Összes felügyelet</span>
              <Clock size={16} className="text-primary" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">
              {statsData?.totalAssignments ?? "..."} <span className="text-xs font-mono font-normal text-muted-foreground">óra</span>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground mt-1">
              Rögzített műszakok száma
            </div>
          </div>

          <div className="tactical-card p-4 bg-card/60 backdrop-blur-sm border-border/80">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="font-mono text-xs uppercase tracking-wider">Aktuális hónap</span>
              <CalendarCheck size={16} className="text-cyan-400" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">
              {statsData?.currentMonthTotal ?? "..."} <span className="text-xs font-mono font-normal text-muted-foreground">óra</span>
            </div>
            <div className="text-[11px] font-mono text-cyan-400/80 mt-1">
              Ebben a naptári hónapban
            </div>
          </div>

          <div className="tactical-card p-4 bg-card/60 backdrop-blur-sm border-border/80">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="font-mono text-xs uppercase tracking-wider">Aktuális hét</span>
              <CalendarDays size={16} className="text-emerald-400" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">
              {statsData?.currentWeekTotal ?? "..."} <span className="text-xs font-mono font-normal text-muted-foreground">óra</span>
            </div>
            <div className="text-[11px] font-mono text-emerald-400/80 mt-1">
              Hétfőtől vasárnapig
            </div>
          </div>

          <div className="tactical-card p-4 bg-card/60 backdrop-blur-sm border-primary/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
                Saját vállalt óráim
              </span>
              <UserCheck size={16} className="text-primary" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">
              {currentUserStats?.totalHours ?? 0} <span className="text-xs font-mono font-normal text-muted-foreground">óra</span>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground mt-1 flex items-center justify-between">
              <span>Havi: {currentUserStats?.monthHours ?? 0} ó</span>
              {user && getRoleBadge(user.role)}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "calendar"
              ? "border-primary text-primary font-bold bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <Calendar size={16} />
          <span>Heti Beosztás & Naptár</span>
        </button>

        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "leaderboard"
              ? "border-primary text-primary font-bold bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <Trophy size={16} />
          <span>Felelősségi Ranglista</span>
          {statsData?.leaderboard && statsData.leaderboard.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-secondary text-muted-foreground border border-border">
              {statsData.leaderboard.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("my-shifts")}
          className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "my-shifts"
              ? "border-primary text-primary font-bold bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <History size={16} />
          <span>Saját Műszakjaim</span>
          {currentUserStats?.upcomingHours ? (
            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              +{currentUserStats.upcomingHours}
            </span>
          ) : null}
        </button>
      </div>

      {/* TAB 1: WEEKLY CALENDAR & SHIFTS */}
      {activeTab === "calendar" && (
        <div className="space-y-6">
          {/* Week Controls Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 tactical-card p-4 bg-card/80">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentWeekStart((prev) => addDays(prev, -7))}
                className="p-2 rounded hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
                title="Előző hét"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="px-3 py-1.5 rounded font-mono text-xs uppercase tracking-wider border border-border hover:bg-secondary text-foreground transition-colors cursor-pointer"
              >
                Aktuális hét
              </button>

              <button
                onClick={() => setCurrentWeekStart((prev) => addDays(prev, 7))}
                className="p-2 rounded hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
                title="Következő hét"
              >
                <ChevronRight size={18} />
              </button>

              <div className="ml-3 font-display text-lg font-bold text-foreground flex items-center gap-2">
                <span>
                  {format(currentWeekStart, "yyyy. MMMM dd.")} – {format(addDays(currentWeekStart, 6), "MMMM dd.")}
                </span>
                {isCalendarLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showFullDayHours}
                  onChange={(e) => setShowFullDayHours(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>Teljes idősáv (08:00 - 22:00)</span>
              </label>

              <div className="h-4 w-px bg-border hidden sm:block" />

              <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                <span>Ügyeletes(ek) beosztva</span>
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-border inline-block ml-2" />
                <span>Szabad slot</span>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="tactical-card overflow-hidden bg-card/90">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="p-3 text-left font-mono text-xs uppercase tracking-wider text-muted-foreground w-20 border-r border-border">
                      Időpont
                    </th>
                    {weekDays.map((d) => {
                      const today = isToday(d.date);
                      const dayShiftsCount = shifts.filter((s) =>
                        isSameDay(new Date(s.date), d.date)
                      ).length;

                      return (
                        <th
                          key={d.dateStr}
                          className={`p-3 text-center border-r border-border last:border-r-0 ${
                            today ? "bg-primary/10 border-b-2 border-b-primary" : ""
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span
                              className={`font-display text-sm font-bold uppercase tracking-wider ${
                                today ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {d.dayName}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {format(d.date, "MM. dd.")}
                            </span>
                            <span
                              className={`mt-1 text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                dayShiftsCount > 0
                                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                  : "bg-secondary text-muted-foreground/60 border-border"
                              }`}
                            >
                              {dayShiftsCount} felügyelet
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {hoursRange.map((hour) => (
                    <tr key={hour} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="p-2.5 font-mono text-xs font-semibold text-muted-foreground border-r border-border bg-card/60 select-none text-center">
                        {hour}:00
                      </td>

                      {weekDays.map((d) => {
                        const key = `${d.dateStr}_${hour}`;
                        const slotShifts = shiftsBySlotMap.get(key) || [];
                        const isPast =
                          new Date(`${d.dateStr}T${String(hour).padStart(2, "0")}:00:00`).getTime() <
                          Date.now() - 5 * 60 * 1000;
                        const hasMyShift = Boolean(user && slotShifts.some((s) => s.userId === user.id));

                        return (
                          <td
                            key={d.dateStr}
                            className={`p-1.5 border-r border-border/50 last:border-r-0 align-top min-h-24 transition-colors ${
                              isToday(d.date) ? "bg-primary/5" : ""
                            }`}
                          >
                            {slotShifts.length > 0 ? (
                              <div className="space-y-1.5">
                                {slotShifts.map((shift) => {
                                  const isMyShift = Boolean(user && shift.userId === user.id);
                                  const canDelete = Boolean(isMyShift || isAdminOrTeacher);
                                  return (
                                    <div
                                      key={shift.id}
                                      className={`rounded-md p-1.5 border transition-all ${
                                        isMyShift
                                          ? "bg-cyan-950/40 border-cyan-500/50 hover:border-cyan-400"
                                          : "bg-secondary/80 border-border hover:border-border/90"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          {shift.user.avatarUrl ? (
                                            <img
                                              src={shift.user.avatarUrl}
                                              alt=""
                                              className="w-4 h-4 rounded-full object-cover shrink-0"
                                            />
                                          ) : (
                                            <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[8px] font-bold shrink-0">
                                              {(shift.user.displayName || shift.user.username)[0].toUpperCase()}
                                            </div>
                                          )}
                                          <div className="truncate">
                                            <div className="text-[11px] font-medium text-foreground truncate max-w-[85px]">
                                              {shift.user.displayName || shift.user.username}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          {getRoleBadge(shift.user.role)}
                                          {canDelete && (!isPast || isAdminOrTeacher) && (
                                            <button
                                              onClick={() => handleDeleteShift(shift)}
                                              className="text-muted-foreground hover:text-red-400 p-0.5 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                                              title="Ügyelet törlése"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Multi-supervisor action buttons */}
                                <div className="flex items-center justify-between pt-0.5 text-[9px] font-mono text-muted-foreground">
                                  <span>{slotShifts.length} fő</span>
                                  <div className="flex items-center gap-1.5">
                                    {!isPast && !hasMyShift && (
                                      <button
                                        onClick={() => handleQuickAssign(d.dateStr, hour)}
                                        className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer flex items-center gap-0.5"
                                        title="Csatlakozom felügyelőként ehhez az órához"
                                      >
                                        <Plus size={10} />
                                        <span>Csatlakozom</span>
                                      </button>
                                    )}
                                    {isAdminOrTeacher && (
                                      <button
                                        onClick={() => handleOpenSlotAssign(d.dateStr, hour)}
                                        className="text-primary hover:text-primary-hover hover:underline cursor-pointer flex items-center gap-0.5"
                                        title="További felügyelő hozzáadása erre az órára"
                                      >
                                        <Plus size={10} />
                                        <span>+ Hozzáadás</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full min-h-16 rounded-md border border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center group p-1 text-center">
                                {!isPast ? (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                                    <button
                                      onClick={() => handleQuickAssign(d.dateStr, hour)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-mono text-[10px] font-semibold cursor-pointer"
                                      title="Ügyelet elvállalása (Önmagam)"
                                    >
                                      <Plus size={11} />
                                      <span>Vállalom</span>
                                    </button>
                                    {isAdminOrTeacher && (
                                      <button
                                        onClick={() => handleOpenSlotAssign(d.dateStr, hour)}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground font-mono text-[9px] cursor-pointer border border-border"
                                        title="Más felhasználó kijelölése"
                                      >
                                        <span>Kijelölés</span>
                                      </button>
                                    )}
                                  </div>
                                ) : isAdminOrTeacher ? (
                                  <button
                                    onClick={() => handleOpenSlotAssign(d.dateStr, hour)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black font-mono text-[10px] font-semibold cursor-pointer border border-amber-500/30"
                                    title="Visszamenőleges ügyelet rögzítése"
                                  >
                                    <Plus size={11} />
                                    <span>Pótlás</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-mono text-muted-foreground/40 select-none">
                                    —
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DUTY LEADERBOARD & STATS */}
      {activeTab === "leaderboard" && (
        <div className="space-y-8">
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 tactical-card p-4 bg-card/80">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase text-muted-foreground mr-1 flex items-center gap-1.5">
                <span>Időszak:</span>
                {isStatsLoading && (
                  <span className="w-3 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block h-3" />
                )}
              </span>
              <button
                onClick={() => setLeaderboardFilterPeriod("total")}
                className={`px-3 py-1.5 rounded font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                  leaderboardFilterPeriod === "total"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                Összesített
              </button>
              <button
                onClick={() => setLeaderboardFilterPeriod("month")}
                className={`px-3 py-1.5 rounded font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                  leaderboardFilterPeriod === "month"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                E havi
              </button>
              <button
                onClick={() => setLeaderboardFilterPeriod("week")}
                className={`px-3 py-1.5 rounded font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                  leaderboardFilterPeriod === "week"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                E heti
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Role filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs uppercase text-muted-foreground">Szerepkör:</span>
                <select
                  value={leaderboardRoleFilter}
                  onChange={(e) => setLeaderboardRoleFilter(e.target.value)}
                  className="bg-secondary border border-border rounded px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="ALL">Mindegyik</option>
                  <option value="DOK">DÖK Tagok</option>
                  <option value="ADMIN">Adminisztrátorok</option>
                  <option value="TEACHER">Oktatók</option>
                </select>
              </div>

              {/* Search box */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Keresés név szerint..."
                  value={leaderboardSearch}
                  onChange={(e) => setLeaderboardSearch(e.target.value)}
                  className="w-full sm:w-56 pl-8 pr-3 py-1.5 bg-secondary border border-border rounded text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Top 3 Podium (If at least 2 supervisors) */}
          {sortedLeaderboard.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              {/* Silver - 2nd place */}
              {sortedLeaderboard[1] && (
                <div className="tactical-card p-6 bg-card border-slate-400/30 flex flex-col items-center text-center relative overflow-hidden order-2 md:order-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-400/10 text-slate-300 border border-slate-400/20 mb-3">
                    <Medal size={14} className="text-slate-300" />
                    <span>#2 EZÜST FELELŐS</span>
                  </div>
                  {sortedLeaderboard[1].user.avatarUrl ? (
                    <img
                      src={sortedLeaderboard[1].user.avatarUrl}
                      alt=""
                      className="w-16 h-16 rounded-full border-2 border-slate-400 object-cover mb-3"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-slate-400 bg-secondary flex items-center justify-center font-display text-xl font-bold text-slate-300 mb-3">
                      {(sortedLeaderboard[1].user.displayName || sortedLeaderboard[1].user.username)[0].toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {sortedLeaderboard[1].user.displayName || sortedLeaderboard[1].user.username}
                  </h3>
                  <div className="mt-1">{getRoleBadge(sortedLeaderboard[1].user.role)}</div>
                  <div className="mt-4 pt-3 border-t border-border/60 w-full flex justify-around">
                    <div>
                      <div className="font-display text-2xl font-bold text-slate-300">
                        {sortedLeaderboard[1].totalHours}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Összes óra</div>
                    </div>
                    <div>
                      <div className="font-display text-2xl font-bold text-foreground">
                        {sortedLeaderboard[1].monthHours}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">E havi óra</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gold - 1st place */}
              {sortedLeaderboard[0] && (
                <div className="tactical-card p-6 bg-card border-amber-500/50 flex flex-col items-center text-center relative overflow-hidden order-1 md:order-2 shadow-lg shadow-amber-500/5 md:-translate-y-2">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-3">
                    <Crown size={15} className="text-amber-400" />
                    <span>#1 ARANY FELELŐS</span>
                  </div>
                  {sortedLeaderboard[0].user.avatarUrl ? (
                    <img
                      src={sortedLeaderboard[0].user.avatarUrl}
                      alt=""
                      className="w-20 h-20 rounded-full border-2 border-amber-400 object-cover mb-3 ring-4 ring-amber-500/10"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-amber-400 bg-amber-500/10 flex items-center justify-center font-display text-2xl font-bold text-amber-400 mb-3 ring-4 ring-amber-500/10">
                      {(sortedLeaderboard[0].user.displayName || sortedLeaderboard[0].user.username)[0].toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-display text-xl font-extrabold text-foreground">
                    {sortedLeaderboard[0].user.displayName || sortedLeaderboard[0].user.username}
                  </h3>
                  <div className="mt-1">{getRoleBadge(sortedLeaderboard[0].user.role)}</div>
                  <div className="mt-4 pt-3 border-t border-border/60 w-full flex justify-around">
                    <div>
                      <div className="font-display text-3xl font-extrabold text-amber-400">
                        {sortedLeaderboard[0].totalHours}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Összes óra</div>
                    </div>
                    <div>
                      <div className="font-display text-3xl font-extrabold text-foreground">
                        {sortedLeaderboard[0].monthHours}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">E havi óra</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bronze - 3rd place */}
              {sortedLeaderboard[2] && (
                <div className="tactical-card p-6 bg-card border-orange-500/30 flex flex-col items-center text-center relative overflow-hidden order-3">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-3">
                    <Medal size={14} className="text-orange-400" />
                    <span>#3 BRONZ FELELŐS</span>
                  </div>
                  {sortedLeaderboard[2].user.avatarUrl ? (
                    <img
                      src={sortedLeaderboard[2].user.avatarUrl}
                      alt=""
                      className="w-16 h-16 rounded-full border-2 border-orange-500 object-cover mb-3"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-orange-500 bg-secondary flex items-center justify-center font-display text-xl font-bold text-orange-400 mb-3">
                      {(sortedLeaderboard[2].user.displayName || sortedLeaderboard[2].user.username)[0].toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {sortedLeaderboard[2].user.displayName || sortedLeaderboard[2].user.username}
                  </h3>
                  <div className="mt-1">{getRoleBadge(sortedLeaderboard[2].user.role)}</div>
                  <div className="mt-4 pt-3 border-t border-border/60 w-full flex justify-around">
                    <div>
                      <div className="font-display text-2xl font-bold text-orange-400">
                        {sortedLeaderboard[2].totalHours}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Összes óra</div>
                    </div>
                    <div>
                      <div className="font-display text-2xl font-bold text-foreground">
                        {sortedLeaderboard[2].monthHours}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">E havi óra</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="tactical-card overflow-hidden bg-card/90">
            <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
              <div className="font-display text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Award size={18} className="text-primary" />
                <span>Részletes Felelősségi Rangsor</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                Összes felelős: {sortedLeaderboard.length} fő
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/20 text-muted-foreground text-xs font-mono uppercase tracking-wider">
                    <th className="p-3 w-14 text-center">Rang</th>
                    <th className="p-3">Felelős Tag</th>
                    <th className="p-3 text-center">Összes óra</th>
                    <th className="p-3 text-center">E havi óra</th>
                    <th className="p-3 text-center">E heti óra</th>
                    <th className="p-3 text-center">Közelgő</th>
                    <th className="p-3 text-right">Legutóbbi ügyelet</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/60">
                  {sortedLeaderboard.map((item, index) => {
                    const isCurrentUser = Boolean(user && item.user.id === user.id);
                    return (
                      <tr
                        key={item.user.id}
                        className={`hover:bg-secondary/40 transition-colors ${
                          isCurrentUser ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="p-3 text-center font-mono text-sm font-bold">
                          {index === 0 && <span className="text-amber-400">#1</span>}
                          {index === 1 && <span className="text-slate-300">#2</span>}
                          {index === 2 && <span className="text-orange-400">#3</span>}
                          {index > 2 && <span className="text-muted-foreground">#{index + 1}</span>}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {item.user.avatarUrl ? (
                              <img
                                src={item.user.avatarUrl}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-mono text-xs font-bold text-foreground shrink-0 border border-border">
                                {(item.user.displayName || item.user.username)[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-sm text-foreground flex items-center gap-2">
                                <span>{item.user.displayName || item.user.username}</span>
                                {isCurrentUser && (
                                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-primary/20 text-primary">
                                    Te
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-mono text-muted-foreground">
                                  @{item.user.username}
                                </span>
                                {getRoleBadge(item.user.role)}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                            {item.totalHours} óra
                          </span>
                        </td>

                        <td className="p-3 text-center font-mono text-sm text-foreground">
                          {item.monthHours}
                        </td>

                        <td className="p-3 text-center font-mono text-sm text-foreground">
                          {item.weekHours}
                        </td>

                        <td className="p-3 text-center">
                          {item.upcomingHours > 0 ? (
                            <span className="font-mono text-xs text-cyan-400 font-semibold">
                              +{item.upcomingHours}
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground/60">—</span>
                          )}
                        </td>

                        <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                          {item.lastShift ? (
                            <span>
                              {format(new Date(item.lastShift.date), "yyyy. MM. dd.")} {item.lastShift.hour}:00
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">Még nem volt</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY SHIFTS */}
      {activeTab === "my-shifts" && (
        <div className="space-y-6">
          <div className="tactical-card p-4 bg-card/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">
                Saját Ügyeleti Időbeosztásom
              </h3>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                Összes általad rögzített és elvállalt felügyeleti időpont áttekintése és kezelése.
              </p>
            </div>

            {selectedMyShiftIds.length > 0 && (
              <button
                onClick={handleBulkDeleteMyShifts}
                disabled={isDeletingBulk}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Kijelöltek lemondása ({selectedMyShiftIds.length})</span>
              </button>
            )}
          </div>

          {myShiftsList.length === 0 ? (
            <div className="tactical-card p-12 text-center bg-card/40 border-dashed">
              <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <h4 className="font-display text-base font-bold text-foreground">Nincsenek rögzített műszakaid</h4>
              <p className="text-xs font-mono text-muted-foreground mt-1 max-w-md mx-auto">
                Még nem vettél fel felelős ügyeleti időpontot a héten vagy hónapban.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs uppercase tracking-wider transition-colors"
              >
                <Plus size={15} />
                <span>Ügyelet felvétele most</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myShiftsList.map((shift) => {
                const shiftDateTime = new Date(`${format(new Date(shift.date), "yyyy-MM-dd")}T${String(shift.hour).padStart(2, "0")}:00:00`);
                const isPast = shiftDateTime.getTime() < Date.now();
                const isSelected = selectedMyShiftIds.includes(shift.id);

                return (
                  <div
                    key={shift.id}
                    className={`tactical-card p-4 transition-all flex flex-col justify-between ${
                      isPast
                        ? "bg-card/40 border-border/60 opacity-80"
                        : "bg-card border-cyan-500/30 hover:border-cyan-500/60 shadow-md shadow-cyan-500/5"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        {!isPast && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMyShiftIds((prev) => [...prev, shift.id]);
                                } else {
                                  setSelectedMyShiftIds((prev) => prev.filter((id) => id !== shift.id));
                                }
                              }}
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="font-mono text-xs text-muted-foreground">Kijelölés</span>
                          </label>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isPast
                              ? "bg-secondary text-muted-foreground border border-border"
                              : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          }`}
                        >
                          {isPast ? "Teljesítve" : "Közelgő műszak"}
                        </span>
                      </div>

                      <div className="font-display text-lg font-bold text-foreground">
                        {format(new Date(shift.date), "yyyy. MMMM dd.")}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-sm font-mono text-cyan-400">
                        <Clock size={15} />
                        <span>
                          {shift.hour}:00 - {shift.hour + 1}:00 (1 óra)
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Felelős: {user?.displayName || user?.username}
                      </span>

                      {!isPast && (
                        <button
                          onClick={() => handleDeleteShift(shift)}
                          className="text-xs font-mono text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          Lemondás
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODERN SHIFT CREATION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/85 backdrop-blur-md overflow-y-auto">
          <div className="tactical-card w-full max-w-2xl bg-card border-border p-5 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <CalendarPlus size={20} />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">
                    Ügyeleti Műszak Rögzítése
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    Időbeosztás, több felügyelő kijelölése és párhuzamos műszakok
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-secondary/50 rounded-lg border border-border mb-5">
              <button
                type="button"
                onClick={() => setModalMode("single")}
                className={`py-2 px-3 rounded-md font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  modalMode === "single"
                    ? "bg-primary text-primary-foreground font-bold shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Egyedi nap
              </button>
              <button
                type="button"
                onClick={() => setModalMode("multi-day")}
                className={`py-2 px-3 rounded-md font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  modalMode === "multi-day"
                    ? "bg-primary text-primary-foreground font-bold shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Több nap / Hét
              </button>
              <button
                type="button"
                onClick={() => setModalMode("template")}
                className={`py-2 px-3 rounded-md font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  modalMode === "template"
                    ? "bg-primary text-primary-foreground font-bold shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Gyors sablonok
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="space-y-5 max-h-[68vh] overflow-y-auto pr-1">
              {/* SECTION 1: FELELŐSÖK KIJELÖLÉSE (Multi-select user picker) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
                    <Users size={14} className="text-primary" />
                    <span>Felelős(ök) kiválasztása:</span>
                    <span className="text-primary font-bold">
                      ({modalSelectedUserIds.length} kiválasztva)
                    </span>
                  </label>

                  {isAdminOrTeacher && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => user && setModalSelectedUserIds([user.id])}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-colors"
                      >
                        Csak én
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setModalSelectedUserIds(filteredEligibleSupervisors.map((s) => s.id))
                        }
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-colors"
                      >
                        Mind
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalSelectedUserIds([])}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-colors"
                      >
                        Törlés
                      </button>
                    </div>
                  )}
                </div>

                {isAdminOrTeacher ? (
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2.5">
                    {/* Search and Role Filter */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="relative flex-1">
                        <Search
                          size={13}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                          type="text"
                          placeholder="Keresés felügyelő neve szerint..."
                          value={modalUserSearch}
                          onChange={(e) => setModalUserSearch(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 bg-secondary border border-border rounded text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        {["ALL", "DOK", "ADMIN", "TEACHER"].map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setModalRoleFilter(role)}
                            className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-colors cursor-pointer ${
                              modalRoleFilter === role
                                ? "bg-primary text-primary-foreground font-bold"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {role === "ALL" ? "Mind" : role}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Multi-Select User Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      {filteredEligibleSupervisors.map((s) => {
                        const isSelected = modalSelectedUserIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleUserSelection(s.id)}
                            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
                              isSelected
                                ? "bg-primary/15 border-primary shadow-sm shadow-primary/20"
                                : "bg-secondary/50 border-border hover:bg-secondary/80 hover:border-border/80"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {s.avatarUrl ? (
                                <img
                                  src={s.avatarUrl}
                                  alt=""
                                  className="w-6 h-6 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-secondary text-foreground flex items-center justify-center font-mono text-[10px] font-bold border border-border shrink-0">
                                  {(s.displayName || s.username)[0].toUpperCase()}
                                </div>
                              )}
                              <div className="truncate">
                                <div className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                                  <span>{s.displayName || s.username}</span>
                                  {s.id === user?.id && (
                                    <span className="text-[9px] font-mono text-primary font-bold">
                                      (Te)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  @{s.username}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {getRoleBadge(s.role)}
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-border bg-card"
                                }`}
                              >
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-secondary/40 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-xs font-bold">
                          {(user?.displayName || user?.username || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {user?.displayName || user?.username} (Önmagad)
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          @{user?.username}
                        </div>
                      </div>
                    </div>
                    {user && getRoleBadge(user.role)}
                  </div>
                )}
              </div>

              {/* SECTION 2: DÁTUM VÁLASZTÁS */}
              {(modalMode === "single" || modalMode === "template") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                      <Calendar size={14} className="text-primary" />
                      <span>Dátum kiválasztása:</span>
                    </label>

                    {/* Quick Day Chips */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setModalDate(format(new Date(), "yyyy-MM-dd"))}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-colors"
                      >
                        Ma
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDate(format(addDays(new Date(), 1), "yyyy-MM-dd"))}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-colors"
                      >
                        Holnap
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDate(format(addDays(new Date(), 2), "yyyy-MM-dd"))}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-colors"
                      >
                        +2 nap
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="date"
                      value={modalDate}
                      min={isAdminOrTeacher ? undefined : format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => setModalDate(e.target.value)}
                      className="w-full bg-secondary/80 border border-border rounded-lg px-3.5 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    />
                  </div>

                  {isAdminOrTeacher &&
                    modalDate &&
                    new Date(`${modalDate}T23:59:59`).getTime() < Date.now() && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs">
                        <History size={14} className="shrink-0" />
                        <span>Visszamenőleges ügyelet rögzítése (Adminisztrátori jogosultság)</span>
                      </div>
                    )}
                </div>
              )}

              {/* Multi-day date picker */}
              {modalMode === "multi-day" && (
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-primary" />
                    <span>Napok kiválasztása erre a hétre ({format(currentWeekStart, "MM. dd.")} – {format(addDays(currentWeekStart, 6), "MM. dd.")}):</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {weekDays.map((d) => {
                      const isSelected = modalSelectedDays.includes(d.dateStr);
                      return (
                        <button
                          key={d.dateStr}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setModalSelectedDays((prev) => prev.filter((item) => item !== d.dateStr));
                            } else {
                              setModalSelectedDays((prev) => [...prev, d.dateStr]);
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                            isSelected
                              ? "bg-primary/20 border-primary text-primary font-bold shadow-sm"
                              : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <div className="font-display text-sm">{d.dayName}</div>
                          <div className="font-mono text-[11px] mt-0.5">{format(d.date, "MM. dd.")}</div>
                          <div className="mt-1.5">
                            {isSelected ? (
                              <CheckSquare size={14} className="text-primary" />
                            ) : (
                              <Square size={14} className="text-muted-foreground/40" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Template Presets */}
              {modalMode === "template" && (
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <Zap size={14} className="text-primary" />
                    <span>Gyakori Műszaksablonok:</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(14, 18, "Délutáni")}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        modalStartHour === 14 && modalEndHour === 18
                          ? "bg-primary/20 border-primary shadow-sm"
                          : "border-border hover:border-primary/50 bg-secondary/50 hover:bg-secondary/80"
                      }`}
                    >
                      <div className="text-xs font-bold text-foreground">Délutáni műszak</div>
                      <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                        14:00 - 18:00 (4 óra)
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(16, 20, "Záró")}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        modalStartHour === 16 && modalEndHour === 20
                          ? "bg-primary/20 border-primary shadow-sm"
                          : "border-border hover:border-primary/50 bg-secondary/50 hover:bg-secondary/80"
                      }`}
                    >
                      <div className="text-xs font-bold text-foreground">Záró műszak</div>
                      <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                        16:00 - 20:00 (4 óra)
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(12, 16, "Kora délutáni")}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        modalStartHour === 12 && modalEndHour === 16
                          ? "bg-primary/20 border-primary shadow-sm"
                          : "border-border hover:border-primary/50 bg-secondary/50 hover:bg-secondary/80"
                      }`}
                    >
                      <div className="text-xs font-bold text-foreground">Kora délutáni</div>
                      <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                        12:00 - 16:00 (4 óra)
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 3: INTERAKTÍV IDŐSÁV & ÓRÁK (Modern Stepper & Timeline - NO <select>) */}
              <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <Clock size={14} className="text-primary" />
                    <span>Ügyeleti Idősáv Beállítása:</span>
                  </label>

                  {/* Duration Presets */}
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <span className="text-muted-foreground mr-1">Hossz:</span>
                    {[1, 2, 3, 4].map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => setModalEndHour(Math.min(22, modalStartHour + hours))}
                        className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          modalEndHour - modalStartHour === hours
                            ? "bg-primary text-primary-foreground font-bold border-primary"
                            : "bg-secondary text-muted-foreground hover:text-foreground border-border"
                        }`}
                      >
                        +{hours}ó
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dual Stepper Controls (Start & End) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Start Hour Stepper */}
                  <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        Kezdés ideje
                      </div>
                      <div className="font-display text-xl font-bold text-foreground mt-0.5">
                        {modalStartHour}:00
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={modalStartHour <= 8}
                        onClick={() => setModalStartHour((prev) => Math.max(8, prev - 1))}
                        className="w-8 h-8 rounded-md bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center border border-border disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={modalStartHour >= modalEndHour - 1}
                        onClick={() =>
                          setModalStartHour((prev) => Math.min(modalEndHour - 1, prev + 1))
                        }
                        className="w-8 h-8 rounded-md bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center border border-border disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* End Hour Stepper */}
                  <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        Befejezés ideje
                      </div>
                      <div className="font-display text-xl font-bold text-cyan-400 mt-0.5">
                        {modalEndHour}:00
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={modalEndHour <= modalStartHour + 1}
                        onClick={() =>
                          setModalEndHour((prev) => Math.max(modalStartHour + 1, prev - 1))
                        }
                        className="w-8 h-8 rounded-md bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center border border-border disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={modalEndHour >= 22}
                        onClick={() => setModalEndHour((prev) => Math.min(22, prev + 1))}
                        className="w-8 h-8 rounded-md bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center border border-border disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Interactive Visual Timeline Strip */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground flex items-center justify-between">
                    <span>Időtengely (08:00 - 22:00)</span>
                    <span className="text-primary font-bold">
                      {modalEndHour - modalStartHour} óra időtartam
                    </span>
                  </div>

                  <div className="grid grid-cols-8 sm:grid-cols-15 gap-1">
                    {timelineHours.map((h) => {
                      const isInRange = h >= modalStartHour && h < modalEndHour;
                      const isStart = h === modalStartHour;
                      const isLast = h === modalEndHour - 1;

                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => {
                            if (h < modalStartHour) {
                              setModalStartHour(h);
                            } else if (h >= modalStartHour) {
                              setModalEndHour(h + 1);
                            }
                          }}
                          className={`py-1.5 rounded text-center font-mono text-[11px] transition-all cursor-pointer ${
                            isInRange
                              ? "bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/30"
                              : "bg-card hover:bg-secondary text-muted-foreground border border-border/80"
                          } ${isStart ? "rounded-l-lg border-l-2 border-l-cyan-300" : ""} ${
                            isLast ? "rounded-r-lg border-r-2 border-r-cyan-300" : ""
                          }`}
                          title={`${h}:00 - ${h + 1}:00`}
                        >
                          {h}h
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 4: LIVE SUMMARY TACTICAL PILL */}
              <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-primary shrink-0" />
                  <span className="text-foreground">
                    <span className="font-bold text-primary">{modalSelectedUserIds.length} fő</span> felügyelő kijelölve:{" "}
                    <span className="font-bold text-foreground">
                      {modalStartHour}:00 – {modalEndHour}:00
                    </span>{" "}
                    ({modalEndHour - modalStartHour} óra / nap)
                  </span>
                </div>
                <div className="text-primary font-bold whitespace-nowrap">
                  = {modalSelectedUserIds.length * (modalEndHour - modalStartHour)} ügyeleti óra
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-mono text-xs uppercase tracking-wider border border-border transition-colors cursor-pointer"
              >
                Mégse
              </button>

              <button
                type="button"
                onClick={handleSaveShifts}
                disabled={
                  isSubmittingShift ||
                  modalStartHour >= modalEndHour ||
                  (isAdminOrTeacher && modalSelectedUserIds.length === 0)
                }
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs uppercase font-mono tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-primary/20"
              >
                {isSubmittingShift ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Rögzítés folyamatban...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Beosztás Mentése</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        variant={confirmModal.variant}
        confirmLabel={confirmModal.confirmLabel}
      />
    </div>
  );
}
