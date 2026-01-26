import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useRedux';
import { authService } from '../lib/auth-service';
import { API_URL } from '../config';
import { fetchNotifications } from '../store/slices/notificationsSlice';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function DiscordCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Fiókok összekapcsolása folyamatban...');

    useEffect(() => {
        const code = searchParams.get('code');

        if (!code) {
            setStatus('error');
            setMessage('Hiányzó OAuth kód!');
            toast.error('Hiányzó OAuth kód!');
            setTimeout(() => navigate('/'), 3000);
            return;
        }

        const linkAccount = async () => {
            try {
                const token = authService.keycloak?.token;
                if (!token) {
                    throw new Error('Nem vagy bejelentkezve!');
                }

                const response = await fetch(`${API_URL}/auth/discord/oauth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ code })
                });

                const data = await response.json();

                if (data.success) {
                    setStatus('success');
                    setMessage('Sikeres összekapcsolás!');
                    toast.success('Sikeresen összekötötted a Discord fiókodat!');
                    // Refresh notifications or profile data if needed
                    dispatch(fetchNotifications({ page: 1, limit: 5 }));
                    setTimeout(() => navigate('/profile'), 1500);
                } else {
                    throw new Error(data.message || 'Sikertelen összekapcsolás');
                }
            } catch (error: any) {
                console.error('Discord Link Error:', error);
                setStatus('error');
                setMessage(error.message || 'Hiba történt az összekapcsolás során');
                toast.error(error.message || 'Hiba történt az összekapcsolás során');
                setTimeout(() => navigate('/profile'), 3000);
            }
        };

        // Prevent double-execution in StrictMode if not careful, but useEffect runs once per mount effectively here with empty deps or code dep.
        // Better to use a ref to track if verified.
        linkAccount();

    }, [searchParams, navigate, dispatch]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#07090e]">
            <div className="bg-[#161722] p-8 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-primary" size={48} />
                        <h2 className="text-xl font-bold text-white">Összekapcsolás...</h2>
                        <p className="text-gray-400">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">Siker!</h2>
                        <p className="text-gray-400">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">Hiba</h2>
                        <p className="text-red-400">{message}</p>
                        <p className="text-sm text-gray-500 mt-2">Átirányítás a profilra...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
