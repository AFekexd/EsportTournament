import { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { setSearchOpen } from "../../store/slices/uiSlice";
import { searchUsers } from "../../store/slices/usersSlice";
import { fetchTournaments } from "../../store/slices/tournamentsSlice";
import { useNavigate } from "react-router-dom";
import { Search, Trophy, User, ArrowRight, Loader } from "lucide-react";

export function CommandPalette() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { isSearchOpen } = useAppSelector((state) => state.ui);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<{
        tournaments: any[];
        users: any[];
    }>({ tournaments: [], users: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Combine results for linear navigation
    const items = [
        ...results.tournaments.map(t => ({ ...t, type: 'tournament' })),
        ...results.users.map(u => ({ ...u, type: 'user' }))
    ];

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            // Short delay to allow animation
            setTimeout(() => inputRef.current?.focus(), 50);
        }
        setSelectedIndex(0); // Reset selection on open
    }, [isSearchOpen]);


    useEffect(() => {
        // Debounce search
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setIsLoading(true);
                try {
                    // Parallel fetch
                    const [usersResult, tournamentsResult] = await Promise.allSettled([
                        dispatch(searchUsers(query)).unwrap(),
                        dispatch(fetchTournaments({ search: query, limit: 5 })).unwrap()
                    ]);

                    const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
                    const tournaments = tournamentsResult.status === 'fulfilled' ? tournamentsResult.value.tournaments : [];

                    setResults({ users, tournaments });
                    setSelectedIndex(0);
                } catch (error) {
                    console.error("Search failed:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults({ users: [], tournaments: [] });
                setSelectedIndex(0);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [query, dispatch]);

    // Keyboard shortcut listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                dispatch(setSearchOpen(true));
            }
            if (!isSearchOpen) return;

            if (e.key === "Escape") {
                e.preventDefault();
                dispatch(setSearchOpen(false));
            }

            if (items.length === 0) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % items.length);
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
            }

            if (e.key === "Enter") {
                e.preventDefault();
                const selectedItem = items[selectedIndex];
                if (selectedItem) {
                    if (selectedItem.type === 'tournament') {
                        handleNavigate(`/tournaments/${selectedItem.id}`);
                    } else {
                        handleNavigate(`/profile/${selectedItem.id}`);
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [dispatch, isSearchOpen, items, selectedIndex]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (!isSearchOpen) return null;

    const handleClose = () => {
        dispatch(setSearchOpen(false));
        setQuery("");
        setResults({ users: [], tournaments: [] });
    };

    const handleNavigate = (path: string) => {
        navigate(path);
        handleClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-black/50 animate-in fade-in duration-200">
            <div
                className="w-full max-w-2xl bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Header */}
                <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3">
                    <Search className="text-gray-400" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Keresés versenyek és felhasználók között..."
                        className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none focus:ring-0 text-lg"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        onClick={handleClose}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <div className="text-xs px-1.5 font-medium">ESC</div>
                    </button>
                </div>

                {/* Content */}
                <div
                    ref={listRef}
                    className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2"
                >

                    {/* Loading State */}
                    {isLoading && (
                        <div className="py-8 flex flex-col items-center text-gray-400">
                            <Loader size={24} className="animate-spin mb-2" />
                            <p className="text-sm">Keresés folyamatban...</p>
                        </div>
                    )}

                    {/* Empty State / Hints */}
                    {!isLoading && query.length < 2 && (
                        <div className="py-12 text-center text-gray-500">
                            <p className="text-sm">Írj be legalább 2 karaktert a kereséshez</p>
                            <div className="flex justify-center gap-4 mt-4 text-xs">
                                <span className="flex items-center gap-1"><Trophy size={12} /> Versenyek</span>
                                <span className="flex items-center gap-1"><User size={12} /> Felhasználók</span>
                            </div>
                        </div>
                    )}

                    {/* No Results */}
                    {!isLoading && query.length >= 2 && results.tournaments.length === 0 && results.users.length === 0 && (
                        <div className="py-8 text-center text-gray-500">
                            <p>Nincs találat a következőre: "{query}"</p>
                        </div>
                    )}

                    {/* Results Groups */}
                    {!isLoading && results.tournaments.length > 0 && (
                        <div className="mb-2">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Versenyek
                            </div>
                            {results.tournaments.map((t, i) => {
                                const globalIndex = i;
                                const isSelected = globalIndex === selectedIndex;
                                return (
                                    <button
                                        key={t.id}
                                        data-index={globalIndex}
                                        onClick={() => handleNavigate(`/tournaments/${t.id}`)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left group transition-all duration-100 ${isSelected ? 'bg-primary/20 ring-1 ring-primary/50' : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="p-2 bg-yellow-500/10 rounded-md text-yellow-500 group-hover:bg-yellow-500/20">
                                            <Trophy size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-medium truncate ${isSelected ? 'text-primary' : 'text-white'}`}>{t.name}</h4>
                                            <p className="text-xs text-gray-400 truncate">{t.game?.name || 'Játék'}</p>
                                        </div>
                                        <ArrowRight size={16} className={`text-gray-600 transition-all ${isSelected ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Users Results */}
                    {!isLoading && results.users.length > 0 && (
                        <div>
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Felhasználók
                            </div>
                            {results.users.map((u, i) => {
                                const globalIndex = results.tournaments.length + i;
                                const isSelected = globalIndex === selectedIndex;
                                return (
                                    <button
                                        key={u.id}
                                        data-index={globalIndex}
                                        onClick={() => handleNavigate(`/profile/${u.id}`)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left group transition-all duration-100 ${isSelected ? 'bg-primary/20 ring-1 ring-primary/50' : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="p-1 rounded-full border border-white/10 overflow-hidden w-9 h-9 flex-shrink-0">
                                            {u.avatarUrl ? (
                                                <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                                                    {(u.displayName || u.username).charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-medium truncate ${isSelected ? 'text-primary' : 'text-white'}`}>{u.displayName || u.username}</h4>
                                            <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${u.role === 'ADMIN' ? 'border-yellow-500/30 text-yellow-500' :
                                                u.role === 'ORGANIZER' ? 'border-purple-500/30 text-purple-500' :
                                                    'border-gray-500/30 text-gray-500'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </div>
                                        <ArrowRight size={16} className={`text-gray-600 transition-all ${isSelected ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-black/20 border-t border-white/5 text-[10px] text-gray-500 flex justify-end gap-3">
                    <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded text-gray-300">↑↓</kbd> navigate</span>
                    <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded text-gray-300">Enter</kbd> select</span>
                    <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded text-gray-300">Esc</kbd> close</span>
                </div>
            </div>

            {/* Backdrop Close Click Area (Handled by parent div but ensures full coverage) */}
            <div className="fixed inset-0 -z-10" onClick={handleClose} />
        </div>
    );
}
