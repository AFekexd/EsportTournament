import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ScrollText, Shield } from "lucide-react";
import DOMPurify from "dompurify";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchTournament, clearCurrentTournament } from "../store/slices/tournamentsSlice";

export function TournamentRulesPage() {
    const { id } = useParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const { currentTournament, isLoading } = useAppSelector(
        (state) => state.tournaments
    );

    useEffect(() => {
        if (id) {
            dispatch(fetchTournament(id));
            return () => {
                dispatch(clearCurrentTournament());
            };
        }
    }, [id, dispatch]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground animate-pulse">Betöltés...</p>
            </div>
        );
    }

    if (!currentTournament) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <h2 className="text-2xl font-bold text-foreground mb-2">Verseny nem található</h2>
                <Link to="/tournaments" className="text-primary hover:underline">
                    Vissza a versenyekhez
                </Link>
            </div>
        );
    }

    const rules = currentTournament.game?.rules;
    const rulesPdfUrl = currentTournament.game?.rulesPdfUrl;
    const gameName = currentTournament.game?.name;

    if (!rules && !rulesPdfUrl) {
        return (
            <div className="flex flex-col gap-6 pb-16">
                <div>
                    <Link
                        to={`/tournaments/${id}`}
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-mono text-xs uppercase tracking-wider transition-colors mb-4"
                    >
                        <ArrowLeft size={16} />
                        Vissza a versenyhez
                    </Link>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground">{currentTournament.name}</h1>
                </div>
                <div className="tactical-card p-12 text-center flex flex-col items-center justify-center">
                    <Shield className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
                    <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground mb-1">Nincs elérhető szabályzat</h2>
                    <p className="text-muted-foreground text-sm font-mono">Ehhez a versenyhez/játékhoz nincs feltöltve egyedi szabályzat.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-16">
            {/* Header */}
            <div>
                <Link
                    to={`/tournaments/${id}`}
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-mono text-xs uppercase tracking-wider transition-colors mb-4"
                >
                    <ArrowLeft size={16} />
                    Vissza a versenyhez
                </Link>
                <div className="flex items-center gap-3.5 border-b border-border/60 pb-6">
                    <div className="p-2.5 bg-secondary rounded border border-border text-primary">
                        <ScrollText size={24} />
                    </div>
                    <div>
                        <h1 className="font-display text-2xl sm:text-4xl font-bold uppercase tracking-tight text-foreground">Játékszabályzat</h1>
                        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mt-0.5">
                            {gameName ? `${gameName} // ` : ""}{currentTournament.name}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="tactical-card overflow-hidden">
                {rulesPdfUrl ? (
                    <div className="w-full h-[80vh] bg-card">
                        <iframe
                            src={rulesPdfUrl}
                            className="w-full h-full"
                            title={`${gameName || 'Verseny'} szabályzat`}
                        />
                    </div>
                ) : (
                    <div className="p-6 sm:p-8">
                        <div
                            className="prose prose-invert max-w-none text-muted-foreground [&>h1]:text-2xl [&>h1]:text-foreground [&>h2]:text-xl [&>h2]:text-foreground [&>h3]:text-lg [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:pl-5 [&>ol]:pl-5"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rules || "") }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
