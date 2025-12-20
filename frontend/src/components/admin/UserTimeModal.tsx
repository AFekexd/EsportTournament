import { useState } from 'react';
import { X, Clock, Plus, Minus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { API_URL } from '../../config';

interface UserTimeModalProps {
    user: {
        id: string;
        username: string;
        displayName: string | null;
        role: string;
        email: string;
    };
    onClose: () => void;
    onSuccess: () => void;
}

export const UserTimeModal: React.FC<UserTimeModalProps> = ({ user, onClose, onSuccess }) => {
    const { user: currentUser } = useAuth();
    const [amount, setAmount] = useState<number>(60); // Default 60 minutes
    const [mode, setMode] = useState<'ADD' | 'REMOVE'>('ADD');
    const [isLoading, setIsLoading] = useState(false);
    const [reason, setReason] = useState(''); // Optional reason logging/notes if we want later

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const token = currentUser?.token; // Assuming useAuth provides token, strictly speaking we might need authService.keycloak.token if useAuth doesn't expose it directly yet
            // Actually let's use authService direct access if unsure about hook
            const validToken = token || (await import('../../lib/auth-service')).authService.keycloak?.token;

            if (!validToken) return;

            // Calculate seconds
            const seconds = mode === 'ADD' ? amount * 60 : -amount * 60;

            const response = await fetch(`${API_URL}/admin/kiosk/users/${user.id}/add-time`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${validToken}`,
                },
                body: JSON.stringify({ seconds }),
            });

            if (response.ok) {
                onSuccess();
                onClose();
            } else {
                alert('Sikertelen időmódosítás');
            }
        } catch (error) {
            console.error(error);
            alert('Hiba történt');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#1a1b26] rounded-xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock className="text-blue-400" size={24} />
                        Időkeret kezelése
                    </h2>
                    <button
                        className="text-gray-400 hover:text-white transition-colors"
                        onClick={onClose}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6 bg-white/5 p-4 rounded-lg border border-white/5">
                        <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center border border-white/10 text-xl font-bold text-gray-400">
                            {(user.displayName || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-bold text-white text-lg">{user.displayName || user.username}</div>
                            <div className="text-gray-400 text-sm">Jelenlegi egyenleg módosítása</div>
                        </div>
                    </div>

                    <div className="flex bg-black/40 p-1 rounded-lg mb-6">
                        <button
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'ADD' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setMode('ADD')}
                        >
                            <Plus size={16} /> Hozzáadás
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'REMOVE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setMode('REMOVE')}
                        >
                            <Minus size={16} /> Levonás
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-bold mb-2">
                            Időtartam (perc)
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="1"
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setAmount(30)} className="px-3 py-1 rounded border border-white/10 text-sm hover:bg-white/5">30p</button>
                                <button onClick={() => setAmount(60)} className="px-3 py-1 rounded border border-white/10 text-sm hover:bg-white/5">1h</button>
                                <button onClick={() => setAmount(120)} className="px-3 py-1 rounded border border-white/10 text-sm hover:bg-white/5">2h</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Mégse
                    </button>
                    <button
                        className={`btn ${mode === 'ADD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white border-none`}
                        onClick={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Mentés...' : (mode === 'ADD' ? 'Idő jóváírása' : 'Idő levonása')}
                    </button>
                </div>
            </div>
        </div>
    );
};
