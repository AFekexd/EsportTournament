import React, { useEffect, useState } from "react";
import { History, RefreshCw, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
  fetchClientVersions,
  deleteClientVersion,
} from "../../store/slices/kioskSlice";
import { API_URL } from "../../config";
import { ConfirmationModal } from "../common/ConfirmationModal";

export const ClientVersionList: React.FC = () => {
  const dispatch = useAppDispatch();
  const versions = useAppSelector((state) => state.kiosk.clientVersions);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(versions.length === 0);

  // Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<{
    id: string;
    version: string;
  } | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(fetchClientVersions()).unwrap();
      toast.success("Verziók frissítve");
    } catch (error) {
      console.error("Failed to refresh versions:", error);
      toast.error("Nem sikerült frissíteni a verziókat");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownload = (id: string) => {
    window.open(`${API_URL}/client/update/${id}/download`, "_blank");
  };

  const handleDeleteClick = (id: string, version: string) => {
    setVersionToDelete({ id, version });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!versionToDelete) return;

    try {
      await dispatch(deleteClientVersion(versionToDelete.id)).unwrap();
      toast.success(`${versionToDelete.version} verzió törölve`);
    } catch (error) {
      console.error("Failed to delete version:", error);
      toast.error("Nem sikerült törölni a verziót");
    } finally {
      setIsDeleteModalOpen(false);
      setVersionToDelete(null);
    }
  };

  useEffect(() => {
    if (versions.length === 0) {
      setIsInitialLoad(true);
      dispatch(fetchClientVersions())
        .unwrap()
        .then(() => setIsInitialLoad(false))
        .catch(() => setIsInitialLoad(false));
    } else {
      setIsInitialLoad(false);
    }
  }, [dispatch, versions.length]);

  if (isInitialLoad && versions.length === 0) {
    return (
      <div className="bg-tertiary rounded-lg border border-border overflow-hidden min-h-[100px] flex items-center justify-center">
        <div className="text-white/50 text-sm">Verziók betöltése...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-tertiary rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <History size={18} className="text-primary" />
            Kliens Verzió Előzmények
          </h3>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Frissítés"
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary text-muted-foreground text-xs uppercase">
                <th className="p-3 border-b border-border">Verzió</th>
                <th className="p-3 border-b border-border">Feltöltve</th>
                <th className="p-3 border-b border-border">Státusz</th>
                <th className="p-3 border-b border-border text-right">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {versions.length > 0 ? (
                versions.map((ver) => (
                  <tr
                    key={ver.id}
                    className="hover:bg-secondary transition-colors group"
                  >
                    <td className="p-3 border-b border-border text-foreground font-mono">
                      {ver.version}
                    </td>
                    <td className="p-3 border-b border-border text-muted-foreground">
                      {new Date(ver.createdAt).toLocaleString("hu-HU", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3 border-b border-border">
                      {ver.isActive ? (
                        <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs border border-green-500/30">
                          AKTÍV
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Inaktív</span>
                      )}
                    </td>
                    <td className="p-3 border-b border-border text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDownload(ver.id)}
                          className="p-1.5 hover:bg-secondary/80 rounded text-primary hover:text-blue-300 transition-colors"
                          title="Letöltés"
                        >
                          <Download size={16} />
                        </button>
                        {!ver.isActive && (
                          <button
                            onClick={() =>
                              handleDeleteClick(ver.id, ver.version)
                            }
                            className="p-1.5 hover:bg-secondary/80 rounded text-red-400 hover:text-red-300 transition-colors"
                            title="Törlés"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Nincs feltöltött verzió.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Verzió törlése"
        message={`Biztosan törölni szeretnéd a(z) ${versionToDelete?.version} verziót? Ez a művelet nem vonható vissza.`}
        confirmLabel="Törlés"
        variant="danger"
      />
    </>
  );
};
