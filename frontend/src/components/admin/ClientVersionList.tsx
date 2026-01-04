import React, { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { fetchClientVersions } from "../../store/slices/kioskSlice";

export const ClientVersionList: React.FC = () => {
  const dispatch = useAppDispatch();
  const versions = useAppSelector((state) => state.kiosk.clientVersions);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(versions.length === 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(fetchClientVersions()).unwrap();
    } catch (error) {
      console.error("Failed to refresh versions:", error);
    } finally {
      setIsRefreshing(false);
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
      <div className="bg-tertiary rounded-lg border border-white/5 overflow-hidden min-h-[100px] flex items-center justify-center">
        <div className="text-white/50 text-sm">Verziók betöltése...</div>
      </div>
    );
  }

  return (
    <div className="bg-tertiary rounded-lg border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <h3 className="font-bold text-white flex items-center gap-2">
          <History size={18} className="text-primary" />
          Kliens Verzió Előzmények
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Frissítés"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-gray-400 text-xs uppercase">
              <th className="p-3 border-b border-white/5">Verzió</th>
              <th className="p-3 border-b border-white/5">Feltöltve</th>
              <th className="p-3 border-b border-white/5">Státusz</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {versions.length > 0 ? (
              versions.map((ver) => (
                <tr
                  key={ver.id}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="p-3 border-b border-white/5 text-white font-mono">
                    {ver.version}
                  </td>
                  <td className="p-3 border-b border-white/5 text-gray-400">
                    {new Date(ver.createdAt).toLocaleString("hu-HU", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3 border-b border-white/5">
                    {ver.isActive ? (
                      <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs border border-green-500/30">
                        AKTÍV
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">Inaktív</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500">
                  Nincs feltöltött verzió.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
