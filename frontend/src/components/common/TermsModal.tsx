
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../lib/api-client';
import { API_URL } from '../../config';
import { useAppDispatch } from '../../hooks/useRedux';
import { updateUser } from '../../store/slices/authSlice';
import { toast } from 'sonner';
import { ScrollText, CheckCircle2, FileText } from 'lucide-react';

export function TermsModal() {
    const { user, isAuthenticated } = useAuth();
    const dispatch = useAppDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [pdfError, setPdfError] = useState(false);

    // Only show if authenticated AND tosAcceptedAt is missing
    const shouldShow = isAuthenticated && user && !user.tosAcceptedAt;

    useEffect(() => {
        if (shouldShow) {
            // Check if PDF exists to avoid iframe recursion (SPA fallback)
            fetch('/rules.pdf', { method: 'HEAD' })
                .then(res => {
                    const type = res.headers.get('content-type');
                    if (!res.ok || (type && type.includes('text/html'))) {
                        setPdfError(true);
                    } else {
                        setPdfError(false);
                    }
                })
                .catch(() => setPdfError(true));
        }
    }, [shouldShow]);

    if (!shouldShow) return null;

    const handleAccept = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch(`${API_URL}/users/me/accept-tos`, {
                method: 'POST'
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Házirend elfogadva!');
                // Update local state immediately
                dispatch(updateUser({ ...user!, tosAcceptedAt: new Date().toISOString() }));
            } else {
                toast.error('Hiba történt az elfogadáskor');
            }
        } catch (error) {
            console.error('ToS Accept Error:', error);
            toast.error('Hiba történt a kommunikáció során');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-[#161722] rounded-2xl border border-white/10 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-[#1a1b26]">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <ScrollText className="text-primary" size={32} />
                        Házirend Elfogadása
                    </h2>
                    <p className="text-gray-400 mt-2">
                        A szolgáltatás használatához el kell olvasnod és el kell fogadnod a házirendet.
                    </p>
                </div>

                {/* PDF Viewer / Content */}
                <div className="flex-1 overflow-y-auto bg-[#0f1015] p-1">
                    {/* Using iframe for PDF display. 
                         Ideally use a proper PDF viewer lib like react-pdf for better control, 
                         but iframe is standard for simple display. 
                         Assumes rules.pdf is in public folder.
                     */}
                    {!pdfError ? (
                        <iframe
                            src="/rules.pdf#toolbar=0&navpanes=0"
                            className="w-full h-full min-h-[400px] rounded-lg bg-white"
                            title="Házirend"
                        />
                    ) : (
                        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-[#161722]">
                            <ScrollText size={48} className="text-gray-600 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">A dokumentum nem tölthető be</h3>
                            <p className="text-gray-400 mb-6 max-w-md">
                                A házirend dokumentum (rules.pdf) jelenleg nem érhető el a szerveren, vagy hibás.
                            </p>
                            <a
                                href="/rules.pdf"
                                target="_blank"
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors border border-white/10"
                            >
                                Megnyitás új lapon (Megpróbálhatod így)
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="p-6 border-t border-white/10 bg-[#1a1b26] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <FileText size={16} />
                        <a href="/rules.pdf" target="_blank" className="hover:text-primary transition-colors hover:underline">
                            Megnyitás új lapon
                        </a>
                    </div>

                    <button
                        onClick={handleAccept}
                        disabled={isLoading}
                        className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            'Feldolgozás...'
                        ) : (
                            <>
                                <CheckCircle2 size={20} />
                                Elolvastam és Elfogadom
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
