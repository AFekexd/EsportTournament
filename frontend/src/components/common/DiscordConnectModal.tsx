import { X, ExternalLink, Link as LinkIcon, Hash } from "lucide-react";
import { useState } from "react";

interface DiscordConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiscordConnectModal({
  isOpen,
  onClose,
}: DiscordConnectModalProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#161722] rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#5865F2] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#5865F2]/20">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Discord Közösség
            </h2>
            <p className="text-gray-400">
              Csatlakozz a szerverünkhöz vagy kösd össze a fiókodat!
            </p>
          </div>

          <div className="grid gap-4">
            {/* Option 1: Join Server */}
            <a
              href="https://discord.gg/BsAz7YqjWx"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-[#5865F2]/10 hover:border-[#5865F2]/50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2] mr-4 group-hover:scale-110 transition-transform">
                <ExternalLink size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-[#5865F2] transition-colors">
                  Csatlakozás
                </h3>
                <p className="text-sm text-gray-400">Megnyitás új lapon</p>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                <ExternalLink size={20} className="text-[#5865F2]" />
              </div>
            </a>

            <p className="text-center text-sm text-gray-500 mb-1">Majd</p>
            {/* Option 2: OAuth Link Account */}
            <button
              onClick={() => {
                const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
                if (!clientId) {
                  // Use alert if toast not imported, or just console error. Ideally user configured env.
                  console.error("Missing VITE_DISCORD_CLIENT_ID");
                  alert(
                    "A rendszergazda nem állította be a Discord Client ID-t.",
                  );
                  return;
                }
                const redirectUri = encodeURIComponent(
                  `${window.location.origin}/auth/discord/callback`,
                );
                window.location.href = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=identify`;
              }}
              className="w-full group relative flex items-center p-4 rounded-xl border border-white/10 bg-[#5865F2] hover:bg-[#4752C4] hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#5865F2]/20"
            >
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-white mr-4">
                <LinkIcon size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white">
                  Gyors összekötés (OAuth)
                </h3>
                <p className="text-sm text-white/80">
                  Kattints az automatikus összekapcsoláshoz
                </p>
              </div>
            </button>

            <div className="relative border-t border-white/10 pt-4 mt-2">
              <p className="text-center text-sm text-gray-500 mb-4">
                Vagy használd a manuális módszert:
              </p>

              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className={`w-full group relative flex items-center p-4 rounded-xl border transition-all duration-300 ${showInstructions ? "bg-white/10 border-white/20" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
              >
                <div className="w-12 h-12 rounded-lg bg-gray-500/20 flex items-center justify-center text-gray-400 mr-4 group-hover:scale-110 transition-transform">
                  <Hash size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white group-hover:text-gray-300 transition-colors">
                    Manuális összekötés
                  </h3>
                  <p className="text-sm text-gray-400">Parancsok használata</p>
                </div>
              </button>

              {/* Instructions Panel */}
              {showInstructions && (
                <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/10 animate-in slide-in-from-top-2">
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Hash size={16} className="text-gray-400" />
                    Hogyan kösd össze?
                  </h4>
                  <ol className="space-y-3 text-sm text-gray-300 list-decimal list-inside marker:text-emerald-500">
                    <li className="pl-2">
                      <span className="text-gray-400">
                        Csatlakozz a szerverünkhöz a fenti gombbal.
                      </span>
                    </li>
                    <li className="pl-2">
                      <span className="text-gray-400">
                        Használd a parancsokat bármelyik csatornán.
                      </span>
                    </li>
                    <li className="pl-2">
                      <span className="text-gray-400">Ha diák vagy:</span>
                      <div className="mt-1.5 ml-4 p-2 rounded bg-black/60 font-mono text-emerald-400 text-xs border border-white/5 select-all cursor-text">
                        /om &lt;oktatási_azonosító&gt;
                      </div>
                    </li>
                    <li className="pl-2">
                      <span className="text-gray-400">
                        Vagy ha csak fiókot szeretnél kötni:
                      </span>
                      <div className="mt-1.5 ml-4 p-2 rounded bg-black/60 font-mono text-emerald-400 text-xs border border-white/5 select-all cursor-text">
                        /link
                      </div>
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
