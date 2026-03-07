import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, AlertCircle } from "lucide-react";

export function GradesUploadAdmin() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem("token"); // or import from auth service
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

            toast.success("Feltöltés sikeres!");
            toast.info(`Frissített diákok: ${data.data.updatedRecords}, Bukásra állók blokkolva: ${data.data.bannedStudents}, Nem talált OM azonosító: ${data.data.notFoundOMIds}`, { duration: 8000 });
            setFile(null);

            // clear the file input view
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
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Upload className="text-primary" /> Jegyek & Átlag (XLS feltöltés)
            </h2>
            <div className="bg-secondary rounded-xl p-6 border border-border">
                <p className="text-muted-foreground mb-4">
                    Tölts fel egy Excel fájlt a hallgatók eredményeivel. A rendszer automatikusan megkeresi az "OM azonosító", "Átlag" és "Bukás" (vagy "Elégtelen") oszlopokat, jóváírja az átlag alapján járó gépidőt, és letiltja a gépfoglalásról azokat a diákokat, akik bukásra állnak.
                </p>

                <div className="flex flex-col gap-4 max-w-lg">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary/50 hover:bg-black/20 transition-all">
                        <FileText size={48} className="text-muted-foreground mb-4" />
                        <span className="text-sm font-medium text-foreground">
                            {file ? file.name : "Kattints ide a feltöltéshez (.xls, .xlsx)"}
                        </span>
                        <input
                            id="grades-file-input"
                            type="file"
                            className="hidden"
                            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={handleFileChange}
                        />
                    </label>

                    <button
                        className="px-4 py-2 bg-primary text-foreground font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                    >
                        {uploading ? "Feldolgozás..." : "Feltöltés és frissítés"}
                    </button>

                    <div className="mt-4 flex items-start gap-2 text-sm text-yellow-500/80 bg-yellow-500/10 p-4 rounded-lg">
                        <AlertCircle className="shrink-0 mt-0.5" size={16} />
                        <p>Fontos: Ellenőrizd az oszlopok neveit az Excelben. Működő nevek pl.: "OM", "Azonosító", "Átlag", "Tanulmányi", "Bukás", "Elégtelen".</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
