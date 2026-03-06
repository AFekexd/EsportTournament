import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import {
    fetchTournament,
    clearCurrentTournament,
} from '../../store/slices/tournamentsSlice';
import { TournamentBracket } from '../../components/tournament';

export function TournamentEmbedPage() {
    const { id } = useParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const { currentTournament, isLoading } = useAppSelector((state) => state.tournaments);

    useEffect(() => {
        if (id) {
            dispatch(fetchTournament(id));
        }

        return () => {
            dispatch(clearCurrentTournament());
        };
    }, [id, dispatch]);

    if (isLoading || !currentTournament) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#121A22]">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground animate-pulse">Betöltés...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121A22] overflow-hidden">
            <div className="h-screen w-full">
                {/* Remove onMatchClick to make it read-only for embed */}
                <TournamentBracket
                    tournament={currentTournament}
                />
            </div>
        </div>
    );
}
