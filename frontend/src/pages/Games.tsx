import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Users, Trophy, ChevronRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchGames } from '../store/slices/gamesSlice';
import type { Game } from '../types';
import './Games.css';

const teamSizeLabels: Record<number, string> = {
    1: '1v1',
    2: '2v2',
    3: '3v3',
    5: '5v5',
};

function GameCard({ game }: { game: Game }) {
    return (
        <Link to={`/games/${game.id}`} className="game-card card card-glow">
            <div className="game-image">
                {game.imageUrl ? (
                    <img src={game.imageUrl} alt={game.name} />
                ) : (
                    <div className="game-placeholder">
                        <Gamepad2 size={48} />
                    </div>
                )}
                <div className="game-overlay">
                    <span className="team-size-badge">{teamSizeLabels[game.teamSize]}</span>
                </div>
            </div>

            <div className="game-content">
                <h3 className="game-name">{game.name}</h3>
                {game.description && (
                    <p className="game-description">{game.description}</p>
                )}

                <div className="game-stats">
                    <div className="stat">
                        <Trophy size={16} />
                        <span>{game._count?.tournaments || 0} verseny</span>
                    </div>
                    <div className="stat">
                        <Users size={16} />
                        <span>{game._count?.gameStats || 0} játékos</span>
                    </div>
                </div>

                <div className="game-action">
                    <span>Részletek</span>
                    <ChevronRight size={16} />
                </div>
            </div>
        </Link>
    );
}

export function GamesPage() {
    const dispatch = useAppDispatch();
    const { games, isLoading } = useAppSelector((state) => state.games);

    useEffect(() => {
        dispatch(fetchGames());
    }, [dispatch]);

    return (
        <div className="games-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Játékok</h1>
                    <p className="page-subtitle">Támogatott esport játékok és szabályzatok</p>
                </div>
            </div>

            {isLoading ? (
                <div className="games-grid">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="game-card-skeleton card">
                            <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-md)' }} />
                            <div className="skeleton" style={{ height: 24, width: '60%', marginTop: 16 }} />
                            <div className="skeleton" style={{ height: 16, width: '80%', marginTop: 8 }} />
                        </div>
                    ))}
                </div>
            ) : games.length === 0 ? (
                <div className="empty-state">
                    <Gamepad2 size={48} className="empty-icon" />
                    <h3>Nincs elérhető játék</h3>
                    <p>Hamarosan új játékokat adunk hozzá.</p>
                </div>
            ) : (
                <div className="games-grid">
                    {games.map((game: Game) => (
                        <GameCard key={game.id} game={game} />
                    ))}
                </div>
            )}
        </div>
    );
}
