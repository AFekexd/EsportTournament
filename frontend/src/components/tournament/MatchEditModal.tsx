import { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Match } from '../../types';

interface MatchEditModalProps {
    match: Match;
    onClose: () => void;
    onSave: (data: { homeScore?: number; awayScore?: number; winnerId?: string; winnerUserId?: string }) => void;
    isLoading?: boolean;
}

// Helper to get participant name (team or user)
function getParticipantName(match: Match, side: 'home' | 'away'): string {
    if (side === 'home') {
        if (match.homeUser) {
            return match.homeUser.displayName || match.homeUser.username;
        }
        return match.homeTeam?.name || 'Nincs meghatározva';
    } else {
        if (match.awayUser) {
            return match.awayUser.displayName || match.awayUser.username;
        }
        return match.awayTeam?.name || 'Nincs meghatározva';
    }
}

// Check if this is a solo (1v1) match
function isSoloMatch(match: Match): boolean {
    return !!(match.homeUserId || match.awayUserId || match.homeUser || match.awayUser);
}

export function MatchEditModal({ match, onClose, onSave, isLoading }: MatchEditModalProps) {
    const [homeScore, setHomeScore] = useState<string>(match.homeScore?.toString() || '');
    const [awayScore, setAwayScore] = useState<string>(match.awayScore?.toString() || '');
    const [winnerId, setWinnerId] = useState<string>(
        match.winnerId || match.winnerUserId || ''
    );

    const solo = isSoloMatch(match);
    const homeName = getParticipantName(match, 'home');
    const awayName = getParticipantName(match, 'away');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const data: { homeScore?: number; awayScore?: number; winnerId?: string; winnerUserId?: string } = {};

        if (homeScore !== '') {
            data.homeScore = parseInt(homeScore, 10);
        }
        if (awayScore !== '') {
            data.awayScore = parseInt(awayScore, 10);
        }

        // Send winnerId if it has a value (user selected or pre-existing)
        if (winnerId && winnerId !== '') {
            // For solo matches, use winnerUserId; for team matches, use winnerId
            if (solo) {
                data.winnerUserId = winnerId;
            } else {
                data.winnerId = winnerId;
            }
        }
        // If winnerId is empty, backend will determine automatically from scores

        onSave(data);
    };

    // Get the participant ID for winner selection
    const homeId = solo ? (match.homeUserId || match.homeUser?.id) : match.homeTeamId;
    const awayId = solo ? (match.awayUserId || match.awayUser?.id) : match.awayTeamId;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Mérkőzés eredmény szerkesztése</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="match-info">
                        <div className="match-teams-display">
                            <span className="team-display">{homeName}</span>
                            <span className="vs-display">vs</span>
                            <span className="team-display">{awayName}</span>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="label">
                                {homeName} pontszám
                            </label>
                            <input
                                type="number"
                                className="input"
                                value={homeScore}
                                onChange={(e) => setHomeScore(e.target.value)}
                                min="0"
                                placeholder="0"
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">
                                {awayName} pontszám
                            </label>
                            <input
                                type="number"
                                className="input"
                                value={awayScore}
                                onChange={(e) => setAwayScore(e.target.value)}
                                min="0"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">Győztes</label>
                        <select
                            className="input"
                            value={winnerId}
                            onChange={(e) => setWinnerId(e.target.value)}
                        >
                            <option value="">Automatikus (pontszám alapján)</option>
                            {homeId && (
                                <option value={homeId}>
                                    {homeName}
                                </option>
                            )}
                            {awayId && (
                                <option value={awayId}>
                                    {awayName}
                                </option>
                            )}
                        </select>
                        <p className="help-text">
                            Ha üresen hagyod, a győztest a pontszám alapján határozza meg a rendszer
                        </p>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Mégse
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="spinner" />
                                    Mentés...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Mentés
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
