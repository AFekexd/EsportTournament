import { useState } from "react";
import { X, Check, ScrollText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import DOMPurify from "dompurify";

interface RuleAcceptanceModalProps {
  rules: string;
  rulesPdfUrl?: string;
  gameName?: string;
  onClose: () => void;
  onAccept?: () => void;
  viewOnly?: boolean;
}

export function RuleAcceptanceModal({
  rules,
  rulesPdfUrl,
  gameName,
  onClose,
  onAccept,
  viewOnly = false,
}: RuleAcceptanceModalProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`tactical-card w-full max-w-[95vw] md:max-w-[1400px] border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] md:max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 bg-secondary/60 border-b border-border p-4 md:p-5 flex items-center justify-between z-10 w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 border border-primary/30 rounded text-primary">
              <ScrollText size={20} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-display font-bold uppercase tracking-tight text-foreground break-words">
                {viewOnly ? "Játékszabályzat" : "Szabályzat elfogadása"}
              </h2>
              {gameName && (
                <p className="text-xs font-mono text-muted-foreground">
                  {gameName} játékszabályzat
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded border border-border transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="prose prose-invert max-w-none">
            {!viewOnly && (
              <div className="bg-amber-500/10 p-3.5 rounded border border-amber-500/30 mb-4">
                <div className="flex items-start gap-2.5">
                  <Shield
                    className="text-amber-400 shrink-0 mt-0.5"
                    size={16}
                  />
                  <p className="text-xs font-mono text-amber-300 font-medium m-0 leading-relaxed">
                    A versenyre való regisztrációhoz el kell olvasnod és el kell
                    fogadnod az alábbi játékszabályzatot. A szabályok megszegése
                    kizárást vonhat maga után.
                  </p>
                </div>
              </div>
            )}

            {rulesPdfUrl ? (
              <div className="w-full h-[60vh] md:h-[75vh] border border-border rounded overflow-hidden bg-secondary">
                <iframe
                  src={rulesPdfUrl}
                  className="w-full h-full"
                  title="Játékszabályzat PDF"
                />
              </div>
            ) : (
              <div
                className="prose prose-invert max-w-none text-foreground/80 font-mono text-sm [&>h1]:text-lg [&>h2]:text-base [&>h3]:text-sm [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:pl-5 [&>ol]:pl-5 break-words"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rules) }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 md:p-5 border-t border-border bg-secondary/40 backdrop-blur-sm">
          {!viewOnly ? (
            <>
              <div
                className="flex items-start md:items-center gap-3 mb-4 cursor-pointer group"
                onClick={() => setAccepted(!accepted)}
              >
                <div
                  className={`
                            w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 shrink-0 mt-0.5 md:mt-0
                            ${accepted
                      ? "bg-primary border-primary"
                      : "border-border bg-secondary group-hover:border-primary/50"
                    }
                        `}
                >
                  {accepted && (
                    <Check size={12} className="text-primary-foreground stroke-[3]" />
                  )}
                </div>
                <span
                  className={`text-xs font-mono select-none transition-colors ${accepted
                    ? "text-foreground font-bold"
                    : "text-muted-foreground group-hover:text-foreground"
                    }`}
                >
                  Elolvastam és elfogadom a játékszabályzatot
                </span>
              </div>

              <div className="flex flex-col-reverse md:flex-row gap-2.5">
                <Button
                  variant="ghost"
                  className="flex-1 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary rounded border border-border"
                  onClick={onClose}
                >
                  Mégse
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold uppercase tracking-wider text-xs rounded py-2"
                  onClick={onAccept}
                  disabled={!accepted}
                >
                  Szabályzat elfogadása és Regisztráció
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold uppercase tracking-wider text-xs px-6 rounded"
                onClick={onClose}
              >
                Bezárás
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
