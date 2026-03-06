import React from 'react';
import { X, Gamepad2 } from 'lucide-react';
import MatchHistory from './MatchHistory';
import type { Match } from '../../store/slices/usersSlice';

interface MatchHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: Match[];
    currentUserId: string;
    isAdmin: boolean;
}

const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
    isOpen,
    onClose,
    matches,
    currentUserId,
    isAdmin
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-[#121A22] border border-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-[#121A22]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Gamepad2 size={24} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Mérkőzés Előzmények</h2>
                            <p className="text-sm text-muted-foreground">{matches.length} lejátszott mérkőzés</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {matches.length > 0 ? (
                        <MatchHistory
                            matches={matches}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                        />
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Gamepad2 size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Nincsenek mérkőzések.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchHistoryModal;
