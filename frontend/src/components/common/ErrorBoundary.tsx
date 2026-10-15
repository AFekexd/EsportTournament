import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-destructive/40 bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold uppercase tracking-wide text-foreground">
                  Hiba történt a felületen
                </h2>
                <p className="font-mono text-xs text-muted-foreground">
                  Váratlan hiba lépett fel a modul megjelenítése közben
                </p>
              </div>
            </div>

            <p className="text-sm text-foreground/80 mb-6 leading-relaxed">
              {this.props.fallbackMessage ||
                "A komponens nem tudott megfelelően betöltődni az adatok feldolgozása során. Kérjük próbáld újra, vagy térj vissza a főoldalra."}
            </p>

            {this.state.error && (
              <details className="mb-6 rounded-md border border-border/80 bg-secondary/50 p-3 text-xs font-mono">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-semibold">
                  Technikai részletek megtekintése
                </summary>
                <div className="mt-2 text-destructive font-mono text-[11px] break-words whitespace-pre-wrap">
                  {this.state.error.toString()}
                </div>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 text-muted-foreground/70 text-[10px] max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white font-mono text-xs uppercase font-bold tracking-wider hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
              >
                <RefreshCw size={14} />
                <span>Újrapróbálás</span>
              </button>

              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-secondary border border-border text-foreground font-mono text-xs uppercase tracking-wider hover:bg-secondary/80 transition-all"
              >
                <Home size={14} />
                <span>Főoldal</span>
              </a>

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-secondary/40 text-muted-foreground font-mono text-xs uppercase tracking-wider hover:text-foreground transition-all ml-auto"
              >
                <ArrowLeft size={14} />
                <span>Újratöltés</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
