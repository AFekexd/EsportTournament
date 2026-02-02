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
                <p className="text-gray-400 animate-pulse">Betöltés...</p>
            </div>
        );
    }

    if (!currentTournament) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <h2 className="text-2xl font-bold text-white mb-2">Verseny nem található</h2>
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
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <Link
                        to={`/tournaments/${id}`}
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft size={20} />
                        Vissza a versenyhez
                    </Link>
                    <h1 className="text-3xl font-bold text-white">{currentTournament.name}</h1>
                </div>
                <div className="bg-[#1a1b26] p-8 rounded-xl border border-white/5 text-center">
                    <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Nincs elérhető szabályzat</h2>
                    <p className="text-gray-400">Ehhez a versenyhez/játékhoz nincs feltöltve szabályzat.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <Link
                    to={`/tournaments/${id}`}
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft size={20} />
                    Vissza a versenyhez
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <ScrollText size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Játékszabályzat</h1>
                        <p className="text-gray-400 text-lg">
                            {gameName ? `${gameName} - ` : ""}{currentTournament.name}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="bg-[#1a1b26] rounded-2xl border border-white/10 shadow-xl overflow-hidden">
                {rulesPdfUrl ? (
                    <div className="w-full h-[80vh] bg-white/5">
                        <iframe
                            src={rulesPdfUrl}
                            className="w-full h-full"
                            title={`${gameName || 'Verseny'} szabályzat`}
                        />
                    </div>
                ) : (
                    <div className="p-8">
                        <div
                            className="prose prose-invert max-w-none text-gray-300 [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:pl-5 [&>ol]:pl-5"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rules || "") }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
