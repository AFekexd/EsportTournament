
import { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../lib/api-client';
import { API_URL } from '../../config';
import { useAppDispatch } from '../../hooks/useRedux';
import { updateUser } from '../../store/slices/authSlice';
import { toast } from 'sonner';
import { ScrollText, CheckCircle2, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set the worker source for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function TermsModal() {
    const { user, isAuthenticated } = useAuth();
    const dispatch = useAppDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [pdfError, setPdfError] = useState(false);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);

    // Only show if authenticated AND tosAcceptedAt is missing
    const shouldShow = isAuthenticated && user && !user.tosAcceptedAt;

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setPdfError(false);
        setIsLoading(false);
    }, []);

    const onDocumentLoadError = useCallback((error: Error) => {
        console.error('PDF Load Error:', error);
        setPdfError(true);
        setIsLoading(false);
    }, []);

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

    const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
    const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-[#161722] rounded-2xl border border-white/10 shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">

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
                <div className="flex-1 overflow-y-auto bg-[#0f1015] p-4 flex flex-col items-center">
                    {!pdfError ? (
                        <>
                            {/* Page Navigation */}
                            {numPages && numPages > 1 && (
                                <div className="flex items-center gap-4 mb-4 sticky top-0 z-10 bg-[#0f1015] py-2 rounded-lg">
                                    <button
                                        onClick={goToPrevPage}
                                        disabled={pageNumber <= 1}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={20} className="text-white" />
                                    </button>
                                    <span className="text-white text-sm">
                                        {pageNumber} / {numPages}
                                    </span>
                                    <button
                                        onClick={goToNextPage}
                                        disabled={pageNumber >= numPages}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={20} className="text-white" />
                                    </button>
                                </div>
                            )}

                            {/* PDF Document */}
                            <Document
                                file="/rules.pdf"
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={onDocumentLoadError}
                                loading={
                                    <div className="flex items-center justify-center p-8">
                                        <Loader2 className="animate-spin text-primary" size={32} />
                                        <span className="ml-2 text-white">Dokumentum betöltése...</span>
                                    </div>
                                }
                                className="max-w-full"
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    className="shadow-2xl rounded-lg overflow-hidden"
                                    width={Math.min(800, window.innerWidth - 64)}
                                />
                            </Document>
                        </>
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
