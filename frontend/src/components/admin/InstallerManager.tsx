import React, { useState, useEffect } from "react";
import { Download, Upload, Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "../../config";

interface InstallerInfo {
  version: string;
  uploadedAt: string;
  size: number;
}

export const InstallerManager: React.FC = () => {
  const [installerInfo, setInstallerInfo] = useState<InstallerInfo | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [versionInput, setVersionInput] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchInstallerInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/client/update/installer`);
      if (res.ok) {
        const data = await res.json();
        setInstallerInfo(data);
      } else {
        setInstallerInfo(null);
      }
    } catch (error) {
      console.error("Failed to fetch installer info", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallerInfo();
  }, []);

  const handleDownload = () => {
    window.open(`${API_URL}/client/update/installer/download`, "_blank");
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!versionInput) {
      toast.error("Kérjük add meg a verziószámot!");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("version", versionInput);

      const res = await fetch(`${API_URL}/client/update/installer/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Telepítő sikeresen feltöltve!");
        setVersionInput("");
        fetchInstallerInfo();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Feltöltési hiba");
      }
    } catch (error: any) {
      toast.error(`Hiba: ${error.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-tertiary rounded-lg border border-white/5 overflow-hidden mb-8">
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Package size={18} className="text-secondary" />
          Telepítő Kezelése (Új gépekhez)
        </h3>
        <button
          onClick={fetchInstallerInfo}
          disabled={loading}
          className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Current Installer Info */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
            <h4 className="text-sm font-medium text-gray-400 mb-4">
              Jelenlegi Telepítő
            </h4>

            {installerInfo ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      v{installerInfo.version}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(installerInfo.size / 1024 / 1024).toFixed(2)} MB •
                      {new Date(installerInfo.uploadedAt).toLocaleString(
                        "hu-HU",
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                  >
                    <Download size={16} />
                    Letöltés
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                Nincs elérhető telepítő.
              </div>
            )}
          </div>

          {/* Upload New Installer */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
            <h4 className="text-sm font-medium text-gray-400 mb-4">
              Új Telepítő Feltöltése
            </h4>

            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs text-gray-500">Verziószám</label>
                <input
                  type="text"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  placeholder="pl. 1.0.19"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-secondary/50"
                />
              </div>

              <div>
                <input
                  type="file"
                  accept=".zip"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={handleUploadClick}
                  disabled={uploading || !versionInput}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm border border-white/5"
                >
                  {uploading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  {uploading ? "Feltöltés..." : "ZIP Feltöltése"}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 mt-3">
              Feltöltés csak .zip formátumban. Az auto-build script ezt
              generálja.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
