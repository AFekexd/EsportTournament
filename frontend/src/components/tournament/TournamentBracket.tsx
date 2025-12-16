import { useState, useRef, useCallback, useEffect } from 'react';
import type { Match, Tournament } from '../../types';
import './TournamentBracket.css';

interface TournamentBracketProps {
    tournament: Tournament;
    onMatchClick?: (match: Match) => void;
}

// Helper to get participant name (team or user)
function getParticipantName(match: Match, side: 'home' | 'away'): string {
    if (side === 'home') {
        if (match.homeUser) {
            return match.homeUser.displayName || match.homeUser.username;
        }
        return match.homeTeam?.name || 'TBD';
    } else {
        if (match.awayUser) {
            return match.awayUser.displayName || match.awayUser.username;
        }
        return match.awayTeam?.name || 'TBD';
    }
}

// Helper to check if participant is winner
function isWinner(match: Match, side: 'home' | 'away'): boolean {
    if (side === 'home') {
        return !!(match.winnerId && match.winnerId === match.homeTeamId) ||
            !!(match.winnerUserId && match.winnerUserId === match.homeUserId);
    }
    return !!(match.winnerId && match.winnerId === match.awayTeamId) ||
        !!(match.winnerUserId && match.winnerUserId === match.awayUserId);
}

