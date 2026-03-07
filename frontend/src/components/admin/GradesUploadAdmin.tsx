import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, BookText, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function GradesUploadAdmin() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{
        updatedRecords: number;
        bannedStudents: number;
        notFoundOMIds: number;
    } | null>(null);
    const { getToken } = useAuth();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = await getToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/admin/students/upload-grades`, {
                method: "POST",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Hiba történt a feltöltés során.");
            }

            setResult(data.data);
            toast.success("Feltöltés sikeres!");
            setFile(null);

            const fileInput = document.getElementById("grades-file-input") as HTMLInputElement;
            if (fileInput) fileInput.value = "";

        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error(error.message || "Hiba az Excel feltöltésekor.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <BookText className="text-amber-500" size={24} />
                        Tanulmányi eredmények kezelése
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Excel fájl feltöltése a diákok jegyeinek és átlagának frissítéséhez
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Card */}
                <div className="rounded-xl border border-border bg-[#121A22] p-6 flex flex-col">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                            <Upload size={18} />
                        </span>
                        Fájl feltöltés
                    </h3>

                    {/* Dropzone */}
                    <label
                        className={`
                            relative flex flex-col items-center justify-center gap-3 p-8 
                            rounded-xl border-2 border-dashed cursor-pointer
                            transition-all duration-300 group mb-4
                            ${file
                                ? "border-emerald-500/40 bg-emerald-500/5"
                                : "border-border hover:border-primary/40 hover:bg-primary/5"
                            }
                        `}
                    >
                        <div className={`
                            p-3 rounded-xl transition-colors duration-300
                            ${file
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-secondary text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                            }
                        `}>
                            <FileSpreadsheet size={32} />
                        </div>
                        <div className="text-center">
                            {file ? (
                                <>
                                    <p className="text-sm font-medium text-emerald-400">{file.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {(file.size / 1024).toFixed(1)} KB • Kattints a módosításhoz
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-medium text-foreground">
                                        Kattints vagy húzd ide a fájlt
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        .xls, .xlsx formátumok támogatottak (max 5MB)
                                    </p>
                                </>
                            )}
                        </div>
                        <input
                            id="grades-file-input"
                            type="file"
                            className="hidden"
                            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={handleFileChange}
                        />
                    </label>

                    {/* Upload Button */}
                    <button
                        className={`
                            flex items-center justify-center gap-2 w-full px-4 py-3 
                            rounded-lg font-medium text-sm transition-all duration-300
                            ${file && !uploading
                                ? "bg-primary text-foreground hover:bg-primary-hover shadow-lg shadow-primary/20"
                                : "bg-secondary text-muted-foreground cursor-not-allowed opacity-50"
                            }
                        `}
                        onClick={handleUpload}
                        disabled={!file || uploading}
                    >
                        {uploading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                                Feldolgozás...
                            </>
                        ) : (
                            <>
                                <Upload size={16} />
                                Feltöltés és feldolgozás
                            </>
                        )}
                    </button>
                </div>

                {/* Info & Results Card */}
                <div className="rounded-xl border border-border bg-[#121A22] p-6 flex flex-col">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                            <Info size={18} />
                        </span>
                        Útmutató
                    </h3>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary border border-border">
                            <div className="mt-0.5 text-amber-400 shrink-0">
                                <FileSpreadsheet size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">Kötelező oszlopok</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    OM/Azonosító, Átlag/Tanulmányi, Bukás/Elégtelen
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary border border-border">
                            <div className="mt-0.5 text-cyan-400 shrink-0">
                                <CheckCircle2 size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">Gépidő jóváírás</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    4.5+ átlag → 4 óra, 4.0+ → 3 óra, 3.5+ → 2 óra, 3.0+ → 1 óra
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary border border-border">
                            <div className="mt-0.5 text-red-400 shrink-0">
                                <AlertTriangle size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">Foglalás tiltás</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Bukásra álló diákok automatikusan letiltásra kerülnek a gépfoglalásról
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    {result && (
                        <div className="mt-auto space-y-3 pt-4 border-t border-border">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-400" />
                                Utolsó feltöltés eredménye
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-xl font-bold text-emerald-400">{result.updatedRecords}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Frissítve</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-xl font-bold text-red-400">{result.bannedStudents}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Tiltva</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                    <p className="text-xl font-bold text-yellow-400">{result.notFoundOMIds}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Nem található</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
