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
          flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all duration-300 min-w-[140px] justify-between
          ${isOpen
                        ? "bg-[#1a1b26] border-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                        : "bg-[#0f1015] border-white/10 text-gray-300 hover:bg-[#1a1b26] hover:border-white/20 hover:text-white"
                    }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
            >
                <div className="flex items-center gap-3 truncate">
                    {selectedRank ? (
                        <>
                            {selectedRank.image ? (
                                <img
                                    src={selectedRank.image}
                                    alt={selectedRank.name}
                                    className="w-6 h-6 object-contain drop-shadow-md"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">{selectedRank.name.charAt(0)}</span>
                                </div>
                            )}
                            <div className="flex flex-col items-start leading-none gap-0.5">
                                <span className="font-bold text-white tracking-wide">{selectedRank.name}</span>
                                <span className="text-[10px] text-primary/80 font-mono">{selectedRank.value} MM</span>
                            </div>
                        </>
                    ) : (
                        <span className="text-gray-500 italic font-medium">Válassz rangot...</span>
                    )}
                </div>
                <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : "text-gray-500"
                        }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/5">
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                        {/* Ranks */}
                        {ranks.map((rank) => {
                            const isSelected = rank.id === currentRankId;
                            return (
                                <button
                                    key={rank.id}
                                    onClick={() => handleSelect(rank.id)}
                                    className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left group
                    ${isSelected
                                            ? "bg-primary/10 text-white border border-primary/20"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                                        }
                  `}
                                >
                                    <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-[#0f1015] rounded-md border border-white/5 group-hover:border-white/10 transition-colors p-1">
                                        {rank.image ? (
                                            <img
                                                src={rank.image}
                                                alt={rank.name}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-white/5" />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-start leading-none gap-1">
                                        <span className={`font-bold ${isSelected ? 'text-primary' : 'text-gray-300 group-hover:text-white'}`}>{rank.name}</span>
                                        <span className="text-[10px] opacity-60 font-mono">{rank.value} MM</span>
                                    </div>
                                    {isSelected && (
                                        <div className="ml-auto bg-primary text-white rounded-full p-0.5 shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
