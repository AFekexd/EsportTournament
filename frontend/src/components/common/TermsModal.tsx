import { useState, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api-client";
import { API_URL } from "../../config";
import { useAppDispatch } from "../../hooks/useRedux";
import { updateUser } from "../../store/slices/authSlice";
import { toast } from "sonner";
import {
  ScrollText,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

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

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setPdfError(false);
      setIsLoading(false);
    },
    [],
  );

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("PDF Load Error:", error);
    setPdfError(true);
    setIsLoading(false);
  }, []);

  if (!shouldShow) return null;

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(`${API_URL}/users/me/accept-tos`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Házirend elfogadva!");
        // Update local state immediately
        dispatch(
          updateUser({ ...user!, tosAcceptedAt: new Date().toISOString() }),
        );
      } else {
        toast.error("Hiba történt az elfogadáskor");
      }
    } catch (error) {
      console.error("ToS Accept Error:", error);
      toast.error("Hiba történt a kommunikáció során");
    } finally {
      setIsLoading(false);
    }
  };

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="tactical-card shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary mb-2">
            <ScrollText size={14} className="text-primary" />
            <span>Kötelező Szabályzat // Házirend</span>
          </div>
          <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-foreground">
            Házirend Elfogadása
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            A szolgáltatás használatához el kell olvasnod és el kell fogadnod a hivatalos házirendet.
          </p>
        </div>

        {/* PDF Viewer / Content */}
        <div className="flex-1 overflow-y-auto bg-background/60 p-4 flex flex-col items-center">
          {!pdfError ? (
            <>
              {/* Page Navigation */}
              {numPages && numPages > 1 && (
                <div className="flex items-center gap-3 mb-4 sticky top-0 z-10 bg-secondary/90 border border-border px-3 py-1.5 rounded font-mono text-xs">
                  <button
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className="p-1.5 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-border"
                  >
                    <ChevronLeft size={16} className="text-foreground" />
                  </button>
                  <span className="text-foreground">
                    {pageNumber} / {numPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="p-1.5 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-border"
                  >
                    <ChevronRight size={16} className="text-foreground" />
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
                    <Loader2 className="animate-spin text-primary" size={24} />
                    <span className="ml-2 text-foreground font-mono text-xs">
                      Dokumentum betöltése...
                    </span>
                  </div>
                }
                className="max-w-full"
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-2xl rounded overflow-hidden"
                  width={Math.min(800, window.innerWidth - 64)}
                />
              </Document>
            </>
          ) : (
            <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
              <ScrollText size={40} className="text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-base font-display font-bold uppercase tracking-tight text-foreground mb-2">
                A dokumentum nem tölthető be
              </h3>
              <p className="text-xs font-mono text-muted-foreground mb-6 max-w-md">
                A házirend dokumentum (rules.pdf) jelenleg nem érhető el a
                szerveren, vagy hibás.
              </p>
              <a
                href="/rules.pdf"
                target="_blank"
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded text-foreground font-mono text-xs uppercase tracking-wider transition-colors border border-border"
              >
                Megnyitás új lapon
              </a>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="p-4 sm:p-5 border-t border-border bg-secondary/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
            <FileText size={14} />
            <a
              href="/rules.pdf"
              target="_blank"
              className="hover:text-primary transition-colors hover:underline"
            >
              Megnyitás új lapon
            </a>
          </div>

          <button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold uppercase tracking-wider text-xs rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_hsla(var(--primary),0.2)]"
          >
            {isLoading ? (
              "Feldolgozás..."
            ) : (
              <>
                <CheckCircle2 size={16} />
                Elolvastam és Elfogadom
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
