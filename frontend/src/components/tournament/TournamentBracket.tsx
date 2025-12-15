import type { Match, Tournament } from '../../types';
import './TournamentBracket.css';

interface TournamentBracketProps {
    tournament: Tournament;
    onMatchClick?: (match: Match) => void;
}

export function TournamentBracket({ tournament, onMatchClick }: TournamentBracketProps) {
    if (!tournament.matches || tournament.matches.length === 0) {
        return (
            <div className="bracket-empty">
                <p>Még nincs bracket generálva ehhez a versenyhez.</p>
            </div>
        );
    }

    // Group matches by round
    const matchesByRound: Record<number, Match[]> = {};
    tournament.matches.forEach((match) => {
        if (!matchesByRound[match.round]) {
            matchesByRound[match.round] = [];
        }
        matchesByRound[match.round].push(match);
    });

    // Sort matches by position within each round
    Object.keys(matchesByRound).forEach((round) => {
        matchesByRound[Number(round)].sort((a, b) => a.position - b.position);
    });

    const rounds = Object.keys(matchesByRound)
        .map(Number)
        .sort((a, b) => a - b);

    const roundNames: Record<number, string> = {
        1: rounds.length === 1 ? 'Döntő' : rounds.length === 2 ? 'Elődöntő' : rounds.length === 3 ? 'Negyeddöntő' : `${rounds.length}. kör`,
    };

    // Generate round names dynamically
    rounds.forEach((round, index) => {
        const roundsLeft = rounds.length - index;
        if (roundsLeft === 1) {
            roundNames[round] = 'Döntő';
        } else if (roundsLeft === 2) {
            roundNames[round] = 'Elődöntő';
        } else if (roundsLeft === 3) {
            roundNames[round] = 'Negyeddöntő';
        } else if (roundsLeft === 4) {
            roundNames[round] = 'Nyolcaddöntő';
        } else {
            roundNames[round] = `${round}. kör`;
        }
    });

    return (
        <div className="tournament-bracket">
            <div className="bracket-container">
                {rounds.map((round) => (
                    <div key={round} className="bracket-round">
                        <h3 className="round-title">{roundNames[round]}</h3>
                        <div className="round-matches">
                            {matchesByRound[round].map((match) => (
                                <div
                                    key={match.id}
                                    className={`match-card ${onMatchClick ? 'clickable' : ''} ${match.status.toLowerCase()}`}
                                    onClick={() => onMatchClick?.(match)}
                                >
                                    <div className={`match-team ${match.winnerId === match.homeTeamId ? 'winner' : ''}`}>
                                        <span className="team-name">
                                            {match.homeTeam?.name || 'TBD'}
                                        </span>
                                        {match.homeScore !== null && match.homeScore !== undefined && (
                                            <span className="team-score">{match.homeScore}</span>
                                        )}
                                    </div>
                                    <div className="match-divider">vs</div>
                                    <div className={`match-team ${match.winnerId === match.awayTeamId ? 'winner' : ''}`}>
                                        <span className="team-name">
                                            {match.awayTeam?.name || 'TBD'}
                                        </span>
                                        {match.awayScore !== null && match.awayScore !== undefined && (
                                            <span className="team-score">{match.awayScore}</span>
                                        )}
                                    </div>
                                    {match.status === 'COMPLETED' && match.winner && (
                                        <div className="match-status completed">
                                            Győztes: {match.winner.name}
                                        </div>
                                    )}
                                    {match.status === 'IN_PROGRESS' && (
                                        <div className="match-status in-progress">
                                            Folyamatban
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
