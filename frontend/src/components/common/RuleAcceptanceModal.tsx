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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`bg-[#1a1b26] rounded-2xl w-full max-w-[95vw] md:max-w-[1400px] border border-white/10 shadow-[0_0_50px_-12px_rgba(var(--primary-rgb),0.25)] overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1b26] border-b border-white/10 p-4 md:p-6 flex items-center justify-between z-10 w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <ScrollText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {viewOnly ? "Játékszabályzat" : "Szabályzat elfogadása"}
              </h2>
              {gameName && (
                <p className="text-sm text-gray-400">
                  {gameName} játékszabályzat
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="prose prose-invert max-w-none">
            {!viewOnly && (
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 mb-4">
                <div className="flex items-start gap-3">
                  <Shield
                    className="text-yellow-500 shrink-0 mt-0.5"
                    size={18}
                  />
                  <p className="text-sm text-yellow-500/90 font-medium m-0">
                    A versenyre való regisztrációhoz el kell olvasnod és el kell
                    fogadnod az alábbi játékszabályzatot. A szabályok megszegése
                    kizárást vonhat maga után.
                  </p>
                </div>
              </div>
            )}

            {rulesPdfUrl ? (
              <div className="w-full h-[75vh] border border-white/10 rounded-xl overflow-hidden bg-white/5">
                <iframe
                  src={rulesPdfUrl}
                  className="w-full h-full"
                  title="Játékszabályzat PDF"
                />
              </div>
            ) : (
              <div
                className="prose prose-invert max-w-none text-gray-300 [&>h1]:text-xl [&>h2]:text-lg [&>h3]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:pl-5 [&>ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rules) }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-[#0f1016]/50 backdrop-blur-sm">
          {!viewOnly ? (
            <>
              <div
                className="flex items-center gap-3 mb-6 cursor-pointer group"
                onClick={() => setAccepted(!accepted)}
              >
                <div
                  className={`
                            w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-200
                            ${
                              accepted
                                ? "bg-primary border-primary"
                                : "border-gray-500 group-hover:border-primary/50"
                            }
                        `}
                >
                  {accepted && (
                    <Check size={14} className="text-black stroke-[3]" />
                  )}
                </div>
                <span
                  className={`text-sm select-none transition-colors ${
                    accepted
                      ? "text-white"
                      : "text-gray-400 group-hover:text-gray-300"
                  }`}
                >
                  Elolvastam és elfogadom a játékszabályzatot
                </span>
              </div>

              <div className="flex flex-col-reverse md:flex-row gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 text-gray-400 hover:text-white hover:bg-white/5"
                  onClick={onClose}
                >
                  Mégse
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold whitespace-normal h-auto py-3 md:py-2"
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
                className="bg-primary hover:bg-primary/90 text-white font-bold px-8"
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