// Match card component
function MatchCard({
    match,
    onMatchClick,
    matchRef
}: {
    match: Match;
    onMatchClick?: (match: Match) => void;
    matchRef?: (el: HTMLDivElement | null) => void;
}) {
    const winnerName = match.winner?.name || match.winnerUser?.displayName || match.winnerUser?.username;

    return (
        <div
            ref={matchRef}
            className={`match-card ${onMatchClick ? 'clickable' : ''} ${match.status.toLowerCase()}`}
            onClick={(e) => {
                e.stopPropagation();
                onMatchClick?.(match);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            data-match-id={match.id}
            data-round={match.round}
            data-position={match.position}
        >
            <div className={`match-team ${isWinner(match, 'home') ? 'winner' : ''}`}>
                <span className="team-name">{getParticipantName(match, 'home')}</span>
                {match.homeScore !== null && match.homeScore !== undefined && (
                    <span className="team-score">{match.homeScore}</span>
                )}
            </div>
            <div className="match-divider">vs</div>
            <div className={`match-team ${isWinner(match, 'away') ? 'winner' : ''}`}>
                <span className="team-name">{getParticipantName(match, 'away')}</span>
                {match.awayScore !== null && match.awayScore !== undefined && (
                    <span className="team-score">{match.awayScore}</span>
                )}
            </div>
            {match.status === 'COMPLETED' && winnerName && (
                <div className="match-status completed">✓ {winnerName}</div>
            )}
        </div>
    );
}

// Zoom and Pan controls
function BracketControls({
    zoom,
    onZoomIn,
    onZoomOut,
    onReset
}: {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
}) {
    return (
        <div className="bracket-controls">
            <button className="bracket-control-btn" onClick={onZoomOut} title="Kicsinyítés">
                −
            </button>
            <span className="bracket-zoom-level">{Math.round(zoom * 100)}%</span>
            <button className="bracket-control-btn" onClick={onZoomIn} title="Nagyítás">
                +
            </button>
            <button className="bracket-control-btn reset" onClick={onReset} title="Visszaállítás">
                ↺
            </button>
        </div>
    );
}

export function TournamentBracket({ tournament, onMatchClick }: TournamentBracketProps) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const matchRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

    const handleZoomIn = useCallback(() => {
        setZoom(prev => Math.min(prev + 0.25, 2));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(prev => Math.max(prev - 0.25, 0.25));
    }, []);

    const handleReset = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }, [pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Native wheel event to prevent page scroll (passive: false required)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(prev => Math.min(Math.max(prev + delta, 0.25), 2));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    // Calculate connection lines between rounds
    useEffect(() => {
        if (!tournament.matches || tournament.matches.length === 0) return;
        if (!contentRef.current) return;

        const calculateLines = () => {
            const newLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
            const content = contentRef.current;
            if (!content) return;

            // Get all upper bracket matches only for lines
            const upperMatches = tournament.matches?.filter(m =>
                m.bracketType === 'UPPER' || !m.bracketType
            ) || [];

            // Group matches by round
            const matchesByRound: Record<number, Match[]> = {};
            upperMatches.forEach(match => {
                if (!matchesByRound[match.round]) {
                    matchesByRound[match.round] = [];
                }
                matchesByRound[match.round].push(match);
            });

            // Sort each round by position
            Object.values(matchesByRound).forEach(matches => {
                matches.sort((a, b) => a.position - b.position);
            });

            const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

            // Connect matches between consecutive rounds
            for (let i = 0; i < rounds.length - 1; i++) {
                const currentRound = rounds[i];
                const nextRound = rounds[i + 1];
                const currentMatches = matchesByRound[currentRound];
                const nextMatches = matchesByRound[nextRound];

                currentMatches.forEach((match, idx) => {
                    const matchEl = matchRefs.current.get(match.id);
                    const nextMatchIdx = Math.floor(idx / 2);
                    const nextMatch = nextMatches?.[nextMatchIdx];
                    if (!nextMatch) return;

                    const nextMatchEl = matchRefs.current.get(nextMatch.id);

                    if (matchEl && nextMatchEl) {
                        // Use offset positions relative to content
                        const getOffsetPosition = (el: HTMLElement) => {
                            let left = 0;
                            let top = 0;
                            let current: HTMLElement | null = el;

                            while (current && current !== content) {
                                left += current.offsetLeft;
                                top += current.offsetTop;
                                current = current.offsetParent as HTMLElement;
                            }

                            return { left, top, width: el.offsetWidth, height: el.offsetHeight };
                        };

                        const matchPos = getOffsetPosition(matchEl);
                        const nextMatchPos = getOffsetPosition(nextMatchEl);

                        newLines.push({
                            x1: matchPos.left + matchPos.width,
                            y1: matchPos.top + matchPos.height / 2,
                            x2: nextMatchPos.left,
                            y2: nextMatchPos.top + nextMatchPos.height / 2,
                        });
                    }
                });
            }

            setLines(newLines);
        };

        // Delay to ensure refs are populated and layout is stable
        const timer = setTimeout(calculateLines, 200);
        return () => clearTimeout(timer);
    }, [tournament.matches]);

    if (!tournament.matches || tournament.matches.length === 0) {
        return (
            <div className="bracket-empty">
                <p>Még nincs bracket generálva ehhez a versenyhez.</p>
            </div>
        );
    }

    // Group matches by bracket type and round
    const upperMatches = tournament.matches.filter(m => m.bracketType === 'UPPER' || !m.bracketType);
    const lowerMatches = tournament.matches.filter(m => m.bracketType === 'LOWER');
    const grandFinalMatches = tournament.matches.filter(m => m.bracketType === 'GRAND_FINAL');
    const isDoubleElimination = tournament.format === 'DOUBLE_ELIMINATION';

    // Group by round
    const groupByRound = (matches: Match[]) => {
        const byRound: Record<number, Match[]> = {};
        matches.forEach(match => {
            if (!byRound[match.round]) byRound[match.round] = [];
            byRound[match.round].push(match);
        });
        Object.values(byRound).forEach(arr => arr.sort((a, b) => a.position - b.position));
        return byRound;
    };

    const upperByRound = groupByRound(upperMatches);
    const lowerByRound = groupByRound(lowerMatches);
    const rounds = Object.keys(upperByRound).map(Number).sort((a, b) => a - b);
    const lowerRounds = Object.keys(lowerByRound).map(Number).sort((a, b) => a - b);

    const getRoundName = (round: number, totalRounds: number, isLower = false) => {
        if (isLower) return `Alsó ${round}. kör`;
        const left = totalRounds - rounds.indexOf(round);
        if (left === 1) return 'Döntő';
        if (left === 2) return 'Elődöntő';
        if (left === 3) return 'Negyeddöntő';
        return `${round}. kör`;
    };

    const registerMatchRef = (id: string) => (el: HTMLDivElement | null) => {
        if (el) {
            matchRefs.current.set(id, el);
        } else {
            matchRefs.current.delete(id);
        }
    };

    return (
        <div className="bracket-wrapper">
            <BracketControls
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleReset}
            />

            <div
                ref={containerRef}
                className={`bracket-viewport ${isDragging ? 'dragging' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    ref={contentRef}
                    className="bracket-content"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'top left'
                    }}
                >
                    {/* SVG Connection Lines - inside content so it transforms together */}
                    <svg className="bracket-lines">
                        {lines.map((line, idx) => (
                            <path
                                key={idx}
                                d={`M ${line.x1} ${line.y1} 
                                    C ${line.x1 + 40} ${line.y1}, 
                                      ${line.x2 - 40} ${line.y2}, 
                                      ${line.x2} ${line.y2}`}
                                className="bracket-line"
                            />
                        ))}
                    </svg>
                    <div className="bracket-section upper-bracket">
                        {isDoubleElimination && <h3 className="bracket-section-title">🏆 Felső ág</h3>}
                        <div className="bracket-rounds">
                            {rounds.map(round => (
                                <div key={`upper-${round}`} className="bracket-round">
                                    <div className="round-title">{getRoundName(round, rounds.length)}</div>
                                    <div className="round-matches">
                                        {upperByRound[round]?.map(match => (
                                            <MatchCard
                                                key={match.id}
                                                match={match}
                                                onMatchClick={onMatchClick}
                                                matchRef={registerMatchRef(match.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Lower Bracket */}
                    {isDoubleElimination && lowerMatches.length > 0 && (
                        <div className="bracket-section lower-bracket">
                            <h3 className="bracket-section-title">🔄 Alsó ág</h3>
                            <div className="bracket-rounds">
                                {lowerRounds.map(round => (
                                    <div key={`lower-${round}`} className="bracket-round">
                                        <div className="round-title">{getRoundName(round, lowerRounds.length, true)}</div>
                                        <div className="round-matches">
                                            {lowerByRound[round]?.map(match => (
                                                <MatchCard
                                                    key={match.id}
                                                    match={match}
                                                    onMatchClick={onMatchClick}
                                                    matchRef={registerMatchRef(match.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Grand Final */}
                    {grandFinalMatches.length > 0 && (
                        <div className="bracket-section grand-final">
                            <h3 className="bracket-section-title">⭐ Nagydöntő</h3>
                            <div className="bracket-rounds">
                                <div className="bracket-round">
                                    <div className="round-matches">
                                        {grandFinalMatches.map(match => (
                                            <MatchCard
                                                key={match.id}
                                                match={match}
                                                onMatchClick={onMatchClick}
                                                matchRef={registerMatchRef(match.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
