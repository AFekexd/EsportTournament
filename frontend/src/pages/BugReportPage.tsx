import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
    Bug,
    Send,
    Lock,
    AlertTriangle,
    Globe,
    Trophy,
    Calendar,
    Users,
    HelpCircle,
    ArrowUp,
    ArrowRight,
    ArrowDown,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    ImageIcon,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { API_URL } from "../config";
import { apiFetch } from "../lib/api-client";
import { ImageUpload } from "../components/common/ImageUpload";

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
}

const categories = [
    { value: "WEBSITE", label: "Weboldal", icon: <Globe size={20} /> },
    { value: "TOURNAMENT", label: "Verseny", icon: <Trophy size={20} /> },
    { value: "BOOKING", label: "Foglalás", icon: <Calendar size={20} /> },
    { value: "TEAM", label: "Csapat", icon: <Users size={20} /> },
    { value: "OTHER", label: "Egyéb", icon: <HelpCircle size={20} /> },
];

const priorities = [
    { value: "LOW", label: "Alacsony", icon: <ArrowDown size={16} />, color: "text-green-400" },
    { value: "MEDIUM", label: "Közepes", icon: <ArrowRight size={16} />, color: "text-yellow-400" },
    { value: "HIGH", label: "Magas", icon: <ArrowUp size={16} />, color: "text-red-400" },
];

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    PENDING: { label: "Függőben", icon: <Clock size={16} />, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    IN_PROGRESS: { label: "Folyamatban", icon: <Loader2 size={16} className="animate-spin" />, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    RESOLVED: { label: "Megoldva", icon: <CheckCircle size={16} />, color: "text-green-400 bg-green-400/10 border-green-400/20" },
    CLOSED: { label: "Lezárva", icon: <XCircle size={16} />, color: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
};

export function BugReportPage() {
    const { isAuthenticated } = useAuth();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("WEBSITE");
    const [priority, setPriority] = useState("MEDIUM");
    const [imageUrl, setImageUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [myReports, setMyReports] = useState<BugReport[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            fetchMyReports();
        }
    }, [isAuthenticated]);

    const fetchMyReports = async () => {
        try {
            const res = await apiFetch(`${API_URL}/bug-reports`);
            const data = await res.json();
            if (data.success) {
                setMyReports(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch bug reports:", error);
        } finally {
            setIsLoadingReports(false);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error("Kérlek add meg a hiba címét!");
            return;
        }
        if (!description.trim()) {
            toast.error("Kérlek írd le a hibát részletesen!");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await apiFetch(`${API_URL}/bug-reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    category,
                    priority,
                    imageUrl: imageUrl || undefined,
                }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Hibajelentés sikeresen elküldve!");
                setTitle("");
                setDescription("");
                setCategory("WEBSITE");
                setPriority("MEDIUM");
                setImageUrl("");
                fetchMyReports();
            } else {
                toast.error(data.message || "Hiba történt a küldés során");
            }
        } catch (error: any) {
            console.error("Failed to submit bug report:", error);
            toast.error(error.message || "Hiba történt a küldés során");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center justify-center py-20 glass-card rounded-2xl">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 neon-border">
                        <Lock size={40} className="text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 text-glow">
                        Nem vagy bejelentkezve
                    </h3>
                    <p className="text-gray-400">
                        Jelentkezz be a hibajelentés beküldéséhez.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 page">
            {/* Modern Header with Gradient */}
            <div className="mb-16 text-center relative animate-fade-in">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/20 blur-[100px] rounded-full -z-10" />
                <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-red-300 to-red-500 bg-clip-text text-transparent mb-6 text-glow">
                    Hibajelentés
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Találtál hibát? Segíts nekünk jobbá tenni a platformot!
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {/* Bug Report Form */}
                <div
                    className="glass-card rounded-2xl p-8 hover:scale-[1.01] transition-transform animate-slide-up"
                    style={{ animationDelay: "0.1s" }}
                >
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                            <Bug size={24} className="text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Új Hibajelentés</h2>
                            <p className="text-sm text-gray-400">Írd le részletesen a hibát</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <label
                                htmlFor="title"
                                className="text-sm font-medium text-gray-300 ml-1"
                            >
                                Hiba címe *
                            </label>
                            <input
                                id="title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                className="w-full px-5 py-4 bg-[#0a0a0f]/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                                placeholder="pl. A profilkép nem töltődik be"
                            />
                            <div className="text-xs text-gray-500 text-right mr-1">
                                {title.length}/100
                            </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">
                                Kategória *
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setCategory(cat.value)}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${category === cat.value
                                            ? "bg-red-500/20 border-red-500/50 text-red-400"
                                            : "bg-[#0a0a0f]/50 border-white/10 text-gray-400 hover:border-white/20"
                                            }`}
                                    >
                                        {cat.icon}
                                        <span className="text-sm font-medium">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">
                                Prioritás
                            </label>
                            <div className="flex gap-2">
                                {priorities.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setPriority(p.value)}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${priority === p.value
                                            ? `bg-white/5 border-white/20 ${p.color}`
                                            : "bg-[#0a0a0f]/50 border-white/10 text-gray-500 hover:border-white/20"
                                            }`}
                                    >
                                        {p.icon}
                                        <span className="text-sm font-medium">{p.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label
                                htmlFor="description"
                                className="text-sm font-medium text-gray-300 ml-1"
                            >
                                Részletes leírás *
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                                maxLength={2000}
                                className="w-full px-5 py-4 bg-[#0a0a0f]/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all resize-none"
                                placeholder="Írd le részletesen, mit tapasztaltál, milyen lépések után jelentkezett a hiba..."
                            />
                            <div className="text-xs text-gray-500 text-right mr-1">
                                {description.length}/2000
                            </div>
                        </div>

                        {/* Screenshot */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                                <ImageIcon size={16} />
                                Képernyőkép (opcionális)
                            </label>
                            <ImageUpload
                                value={imageUrl}
                                onChange={setImageUrl}
                                label=""
                                placeholder="Húzd ide a képet vagy kattints a feltöltéshez"
                                maxSizeMB={5}
                                className="w-full"
                                aspect="video"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all bg-gradient-to-r from-red-500 to-orange-500 hover:brightness-110 text-white shadow-lg shadow-red-500/25 transform hover:-translate-y-1 disabled:opacity-75 disabled:cursor-wait"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Küldés...
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    Hibajelentés Küldése
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* My Reports */}
                <div
                    className="glass-card rounded-2xl p-8 animate-slide-up"
                    style={{ animationDelay: "0.2s" }}
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-primary/10 rounded-xl neon-border">
                            <AlertTriangle size={24} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Korábbi Bejelentéseim</h2>
                            <p className="text-sm text-gray-400">
                                {myReports.length} bejelentés
                            </p>
                        </div>
                    </div>

                    {isLoadingReports ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={32} className="animate-spin text-primary" />
                        </div>
                    ) : myReports.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bug size={32} className="text-gray-600" />
                            </div>
                            <p className="text-gray-400">Még nincs bejelentésed</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {myReports.map((report) => {
                                const status = statusConfig[report.status] || statusConfig.PENDING;
                                const priorityConfig = priorities.find((p) => p.value === report.priority);
                                return (
                                    <div
                                        key={report.id}
                                        className="p-4 bg-[#0a0a0f]/50 border border-white/5 rounded-xl hover:border-white/10 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h3 className="font-medium text-white line-clamp-1">
                                                {report.title}
                                            </h3>
                                            <span
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${status.color}`}
                                            >
                                                {status.icon}
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                                            {report.description}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                            <span className="flex items-center gap-1">
                                                {categories.find((c) => c.value === report.category)?.icon}
                                                {categories.find((c) => c.value === report.category)?.label}
                                            </span>
                                            {priorityConfig && (
                                                <span className={`flex items-center gap-1 ${priorityConfig.color}`}>
                                                    {priorityConfig.icon}
                                                    {priorityConfig.label}
                                                </span>
                                            )}
                                            <span className="ml-auto">
                                                {new Date(report.createdAt).toLocaleDateString("hu-HU")}
                                            </span>
                                        </div>
                                        {report.adminNote && (
                                            <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                                <p className="text-xs text-gray-400 mb-1">Admin válasz:</p>
                                                <p className="text-sm text-gray-300">{report.adminNote}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
