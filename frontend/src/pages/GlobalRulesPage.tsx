import { Shield } from "lucide-react";

export function GlobalRulesPage() {
    const pdfUrl = "/rules.pdf";

    return (
        <div className="flex flex-col gap-8 pb-16">
            {/* Tactical Header */}
            <div className="flex flex-col gap-3 border-b border-border/60 pb-6">
                <div className="inline-flex w-fit items-center gap-2 rounded border border-border bg-secondary/80 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
                    <Shield className="h-3.5 w-3.5" />
                    <span>HIVATALOS SZABÁLYZAT // CODE OF CONDUCT</span>
                </div>
                <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-foreground">
                    ESPORT LABOR <span className="text-primary">HÁZIREND</span>
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl">
                    A Pollák Antal Technikum esport termének és hivatalos versenyeinek kötelező érvényű házirendje.
                </p>
            </div>

            {/* Content Frame */}
            <div className="tactical-card overflow-hidden h-[80vh] border border-border bg-card">
                <iframe
                    src={pdfUrl}
                    className="w-full h-full"
                    title="Házirend"
                />
            </div>
        </div>
    );
}
