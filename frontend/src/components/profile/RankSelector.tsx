import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { Rank } from "../../types";

interface RankSelectorProps {
    gameId: string;
    currentRankId: string;
    ranks: Rank[];
    onSelect: (gameId: string, rankId: string) => void;
    disabled?: boolean;
}

export function RankSelector({
    gameId,
    currentRankId,
    ranks,
    onSelect,
    disabled
}: RankSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedRank = ranks.find((r) => r.id === currentRankId);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (rankId: string) => {
        onSelect(gameId, rankId);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-200 min-w-[140px] justify-between
          ${isOpen
                        ? "bg-black/60 border-primary/50 text-white shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                        : "bg-black/40 border-white/10 text-gray-300 hover:bg-black/60 hover:text-white"
                    }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedRank ? (
                        <>
                            {selectedRank.image && (
                                <img
                                    src={selectedRank.image}
                                    alt={selectedRank.name}
                                    className="w-5 h-5 object-contain"
                                />
                            )}
                            <span className="font-medium truncate">{selectedRank.name}</span>
                        </>
                    ) : (
                        <span className="text-gray-500 italic">Válassz...</span>
                    )}
                </div>
                <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : "text-gray-500"
                        }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="max-h-[240px] overflow-y-auto custom-scrollbar p-1">
                        {/* Empty Option */}
                        <button
                            onClick={() => handleSelect("")}
                            className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left
                ${!currentRankId
                                    ? "bg-primary/10 text-primary"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                }
              `}
                        >
                            <span className="w-5 h-5 flex items-center justify-center">
                                {!currentRankId && <Check size={14} />}
                            </span>
                            <span>Nincs rang / Válassz...</span>
                        </button>

                        <div className="h-px bg-white/5 my-1 mx-2" />

                        {/* Ranks */}
                        {ranks.map((rank) => {
                            const isSelected = rank.id === currentRankId;
                            return (
                                <button
                                    key={rank.id}
                                    onClick={() => handleSelect(rank.id)}
                                    className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left
                    ${isSelected
                                            ? "bg-primary/10 text-primary"
                                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                                        }
                  `}
                                >
                                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                        {rank.image ? (
                                            <img
                                                src={rank.image}
                                                alt={rank.name}
                                                className="w-full h-full object-contain drop-shadow"
                                            />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full bg-white/10" />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-start leading-none gap-0.5">
                                        <span className="font-medium">{rank.name}</span>
                                        <span className="text-[10px] opacity-60 font-mono">{rank.value} ELO</span>
                                    </div>
                                    {isSelected && <Check size={14} className="ml-auto" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
