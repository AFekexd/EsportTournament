import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shield, GripVertical } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { fetchRanks, addRank, deleteRank } from '../../store/slices/gamesSlice';
import type { Game } from '../../types';
// Reusing existing modal styles

interface GameRankModalProps {
    game: Game;
    onClose: () => void;
}

export function GameRankModal({ game, onClose }: GameRankModalProps) {
    const dispatch = useAppDispatch();
    const { gameRanks } = useAppSelector((state) => state.games);
    const ranks = gameRanks[game.id] || [];

    const [newRank, setNewRank] = useState({
        name: '',
        value: 1000,
        image: '',
        order: ranks.length + 1
    });

    useEffect(() => {
        dispatch(fetchRanks(game.id));
    }, [dispatch, game.id]);

    const handleAdd = async () => {
        if (!newRank.name) return;
        try {
            await dispatch(addRank({
                gameId: game.id,
                rankData: newRank
            })).unwrap();

            // Reset form but keep logical defaults
            setNewRank({
                name: '',
                value: newRank.value + 100, // Increment default logic
                image: '',
                order: ranks.length + 2
            });
        } catch (error) {
            console.error('Failed to add rank:', error);
            alert('Hiba történt a rang hozzáadásakor');
        }
    };

    const handleDelete = async (rankId: string) => {
        if (!confirm('Biztosan törölni szeretnéd ezt a rangot?')) return;
        try {
            await dispatch(deleteRank({ gameId: game.id, rankId })).unwrap();
        } catch (error) {
            console.error('Failed to delete rank:', error);
            alert('Hiba történt a törléskor');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2>{game.name} - Rangok Kezelése</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="alert alert-info mb-4">
                        <Shield size={20} />
                        <div>
                            <p className="mb-0">A rangok határozzák meg a játékosok P-ELO (Pollák ELO) pontszámát.</p>
                        </div>
                    </div>

                    {/* Add New Rank Form */}
                    <div className="card p-3 mb-4" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                        <h4 className="mt-0 mb-3">Új Rang Hozzáadása</h4>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="form-group">
                                <label>Megnevezés</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Pl. Silver 1"
                                    value={newRank.name}
                                    onChange={(e) => setNewRank({ ...newRank, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>P-ELO Érték</label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="1000"
                                    value={newRank.value}
                                    onChange={(e) => setNewRank({ ...newRank, value: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Kép URL (Opcionális)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="https://..."
                                    value={newRank.image}
                                    onChange={(e) => setNewRank({ ...newRank, image: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Sorrend</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={newRank.order}
                                    onChange={(e) => setNewRank({ ...newRank, order: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <button
                            className="btn btn-primary w-full"
                            disabled={!newRank.name}
                            onClick={handleAdd}
                        >
                            <Plus size={18} className="mr-2" />
                            Hozzáadás
                        </button>
                    </div>

                    {/* Ranks List */}
                    <div className="ranks-list">
                        <h4 className="mb-2">Jelenlegi Rangok</h4>
                        {ranks.length === 0 ? (
                            <p className="text-muted text-center py-4">Még nincs rang felvéve ehhez a játékhoz.</p>
                        ) : (
                            <div className="space-y-2">
                                {ranks.map((rank) => (
                                    <div key={rank.id} className="card p-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="text-muted cursor-move">
                                                <GripVertical size={16} />
                                            </div>
                                            {rank.image ? (
                                                <img src={rank.image} alt={rank.name} className="w-8 h-8 object-contain" />
                                            ) : (
                                                <div className="w-8 h-8 bg-black/20 rounded flex items-center justify-center">
                                                    <Shield size={16} className="text-muted" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold">{rank.name}</div>
                                                <div className="text-xs text-muted">ELO: <span className="text-primary">{rank.value}</span></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-sm text-muted">#{rank.order}</div>
                                            <button
                                                className="btn-icon text-danger hover:bg-danger/10"
                                                onClick={() => handleDelete(rank.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
