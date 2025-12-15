import { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Match } from '../../types';

interface MatchEditModalProps {
    match: Match;
    onClose: () => void;
    onSave: (data: { homeScore?: number; awayScore?: number; winnerId?: string }) => void;
    isLoading?: boolean;
}

export function MatchEditModal({ match, onClose, onSave, isLoading }: MatchEditModalProps) {
    const [homeScore, setHomeScore] = useState<string>(match.homeScore?.toString() || '');
    const [awayScore, setAwayScore] = useState<string>(match.awayScore?.toString() || '');
    const [winnerId, setWinnerId] = useState<string>(match.winnerId || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const data: { homeScore?: number; awayScore?: number; winnerId?: string } = {};

        if (homeScore !== '') {
            data.homeScore = parseInt(homeScore, 10);
        }
        if (awayScore !== '') {
            data.awayScore = parseInt(awayScore, 10);
        }
        if (winnerId) {
            data.winnerId = winnerId;
        }

        onSave(data);
    };

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
                            <span className="team-display">{match.homeTeam?.name || 'TBD'}</span>
                            <span className="vs-display">vs</span>
                            <span className="team-display">{match.awayTeam?.name || 'TBD'}</span>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="label">
                                {match.homeTeam?.name || 'Hazai csapat'} pontszám
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
                                {match.awayTeam?.name || 'Vendég csapat'} pontszám
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
                            {match.homeTeamId && (
                                <option value={match.homeTeamId}>
                                    {match.homeTeam?.name || 'Hazai csapat'}
                                </option>
                            )}
                            {match.awayTeamId && (
                                <option value={match.awayTeamId}>
                                    {match.awayTeam?.name || 'Vendég csapat'}
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
