import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
  fetchMachines,
  toggleLock,
  toggleCompetitionMode,
} from "../../store/slices/kioskSlice";
import { Monitor, Lock, Unlock } from "lucide-react";
import type { Computer } from "../../types";
import { ClientVersionList } from "./ClientVersionList";

export const KioskManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { machines, isLoading } = useAppSelector((state) => state.kiosk);

  useEffect(() => {
    dispatch(fetchMachines());
    // Poll for updates every 5 seconds (or use sockets in future)
    const interval = setInterval(() => {
      dispatch(fetchMachines());
    }, 60000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Group machines by row
  const uniqueRows = Array.from(new Set(machines.map((m) => m.row))).sort(
    (a, b) => a - b
  );

  const machinesByRow = uniqueRows.map((row) => ({
    rowNumber: row,
    machines: machines
      .filter((m) => m.row === row)
      .sort((a, b) => a.position - b.position),
  }));

  const handleLockToggle = (machine: Computer) => {
    dispatch(toggleLock({ id: machine.id, locked: !machine.isLocked }));
  };

  const handleCompetitionToggle = (machine: Computer) => {
    dispatch(
      toggleCompetitionMode({
        id: machine.id,
        enabled: !machine.isCompetitionMode,
      })
    );
  };

  return (
    <div className="admin-section">
      <h2 className="section-title mb-6 flex items-center gap-2">
        <Monitor className="text-primary" />
        Gépterem Felügyelet
      </h2>

      {isLoading && machines.length === 0 ? (
        <div className="p-12 text-center text-gray-400 border border-white/5 rounded-lg bg-white/5 animate-pulse">
          Betöltés...
        </div>
      ) : (
        <>
          <div className="grid gap-8">
            {machinesByRow.map(({ rowNumber, machines }) => (
              <div key={rowNumber} className="space-y-4">
                <h3 className="text-white/70 font-medium ml-2">
                  {rowNumber}. Sor
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {machines.length > 0 ? (
                    machines.map((machine) => (
                      <MachineCard
                        key={machine.id}
                        machine={machine}
                        onLock={() => handleLockToggle(machine)}
                        onCompetitionToggle={() =>
                          handleCompetitionToggle(machine)
                        }
                      />
                    ))
                  ) : (
                    <div className="col-span-full p-4 border border-dashed border-white/10 rounded-lg text-center text-muted">
                      Nincsenek gépek ebben a sorban
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-tertiary rounded-lg border border-white/5">
            <h3 className="font-bold text-white mb-2">Jelmagyarázat</h3>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div> Szabad
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div> Foglalt
                / Aktív
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div> Zárolt
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>{" "}
                Verseny Mód
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-600"></div> Offline
              </span>
            </div>
          </div>
        </>
      )}

      <div className="mt-8">
        <ClientVersionList />
      </div>
    </div>
  );
};

interface MachineCardProps {
  machine: Computer;
  onLock: () => void;
  onCompetitionToggle: () => void;
}

const MachineCard: React.FC<MachineCardProps> = ({
  machine,
  onLock,
  onCompetitionToggle,
}) => {
  // Determine status color
  let statusColor = "bg-gray-800 border-white/10";
  let statusDot = "bg-gray-500";

  // Calculate if offline (no update in last 2 minutes)
  const lastSeen = machine.updatedAt ? new Date(machine.updatedAt).getTime() : 0;
  const isOffline = Date.now() - lastSeen > 120000; // 2 minutes

  if (isOffline) {
    statusDot = "bg-gray-600"; // Offline
    statusColor = "bg-gray-900 border-white/5 opacity-75";
  } else if (machine.isLocked) {
    statusColor = "bg-red-900/20 border-red-500/50";
    statusDot = "bg-red-500";
  } else if (machine.isCompetitionMode) {
    statusColor = "bg-purple-900/20 border-purple-500/50";
    statusDot = "bg-purple-500";
  } else if (machine.status === "AVAILABLE") {
    statusColor = "bg-green-900/10 border-green-500/30";
    statusDot = "bg-green-500";
  } else {
    statusColor = "bg-blue-900/20 border-blue-500/30"; // Occupied logic
    statusDot = "bg-blue-500";
  }

  return (
    <div
      className={`card ${statusColor} p-4 transition-all hover:shadow-lg relative group flex flex-col h-full`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${statusDot} animate-pulse`}
            ></div>
            <span className="font-bold text-lg text-white leading-none">
              {machine.name}
            </span>
          </div>
          {machine.hostname && machine.hostname !== machine.name && (
            <span className="text-xs text-gray-500 font-mono mt-1 ml-4">
              {machine.hostname}
            </span>
          )}
        </div>

        {machine.clientVersion && (
          <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">
            {machine.clientVersion}
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Állapot:</span>
          <span
            className={`font-medium ${machine.isLocked ? "text-red-400" : "text-gray-200"
              }`}
          >
            {isOffline
              ? "OFFLINE"
              : machine.isLocked
                ? "ZÁROLT"
                : machine.isCompetitionMode
                  ? "VERSENY MÓD"
                  : "ELÉRHETŐ"}
          </span>
        </div>
        {/* Placeholder for active user if session exists (would require session join in fetch) */}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <button
          onClick={onLock}
          className={`btn btn-sm flex items-center justify-center gap-1 ${machine.isLocked
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-white/5 hover:bg-white/10 text-gray-300"
            }`}
          title={machine.isLocked ? "Feloldás" : "Zárolás"}
        >
          {machine.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
          {machine.isLocked ? "Felold" : "Zárol"}
        </button>
        <button
          onClick={onCompetitionToggle}
          className={`btn btn-sm flex items-center justify-center gap-1 ${machine.isCompetitionMode
            ? "bg-purple-500 hover:bg-purple-600 text-white"
            : "bg-white/5 hover:bg-white/10 text-gray-300"
            }`}
          title="Verseny mód"
        >
          <TrophyIcon size={14} />
          Verseny
        </button>
      </div>
    </div>
  );
};

const TrophyIcon = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
