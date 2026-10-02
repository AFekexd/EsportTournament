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
    IN_PROGRESS: { label: "Folyamatban", icon: <Loader2 size={16} className="animate-spin" />, color: "text-primary bg-primary/20 border-primary/20" },
    RESOLVED: { label: "Megoldva", icon: <CheckCircle size={16} />, color: "text-green-400 bg-green-400/10 border-green-400/20" },
    CLOSED: { label: "Lezárva", icon: <XCircle size={16} />, color: "text-muted-foreground bg-gray-400/10 border-gray-400/20" },
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
            const res = await apiFetch(`${API_URL}/bug-reports?mine=true`);
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
            <div className="flex flex-col items-center justify-center py-20 tactical-card text-center my-8">
                <div className="w-16 h-16 bg-secondary rounded border border-border flex items-center justify-center mb-4 text-muted-foreground">
                    <Lock size={32} />
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-wider text-foreground mb-2">
                    Nem vagy bejelentkezve
                </h3>
                <p className="text-muted-foreground text-sm font-mono">
                    Jelentkezz be a hibajelentés beküldéséhez.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-16">
            {/* Tactical Header */}
            <div className="flex flex-col gap-3 border-b border-border/60 pb-6">
                <div className="inline-flex w-fit items-center gap-2 rounded border border-border bg-secondary/80 px-3 py-1 font-mono text-xs uppercase tracking-wider text-red-400">
                    <Bug className="h-3.5 w-3.5" />
                    <span>HIBAJELENTÉSI KÖZPONT // BUG TRACKER</span>
                </div>
                <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-foreground">
                    HIBA<span className="text-red-500">JELENTÉS</span>
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl">
                    Találtál valamilyen rendellenességet vagy hibát? Segíts nekünk fejleszteni az esport platformot!
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bug Report Form */}
                <div className="tactical-card p-6 sm:p-8">
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-border">
                        <div className="p-2.5 bg-secondary rounded border border-border text-red-400">
                            <Bug size={20} />
                        </div>
                        <div>
                            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">Új Hibajelentés</h2>
                            <p className="text-xs text-muted-foreground">Írd le a tapasztalt rendellenességet</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="title"
                                className="text-xs font-mono uppercase tracking-wider text-muted-foreground ml-1"
                            >
                                Hiba címe *
                            </label>
                            <input
                                id="title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                className="w-full px-4 py-2.5 bg-secondary/40 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 text-sm"
                                placeholder="pl. A profilkép nem töltődik be"
                            />
                            <div className="text-xs font-mono text-muted-foreground text-right mr-1">
                                {title.length}/100
                            </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground ml-1">
                                Kategória *
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setCategory(cat.value)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded border transition-all text-xs font-mono uppercase ${category === cat.value
                                            ? "bg-red-500/15 border-red-500/50 text-red-400"
                                            : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                            }`}
                                    >
                                        {cat.icon}
                                        <span>{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Priority */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground ml-1">
                                Prioritás
                            </label>
                            <div className="flex gap-2">
                                {priorities.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setPriority(p.value)}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded border transition-all text-xs font-mono uppercase ${priority === p.value
                                            ? `bg-secondary border-border ${p.color}`
                                            : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                            }`}
                                    >
                                        {p.icon}
                                        <span>{p.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="description"
                                className="text-xs font-mono uppercase tracking-wider text-muted-foreground ml-1"
                            >
                                Részletes leírás *
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                                maxLength={2000}
                                className="w-full px-4 py-2.5 bg-secondary/40 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 text-sm resize-none"
                                placeholder="Írd le részletesen, mit tapasztaltál, milyen lépések után jelentkezett a hiba..."
                            />
                            <div className="text-xs font-mono text-muted-foreground text-right mr-1">
                                {description.length}/2000
                            </div>
                        </div>

                        {/* Screenshot */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-1.5">
                                <ImageIcon size={14} />
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
                                skipCrop={true}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded bg-red-600 hover:bg-red-500 text-foreground font-display font-bold uppercase tracking-wider text-base transition-all shadow-lg shadow-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Küldés...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Hibajelentés Küldése
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* My Reports */}
                <div className="tactical-card p-6 sm:p-8">
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-border">
                        <div className="p-2.5 bg-secondary rounded border border-border text-primary">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">Korábbi Bejelentéseim</h2>
                            <p className="text-xs font-mono text-muted-foreground">
                                {myReports.length} BEJEGYZÉS
                            </p>
                        </div>
                    </div>

                    {isLoadingReports ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 size={28} className="animate-spin text-primary" />
                        </div>
                    ) : myReports.length === 0 ? (
                        <div className="text-center py-16 bg-secondary/20 rounded border border-dashed border-border">
                            <div className="w-12 h-12 bg-secondary rounded border border-border flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                                <Bug size={24} />
                            </div>
                            <p className="text-muted-foreground text-sm font-mono">Még nincs beküldött hibajelentésed</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {myReports.map((report) => {
                                const status = statusConfig[report.status] || statusConfig.PENDING;
                                const priorityConfig = priorities.find((p) => p.value === report.priority);
                                return (
                                    <div
                                        key={report.id}
                                        className="p-4 bg-secondary/30 border border-border rounded hover:border-primary/40 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h3 className="font-bold text-foreground line-clamp-1 text-sm">
                                                {report.title}
                                            </h3>
                                            <span
                                                className={`tactical-badge flex items-center gap-1.5 ${status.color}`}
                                            >
                                                {status.icon}
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                                            {report.description}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
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
                                            <div className="mt-3 p-3 bg-secondary/50 border border-border rounded">
                                                <p className="text-xs font-mono uppercase text-primary mb-1">Admin Válasz:</p>
                                                <p className="text-xs text-secondary-foreground">{report.adminNote}</p>
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
