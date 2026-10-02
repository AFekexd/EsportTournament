import { useState, useRef } from "react";
import { FileText, Trash2 } from "lucide-react";
import type { ChangeEvent, DragEvent } from "react";

interface PdfUploadProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  label?: string;
  maxSizeMB?: number;
  className?: string;
}

export function PdfUpload({
  value,
  onChange,
  label = "PDF Feltöltés",
  maxSizeMB = 5,
  className = "",
}: PdfUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError("");

    // Validate file type
    if (file.type !== "application/pdf") {
      setError("Csak PDF fájlok engedélyezettek");
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`A fájl túl nagy (max ${maxSizeMB}MB)`);
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onChange(result); // This includes "data:application/pdf;base64,..."
    };
    reader.onerror = () => {
      setError("Hiba történt a fájl beolvasásakor");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClear = () => {
    onChange(undefined);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Calculate size if value exists
  const getSize = () => {
    if (!value) return 0;
    const base64Data = value.replace(/^data:application\/pdf;base64,/, "");
    return ((base64Data.length * 0.75) / 1024 / 1024).toFixed(2);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}

      {!value ? (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded p-6 text-center cursor-pointer transition-all ${isDragging
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 bg-secondary/30"
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileText size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-foreground text-sm font-semibold mb-1">
              Kattints vagy húzd ide a PDF-et
            </p>
            <p className="text-xs font-mono text-muted-foreground">Max {maxSizeMB}MB</p>
          </div>
          {error && <p className="text-destructive font-mono text-xs mt-2">{error}</p>}
        </>
      ) : (
        <div className="relative bg-secondary/40 border border-border rounded p-4 flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">
                Feltöltött PDF szabályzat
              </p>
              <p className="text-xs font-mono text-muted-foreground">{getSize()} MB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-destructive rounded border border-border transition-colors"
            title="Törlés"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
