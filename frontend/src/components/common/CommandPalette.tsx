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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-background/80 animate-in fade-in duration-200">
            <div
                className="w-full max-w-2xl tactical-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Header */}
                <div className="flex items-center px-4 py-3 border-b border-border gap-3 bg-secondary/30">
                    <Search className="text-primary" size={18} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Keresés versenyek és felhasználók között..."
                        className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 text-base font-mono"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        onClick={handleClose}
                        className="p-1 rounded bg-secondary border border-border hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <div className="text-[10px] font-mono px-1.5 font-bold uppercase">ESC</div>
                    </button>
                </div>

                {/* Content */}
                <div
                    ref={listRef}
                    className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2"
                >

                    {/* Loading State */}
                    {isLoading && (
                        <div className="py-8 flex flex-col items-center text-muted-foreground font-mono text-xs">
                            <Loader size={20} className="animate-spin mb-2 text-primary" />
                            <p>Keresés folyamatban...</p>
                        </div>
                    )}

                    {/* Empty State / Hints */}
                    {!isLoading && query.length < 2 && (
                        <div className="py-10 text-center text-muted-foreground font-mono">
                            <p className="text-xs">Írj be legalább 2 karaktert a kereséshez</p>
                            <div className="flex justify-center gap-4 mt-3 text-[11px]">
                                <span className="flex items-center gap-1.5"><Trophy size={13} className="text-amber-400" /> Versenyek</span>
                                <span className="flex items-center gap-1.5"><User size={13} className="text-primary" /> Felhasználók</span>
                            </div>
                        </div>
                    )}

                    {/* No Results */}
                    {!isLoading && query.length >= 2 && results.tournaments.length === 0 && results.users.length === 0 && (
                        <div className="py-8 text-center text-muted-foreground font-mono text-xs">
                            <p>Nincs találat a következőre: "{query}"</p>
                        </div>
                    )}

                    {/* Results Groups */}
                    {!isLoading && results.tournaments.length > 0 && (
                        <div className="mb-2">
                            <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
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
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left group transition-all duration-100 ${isSelected ? 'bg-primary/20 ring-1 ring-primary/50' : 'hover:bg-secondary/60'
                                            }`}
                                    >
                                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400 group-hover:bg-amber-500/20">
                                            <Trophy size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{t.name}</h4>
                                            <p className="text-xs font-mono text-muted-foreground truncate">{t.game?.name || 'Játék'}</p>
                                        </div>
                                        <ArrowRight size={14} className={`text-muted-foreground transition-all ${isSelected ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Users Results */}
                    {!isLoading && results.users.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
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
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left group transition-all duration-100 ${isSelected ? 'bg-primary/20 ring-1 ring-primary/50' : 'hover:bg-secondary/60'
                                            }`}
                                    >
                                        <div className="p-0.5 rounded border border-border overflow-hidden w-8 h-8 flex-shrink-0">
                                            {u.avatarUrl ? (
                                                <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover rounded" />
                                            ) : (
                                                <div className="w-full h-full bg-secondary flex items-center justify-center text-xs font-mono font-bold text-foreground">
                                                    {(u.displayName || u.username).charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{u.displayName || u.username}</h4>
                                            <p className="text-xs font-mono text-muted-foreground truncate">@{u.username}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`tactical-badge text-[10px] ${u.role === 'ADMIN' ? 'border-destructive/40 text-destructive bg-destructive/10' :
                                                u.role === 'ORGANIZER' ? 'border-primary/40 text-primary bg-primary/10' :
                                                    'border-border text-muted-foreground bg-secondary'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </div>
                                        <ArrowRight size={14} className={`text-muted-foreground transition-all ${isSelected ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-secondary/40 border-t border-border text-[10px] font-mono text-muted-foreground flex justify-end gap-3">
                    <span className="flex items-center gap-1"><kbd className="bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground">↑↓</kbd> navigáció</span>
                    <span className="flex items-center gap-1"><kbd className="bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground">Enter</kbd> kiválasztás</span>
                    <span className="flex items-center gap-1"><kbd className="bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground">Esc</kbd> bezárás</span>
                </div>
            </div>

            {/* Backdrop Close Click Area (Handled by parent div but ensures full coverage) */}
            <div className="fixed inset-0 -z-10" onClick={handleClose} />
        </div>
    );
}
